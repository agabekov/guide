/**
 * Сервис для умного сжатия редакторского чеклиста
 * Вместо отправки всех 223 строк (~8000 токенов), отправляем только релевантные секции (~2000 токенов)
 */

// Интерфейс для секции чеклиста
interface ChecklistSection {
  id: string;
  title: string;
  content: string;
}

// Кэш распарсенных секций
let parsedSectionsCache: Map<string, ChecklistSection> | null = null;

/**
 * Парсит полный чеклист на отдельные секции
 */
export const parseChecklistSections = (fullChecklist: string): Map<string, ChecklistSection> => {
  // Проверяем кэш
  if (parsedSectionsCache) {
    return parsedSectionsCache;
  }

  const sections = new Map<string, ChecklistSection>();
  const lines = fullChecklist.split('\n');

  let currentSection: ChecklistSection | null = null;
  let currentContent: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Проверяем, начинается ли строка с номера секции (например, "1.6. " или "1.10. ")
    const sectionMatch = line.match(/^(\d+\.\d+\.?)\s+(.+)/);

    if (sectionMatch) {
      // Сохраняем предыдущую секцию
      if (currentSection) {
        currentSection.content = currentContent.join('\n');
        sections.set(currentSection.id, currentSection);
      }

      // Начинаем новую секцию
      const sectionId = sectionMatch[1].replace(/\.$/, ''); // Убираем точку в конце если есть
      const sectionTitle = sectionMatch[2].trim();

      currentSection = {
        id: sectionId,
        title: sectionTitle,
        content: '',
      };
      currentContent = [line];
    } else if (currentSection) {
      // Добавляем строку к текущей секции
      currentContent.push(line);
    } else {
      // Строки до первой секции (заголовок чеклиста)
      if (!sections.has('header')) {
        sections.set('header', {
          id: 'header',
          title: 'Заголовок',
          content: line,
        });
      } else {
        const header = sections.get('header')!;
        header.content += '\n' + line;
      }
    }
  }

  // Сохраняем последнюю секцию
  if (currentSection) {
    currentSection.content = currentContent.join('\n');
    sections.set(currentSection.id, currentSection);
  }

  // Кэшируем результат
  parsedSectionsCache = sections;

  console.log(`📋 Parsed ${sections.size} checklist sections`);
  return sections;
};

/**
 * Анализирует sourceText и определяет релевантные секции чеклиста
 */
export const detectRelevantSections = (sourceText: string): string[] => {
  const relevantSections: string[] = [];

  // ВСЕГДА включаем базовые секции (они универсальны)
  relevantSections.push('1.6'); // Единая терминология
  relevantSections.push('1.7'); // Интерфейс

  // Проверяем контент на наличие определенных паттернов

  // 1. Поисковые запросы и SEO
  if (/kaspi|каспи/i.test(sourceText)) {
    relevantSections.push('1.5'); // SEO
  }

  // 2. Шаги и инструкции
  if (
    /шаг|сначала|затем|далее|после этого|следующий шаг|\d+\.|во-первых|во-вторых|порядок действий/i.test(
      sourceText
    )
  ) {
    relevantSections.push('1.9'); // Логическая цепочка
  }

  // 3. Закрытые вопросы (да/нет)
  if (/можно ли|нужна ли|нужен ли|доступно ли|есть ли|могу ли|возможно ли/i.test(sourceText)) {
    relevantSections.push('1.8'); // Закрытый вопрос
  }

  // 4. Обращения и жалобы клиентов
  if (/обращени|жалоб|вопрос|проблем|не работает|ошибк/i.test(sourceText)) {
    relevantSections.push('1.1'); // Обращения
  }

  // 5. Новые продукты или сервисы
  if (/новый|запуск|что такое|как работает/i.test(sourceText)) {
    relevantSections.push('1.4'); // Базовые вопросы
  }

  // 6. Рекомендации и альтернативы
  if (/нельзя|не могу|недоступно|ограничение/i.test(sourceText)) {
    relevantSections.push('1.10'); // Полный ответ с рекомендациями
  }

  // Удаляем дубликаты
  return Array.from(new Set(relevantSections));
};

/**
 * Извлекает выбранные секции из полного чеклиста
 */
export const extractSections = (
  allSections: Map<string, ChecklistSection>,
  neededSectionIds: string[]
): string => {
  const extracted: string[] = [];

  // Добавляем заголовок если есть
  const header = allSections.get('header');
  if (header && header.content.trim()) {
    extracted.push(header.content.trim());
    extracted.push(''); // Пустая строка для разделения
  }

  // Добавляем нужные секции
  for (const sectionId of neededSectionIds) {
    const section = allSections.get(sectionId);
    if (section) {
      extracted.push(section.content.trim());
      extracted.push(''); // Пустая строка между секциями
    } else {
      console.warn(`⚠️  Section ${sectionId} not found in checklist`);
    }
  }

  return extracted.join('\n');
};

/**
 * Основная функция: сжимает чеклист, оставляя только релевантные секции
 *
 * @param sourceText - Исходный текст пользователя
 * @param fullChecklist - Полный текст редакторского чеклиста
 * @returns Сжатый чеклист с только релевантными секциями
 */
export const compressChecklist = (sourceText: string, fullChecklist: string): string => {
  console.log('🗜️  Compressing checklist based on source text...');

  // 1. Парсим чеклист на секции
  const allSections = parseChecklistSections(fullChecklist);

  // 2. Определяем релевантные секции
  const relevantSectionIds = detectRelevantSections(sourceText);
  console.log(`   Detected ${relevantSectionIds.length} relevant sections: ${relevantSectionIds.join(', ')}`);

  // 3. Извлекаем только нужные секции
  const compressed = extractSections(allSections, relevantSectionIds);

  // 4. Подсчет экономии
  const originalLength = fullChecklist.length;
  const compressedLength = compressed.length;
  const savings = ((1 - compressedLength / originalLength) * 100).toFixed(1);

  console.log(`   Original: ${originalLength} chars, Compressed: ${compressedLength} chars`);
  console.log(`   ✅ Saved ${savings}% of checklist size`);

  return compressed;
};

/**
 * Получает сжатый чеклист в формате промпта
 */
export const getCompressedChecklistPrompt = (sourceText: string, fullChecklist: string): string => {
  const compressed = compressChecklist(sourceText, fullChecklist);

  return `
Редакторский чек-лист (релевантные секции):
${compressed}
`;
};

/**
 * Очищает кэш парсинга (для тестирования)
 */
export const clearChecklistCache = (): void => {
  parsedSectionsCache = null;
  console.log('🗑️  Checklist cache cleared');
};

/**
 * Получает список всех доступных секций
 */
export const getAllSectionIds = (fullChecklist: string): string[] => {
  const sections = parseChecklistSections(fullChecklist);
  return Array.from(sections.keys()).filter(id => id !== 'header');
};

/**
 * Получает статистику по чеклисту
 */
export const getChecklistStats = (fullChecklist: string) => {
  const sections = parseChecklistSections(fullChecklist);
  const lines = fullChecklist.split('\n').length;
  const chars = fullChecklist.length;
  const estimatedTokens = Math.ceil(chars / 4); // Примерная оценка для русского

  return {
    totalSections: sections.size - 1, // Минус header
    totalLines: lines,
    totalChars: chars,
    estimatedTokens,
  };
};
