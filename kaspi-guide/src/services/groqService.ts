import editorChecklistRaw from '../data/editor-checklist.txt?raw';
import type { FAQItem } from '../types';

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

// Генерация вопросов с автоматическим выбором модели
export const generateQuestions = async (
  sourceText: string,
  faqData: any[]
): Promise<GeneratedQuestion[]> => {
  let lastError: any = null;

  // Пробуем разные модели
  for (const modelName of MODEL_NAMES) {
    try {
      console.log(`Trying Groq model: ${modelName}`);

      const styleAnalysis = analyzeFAQStyle(faqData);

      const prompt = `
Ты - эксперт по созданию FAQ для финансового сервиса Kaspi.kz.

${styleAnalysis}
${editorGuidelinesPrompt}

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

      console.log('Generating questions with Groq...');
      const text = await callGroqAPI([
        {
          role: 'user',
          content: prompt,
        },
      ], modelName);

      console.log('Groq response:', text);

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

// Генерация ответов с автоматическим выбором модели
export const generateAnswers = async (
  questions: string[],
  sourceText: string,
  faqData: any[]
): Promise<GeneratedFAQ[]> => {
  let workingModel: string | null = null;

  // Находим рабочую модель
  for (const modelName of MODEL_NAMES) {
    try {
      console.log(`Testing Groq model: ${modelName}`);
      // Простой тест
      await callGroqAPI([{ role: 'user', content: 'test' }], modelName);
      workingModel = modelName;
      console.log(`Using Groq model: ${modelName} for answers`);
      break;
    } catch (error) {
      continue;
    }
  }

  if (!workingModel) {
    throw new Error('Не удалось найти рабочую модель Groq API');
  }

  try {
    const styleAnalysis = analyzeFAQStyle(faqData);
    const results: GeneratedFAQ[] = [];

    // Генерируем ответы для каждого вопроса
    console.log(`Generating answers for ${questions.length} questions...`);
    for (const question of questions) {
      const prompt = `
Ты - эксперт по созданию FAQ для финансового сервиса Kaspi.kz.

${styleAnalysis}
${editorGuidelinesPrompt}

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
      const answer = await callGroqAPI([
        {
          role: 'user',
          content: prompt,
        },
      ], workingModel);

      results.push({
        question,
        answer: answer.trim(),
      });
    }

    console.log('All answers generated successfully');
    return results;
  } catch (error: any) {
    console.error('Error generating answers:', error);
    console.error('Error details:', error.message, error.stack);
    throw new Error(
      `Не удалось сгенерировать ответы: ${error.message || 'Попробуйте еще раз'}`
    );
  }
};
