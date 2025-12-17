import type { FAQItem } from '../types';
import precomputedStyleData from '../data/style-analysis.json';

/**
 * Результат анализа стиля FAQ
 */
export interface StyleAnalysis {
  // Статистика по длине
  avgQuestionLength: number;
  avgAnswerLength: number;

  // Структурные паттерны
  percentWithLists: number; // % ответов со списками
  percentWithSteps: number; // % с пошаговыми инструкциями
  percentShortAnswers: number; // % кратких ответов (< 200 символов)

  // Часто используемые начала вопросов
  commonQuestionStarts: string[];

  // Часто используемые начала ответов
  commonAnswerStarts: string[];

  // Ключевые фразы и термины
  keyPhrases: string[];

  // Примеры по типам
  examplesByType: {
    short: FAQItem[];      // Краткие ответы
    stepByStep: FAQItem[]; // Пошаговые инструкции
    withLists: FAQItem[];  // Со списками
    detailed: FAQItem[];   // Детальные ответы
  };
}

/**
 * Анализирует стиль ВСЕХ FAQ и создает сжатое представление
 * Эта функция запускается один раз и кэшируется
 */
export const analyzeGlobalStyle = (allFAQs: FAQItem[]): StyleAnalysis => {
  if (!allFAQs || allFAQs.length === 0) {
    throw new Error('No FAQs provided for style analysis');
  }

  console.log(`📊 Analyzing style of ${allFAQs.length} FAQs...`);

  // 1. Статистика по длине
  const questionLengths = allFAQs.map(faq => faq.question.length);
  const answerLengths = allFAQs.map(faq => faq.answer.length);

  const avgQuestionLength = Math.round(
    questionLengths.reduce((sum, len) => sum + len, 0) / questionLengths.length
  );
  const avgAnswerLength = Math.round(
    answerLengths.reduce((sum, len) => sum + len, 0) / answerLengths.length
  );

  // 2. Структурные паттерны
  let withLists = 0;
  let withSteps = 0;
  let shortAnswers = 0;

  const shortExamples: FAQItem[] = [];
  const stepByStepExamples: FAQItem[] = [];
  const withListsExamples: FAQItem[] = [];
  const detailedExamples: FAQItem[] = [];

  allFAQs.forEach(faq => {
    const answer = faq.answer;

    // Проверяем на списки (начинается с "-", "•", цифр)
    const hasList = /^[\s]*[-•\d]/.test(answer) || answer.includes('\n-') || answer.includes('\n•');
    if (hasList) {
      withLists++;
      if (withListsExamples.length < 5 && faq.usefulness > 80) {
        withListsExamples.push(faq);
      }
    }

    // Проверяем на пошаговые инструкции
    const hasSteps = /[Шш]аг\s*\d|[Пп]ерейдите|[Нн]ажмите|[Вв]ыберите|[Уу]кажите/.test(answer);
    if (hasSteps) {
      withSteps++;
      if (stepByStepExamples.length < 5 && faq.usefulness > 80) {
        stepByStepExamples.push(faq);
      }
    }

    // Краткие ответы
    if (answer.length < 200) {
      shortAnswers++;
      if (shortExamples.length < 5 && faq.usefulness > 80) {
        shortExamples.push(faq);
      }
    }

    // Детальные ответы
    if (answer.length > 500 && detailedExamples.length < 5 && faq.usefulness > 85) {
      detailedExamples.push(faq);
    }
  });

  const percentWithLists = Math.round((withLists / allFAQs.length) * 100);
  const percentWithSteps = Math.round((withSteps / allFAQs.length) * 100);
  const percentShortAnswers = Math.round((shortAnswers / allFAQs.length) * 100);

  // 3. Анализ начал вопросов
  const questionStarts = new Map<string, number>();
  allFAQs.forEach(faq => {
    // Берем первые 2-3 слова
    const match = faq.question.match(/^([А-Яа-яЁё]+\s+[А-Яа-яЁё]+(?:\s+[А-Яа-яЁё]+)?)/);
    if (match) {
      const start = match[1];
      questionStarts.set(start, (questionStarts.get(start) || 0) + 1);
    }
  });

  // Топ-10 начал вопросов
  const commonQuestionStarts = Array.from(questionStarts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([start]) => start);

  // 4. Анализ начал ответов
  const answerStarts = new Map<string, number>();
  allFAQs.forEach(faq => {
    // Берем первые 2-3 слова ответа
    const match = faq.answer.match(/^([А-Яа-яЁё]+(?:\s+[А-Яа-яЁё]+){0,2})/);
    if (match) {
      const start = match[1];
      answerStarts.set(start, (answerStarts.get(start) || 0) + 1);
    }
  });

  const commonAnswerStarts = Array.from(answerStarts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([start]) => start);

  // 5. Ключевые фразы (специфичные для Kaspi)
  const keyPhrases = extractKeyPhrases(allFAQs);

  console.log(`✅ Style analysis complete:`);
  console.log(`   Avg question length: ${avgQuestionLength} chars`);
  console.log(`   Avg answer length: ${avgAnswerLength} chars`);
  console.log(`   With lists: ${percentWithLists}%`);
  console.log(`   With steps: ${percentWithSteps}%`);
  console.log(`   Short answers: ${percentShortAnswers}%`);

  return {
    avgQuestionLength,
    avgAnswerLength,
    percentWithLists,
    percentWithSteps,
    percentShortAnswers,
    commonQuestionStarts,
    commonAnswerStarts,
    keyPhrases,
    examplesByType: {
      short: shortExamples,
      stepByStep: stepByStepExamples,
      withLists: withListsExamples,
      detailed: detailedExamples,
    },
  };
};

