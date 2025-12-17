import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import type { FAQItem, Service } from '../src/types';

// Путь к корневой директории с MD файлами
const CONTENT_ROOT = path.join(process.cwd(), '..');

// Директории которые нужно исключить
const EXCLUDED_DIRS = [
  'node_modules',
  '.git',
  'kaspi-guide',
  '.claude',
];

// Функция для создания slug из строки
function createSlug(text: string): string {
  return text
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^\w\-]+/g, '')
    .replace(/\-\-+/g, '-')
    .replace(/^-+/, '')
    .replace(/-+$/, '');
}

// Функция для генерации уникального ID
function generateId(filePath: string): string {
  return Buffer.from(filePath).toString('base64').slice(0, 16);
}

// Функция для парсинга MD файла
function parseMDFile(filePath: string, category: string, subcategory: string): FAQItem | null {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');

    // Извлечь заголовок (вопрос)
    const questionLine = lines.find(line => line.startsWith('# '));
    if (!questionLine) return null;
    const question = questionLine.replace('# ', '').trim();

    // Извлечь метаданные
    const createdMatch = content.match(/Дата создания:\s*(.+)/);
    const updatedMatch = content.match(/Дата обновления:\s*(.+)/);
    const usefulnessMatch = content.match(/Полезность:\s*(\d+)%/);

    const created = createdMatch ? createdMatch[1].trim() : '';
    const updated = updatedMatch ? updatedMatch[1].trim() : '';
    const usefulness = usefulnessMatch ? parseInt(usefulnessMatch[1]) : 0;

    // Извлечь ответ (после ## Ответ)
    const answerStartIndex = lines.findIndex(l => l.trim().startsWith('## Ответ'));
    const answer = answerStartIndex >= 0
      ? lines.slice(answerStartIndex + 2).join('\n').trim()
      : '';

    return {
      id: generateId(filePath),
      question,
      answer,
      category,
      subcategory,
      created,
      updated,
      usefulness,
      path: filePath,
    };
  } catch (error) {
    console.error(`Error parsing ${filePath}:`, error);
    return null;
  }
}

// Рекурсивная функция для чтения всех MD файлов
function readMDFiles(dir: string, currentCategory: string = '', currentSubcategory: string = ''): FAQItem[] {
  const faqs: FAQItem[] = [];

  try {
    const files = fs.readdirSync(dir);

    for (const file of files) {
      const fullPath = path.join(dir, file);
      const stat = fs.statSync(fullPath);

      // Пропустить исключенные директории
      if (stat.isDirectory() && EXCLUDED_DIRS.includes(file)) {
        continue;
      }

      if (stat.isDirectory()) {
        // Определить категорию и подкатегорию
        const parentDir = path.basename(path.dirname(fullPath));
        const isTopLevel = path.dirname(fullPath) === CONTENT_ROOT;

        const category = isTopLevel ? file : currentCategory || parentDir;
        const subcategory = isTopLevel ? '' : file;

        // Рекурсивно обработать поддиректорию
        const subFaqs = readMDFiles(fullPath, category, subcategory);
        faqs.push(...subFaqs);
      } else if (file.endsWith('.md')) {
        const faq = parseMDFile(fullPath, currentCategory, currentSubcategory);
        if (faq) {
          faqs.push(faq);
        }
      }
    }
  } catch (error) {
    console.error(`Error reading directory ${dir}:`, error);
  }

  return faqs;
}

// Функция для группировки FAQ по категориям
function groupByCategory(faqs: FAQItem[]): Service[] {
  const categoryMap = new Map<string, FAQItem[]>();

  // Группировать по категориям
  for (const faq of faqs) {
    if (!faq.category) continue;

    if (!categoryMap.has(faq.category)) {
      categoryMap.set(faq.category, []);
    }
    categoryMap.get(faq.category)!.push(faq);
  }

  // Создать объекты Service
  const services: Service[] = [];

  for (const [categoryName, categoryFaqs] of categoryMap) {
    // Получить уникальные подкатегории
    const subcategories = Array.from(
      new Set(categoryFaqs.map(faq => faq.subcategory).filter(Boolean))
    );

    services.push({
      id: generateId(categoryName),
      name: categoryName,
      slug: createSlug(categoryName),
      description: '', // Будет заполнено на фронтенде из SERVICE_DESCRIPTIONS
      icon: '', // Будет заполнено на фронтенде из SERVICE_ICONS
      subcategories,
      faqCount: categoryFaqs.length,
      faqs: categoryFaqs,
    });
  }

  return services.sort((a, b) => b.faqCount - a.faqCount);
}

// Главная функция
async function buildData() {
  console.log('🔍 Scanning for MD files...');

  // Прочитать все FAQ
  const allFaqs = readMDFiles(CONTENT_ROOT);
  console.log(`✅ Found ${allFaqs.length} FAQ items`);

  // Группировать по категориям
  const services = groupByCategory(allFaqs);
  console.log(`✅ Created ${services.length} service categories`);

  // Создать директорию для данных
  const dataDir = path.join(process.cwd(), 'src', 'data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  // Записать все FAQ в один файл
  fs.writeFileSync(
    path.join(dataDir, 'faq.json'),
    JSON.stringify(allFaqs, null, 2),
    'utf-8'
  );
  console.log('✅ Saved faq.json');

  // Записать services
  fs.writeFileSync(
    path.join(dataDir, 'services.json'),
    JSON.stringify(services, null, 2),
    'utf-8'
  );
  console.log('✅ Saved services.json');

  // Статистика
  const stats = {
    totalServices: services.length,
    totalFAQs: allFaqs.length,
    averageUsefulness: Math.round(
      allFaqs.reduce((sum, faq) => sum + faq.usefulness, 0) / allFaqs.length
    ),
    totalCategories: services.length,
  };

  fs.writeFileSync(
    path.join(dataDir, 'stats.json'),
    JSON.stringify(stats, null, 2),
    'utf-8'
  );
  console.log('✅ Saved stats.json');

  console.log('\n📊 Statistics:');
  console.log(`   Total Services: ${stats.totalServices}`);
  console.log(`   Total FAQs: ${stats.totalFAQs}`);
  console.log(`   Average Usefulness: ${stats.averageUsefulness}%`);
  console.log('\n✨ Data build complete!');
}

// Запустить
buildData().catch(console.error);
