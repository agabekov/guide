import { pipeline, env } from '@xenova/transformers';
import type { FAQItem } from '../types';

// Настройка окружения для Transformers.js
env.allowLocalModels = false;
env.useBrowserCache = true;

// Интерфейс для FAQ с embedding
export interface FAQEmbedding {
  faq_id: string;
  embedding: number[];
  question: string;
  answer: string;
  category: string;
  usefulness: number;
}

// Кэш для embedder модели
let embedder: any = null;
let cachedEmbeddings: FAQEmbedding[] | null = null;

/**
 * Загружает предвычисленные embeddings из JSON файла
 * Использует ленивую загрузку и кэширование
 */
export const loadEmbeddings = async (): Promise<FAQEmbedding[]> => {
  if (cachedEmbeddings) {
    console.log('✅ Using cached embeddings');
    return cachedEmbeddings;
  }

  try {
    console.log('📦 Loading pre-computed embeddings...');
    const response = await import('../data/faq-embeddings.json');
    cachedEmbeddings = response.default as FAQEmbedding[];
    console.log(`✅ Loaded ${cachedEmbeddings.length} embeddings`);
    return cachedEmbeddings;
  } catch (error) {
    console.error('❌ Failed to load embeddings:', error);
    throw new Error('Не удалось загрузить базу знаний. Проверьте, что файл faq-embeddings.json существует.');
  }
};

/**
 * Создает embedding для текста с использованием Transformers.js
 * Использует multilingual-e5-small модель для поддержки русского языка
 */
export const embedText = async (text: string): Promise<number[]> => {
  try {
    // Инициализируем модель при первом вызове
    if (!embedder) {
      console.log('🤖 Initializing embedding model (first time only)...');
      console.log('   This may take 5-10 seconds...');

      embedder = await pipeline(
        'feature-extraction',
        'Xenova/multilingual-e5-small',
        {
          quantized: true, // Используем квантизованную версию для меньшего размера
        }
      );

      console.log('✅ Embedding model loaded successfully');
    }

    // Генерируем embedding
    const output = await embedder(text, {
      pooling: 'mean',
      normalize: true,
    });

    // Конвертируем в массив
    const embedding = Array.from(output.data as Float32Array);

    return embedding;
  } catch (error) {
    console.error('❌ Error creating embedding:', error);
    throw new Error('Не удалось создать embedding для текста');
  }
};

/**
 * Вычисляет косинусное сходство между двумя векторами
 * Возвращает значение от -1 до 1, где 1 = идентичные векторы
 */
export const cosineSimilarity = (vecA: number[], vecB: number[]): number => {
  if (vecA.length !== vecB.length) {
    throw new Error(`Vector dimensions don't match: ${vecA.length} vs ${vecB.length}`);
  }

  let dotProduct = 0;
  let magnitudeA = 0;
  let magnitudeB = 0;

  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    magnitudeA += vecA[i] * vecA[i];
    magnitudeB += vecB[i] * vecB[i];
  }

  magnitudeA = Math.sqrt(magnitudeA);
  magnitudeB = Math.sqrt(magnitudeB);

  if (magnitudeA === 0 || magnitudeB === 0) {
    return 0;
  }

  return dotProduct / (magnitudeA * magnitudeB);
};

/**
 * Находит наиболее похожие FAQ на основе семантического поиска
 *
 * @param sourceText - Текст для поиска похожих FAQ
 * @param topK - Количество результатов для возврата (по умолчанию 5)
 * @returns Массив наиболее релевантных FAQ
 */
export const findSimilarFAQs = async (
  sourceText: string,
  topK: number = 5
): Promise<FAQItem[]> => {
  try {
    console.log(`🔍 Searching for ${topK} most relevant FAQs...`);
    const startTime = performance.now();

    // 1. Загружаем предвычисленные embeddings
    const allEmbeddings = await loadEmbeddings();

    // 2. Создаем embedding для sourceText
    console.log('   Creating embedding for source text...');
    const queryEmbedding = await embedText(sourceText);
    console.log(`   ✓ Query embedding created (dim: ${queryEmbedding.length})`);

    // 3. Вычисляем similarity со всеми FAQ
    console.log(`   Calculating similarity with ${allEmbeddings.length} FAQs...`);
    const similarities = allEmbeddings.map(faq => {
      const similarity = cosineSimilarity(queryEmbedding, faq.embedding);
      return {
        ...faq,
        similarity,
      };
    });

    // 4. Сортируем по схожести (descending)
    similarities.sort((a, b) => b.similarity - a.similarity);

    // 5. Берем топ K
    const topResults = similarities.slice(0, topK);

    const endTime = performance.now();
    const duration = ((endTime - startTime) / 1000).toFixed(2);

    console.log(`✅ Found ${topResults.length} similar FAQs in ${duration}s`);
    console.log('   Top 3 matches:');
    topResults.slice(0, 3).forEach((result, i) => {
      console.log(`   ${i + 1}. [${(result.similarity * 100).toFixed(1)}%] ${result.question.slice(0, 60)}...`);
    });

    // 6. Конвертируем в FAQItem формат
    const faqItems: FAQItem[] = topResults.map(item => ({
      id: item.faq_id,
      question: item.question,
      answer: item.answer,
      category: item.category,
      subcategory: '', // Не храним в embeddings
      created: '',
      updated: '',
      usefulness: item.usefulness,
      path: '',
    }));

    return faqItems;
  } catch (error: any) {
    console.error('❌ Error in findSimilarFAQs:', error);
    throw new Error(`Ошибка при поиске похожих FAQ: ${error.message}`);
  }
};

/**
 * Предзагрузка модели в фоновом режиме
 * Вызывайте эту функцию при инициализации приложения для ускорения первого поиска
 */
export const preloadModel = async (): Promise<void> => {
  try {
    console.log('🚀 Preloading embedding model in background...');
    await embedText('Инициализация модели'); // Простой текст для прогрева
    console.log('✅ Model preloaded successfully');
  } catch (error) {
    console.warn('⚠️  Failed to preload model:', error);
    // Не бросаем ошибку, просто логируем
  }
};

/**
 * Очищает кэш embeddings (для тестирования)
 */
export const clearEmbeddingsCache = (): void => {
  cachedEmbeddings = null;
  console.log('🗑️  Embeddings cache cleared');
};