/**
 * Извлекает ключевые фразы, специфичные для Kaspi FAQ
 */
const extractKeyPhrases = (faqs: FAQItem[]): string[] => {
  const phrases = new Map<string, number>();

  // Паттерны для поиска
  const patterns = [
    /приложени[ие]\s+Kaspi\.kz/gi,
    /сервис[е]?\s+[«"]?([А-Яа-я\s]+)[»"]?/gi,
    /в\s+раздел[е]\s+[«"]?([А-Яа-я\s]+)[»"]?/gi,
    /перейдите\s+в\s+([А-Яа-я\s]+)/gi,
    /нажмите\s+[«"]?([А-Яа-я\s]+)[»"]?/gi,
  ];

  faqs.slice(0, 1000).forEach(faq => { // Анализируем первые 1000 для скорости
    const text = faq.answer;
    patterns.forEach(pattern => {
      const matches = text.matchAll(pattern);
      for (const match of matches) {
        const phrase = match[0].trim();
        if (phrase.length > 10 && phrase.length < 60) {
          phrases.set(phrase, (phrases.get(phrase) || 0) + 1);
        }
      }
    });
  });

  // Топ-20 фраз
  return Array.from(phrases.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20)
    .map(([phrase]) => phrase);
};

/**
 * Создает сжатое текстовое представление стиля для промпта
 */
export const formatStyleGuide = (styleAnalysis: StyleAnalysis): string => {
  return `
АНАЛИЗ СТИЛЯ СУЩЕСТВУЮЩИХ FAQ (на основе ${styleAnalysis.commonQuestionStarts.length > 0 ? '3985' : 'N'} примеров):

1. СТРУКТУРА ОТВЕТОВ:
   - Средняя длина вопроса: ${styleAnalysis.avgQuestionLength} символов
   - Средняя длина ответа: ${styleAnalysis.avgAnswerLength} символов
   - ${styleAnalysis.percentShortAnswers}% ответов краткие (< 200 символов)
   - ${styleAnalysis.percentWithSteps}% содержат пошаговые инструкции
   - ${styleAnalysis.percentWithLists}% используют списки

2. ТИПИЧНЫЕ НАЧАЛА ВОПРОСОВ:
   ${styleAnalysis.commonQuestionStarts.slice(0, 8).map(start => `   • "${start}..."`).join('\n')}

3. ТИПИЧНЫЕ НАЧАЛА ОТВЕТОВ:
   ${styleAnalysis.commonAnswerStarts.slice(0, 8).map(start => `   • "${start}..."`).join('\n')}

4. КЛЮЧЕВЫЕ ФРАЗЫ И ТЕРМИНЫ:
   ${styleAnalysis.keyPhrases.slice(0, 10).map(phrase => `   • ${phrase}`).join('\n')}

5. ПРИМЕРЫ РАЗНЫХ ТИПОВ ОТВЕТОВ:

А) Краткий ответ (${styleAnalysis.examplesByType.short.length > 0 ? styleAnalysis.examplesByType.short[0].answer.length : 'N/A'} символов):
Вопрос: ${styleAnalysis.examplesByType.short[0]?.question || 'N/A'}
Ответ: ${styleAnalysis.examplesByType.short[0]?.answer.slice(0, 300) || 'N/A'}

Б) Пошаговая инструкция:
Вопрос: ${styleAnalysis.examplesByType.stepByStep[0]?.question || 'N/A'}
Ответ: ${styleAnalysis.examplesByType.stepByStep[0]?.answer.slice(0, 400) || 'N/A'}${styleAnalysis.examplesByType.stepByStep[0]?.answer.length > 400 ? '...' : ''}

В) Ответ со списком:
Вопрос: ${styleAnalysis.examplesByType.withLists[0]?.question || 'N/A'}
Ответ: ${styleAnalysis.examplesByType.withLists[0]?.answer.slice(0, 400) || 'N/A'}${styleAnalysis.examplesByType.withLists[0]?.answer.length > 400 ? '...' : ''}
`.trim();
};

