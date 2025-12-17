import editorChecklistRaw from '../data/editor-checklist.txt?raw';
import type { FAQItem } from '../../question/types';
import { findSimilarFAQs } from '../../question/services/ragService';
import { compressChecklist } from '../../question/services/checklistCompressor';
import { getCacheKey, getCachedAnswers, setCachedAnswers } from '../../question/services/cacheService';
import { getGlobalStyleAnalysis, formatStyleGuide } from '../../question/services/styleAnalysisService';
import allFAQsData from '../../question/data/faq.json';

const groqApiKey = import.meta.env.VITE_GROQ_API_KEY;
const openrouterApiKey = import.meta.env.VITE_OPENROUTER_API_KEY;

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';

// Конфигурация моделей с указанием провайдера
interface ModelConfig {
  name: string;
  provider: 'groq' | 'openrouter';
  displayName: string;
}

const MODEL_CONFIGS: ModelConfig[] = [
  // Groq модели (быстрые и бесплатные)
  { name: 'llama-3.3-70b-versatile', provider: 'groq', displayName: 'LLaMA 3.3 70B' },
  { name: 'meta-llama/llama-4-scout-17b-16e-instruct', provider: 'groq', displayName: 'LLaMA 4 Scout' },
  { name: 'meta-llama/llama-4-maverick-17b-128e-instruct', provider: 'groq', displayName: 'LLaMA 4 Maverick' },
  { name: 'llama-3.1-8b-instant', provider: 'groq', displayName: 'LLaMA 3.1 8B' },
  { name: 'moonshotai/kimi-k2-instruct', provider: 'groq', displayName: 'Kimi K2' },

  // OpenRouter модели (fallback, если есть ключ)
  { name: 'meta-llama/llama-3.3-70b-instruct', provider: 'openrouter', displayName: 'LLaMA 3.3 70B (OR)' },
  { name: 'google/gemini-2.0-flash-exp:free', provider: 'openrouter', displayName: 'Gemini 2.0 Flash' },
  { name: 'mistralai/mistral-7b-instruct:free', provider: 'openrouter', displayName: 'Mistral 7B' },
];

const editorGuidelines = editorChecklistRaw
  .split('\n')
  .map((line) => line.trim())
  .filter((line) => line.length > 0)
  .join('\n');

export interface GeneratedQuestion {
  id: string;
  question: string;
  selected: boolean;
}

export interface GeneratedFAQ {
  question: string;
  answer: string;
}

// Оптимизированное представление FAQ примеров для экономии токенов
const trimText = (text: string, maxLength: number): string => {
  const normalized = (text || '').replace(/\s+/g, ' ').trim();
  if (normalized.length <= maxLength) return normalized;
  return `${normalized.slice(0, maxLength)}...`;
};

/**
 * Форматирует RAG примеры в сжатом виде для промпта
 * Использует адаптивное сжатие в зависимости от количества примеров
 */
const formatRAGExamples = (ragFAQs: FAQItem[]): string => {
  if (!ragFAQs || ragFAQs.length === 0) return '';

  // Чем больше примеров, тем короче каждый
  const maxAnswerLength = Math.max(400, Math.floor(4000 / ragFAQs.length));

  const examples = ragFAQs.map((faq, i) => `
${i + 1}. Вопрос: ${trimText(faq.question, 150)}
   Ответ: ${trimText(faq.answer, maxAnswerLength)}
   Категория: ${faq.category}`).join('\n');

  return `
РЕЛЕВАНТНЫЕ ПРИМЕРЫ ИЗ БАЗЫ (семантически похожие на ваш текст):
${examples}
`;
};

// Утилита для задержки
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Получить доступные модели (фильтруем по наличию API ключей)
const getAvailableModels = (): ModelConfig[] => {
  return MODEL_CONFIGS.filter(config => {
    if (config.provider === 'groq') {
      return groqApiKey && groqApiKey.trim() !== '';
    } else if (config.provider === 'openrouter') {
      return openrouterApiKey && openrouterApiKey.trim() !== '';
    }
    return false;
  });
};

