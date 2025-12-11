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

// Вспомогательная функция для вызова Groq API
const callGroqAPI = async (
  messages: Array<{ role: string; content: string }>,
  modelName: string = MODEL_NAMES[0]
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
    throw new Error(
      `Groq API Error: ${response.status} - ${errorData.error?.message || response.statusText}`
    );
  }

  const data = await response.json();
  return data.choices[0]?.message?.content || '';
};

// Генерация вопросов с автоматическим выбором модели + RAG оптимизация
export const generateQuestions = async (
  sourceText: string,
  faqData: any[]
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
Ты - эксперт по созданию FAQ для финансового сервиса Kaspi.kz.

${styleAnalysis}
${compressedChecklistPrompt}

На основе анализа стиля существующих FAQ и редакторского чек-листа, сгенерируй список из 10-15 вопросов, которые пользователи могут задать по следующему тексту:

ИСХОДНЫЙ ТЕКСТ:
${sourceText}

ТРЕБОВАНИЯ:
1. Соблюдай редакторский чек-лист (см. выше)
2. Вопросы должны быть конкретными и практичными
3. Используй стиль существующих вопросов из примеров
4. Вопросы должны начинаться с "Как...", "Что...", "Где...", "Нужна ли..." и т.д.
5. Ориентируйся на реальные потребности пользователей Kaspi.kz
6. Вопросы должны быть на русском языке

ФОРМАТ ОТВЕТА:
Верни только список вопросов, каждый вопрос на новой строке, без нумерации.
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
  faqData: any[]
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

  let lastSuccessfulModel: string | null = null;
  const rateLimitedModels = new Set<string>();

  try {
    // ✨ ОПТИМИЗАЦИЯ 2: RAG - выполняем поиск ОДИН РАЗ для всех вопросов
    console.log('🔍 Finding similar FAQs using RAG (once for all questions)...');
    const relevantFAQs = await findSimilarFAQs(sourceText, 5);
    const styleAnalysis = analyzeFAQStyle(relevantFAQs);

    // ✨ ОПТИМИЗАЦИЯ 3: Сжимаем чеклист ОДИН РАЗ
    console.log('🗜️  Compressing checklist (once for all questions)...');
    const compressedChecklist = compressChecklist(sourceText, editorGuidelines);
    const compressedChecklistPrompt = `
Редакторский чек-лист (релевантные секции):
${compressedChecklist}
`;

    // Подсчет токенов ДО оптимизации (если бы использовали старый метод)
    const oldStyleAnalysis = analyzeFAQStyle(faqData); // 12 случайных FAQ
    const oldPromptExample = `${oldStyleAnalysis}\n${editorGuidelinesPrompt}\n${sourceText}`;
    const tokensBeforePerQuestion = estimateTokens(oldPromptExample);

    // Подсчет токенов ПОСЛЕ оптимизации
    const newPromptBase = `${styleAnalysis}\n${compressedChecklistPrompt}\n${sourceText}`;
    const tokensAfterPerQuestion = estimateTokens(newPromptBase);

    // Логируем статистику
    const totalBefore = tokensBeforePerQuestion * questions.length;
    const totalAfter = tokensAfterPerQuestion * questions.length;
    const stats = createDetailedTokenStats(totalBefore, totalAfter);
    logDetailedTokenStats('Answer Generation', stats);

    const results: GeneratedFAQ[] = [];

    // Генерируем ответы для каждого вопроса
    console.log(`\n📝 Generating answers for ${questions.length} questions...`);
    for (let i = 0; i < questions.length; i++) {
      const question = questions[i];
      console.log(`\n   Question ${i + 1}/${questions.length}: ${question.slice(0, 60)}...`);

      const prompt = `
Ты - эксперт по созданию FAQ для финансового сервиса Kaspi.kz.

${styleAnalysis}
${compressedChecklistPrompt}

На основе анализа стиля существующих FAQ и требований чек-листа, создай краткий и понятный ответ на вопрос.

ИСХОДНЫЙ ТЕКСТ (источник информации):
${sourceText}

ВОПРОС:
${question}

ТРЕБОВАНИЯ К ОТВЕТУ:
1. Соблюдай редакторский чек-лист (см. выше)
2. Ответ должен быть кратким и конкретным (2-5 абзацев)
3. Используй стиль существующих ответов из примеров
4. Структурируй информацию с помощью:
   - Коротких абзацев
   - Списков (где уместно)
   - Пошаговых инструкций (если это инструкция)
5. Используй простой язык, понятный обычному пользователю
6. Упоминай приложение Kaspi.kz там, где это уместно
7. Ответ должен быть на русском языке
8. Не используй markdown форматирование (**, ##, и т.д.)

ФОРМАТ ОТВЕТА:
Верни только текст ответа, без заголовков и дополнительных пояснений.
`;

      console.log(`Generating answer for: ${question}`);
      let answerText: string | null = null;
      let lastError: any = null;

      const modelPriority = lastSuccessfulModel
        ? [lastSuccessfulModel, ...MODEL_NAMES.filter((model) => model !== lastSuccessfulModel)]
        : [...MODEL_NAMES];

      for (const modelName of modelPriority) {
        if (rateLimitedModels.has(modelName)) {
          continue;
        }

        try {
          console.log(`Trying Groq model for answer: ${modelName}`);
          const answer = await callGroqAPI([
            {
              role: 'user',
              content: prompt,
            },
          ], modelName);

          answerText = answer.trim();
          lastSuccessfulModel = modelName;
          console.log(`Answer generated with Groq model: ${modelName}`);
          break;
        } catch (error: any) {
          lastError = error;
          const errorMessage = error?.message || '';
          console.error(`Groq model ${modelName} failed for answer:`, errorMessage);

          // Если модель уперлась в rate limit, пробуем следующие
          if (errorMessage.includes('429') || errorMessage.toLowerCase().includes('rate limit')) {
            rateLimitedModels.add(modelName);
          }
        }
      }

      if (!answerText) {
        throw new Error(
          `Не удалось сгенерировать ответ: ${lastError?.message || 'Попробуйте еще раз'}`
        );
      }

      results.push({
        question,
        answer: answerText,
      });

      console.log(`   ✅ Answer ${i + 1}/${questions.length} generated successfully`);
    }

    console.log('\n✅ All answers generated successfully');

    // ✨ ОПТИМИЗАЦИЯ 4: Сохраняем результаты в кэш
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
