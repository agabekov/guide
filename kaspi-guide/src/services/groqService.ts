import editorChecklistRaw from '../data/editor-checklist.txt?raw';
import type { FAQItem } from '../types';
import { findSimilarFAQs } from './ragService';
import { compressChecklist } from './checklistCompressor';
import { getCacheKey, getCachedAnswers, setCachedAnswers } from './cacheService';
import { estimateTokens, createDetailedTokenStats, logDetailedTokenStats } from '../utils/tokenCounter';

const apiKey = import.meta.env.VITE_GROQ_API_KEY;
const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';

// Доступные модели Groq (в порядке приоритета)
// Модели выбраны для лучшей поддержки русского языка и качества генерации
const MODEL_NAMES = [
  'llama-3.3-70b-versatile',           // Лучшая модель, 128K context
  'meta-llama/llama-4-scout-17b-16e-instruct',  // Новая LLaMA 4 Scout
  'meta-llama/llama-4-maverick-17b-128e-instruct', // LLaMA 4 Maverick
  'llama-3.1-8b-instant',              // Быстрая, хороша для русского
  'moonshotai/kimi-k2-instruct',       // Kimi - отличная для многоязычности
];

const editorGuidelines = editorChecklistRaw
  .split('\n')
  .map((line) => line.trim())
  .filter((line) => line.length > 0)
  .join('\n');

const editorGuidelinesPrompt = `
Редакторский чек-лист контент-менеджера (учитывай все пункты при генерации):
${editorGuidelines}
`;

export interface GeneratedQuestion {
  id: string;
  question: string;
  selected: boolean;
}

export interface GeneratedFAQ {
  question: string;
  answer: string;
}

// Анализ стиля существующих FAQ
const trimText = (text: string, maxLength: number): string => {
  const normalized = (text || '').replace(/\s+/g, ' ').trim();
  if (normalized.length <= maxLength) return normalized;
  return `${normalized.slice(0, maxLength)}...`;
};

const pickStyleExamples = (faqData: FAQItem[], sampleSize: number): FAQItem[] => {
  if (faqData.length <= sampleSize) return faqData;

  const byUsefulness = [...faqData].sort(
    (a, b) => (b.usefulness || 0) - (a.usefulness || 0)
  );
  const top = byUsefulness.slice(0, Math.ceil(sampleSize / 2));

  const randomPool = [...faqData]
    .sort(() => 0.5 - Math.random())
    .slice(0, sampleSize);

  const combined = [...top, ...randomPool];
  const uniqueByQuestion = new Map<string, FAQItem>();

  combined.forEach((faq) => {
    if (!uniqueByQuestion.has(faq.question)) {
      uniqueByQuestion.set(faq.question, faq);
    }
  });

  return Array.from(uniqueByQuestion.values()).slice(0, sampleSize);
};

const analyzeFAQStyle = (faqData: FAQItem[]): string => {
  if (!faqData || faqData.length === 0) return '';

  // Берем примеры из базы по полезности и случайной выборке, чтобы отражать стиль всех MD
  const examples = pickStyleExamples(faqData, 12).map(faq => ({
    question: trimText(faq.question, 180),
    answer: trimText(faq.answer, 700),
  }));

  return `
Примеры существующих FAQ для анализа стиля:

${examples.map((ex, i) => `
Пример ${i + 1}:
Вопрос: ${ex.question}
Ответ: ${ex.answer}
`).join('\n')}
`;
};

