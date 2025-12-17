import type { GeneratedFAQ } from './groqService';

/**
 * Сервис для кэширования результатов генерации FAQ
 * Использует localStorage для хранения кэша между сессиями
 */

// Интерфейс для кэшированных данных
interface CacheEntry {
  data: GeneratedFAQ[];
  timestamp: number;
  sourceTextHash: string;
  questionsHash: string;
}

// Префикс для ключей кэша
const CACHE_PREFIX = 'faq-cache-';

// Время жизни кэша (24 часа)
const CACHE_MAX_AGE = 24 * 60 * 60 * 1000;

// Максимальное время хранения старых кэшей (7 дней)
const OLD_CACHE_MAX_AGE = 7 * 24 * 60 * 60 * 1000;

/**
 * Создает хэш из строки (простой алгоритм hashCode)
 * Используется для создания компактных ключей кэша
 */
const hashCode = (str: string): string => {
  let hash = 0;

  if (str.length === 0) return hash.toString(36);

  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32-bit integer
  }

  // Конвертируем в base36 для компактности
  return Math.abs(hash).toString(36);
};

/**
 * Создает ключ кэша на основе sourceText и списка вопросов
 */
export const getCacheKey = (sourceText: string, questions: string[]): string => {
  const sourceHash = hashCode(sourceText);
  const questionsHash = hashCode(questions.join('|||'));

  return `${CACHE_PREFIX}${sourceHash}-${questionsHash}`;
};

/**
 * Проверяет и возвращает кэшированные ответы, если они есть и не устарели
 *
 * @param cacheKey - Ключ кэша (получить через getCacheKey)
 * @returns Кэшированные ответы или null если кэш не найден/устарел
 */
export const getCachedAnswers = (cacheKey: string): GeneratedFAQ[] | null => {
  try {
    const cached = localStorage.getItem(cacheKey);

    if (!cached) {
      console.log('💾 Cache miss:', cacheKey);
      return null;
    }

    const entry: CacheEntry = JSON.parse(cached);
    const now = Date.now();
    const age = now - entry.timestamp;

    // Проверяем, не устарел ли кэш
    if (age > CACHE_MAX_AGE) {
      console.log(`💾 Cache expired (age: ${(age / 1000 / 60 / 60).toFixed(1)}h):`, cacheKey);
      localStorage.removeItem(cacheKey);
      return null;
    }

    console.log(`💾 Cache hit (age: ${(age / 1000 / 60).toFixed(1)}m):`, cacheKey);
    console.log(`   Found ${entry.data.length} cached answers`);

    return entry.data;
  } catch (error) {
    console.error('❌ Error reading from cache:', error);
    // Удаляем поврежденный кэш
    try {
      localStorage.removeItem(cacheKey);
    } catch (e) {
      // Игнорируем ошибки удаления
    }
    return null;
  }
};

/**
 * Сохраняет ответы в кэш
 *
 * @param cacheKey - Ключ кэша
 * @param answers - Массив сгенерированных ответов
 */
export const setCachedAnswers = (cacheKey: string, answers: GeneratedFAQ[]): void => {
  try {
    const entry: CacheEntry = {
      data: answers,
      timestamp: Date.now(),
      sourceTextHash: cacheKey.split('-')[1] || '',
      questionsHash: cacheKey.split('-')[2] || '',
    };

    const serialized = JSON.stringify(entry);
    localStorage.setItem(cacheKey, serialized);

    console.log(`💾 Cached ${answers.length} answers (${(serialized.length / 1024).toFixed(1)}KB)`);
  } catch (error: any) {
    console.error('❌ Error writing to cache:', error);

    // Если localStorage переполнен, пытаемся очистить старые кэши
    if (error.name === 'QuotaExceededError' || error.message?.includes('quota')) {
      console.log('🗑️  Storage quota exceeded, clearing old caches...');
      clearOldCaches();

      // Пробуем еще раз после очистки
      try {
        const entry: CacheEntry = {
          data: answers,
          timestamp: Date.now(),
          sourceTextHash: '',
          questionsHash: '',
        };
        localStorage.setItem(cacheKey, JSON.stringify(entry));
        console.log('✅ Cached after cleanup');
      } catch (retryError) {
        console.error('❌ Still failed to cache after cleanup:', retryError);
      }
    }
  }
};

/**
 * Очищает старые кэши (старше 7 дней)
 * Автоматически вызывается при переполнении localStorage
 */