// Вспомогательная функция для вызова API (универсальная для Groq и OpenRouter)
const callAPI = async (
  messages: Array<{ role: string; content: string }>,
  modelConfig: ModelConfig
): Promise<string> => {
  const { name: modelName, provider } = modelConfig;

  // Определяем URL и API ключ в зависимости от провайдера
  const apiUrl = provider === 'groq' ? GROQ_API_URL : OPENROUTER_API_URL;
  const apiKey = provider === 'groq' ? groqApiKey : openrouterApiKey;

  if (!apiKey) {
    throw new Error(`Не настроен ключ для ${provider}. Добавьте API ключ в .env файл.`);
  }

  // Validate API key format
  if (typeof apiKey !== 'string' || apiKey.trim() === '') {
    throw new Error(`API ключ для ${provider} не настроен правильно.`);
  }

  const headers: Record<string, string> = {
    'Authorization': `Bearer ${apiKey}`,
    'Content-Type': 'application/json',
  };

  // OpenRouter требует дополнительные заголовки
  if (provider === 'openrouter') {
    headers['HTTP-Referer'] = 'https://kaspi-guide.com'; // Ваш сайт
    headers['X-Title'] = 'Kaspi Guide Generator';
  }

  const response = await fetch(apiUrl, {
    method: 'POST',
    headers,
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

    // Пробрасываем ошибку наверх - там будет обработка переключения моделей
    throw new Error(
      `${provider} API Error: ${response.status} - ${errorMessage}`
    );
  }

  const data = await response.json();
  return data.choices[0]?.message?.content || '';
};

// Генерация вопросов с автоматическим выбором модели + ПРОДВИНУТАЯ RAG оптимизация
export const generateQuestions = async (
  sourceText: string,
  _faqData: any[]
): Promise<GeneratedQuestion[]> => {
  let lastError: any = null;

  const availableModels = getAvailableModels();

  if (availableModels.length === 0) {
    throw new Error('Не настроен ни один API ключ. Добавьте VITE_GROQ_API_KEY или VITE_OPENROUTER_API_KEY в .env файл.');
  }

  // Пробуем разные модели
  for (const modelConfig of availableModels) {
    try {
      // ✨ НОВАЯ СИСТЕМА: Двухуровневый RAG

      // 1. Глобальный анализ стиля (анализ ВСЕХ 3985 FAQ) - кэшируется!
      const allFAQs = allFAQsData as FAQItem[];
      const globalStyle = await getGlobalStyleAnalysis(allFAQs);
      const styleGuide = formatStyleGuide(globalStyle);

      // 2. RAG - семантический поиск релевантных примеров (увеличено с 5 до 15)
      const relevantFAQs = await findSimilarFAQs(sourceText, 15);
      const ragExamples = formatRAGExamples(relevantFAQs);

      // 3. Сжатие чеклиста
      const compressedChecklist = compressChecklist(sourceText, editorGuidelines);
      const compressedChecklistPrompt = `
Редакторский чек-лист (релевантные секции):
${compressedChecklist}
`;

      const prompt = `
Ты - реальный клиент Kaspi.kz, который впервые узнал о продукте или услуге.

${styleGuide}

${ragExamples}

${compressedChecklistPrompt}

Представь, что ты обычный пользователь, который только что прочитал следующую информацию и хочет разобраться в деталях перед использованием продукта:

ИНФОРМАЦИЯ О ПРОДУКТЕ:
${sourceText}

ТВОЯ ЗАДАЧА:
Подумай о своих сомнениях, опасениях и практических вопросах. Какие вопросы у тебя возникают как у клиента?

ТРЕБОВАНИЯ К ВОПРОСАМ:
1. Строго соблюдай редакторский чек-лист (см. выше)
2. Вопросы должны быть написаны ТОЧНО в том же стиле, что показан в анализе выше:
   - Используй типичные начала вопросов из анализа
   - Соблюдай среднюю длину вопроса (${globalStyle.avgQuestionLength} символов)
   - Следуй структурным паттернам из примеров
3. Думай как реальный пользователь с разными потребностями:
   - Практическое использование: "Как...", "Где...", "Когда..."
   - Условия и ограничения: "Нужна ли...", "Можно ли...", "Доступно ли..."
   - Сомнения и сценарии: "Что будет, если...", "Что делать, когда..."
4. Охватывай все аспекты равномерно: практику, условия, возможные проблемы
5. Вопросы должны помогать клиенту принять решение об использовании продукта
6. Все вопросы должны быть на русском языке
7. Используй формально-вежливый тон как в примерах

ФОРМАТ ОТВЕТА:
Верни список из 20-30 вопросов, каждый вопрос на новой строке, без нумерации.
`;

      const text = await callAPI([
        {
          role: 'user',
          content: prompt,
        },
      ], modelConfig);

      // Парсим вопросы
      const questions = text
        .split('\n')
        .map((q: string) => q.trim())
        .filter((q: string) => q.length > 0 && q.endsWith('?'))
        .map((q: string, i: number) => ({
          id: `q-${Date.now()}-${i}`,
          question: q,
          selected: false,
        }));

      if (questions.length === 0) {
        throw new Error('AI не сгенерировал вопросы в правильном формате');
      }

      return questions;
    } catch (error: any) {
      lastError = error;
      continue; // Пробуем следующую модель
    }
  }

  // Если ни одна модель не сработала
  throw new Error(
    `Не удалось сгенерировать вопросы: ${lastError?.message || 'Попробуйте еще раз'}`
  );
};

// Генерация ответов с автоматическим выбором модели + ПОЛНАЯ ОПТИМИЗАЦИЯ
export const generateAnswers = async (
  questions: string[],
  sourceText: string,
  _faqData: any[],
  onProgress?: (current: number, total: number) => void
): Promise<GeneratedFAQ[]> => {
  // ✨ ОПТИМИЗАЦИЯ 1: Проверяем кэш ПЕРЕД любой обработкой
  const cacheKey = getCacheKey(sourceText, questions);
  const cached = getCachedAnswers(cacheKey);

  if (cached) {
    return cached;
  }

  const allModels = getAvailableModels();

  if (allModels.length === 0) {
    throw new Error('Не настроен ни один API ключ. Добавьте VITE_GROQ_API_KEY или VITE_OPENROUTER_API_KEY в .env файл.');
  }

  // 🔄 SMART MODEL ROTATION: Балансировка нагрузки между моделями
  let currentModelIndex = 0;
  const rateLimitedModels = new Set<string>();
  const modelUsageCount = new Map<string, number>();

  // Инициализируем счетчики
  allModels.forEach(model => modelUsageCount.set(model.name, 0));

  // Функция для выбора следующей доступной модели (round-robin + избегаем rate-limited)
  const getNextAvailableModel = (): ModelConfig | null => {
    const availableModels = allModels.filter(model => !rateLimitedModels.has(model.name));

    if (availableModels.length === 0) {
      return null; // Все модели исчерпали лимиты
    }

    // Round-robin по доступным моделям
    const model = availableModels[currentModelIndex % availableModels.length];
    currentModelIndex++;

    return model;
  };

  try {
    // ✨ НОВАЯ СИСТЕМА: Двухуровневый RAG

    // 1. Глобальный анализ стиля (анализ ВСЕХ 3985 FAQ) - кэшируется!
    const allFAQs = allFAQsData as FAQItem[];
    const globalStyle = await getGlobalStyleAnalysis(allFAQs);
    const styleGuide = formatStyleGuide(globalStyle);

    // 2. RAG - выполняем поиск ОДИН РАЗ для всех вопросов (увеличено с 5 до 15)
    const relevantFAQs = await findSimilarFAQs(sourceText, 15);
    const ragExamples = formatRAGExamples(relevantFAQs);

    // 3. Сжимаем чеклист ОДИН РАЗ
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

    // Генерируем ответы для каждого батча
    for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
      const batch = batches[batchIndex];

      const batchPrompt = `
Ты - контент-менеджер Kaspi.kz, который создает качественные ответы для FAQ.

${styleGuide}

${ragExamples}

${compressedChecklistPrompt}

Твоя задача - написать ответы на вопросы клиентов, используя информацию из исходного текста.

ИСХОДНЫЙ ТЕКСТ (источник информации):
${sourceText}

ВОПРОСЫ КЛИЕНТОВ:
${batch.map((q, i) => `${i + 1}. ${q}`).join('\n')}

ТРЕБОВАНИЯ К ОТВЕТАМ:
1. Строго соблюдай редакторский чек-лист (см. выше) - это ключевой документ для качества
2. Ответы должны быть написаны ТОЧНО в том же стиле, что показан в анализе выше:
   - Используй типичные начала ответов из анализа
   - Соблюдай среднюю длину ответа (${globalStyle.avgAnswerLength} символов)
   - Используй списки в ${globalStyle.percentWithLists}% случаев, как в существующих ответах
   - Используй пошаговые инструкции в ${globalStyle.percentWithSteps}% случаев
   - Следуй ключевым фразам и терминам из анализа
3. Пиши хорошим русским языком:
   - Избегай повторов слов и фраз
   - Используй разнообразную лексику
   - Пиши естественно и понятно
   - Формально-вежливый тон, как в примерах
4. Структура ответа (выбери подходящую по типу вопроса):
   - Краткий ответ (< 200 символов) для простых вопросов
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
      const maxAttempts = allModels.length; // Пробуем все доступные модели

      // 🔄 Пробуем модели по очереди (round-robin) пока не получим результат
      while (batchAnswers.length === 0 && attemptCount < maxAttempts) {
        const modelConfig = getNextAvailableModel();

        if (!modelConfig) {
          // Все модели исчерпали лимиты - ждем и сбрасываем
          await sleep(30000);

          // Сбрасываем rate limit для повторной попытки
          rateLimitedModels.clear();
          currentModelIndex = 0;
          continue;
        }

        try {
          const answer = await callAPI([
            {
              role: 'user',
              content: batchPrompt,
            },
          ], modelConfig);

          // Парсим JSON ответ
          const jsonMatch = answer.match(/\[[\s\S]*\]/);
          if (!jsonMatch) {
            throw new Error('AI не вернул корректный JSON формат');
          }

          batchAnswers = JSON.parse(jsonMatch[0]);

          // Увеличиваем счетчик использования модели
          modelUsageCount.set(modelConfig.name, (modelUsageCount.get(modelConfig.name) || 0) + 1);

          break;
        } catch (error: any) {
          lastError = error;
          const errorMessage = error?.message || '';

          // Если модель уперлась в rate limit, помечаем ее
          if (errorMessage.includes('429') || errorMessage.toLowerCase().includes('rate limit')) {
            rateLimitedModels.add(modelConfig.name);
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

      // Небольшая задержка между батчами для избежания rate limit
      if (batchIndex < batches.length - 1) {
        await sleep(2000);
      }
    }

    // ✨ ОПТИМИЗАЦИЯ 5: Сохраняем результаты в кэш
    setCachedAnswers(cacheKey, results);

    return results;
  } catch (error: any) {
    throw new Error(
      `Не удалось сгенерировать ответы: ${error.message || 'Попробуйте еще раз'}`
    );
  }
};