// Утилита для задержки
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Вспомогательная функция для вызова Groq API с автоматическим retry при rate limit
const callGroqAPI = async (
  messages: Array<{ role: string; content: string }>,
  modelName: string = MODEL_NAMES[0],
  retryCount: number = 0
): Promise<string> => {
  if (!apiKey) {
    throw new Error('Не настроен ключ Groq. Добавьте VITE_GROQ_API_KEY в .env файл.');
  }

  // Validate API key format
  if (typeof apiKey !== 'string' || apiKey.trim() === '') {
    throw new Error('API ключ не настроен правильно. Проверьте переменную окружения VITE_GROQ_API_KEY.');
  }

  // Check for non-ASCII characters in API key
  const hasNonAscii = /[^\x00-\x7F]/.test(apiKey);
  if (hasNonAscii) {
    throw new Error('API ключ содержит недопустимые символы. Используйте только ASCII символы.');
  }

  try {
    const response = await fetch(GROQ_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: modelName,
        messages: messages,
        temperature: 0.7,
        max_tokens: 2048,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMessage = errorData.error?.message || response.statusText;

      // Если это rate limit error, пробуем подождать и повторить
      if (response.status === 429 && retryCount < 3) {
        // Извлекаем время ожидания из сообщения об ошибке
        const waitTimeMatch = errorMessage.match(/try again in ([\d.]+)s/i);
        const waitTime = waitTimeMatch ? Math.ceil(parseFloat(waitTimeMatch[1]) * 1000) : 20000; // По умолчанию 20 секунд

        console.log(`⏳ Rate limit достигнут. Ожидаем ${(waitTime / 1000).toFixed(1)}с перед повторной попыткой (${retryCount + 1}/3)...`);
        await sleep(waitTime);

        // Рекурсивно вызываем с увеличенным счетчиком попыток
        return callGroqAPI(messages, modelName, retryCount + 1);
      }

      throw new Error(
        `Groq API Error: ${response.status} - ${errorMessage}`
      );
    }

    const data = await response.json();
    return data.choices[0]?.message?.content || '';
  } catch (error: any) {
    // Если это ошибка сети и у нас еще есть попытки
    if (!error.message.includes('Groq API Error') && retryCount < 3) {
      console.log(`⏳ Ошибка сети. Повторная попытка через 5с (${retryCount + 1}/3)...`);
      await sleep(5000);
      return callGroqAPI(messages, modelName, retryCount + 1);
    }
    throw error;
  }
};

// Генерация вопросов с автоматическим выбором модели + RAG оптимизация
export const generateQuestions = async (
  sourceText: string,
  _faqData: any[]
): Promise<GeneratedQuestion[]> => {
  let lastError: any = null;

  // Пробуем разные модели
  for (const modelName of MODEL_NAMES) {
    try {
      console.log(`\n🤖 Trying Groq model: ${modelName}`);

      // ✨ ОПТИМИЗАЦИЯ 1: RAG - используем семантический поиск вместо случайной выборки
      console.log('🔍 Finding similar FAQs using RAG...');
      const relevantFAQs = await findSimilarFAQs(sourceText, 5); // Топ-5 вместо 12 случайных
      const styleAnalysis = analyzeFAQStyle(relevantFAQs);

      // ✨ ОПТИМИЗАЦИЯ 2: Сжимаем чеклист
      console.log('🗜️  Compressing checklist...');
      const compressedChecklist = compressChecklist(sourceText, editorGuidelines);
      const compressedChecklistPrompt = `
Редакторский чек-лист (релевантные секции):
${compressedChecklist}
`;

      const prompt = `
Ты - реальный клиент Kaspi.kz, который впервые узнал о продукте или услуге.

${styleAnalysis}
${compressedChecklistPrompt}

Представь, что ты обычный пользователь, который только что прочитал следующую информацию и хочет разобраться в деталях перед использованием продукта:

ИНФОРМАЦИЯ О ПРОДУКТЕ:
${sourceText}

ТВОЯ ЗАДАЧА:
Подумай о своих сомнениях, опасениях и практических вопросах. Какие вопросы у тебя возникают как у клиента?

ТРЕБОВАНИЯ К ВОПРОСАМ:
1. Соблюдай редакторский чек-лист (см. выше)
2. Вопросы должны быть написаны в том же стиле, тоне и формате, как уже существующие вопросы из примеров выше
3. Думай как реальный пользователь с разными потребностями:
   - Практическое использование: "Как...", "Где...", "Когда..."
   - Условия и ограничения: "Нужна ли...", "Можно ли...", "Доступно ли..."
   - Сомнения и сценарии: "Что будет, если...", "Что делать, когда..."
4. Охватывай все аспекты равномерно: практику, условия, возможные проблемы
5. Вопросы должны помогать клиенту принять решение об использовании продукта
6. Все вопросы должны быть на русском языке
7. Используй формально-вежливый тон

ФОРМАТ ОТВЕТА:
Верни список из 20-30 вопросов, каждый вопрос на новой строке, без нумерации.
`;

      // 📊 Подсчет токенов
      const promptTokens = estimateTokens(prompt);
      console.log(`📊 Prompt size: ${promptTokens} tokens (~${(prompt.length / 1024).toFixed(1)}KB)`);

      console.log('Generating questions with Groq...');
      const text = await callGroqAPI([
        {
          role: 'user',
          content: prompt,
        },
      ], modelName);

      console.log('Groq response received');

      // Парсим вопросы
      const questions = text
        .split('\n')
        .map(q => q.trim())
        .filter(q => q.length > 0 && q.endsWith('?'))
        .map((q, i) => ({
          id: `q-${Date.now()}-${i}`,
          question: q,
          selected: false,
        }));

      if (questions.length === 0) {
        throw new Error('AI не сгенерировал вопросы в правильном формате');
      }

      console.log(`Success with Groq model: ${modelName}`);
      console.log('Generated questions:', questions);
      return questions;
    } catch (error: any) {
      console.error(`Groq model ${modelName} failed:`, error.message);
      lastError = error;
      continue; // Пробуем следующую модель
    }
  }

  // Если ни одна модель не сработала
  console.error('All Groq models failed. Last error:', lastError);
  throw new Error(
    `Не удалось сгенерировать вопросы: ${lastError?.message || 'Попробуйте еще раз'}`
  );
};

