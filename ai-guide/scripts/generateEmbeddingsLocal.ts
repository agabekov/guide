import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { pipeline } from '@xenova/transformers';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Интерфейсы
interface FAQItem {
  id: string;
  question: string;
  answer: string;
  category: string;
  subcategory: string;
  usefulness: number;
  path: string;
}

interface FAQEmbedding {
  faq_id: string;
  embedding: number[];
  question: string;
  answer: string;
  category: string;
  usefulness: number;
}

// Путь к файлам
const faqPath = path.join(__dirname, '../src/data/faq.json');
const outputPath = path.join(__dirname, '../src/data/faq-embeddings.json');

// Глобальный embedder
let embedder: any = null;

/**
 * Создает embedding для текста используя локальную модель
 */
async function createLocalEmbedding(text: string): Promise<number[]> {
  try {
    // Инициализируем модель при первом вызове
    if (!embedder) {
      console.log('   🤖 Loading embedding model (first time, ~5-10 seconds)...');
      embedder = await pipeline('feature-extraction', 'Xenova/multilingual-e5-small', {
        quantized: true, // Квантизованная версия для скорости
      });
      console.log('   ✅ Model loaded successfully\n');
    }

    // Генерируем embedding
    const output = await embedder(text, {
      pooling: 'mean',
      normalize: true,
    });

    // Конвертируем в массив
    return Array.from(output.data as Float32Array);
  } catch (error: any) {
    console.error('❌ Error creating embedding:', error.message);
    throw error;
  }
}

/**
 * Генерирует embeddings для всех FAQ с прогресс-баром
 */
async function generateEmbeddingsLocally(faqs: FAQItem[]): Promise<FAQEmbedding[]> {
  const embeddings: FAQEmbedding[] = [];
  const total = faqs.length;

  console.log(`\n🚀 Начинаем локальную генерацию embeddings для ${total} FAQ...`);
  console.log('⏱️  Примерное время: ${Math.ceil(total * 0.5 / 60)} минут\n');

  const startTime = Date.now();
  let lastProgressUpdate = Date.now();

  for (let i = 0; i < total; i++) {
    const faq = faqs[i];

    try {
      // Комбинируем вопрос и ответ
      const combinedText = `Вопрос: ${faq.question}\nОтвет: ${faq.answer}`.slice(0, 8000);

      // Создаем embedding
      const embedding = await createLocalEmbedding(combinedText);

      embeddings.push({
        faq_id: faq.id,
        embedding: embedding,
        question: faq.question,
        answer: faq.answer.slice(0, 700), // Ограничиваем для экономии места
        category: faq.category,
        usefulness: faq.usefulness,
      });

      // Обновляем прогресс каждые 10 FAQ или каждые 5 секунд
      const now = Date.now();
      if ((i + 1) % 10 === 0 || now - lastProgressUpdate > 5000) {
        const progress = ((i + 1) / total * 100).toFixed(1);
        const elapsed = (now - startTime) / 1000 / 60; // минуты
        const rate = (i + 1) / elapsed; // FAQ per minute
        const remaining = (total - i - 1) / rate; // минуты

        console.log(
          `   📊 Progress: ${i + 1}/${total} (${progress}%) | ` +
          `Elapsed: ${elapsed.toFixed(1)}m | ` +
          `ETA: ${remaining.toFixed(1)}m | ` +
          `Rate: ${rate.toFixed(1)} FAQ/min`
        );
        lastProgressUpdate = now;
      }
    } catch (error: any) {
      console.error(`   ❌ Failed to process FAQ ${i + 1} (${faq.id}):`, error.message);
      // Продолжаем с следующим FAQ
    }
  }

  return embeddings;
}

/**
 * Основная функция
 */
async function main() {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('  🤖 Локальный Генератор Embeddings для Kaspi Guide');
  console.log('  (Без OpenAI API - полностью бесплатно!)');
  console.log('═══════════════════════════════════════════════════════════\n');

  // Читаем FAQ данные
  console.log('📖 Чтение faq.json...');
  const faqData: FAQItem[] = JSON.parse(fs.readFileSync(faqPath, 'utf-8'));
  console.log(`✅ Загружено ${faqData.length} FAQ записей\n`);

  // Проверяем, есть ли уже embeddings
  if (fs.existsSync(outputPath)) {
    console.log('⚠️  Файл faq-embeddings.json уже существует!');
    const existingData: FAQEmbedding[] = JSON.parse(fs.readFileSync(outputPath, 'utf-8'));
    console.log(`   Найдено ${existingData.length} существующих embeddings`);

    // Спрашиваем у пользователя
    console.log('\n❓ Продолжить и перезаписать? (Ctrl+C для отмены)\n');

    // Создаем backup
    const backupPath = outputPath.replace('.json', `.backup-${Date.now()}.json`);
    fs.copyFileSync(outputPath, backupPath);
    console.log(`💾 Резервная копия сохранена: ${path.basename(backupPath)}\n`);
  }

  // Генерируем embeddings
  const startTime = Date.now();
  const embeddings = await generateEmbeddingsLocally(faqData);

  // Сохраняем результаты
  console.log('\n💾 Сохранение embeddings...');
  fs.writeFileSync(outputPath, JSON.stringify(embeddings, null, 2));

  // Статистика
  const endTime = Date.now();
  const duration = ((endTime - startTime) / 1000 / 60).toFixed(2);
  const fileSize = (fs.statSync(outputPath).size / 1024 / 1024).toFixed(2);

  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('  ✅ Генерация завершена успешно!');
  console.log('═══════════════════════════════════════════════════════════');
  console.log(`📊 Обработано FAQ: ${embeddings.length} из ${faqData.length}`);
  console.log(`⏱️  Время выполнения: ${duration} минут`);
  console.log(`📦 Размер файла: ${fileSize} MB`);
  console.log(`💰 Стоимость: $0.00 (локальная генерация)`);
  console.log(`📁 Файл сохранен: ${path.basename(outputPath)}\n`);

  // Проверка качества
  if (embeddings.length < faqData.length) {
    console.warn(`⚠️  ВНИМАНИЕ: Обработано только ${embeddings.length} из ${faqData.length} FAQ`);
    console.warn('   Проверьте логи выше на наличие ошибок\n');
  }

  // Показываем пример embedding
  const sampleEmbedding = embeddings[0];
  console.log('📝 Пример embedding:');
  console.log(`   Вопрос: ${sampleEmbedding.question.slice(0, 60)}...`);
  console.log(`   Размерность: ${sampleEmbedding.embedding.length}`);
  console.log(`   Первые 5 значений: [${sampleEmbedding.embedding.slice(0, 5).map(v => v.toFixed(4)).join(', ')}...]\n`);

  console.log('✅ Готово! Теперь можете использовать RAG-оптимизацию.\n');
}

// Запуск
main().catch(error => {
  console.error('\n❌ Критическая ошибка:', error.message);
  console.error(error.stack);
  process.exit(1);
});
