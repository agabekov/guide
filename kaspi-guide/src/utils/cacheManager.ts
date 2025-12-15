/**
 * Утилиты для управления кэшем приложения
 * Можно использовать из консоли браузера для отладки
 */

import { clearStyleCache } from '../services/styleAnalysisService';
import { clearEmbeddingsCache } from '../services/ragService';

/**
 * Информация о кэше в localStorage
 */
interface CacheInfo {
  styleAnalysis: {
    exists: boolean;
    version: string | null;
    age: string | null;
    size: string | null;
  };
}

/**
 * Получает информацию о текущем состоянии кэша
 */
export const getCacheInfo = (): CacheInfo => {
  const info: CacheInfo = {
    styleAnalysis: {
      exists: false,
      version: null,
      age: null,
      size: null,
    },
  };

  try {
    const cached = localStorage.getItem('kaspi-guide-style-analysis');
    if (cached) {
      info.styleAnalysis.exists = true;
      info.styleAnalysis.size = `${(cached.length / 1024).toFixed(2)} KB`;

      const data = JSON.parse(cached);
      info.styleAnalysis.version = data.version || 'unknown';

      if (data.timestamp) {
        const age = Date.now() - data.timestamp;
        const hours = Math.floor(age / (1000 * 60 * 60));
        const days = Math.floor(hours / 24);

        if (days > 0) {
          info.styleAnalysis.age = `${days} день${days > 1 ? 'дней' : ''}`;
        } else {
          info.styleAnalysis.age = `${hours} час${hours > 1 ? 'ов' : ''}`;
        }
      }
    }
  } catch (error) {
    console.error('Error reading cache info:', error);
  }

  return info;
};

/**
 * Выводит информацию о кэше в консоль
 */
export const showCacheInfo = (): void => {
  const info = getCacheInfo();

  console.log('📊 Kaspi Guide Cache Status:');
  console.log('─────────────────────────────');

  if (info.styleAnalysis.exists) {
    console.log('✅ Style Analysis Cache:');
    console.log(`   Version: ${info.styleAnalysis.version}`);
    console.log(`   Age: ${info.styleAnalysis.age}`);
    console.log(`   Size: ${info.styleAnalysis.size}`);
  } else {
    console.log('❌ Style Analysis Cache: Not found');
  }

  console.log('─────────────────────────────');
  console.log('💡 Используйте:');
  console.log('   window.kaspiCache.clear() - очистить весь кэш');
  console.log('   window.kaspiCache.info() - показать информацию');
};

/**
 * Очищает весь кэш приложения
 */
export const clearAllCache = (): void => {
  console.log('🗑️  Clearing all caches...');

  // Очищаем кэш стиля (localStorage + память)
  clearStyleCache();

  // Очищаем кэш embeddings (только память)
  clearEmbeddingsCache();

  console.log('✅ All caches cleared');
  console.log('💡 Перезагрузите страницу для применения изменений');
};

/**
 * Глобальный API для управления кэшем из консоли браузера
 */
export const exposeToWindow = (): void => {
  if (typeof window !== 'undefined') {
    (window as any).kaspiCache = {
      info: showCacheInfo,
      clear: clearAllCache,
      get: getCacheInfo,
    };

    console.log('💡 Cache management API доступен через window.kaspiCache');
    console.log('   Используйте: window.kaspiCache.info()');
  }
};