// Генерация ответов с автоматическим выбором модели + ПОЛНАЯ ОПТИМИЗАЦИЯ
export const generateAnswers = async (
  questions: string[],
  sourceText: string,
  faqData: any[],
  onProgress?: (current: number, total: number) => void
): Promise<GeneratedFAQ[]> => {
  console.log(`\n🚀 Starting answer generation for ${questions.length} questions...`);

  // ✨ ОПТИМИЗАЦИЯ 1: Проверяем кэш ПЕРЕД любой обработкой
  const cacheKey = getCacheKey(sourceText, questions);
  const cached = getCachedAnswers(cacheKey);

  if (cached) {
    console.log('✅ Using cached answers - 100% token savings!');
    return cached;
  }

  console.log('💾 Cache miss - generating new answers...');

  // 🔄 SMART MODEL ROTATION: Балансировка нагрузки между моделями
  let currentModelIndex = 0;
  const rateLimitedModels = new Set<string>();
  const modelUsageCount = new Map<string, number>();

  // Инициализируем счетчики
  MODEL_NAMES.forEach(model => modelUsageCount.set(model, 0));

  // Функция для выбора следующей доступной модели (round-robin + избегаем rate-limited)
  const getNextAvailableModel = (): string | null => {
    const availableModels = MODEL_NAMES.filter(model => !rateLimitedModels.has(model));

    if (availableModels.length === 0) {
      return null; // Все модели исчерпали лимиты
    }

    // Round-robin по доступным моделям
    const model = availableModels[currentModelIndex % availableModels.length];
    currentModelIndex++;

    return model;
  };

  try {
    // ✨ ОПТИМИЗАЦИЯ 2: RAG - выполняем поиск ОДИН РАЗ для всех вопросов
    const relevantFAQs = await findSimilarFAQs(sourceText, 5);
    const styleAnalysis = analyzeFAQStyle(relevantFAQs);

    // ✨ ОПТИМИЗАЦИЯ 3: Сжимаем чеклист ОДИН РАЗ
    const compressedChecklist = compressChecklist(sourceText, editorGuidelines);
    const compressedChecklistPrompt = `
Редакторский чек-лист (релевантные секции):
${compressedChecklist}
`;

    const results: GeneratedFAQ[] = [];

    // ✨ ОПТИМИЗАЦИЯ 4: Батчинг - генерируем ответы группами по 3-5 вопросов
    const BATCH_SIZE = 3; // Генерируем по 3 вопроса за раз
    const batches: string[][] = [];

    for (let i = 0; i < questions.length; i += BATCH_SIZE) {
      batches.push(questions.slice(i, i + BATCH_SIZE));
    }

    console.log(`\n📦 Разбили на ${batches.length} батчей по ~${BATCH_SIZE} вопросов`);

    // Генерируем ответы для каждого батча
    for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
      const batch = batches[batchIndex];
      console.log(`\n📝 Batch ${batchIndex + 1}/${batches.length}: генерируем ${batch.length} ответов...`);

      const batchPrompt = `
Ты - контент-менеджер Kaspi.kz, который создает качественные ответы для FAQ.

${styleAnalysis}
${compressedChecklistPrompt}

Твоя задача - написать ответы на вопросы клиентов, используя информацию из исходного текста.

ИСХОДНЫЙ ТЕКСТ (источник информации):
${sourceText}

ВОПРОСЫ КЛИЕНТОВ:
${batch.map((q, i) => `${i + 1}. ${q}`).join('\n')}

ТРЕБОВАНИЯ К ОТВЕТАМ:
1. Строго соблюдай редакторский чек-лист (см. выше) - это ключевой документ для качества
2. Ответы должны быть написаны в том же стиле, тоне и формате, как уже существующие ответы из примеров выше
3. Пиши хорошим русским языком:
   - Избегай повторов слов и фраз
   - Используй разнообразную лексику
   - Пиши естественно и понятно
   - Формально-вежливый тон, как в примерах
4. Структура ответа (выбери подходящую):
   - Краткий ответ (2-3 абзаца) для простых вопросов
   - Пошаговая инструкция для процессов
   - Списки для перечислений условий или требований
5. Конкретика и польза:
   - Отвечай точно на вопрос, без лишней воды
   - Используй факты из исходного текста
   - Упоминай приложение Kaspi.kz там, где это уместно
6. Технические требования:
   - Ответы должны быть на русском языке
   - Не используй markdown форматирование (**, ##, и т.д.)
   - Только plain text

ФОРМАТ ОТВЕТА:
Верни ответы в формате JSON массива:
[
  {"question": "вопрос 1", "answer": "ответ 1"},
  {"question": "вопрос 2", "answer": "ответ 2"},
  ...
]

Важно: верни ТОЛЬКО JSON, без дополнительного текста до или после.
`;

      let batchAnswers: GeneratedFAQ[] = [];
      let lastError: any = null;
      let attemptCount = 0;
      const maxAttempts = MODEL_NAMES.length; // Пробуем все доступные модели

      // 🔄 Пробуем модели по очереди (round-robin) пока не получим результат
      while (batchAnswers.length === 0 && attemptCount < maxAttempts) {
        const modelName = getNextAvailableModel();

        if (!modelName) {
          // Все модели исчерпали лимиты
          console.error('   ⚠️  Все модели достигли rate limit. Ждем 30 секунд...');
          await sleep(30000);

          // Сбрасываем rate limit для повторной попытки
          rateLimitedModels.clear();
          currentModelIndex = 0;
          continue;
        }

        try {
          console.log(`   🔄 Trying model [${attemptCount + 1}/${maxAttempts}]: ${modelName}`);
          const answer = await callGroqAPI([
            {
              role: 'user',
              content: batchPrompt,
            },
          ], modelName);

          // Парсим JSON ответ
          const jsonMatch = answer.match(/\[[\s\S]*\]/);
          if (!jsonMatch) {
            throw new Error('AI не вернул корректный JSON формат');
          }

          batchAnswers = JSON.parse(jsonMatch[0]);

          // Увеличиваем счетчик использования модели
          modelUsageCount.set(modelName, (modelUsageCount.get(modelName) || 0) + 1);

          console.log(`   ✅ Batch generated with model: ${modelName} (usage: ${modelUsageCount.get(modelName)})`);
          break;
        } catch (error: any) {
          lastError = error;
          const errorMessage = error?.message || '';
          console.error(`   ❌ Model ${modelName} failed:`, errorMessage);

          // Если модель уперлась в rate limit, помечаем ее
          if (errorMessage.includes('429') || errorMessage.toLowerCase().includes('rate limit')) {
            rateLimitedModels.add(modelName);
            console.log(`   ⚠️  Model ${modelName} hit rate limit, switching to next model...`);
          }
        }

        attemptCount++;
      }

      if (batchAnswers.length === 0) {
        throw new Error(
          `Не удалось сгенерировать ответы для batch ${batchIndex + 1}: ${lastError?.message || 'Попробуйте еще раз'}`
        );
      }

      results.push(...batchAnswers);

      // Обновляем прогресс
      if (onProgress) {
        onProgress(results.length, questions.length);
      }

      console.log(`   ✅ Progress: ${results.length}/${questions.length} ответов готово`);

      // Небольшая задержка между батчами для избежания rate limit
      if (batchIndex < batches.length - 1) {
        console.log(`   ⏳ Пауза 2с перед следующим batch...`);
        await sleep(2000);
      }
    }

    console.log('\n✅ All answers generated successfully');

    // 📊 Статистика использования моделей
    console.log('\n📊 Model usage statistics:');
    modelUsageCount.forEach((count, model) => {
      if (count > 0) {
        const wasRateLimited = rateLimitedModels.has(model) ? ' ⚠️ (hit rate limit)' : '';
        console.log(`   - ${model}: ${count} batches${wasRateLimited}`);
      }
    });

    // ✨ ОПТИМИЗАЦИЯ 5: Сохраняем результаты в кэш
    console.log('💾 Caching results for future use...');
    setCachedAnswers(cacheKey, results);

    return results;
  } catch (error: any) {
    console.error('Error generating answers:', error);
    console.error('Error details:', error.message, error.stack);
    throw new Error(
      `Не удалось сгенерировать ответы: ${error.message || 'Попробуйте еще раз'}`
    );
  }
};
