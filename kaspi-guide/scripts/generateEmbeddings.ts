import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import OpenAI from 'openai';

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

// Инициализация OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || process.env.VITE_OPENAI_API_KEY,
});

// Путь к файлам
const faqPath = path.join(__dirname, '../src/data/faq.json');
const outputPath = path.join(__dirname, '../src/data/faq-embeddings.json');

// Функция для создания embedding через OpenAI API
async function createEmbedding(text: string): Promise<number[]> {
  try {
    const response = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: text,
      encoding_format: 'float',
    });

    return response.data[0].embedding;
  } catch (error: any) {
    console.error('Error creating embedding:', error.message);
    throw error;
  }
}

// Функция для генерации embeddings с батчингом
async function generateEmbeddingsWithBatching(
  faqs: FAQItem[],
  batchSize: number = 100
): Promise<FAQEmbedding[]> {
  const embeddings: FAQEmbedding[] = [];
  const total = faqs.length;

  console.log(`\n🚀 Начинаем генерацию embeddings для ${total} FAQ...`);
  console.log(`📦 Размер батча: ${batchSize} FAQ\n`);

  for (let i = 0; i < total; i += batchSize) {
    const batch = faqs.slice(i, Math.min(i + batchSize, total));
    const batchNumber = Math.floor(i / batchSize) + 1;
    const totalBatches = Math.ceil(total / batchSize);

    console.log(`\n📊 Обработка батча ${batchNumber}/${totalBatches} (FAQ ${i + 1}-${Math.min(i + batchSize, total)} из ${total})`);

    // Создаем тексты для embedding (вопрос + ответ)
    const textsToEmbed = batch.map(faq => {
      // Комбинируем вопрос и ответ для более полного представления
      const combinedText = `Вопрос: ${faq.question}\nОтвет: ${faq.answer}`;
      // Ограничиваем длину (OpenAI лимит ~8000 токенов)
      return combinedText.slice(0, 8000);
    });

    try {
      // Создаем embeddings для всего батча
      const response = await openai.embeddings.create({
        model: 'text-embedding-3-small',
        input: textsToEmbed,
        encoding_format: 'float',
      });

      // Сохраняем результаты
      batch.forEach((faq, idx) => {
        embeddings.push({
          faq_id: faq.id,
          embedding: response.data[idx].embedding,
          question: faq.question,
          answer: faq.answer.slice(0, 700), // Ограничиваем для экономии места
          category: faq.category,
          usefulness: faq.usefulness,
        });
      });

      console.log(`✅ Батч ${batchNumber} обработан успешно`);
      console.log(`   Прогресс: ${Math.round((embeddings.length / total) * 100)}%`);

      // Добавляем небольшую задержку между батчами для избежания rate limit
      if (i + batchSize < total) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    } catch (error: any) {
      console.error(`❌ Ошибка при обработке батча ${batchNumber}:`, error.message);

      // Если батч слишком большой, пробуем по одному
      if (error.message.includes('rate limit') || error.message.includes('timeout')) {
        console.log('⚠️  Переключаемся на обработку по одному FAQ...');

        for (const faq of batch) {
          try {
            const text = `Вопрос: ${faq.question}\nОтвет: ${faq.answer}`.slice(0, 8000);
            const embedding = await createEmbedding(text);

            embeddings.push({
              faq_id: faq.id,
              embedding: embedding,
              question: faq.question,
              answer: faq.answer.slice(0, 700),
              category: faq.category,
              usefulness: faq.usefulness,
            });

            console.log(`   ✓ ${embeddings.length}/${total}`);

            // Задержка между запросами
            await new Promise(resolve => setTimeout(resolve, 500));
          } catch (individualError: any) {
            console.error(`   ✗ Не удалось обработать FAQ ${faq.id}:`, individualError.message);
          }
        }
      } else {
        throw error;
      }
    }
  }

  return embeddings;
}

// Основная функция
async function main() {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('  🤖 Генератор Embeddings для Kaspi Guide FAQ Database');
  console.log('═══════════════════════════════════════════════════════════\n');

  // Проверяем API ключ
  if (!openai.apiKey) {
    console.error('❌ Ошибка: OpenAI API ключ не найден!');
    console.error('   Добавьте OPENAI_API_KEY или VITE_OPENAI_API_KEY в .env файл\n');
    process.exit(1);
  }

  console.log('✅ OpenAI API ключ найден');

  // Читаем FAQ данные
  console.log('📖 Чтение faq.json...');
  const faqData: FAQItem[] = JSON.parse(fs.readFileSync(faqPath, 'utf-8'));
  console.log(`✅ Загружено ${faqData.length} FAQ записей\n`);

  // Проверяем, есть ли уже embeddings
  if (fs.existsSync(outputPath)) {
    console.log('⚠️  Файл faq-embeddings.json уже существует!');
    const existingData: FAQEmbedding[] = JSON.parse(fs.readFileSync(outputPath, 'utf-8'));
    console.log(`   Найдено ${existingData.length} существующих embeddings`);
    console.log('   Будет создан резервная копия и файл будет перезаписан\n');

    // Создаем backup
    const backupPath = outputPath.replace('.json', `.backup-${Date.now()}.json`);
    fs.copyFileSync(outputPath, backupPath);
    console.log(`💾 Резервная копия сохранена: ${path.basename(backupPath)}\n`);
  }

  // Генерируем embeddings
  const startTime = Date.now();
  const embeddings = await generateEmbeddingsWithBatching(faqData, 100);

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
  console.log(`💰 Примерная стоимость: ~$${(embeddings.length * 0.00002).toFixed(4)}`);
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
}

// Запуск
main().catch(error => {
  console.error('\n❌ Критическая ошибка:', error.message);
  console.error(error.stack);
  process.exit(1);
});