/**
 * Версия кэша - увеличивайте при изменении логики анализа или обновлении FAQ базы
 */
const CACHE_VERSION = 'v1.0';
const CACHE_KEY = 'kaspi-guide-style-analysis';

/**
 * Кэш в памяти для быстрого доступа в рамках сессии
 */
let cachedStyleAnalysis: StyleAnalysis | null = null;

/**
 * Сохраняет анализ стиля в localStorage
 */
const saveToLocalStorage = (analysis: StyleAnalysis): void => {
  try {
    const cacheData = {
      version: CACHE_VERSION,
      timestamp: Date.now(),
      analysis: analysis,
    };
    localStorage.setItem(CACHE_KEY, JSON.stringify(cacheData));
    console.log('💾 Style analysis saved to localStorage');
  } catch (error) {
    console.warn('⚠️  Failed to save to localStorage:', error);
    // Не критично, продолжаем работу
  }
};

/**
 * Загружает анализ стиля из localStorage
 */
const loadFromLocalStorage = (): StyleAnalysis | null => {
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (!cached) {
      return null;
    }

    const cacheData = JSON.parse(cached);

    // Проверяем версию кэша
    if (cacheData.version !== CACHE_VERSION) {
      console.log('⚠️  Cache version mismatch, will recreate');
      localStorage.removeItem(CACHE_KEY);
      return null;
    }

    // Проверяем возраст кэша (макс. 7 дней)
    const age = Date.now() - cacheData.timestamp;
    const maxAge = 7 * 24 * 60 * 60 * 1000; // 7 дней
    if (age > maxAge) {
      console.log('⚠️  Cache expired (> 7 days), will recreate');
      localStorage.removeItem(CACHE_KEY);
      return null;
    }

    console.log('💾 Loaded style analysis from localStorage');
    return cacheData.analysis as StyleAnalysis;
  } catch (error) {
    console.warn('⚠️  Failed to load from localStorage:', error);
    return null;
  }
};

/**
 * Получает предвычисленный анализ стиля (мгновенно для всех пользователей!)
 *
 * Анализ выполняется один раз при сборке проекта (npm run build:style)
 * и включается в бандл приложения. Все пользователи получают мгновенную загрузку!
 */
export const getGlobalStyleAnalysis = async (_allFAQs?: FAQItem[]): Promise<StyleAnalysis> => {
  // Кэш в памяти для быстрого доступа в рамках сессии
  if (cachedStyleAnalysis) {
    console.log('✅ Using in-memory cached style analysis');
    return cachedStyleAnalysis;
  }

  // Загружаем предвычисленный анализ из бандла (мгновенно!)
  console.log('⚡ Loading pre-computed style analysis from bundle...');

  const precomputed = precomputedStyleData as any;

  // Проверяем версию
  if (precomputed.version !== CACHE_VERSION) {
    console.warn('⚠️  Precomputed style version mismatch. Please run: npm run build:style');
  }

  cachedStyleAnalysis = precomputed.analysis as StyleAnalysis;
  console.log(`✅ Loaded style analysis (${precomputed.faqCount} FAQs, generated ${new Date(precomputed.generatedAt).toLocaleString()})`);

  return cachedStyleAnalysis;
};

/**
 * Очищает весь кэш (память + localStorage)
 * Используйте при обновлении FAQ базы
 */
export const clearStyleCache = (): void => {
  cachedStyleAnalysis = null;
  try {
    localStorage.removeItem(CACHE_KEY);
    console.log('🗑️  Style analysis cache cleared (memory + localStorage)');
  } catch (error) {
    console.warn('⚠️  Failed to clear localStorage:', error);
  }
};
