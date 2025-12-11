import { GoogleGenerativeAI } from '@google/generative-ai';

const API_KEY = 'AIzaSyB6C-23CCxy33Wd3ZsvRsPAWAa2ZAt5DEk';
const genAI = new GoogleGenerativeAI(API_KEY);

// Пробуем v1 и v1beta (хотя для ключа сейчас работают v1 модели 2.x)
const API_VERSIONS = ['v1', 'v1beta'];

// Доступные модели для текущего ключа (список из /v1/models)
const MODEL_NAMES = [
  'gemini-2.5-flash',
  'gemini-2.5-pro',
  'gemini-2.0-flash',
  'gemini-2.0-flash-001',
  'gemini-2.0-flash-lite-001',
  'gemini-2.0-flash-lite',
  'gemini-2.5-flash-lite'
];

const buildModelVariants = (): string[] => {
  const variants = new Set<string>();
  MODEL_NAMES.forEach(name => {
    variants.add(name);
    variants.add(`models/${name}`);
  });
  return Array.from(variants);
};

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
const analyzeFAQStyle = (faqData: any[]): string => {
  if (!faqData || faqData.length === 0) return '';

  // Берем примеры из базы
  const examples = faqData.slice(0, 5).map(faq => ({
    question: faq.question,
    answer: faq.answer
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

// Генерация вопросов с автоматическим выбором модели
export const generateQuestions = async (
  sourceText: string,
  faqData: any[]
): Promise<GeneratedQuestion[]> => {
  let lastError: any = null;

  // Пробуем разные модели и версии API
  for (const apiVersion of API_VERSIONS) {
    for (const modelName of buildModelVariants()) {
      try {
        console.log(`Trying model: ${modelName} (apiVersion=${apiVersion})`);
        const model = genAI.getGenerativeModel({ model: modelName }, { apiVersion });

        const styleAnalysis = analyzeFAQStyle(faqData);

        const prompt = `
Ты - эксперт по созданию FAQ для финансового сервиса Kaspi.kz.

${styleAnalysis}

На основе анализа стиля существующих FAQ, сгенерируй список из 10-15 вопросов, которые пользователи могут задать по следующему тексту:

ИСХОДНЫЙ ТЕКСТ:
${sourceText}

ТРЕБОВАНИЯ:
1. Вопросы должны быть конкретными и практичными
2. Используй стиль существующих вопросов из примеров
3. Вопросы должны начинаться с "Как...", "Что...", "Где...", "Нужна ли..." и т.д.
4. Ориентируйся на реальные потребности пользователей Kaspi.kz
5. Вопросы должны быть на русском языке

ФОРМАТ ОТВЕТА:
Верни только список вопросов, каждый вопрос на новой строке, без нумерации.
`;

        console.log('Generating questions with Gemini...');
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();
        console.log('Gemini response:', text);

        // Парсим вопросы
        const questions = text
          .split('\n')
          .map(q => q.trim())
          .filter(q => q.length > 0 && q.endsWith('?'))
          .map((q, i) => ({
            id: `q-${Date.now()}-${i}`,
            question: q,
            selected: false
          }));

        if (questions.length === 0) {
          throw new Error('AI не сгенерировал вопросы в правильном формате');
        }

        console.log(`Success with model: ${modelName} (apiVersion=${apiVersion})`);
        console.log('Generated questions:', questions);
        return questions;
      } catch (error: any) {
        console.error(`Model ${modelName} (apiVersion=${apiVersion}) failed:`, error.message);
        lastError = error;
        continue; // Пробуем следующую модель/версию
      }
    }
  }

  // Если ни одна модель не сработала
  console.error('All models failed. Last error:', lastError);
  throw new Error(`Не удалось сгенерировать вопросы: ${lastError?.message || 'Попробуйте еще раз'}`);
};

// Генерация ответов с автоматическим выбором модели
export const generateAnswers = async (
  questions: string[],
  sourceText: string,
  faqData: any[]
): Promise<GeneratedFAQ[]> => {
  let workingModel: any = null;

  // Находим рабочую связку модель + версия API
  for (const apiVersion of API_VERSIONS) {
    for (const modelName of buildModelVariants()) {
      try {
        console.log(`Testing model: ${modelName} (apiVersion=${apiVersion})`);
        const model = genAI.getGenerativeModel({ model: modelName }, { apiVersion });
        // Простой тест
        await model.generateContent('test');
        workingModel = { model, apiVersion, modelName };
        console.log(`Using model: ${modelName} (apiVersion=${apiVersion}) for answers`);
        break;
      } catch (error) {
        continue;
      }
    }
    if (workingModel) break;
  }

  if (!workingModel) {
    throw new Error('Не удалось найти рабочую модель API');
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

На основе анализа стиля существующих FAQ, создай краткий и понятный ответ на вопрос.

ИСХОДНЫЙ ТЕКСТ (источник информации):
${sourceText}

ВОПРОС:
${question}

ТРЕБОВАНИЯ К ОТВЕТУ:
1. Ответ должен быть кратким и конкретным (2-5 абзацев)
2. Используй стиль существующих ответов из примеров
3. Структурируй информацию с помощью:
   - Коротких абзацев
   - Списков (где уместно)
   - Пошаговых инструкций (если это инструкция)
4. Используй простой язык, понятный обычному пользователю
5. Упоминай приложение Kaspi.kz там, где это уместно
6. Ответ должен быть на русском языке
7. Не используй markdown форматирование (**, ##, и т.д.)

ФОРМАТ ОТВЕТА:
Верни только текст ответа, без заголовков и дополнительных пояснений.
`;

      console.log(`Generating answer for: ${question}`);
      const result = await workingModel.model.generateContent(prompt);
      const response = await result.response;
      const answer = response.text().trim();

      results.push({
        question,
        answer
      });
    }

    console.log('All answers generated successfully');
    return results;
  } catch (error: any) {
    console.error('Error generating answers:', error);
    console.error('Error details:', error.message, error.stack);
    throw new Error(`Не удалось сгенерировать ответы: ${error.message || 'Попробуйте еще раз'}`);
  }
};
