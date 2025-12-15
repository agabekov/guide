import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Импортируем типы и функцию анализа
interface FAQItem {
  id: string;
  question: string;
  answer: string;
  category: string;
  subcategory: string;
  created: string;
  updated: string;
  usefulness: number;
  path: string;
}

interface StyleAnalysis {
  avgQuestionLength: number;
  avgAnswerLength: number;
  percentWithLists: number;
  percentWithSteps: number;
  percentShortAnswers: number;
  commonQuestionStarts: string[];
  commonAnswerStarts: string[];
  keyPhrases: string[];
  examplesByType: {
    short: FAQItem[];
    stepByStep: FAQItem[];
    withLists: FAQItem[];
    detailed: FAQItem[];
  };
}

/**
 * Извлекает ключевые фразы, специфичные для Kaspi FAQ
 */
const extractKeyPhrases = (faqs: FAQItem[]): string[] => {
  const phrases = new Map<string, number>();

  const patterns = [
    /приложени[ие]\s+Kaspi\.kz/gi,
    /сервис[е]?\s+[«"]?([А-Яа-я\s]+)[»"]?/gi,
    /в\s+раздел[е]\s+[«"]?([А-Яа-я\s]+)[»"]?/gi,
    /перейдите\s+в\s+([А-Яа-я\s]+)/gi,
    /нажмите\s+[«"]?([А-Яа-я\s]+)[»"]?/gi,
  ];

  faqs.slice(0, 1000).forEach(faq => {
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

  return Array.from(phrases.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20)
    .map(([phrase]) => phrase);
};

/**
 * Анализирует стиль ВСЕХ FAQ
 */
const analyzeGlobalStyle = (allFAQs: FAQItem[]): StyleAnalysis => {
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

    const hasList = /^[\s]*[-•\d]/.test(answer) || answer.includes('\n-') || answer.includes('\n•');
    if (hasList) {
      withLists++;
      if (withListsExamples.length < 5 && faq.usefulness > 80) {
        withListsExamples.push(faq);
      }
    }

    const hasSteps = /[Шш]аг\s*\d|[Пп]ерейдите|[Нн]ажмите|[Вв]ыберите|[Уу]кажите/.test(answer);
    if (hasSteps) {
      withSteps++;
      if (stepByStepExamples.length < 5 && faq.usefulness > 80) {
        stepByStepExamples.push(faq);
      }
    }

    if (answer.length < 200) {
      shortAnswers++;
      if (shortExamples.length < 5 && faq.usefulness > 80) {
        shortExamples.push(faq);
      }
    }

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
    const match = faq.question.match(/^([А-Яа-яЁё]+\s+[А-Яа-яЁё]+(?:\s+[А-Яа-яЁё]+)?)/);
    if (match) {
      const start = match[1];
      questionStarts.set(start, (questionStarts.get(start) || 0) + 1);
    }
  });

  const commonQuestionStarts = Array.from(questionStarts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([start]) => start);

  // 4. Анализ начал ответов
  const answerStarts = new Map<string, number>();
  allFAQs.forEach(faq => {
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

  // 5. Ключевые фразы
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
 * Главная функция
 */
async function main() {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('  🎨 Генератор предвычисленного Style Analysis');
  console.log('═══════════════════════════════════════════════════════════\n');

  // Читаем FAQ данные
  const faqPath = path.join(__dirname, '../src/data/faq.json');
  const outputPath = path.join(__dirname, '../src/data/style-analysis.json');

  console.log('📖 Reading faq.json...');
  const faqData: FAQItem[] = JSON.parse(fs.readFileSync(faqPath, 'utf-8'));
  console.log(`✅ Loaded ${faqData.length} FAQ items\n`);

  // Анализируем стиль
  const startTime = Date.now();
  const styleAnalysis = analyzeGlobalStyle(faqData);
  const duration = ((Date.now() - startTime) / 1000).toFixed(2);

  // Добавляем метаданные
  const output = {
    version: 'v1.0',
    generatedAt: new Date().toISOString(),
    faqCount: faqData.length,
    analysis: styleAnalysis,
  };

  // Сохраняем результат
  console.log('\n💾 Saving style-analysis.json...');
  fs.writeFileSync(outputPath, JSON.stringify(output, null, 2), 'utf-8');

  const fileSize = (fs.statSync(outputPath).size / 1024).toFixed(2);

  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('  ✅ Generation complete!');
  console.log('═══════════════════════════════════════════════════════════');
  console.log(`📊 Analyzed FAQs: ${faqData.length}`);
  console.log(`⏱️  Duration: ${duration}s`);
  console.log(`📦 File size: ${fileSize} KB`);
  console.log(`📁 Saved to: ${path.basename(outputPath)}\n`);

  console.log('💡 Next steps:');
  console.log('   1. Commit the generated file to git');
  console.log('   2. The file will be bundled with your app');
  console.log('   3. All users get instant style analysis! ⚡\n');
}

// Запуск
main().catch(error => {
  console.error('\n❌ Error:', error.message);
  console.error(error.stack);
  process.exit(1);
});