export const clearOldCaches = (): void => {
  const now = Date.now();
  let clearedCount = 0;
  let freedSpace = 0;

  try {
    // Получаем все ключи из localStorage
    const keys = Object.keys(localStorage);

    keys.forEach((key) => {
      // Проверяем только наши FAQ кэши
      if (key.startsWith(CACHE_PREFIX)) {
        try {
          const cached = localStorage.getItem(key);
          if (!cached) return;

          const entry: CacheEntry = JSON.parse(cached);
          const age = now - entry.timestamp;

          // Удаляем кэши старше 7 дней
          if (age > OLD_CACHE_MAX_AGE) {
            freedSpace += cached.length;
            localStorage.removeItem(key);
            clearedCount++;
          }
        } catch (error) {
          // Удаляем поврежденные записи
          try {
            const cached = localStorage.getItem(key);
            if (cached) {
              freedSpace += cached.length;
            }
            localStorage.removeItem(key);
            clearedCount++;
          } catch (e) {
            // Игнорируем ошибки
          }
        }
      }
    });

    if (clearedCount > 0) {
      console.log(`🗑️  Cleared ${clearedCount} old caches (freed ${(freedSpace / 1024).toFixed(1)}KB)`);
    } else {
      console.log('🗑️  No old caches to clear');
    }
  } catch (error) {
    console.error('❌ Error clearing old caches:', error);
  }
};

/**
 * Полностью очищает все FAQ кэши
 * Используйте для отладки или по требованию пользователя
 */
export const clearAllFAQCaches = (): void => {
  let clearedCount = 0;

  try {
    const keys = Object.keys(localStorage);

    keys.forEach((key) => {
      if (key.startsWith(CACHE_PREFIX)) {
        try {
          localStorage.removeItem(key);
          clearedCount++;
        } catch (error) {
          // Игнорируем ошибки
        }
      }
    });

    console.log(`🗑️  Cleared all ${clearedCount} FAQ caches`);
  } catch (error) {
    console.error('❌ Error clearing all caches:', error);
  }
};

/**
 * Получает статистику по кэшу
 */
export const getCacheStats = (): {
  totalCaches: number;
  totalSize: number;
  oldestCache: Date | null;
  newestCache: Date | null;
} => {
  let totalCaches = 0;
  let totalSize = 0;
  let oldestTimestamp = Infinity;
  let newestTimestamp = 0;

  try {
    const keys = Object.keys(localStorage);

    keys.forEach((key) => {
      if (key.startsWith(CACHE_PREFIX)) {
        try {
          const cached = localStorage.getItem(key);
          if (!cached) return;

          totalCaches++;
          totalSize += cached.length;

          const entry: CacheEntry = JSON.parse(cached);
          if (entry.timestamp < oldestTimestamp) {
            oldestTimestamp = entry.timestamp;
          }
          if (entry.timestamp > newestTimestamp) {
            newestTimestamp = entry.timestamp;
          }
        } catch (error) {
          // Игнорируем поврежденные записи
        }
      }
    });

    return {
      totalCaches,
      totalSize,
      oldestCache: oldestTimestamp === Infinity ? null : new Date(oldestTimestamp),
      newestCache: newestTimestamp === 0 ? null : new Date(newestTimestamp),
    };
  } catch (error) {
    console.error('❌ Error getting cache stats:', error);
    return {
      totalCaches: 0,
      totalSize: 0,
      oldestCache: null,
      newestCache: null,
    };
  }
};

/**
 * Проверяет, есть ли кэш для заданных параметров
 */
export const hasCachedAnswers = (sourceText: string, questions: string[]): boolean => {
  const key = getCacheKey(sourceText, questions);
  return getCachedAnswers(key) !== null;
};

/**
 * Предварительно очищает старые кэши при инициализации приложения
 * Вызывайте эту функцию один раз при запуске приложения
 */
export const initCacheService = (): void => {
  console.log('🚀 Initializing cache service...');

  const stats = getCacheStats();
  console.log(`   Total caches: ${stats.totalCaches}`);
  console.log(`   Total size: ${(stats.totalSize / 1024).toFixed(1)}KB`);

  if (stats.oldestCache) {
    const age = Date.now() - stats.oldestCache.getTime();
    const ageDays = (age / 1000 / 60 / 60 / 24).toFixed(1);
    console.log(`   Oldest cache: ${ageDays} days old`);

    // Автоматически очищаем старые кэши при инициализации
    if (age > OLD_CACHE_MAX_AGE) {
      clearOldCaches();
    }
  }

  console.log('✅ Cache service initialized');
};
