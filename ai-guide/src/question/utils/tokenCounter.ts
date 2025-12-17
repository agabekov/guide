/**
 * Утилита для оценки количества токенов в тексте
 * Для русского языка используем приблизительную оценку: 1 токен ≈ 4 символа
 */

/**
 * Оценивает количество токенов в тексте
 * Для русского языка: ~4 символа = 1 токен
 * Для английского: ~4 символа = 1 токен
 *
 * @param text - Текст для подсчета
 * @returns Примерное количество токенов
 */
export const estimateTokens = (text: string): number => {
  if (!text || text.length === 0) return 0;

  // Для русского языка токены тяжелее (1 токен ≈ 3-4 символа)
  // Для английского: 1 токен ≈ 4 символа
  // Берем средний коэффициент 4
  return Math.ceil(text.length / 4);
};

/**
 * Подсчитывает токены для массива текстов
 */
export const estimateTokensForArray = (texts: string[]): number => {
  return texts.reduce((total, text) => total + estimateTokens(text), 0);
};

/**
 * Форматирует количество токенов для отображения
 */
export const formatTokenCount = (tokens: number): string => {
  if (tokens >= 1000000) {
    return `${(tokens / 1000000).toFixed(2)}M`;
  } else if (tokens >= 1000) {
    return `${(tokens / 1000).toFixed(1)}K`;
  }
  return tokens.toString();
};

/**
 * Вычисляет процент экономии токенов
 */
export const calculateSavings = (before: number, after: number): string => {
  if (before === 0) return '0%';

  const savings = ((before - after) / before) * 100;
  return `${savings.toFixed(1)}%`;
};

/**
 * Интерфейс для статистики токенов
 */
export interface TokenStats {
  before: number;
  after: number;
  saved: number;
  savingsPercent: string;
  formattedBefore: string;
  formattedAfter: string;
  formattedSaved: string;
}

/**
 * Создает полную статистику по использованию токенов
 */
export const createTokenStats = (before: number, after: number): TokenStats => {
  const saved = before - after;
  const savingsPercent = calculateSavings(before, after);

  return {
    before,
    after,
    saved,
    savingsPercent,
    formattedBefore: formatTokenCount(before),
    formattedAfter: formatTokenCount(after),
    formattedSaved: formatTokenCount(saved),
  };
};

/**
 * Логирует статистику токенов в консоль
 */
export const logTokenStats = (label: string, stats: TokenStats): void => {
  console.log(`\n📊 ${label} - Token Statistics:`);
  console.log(`   Before optimization: ${stats.formattedBefore} tokens`);
  console.log(`   After optimization:  ${stats.formattedAfter} tokens`);
  console.log(`   Saved:               ${stats.formattedSaved} tokens (${stats.savingsPercent})`);
};

/**
 * Оценивает стоимость API вызова на основе токенов
 * Groq pricing (приблизительно): ~$0.27 per 1M input tokens
 */
export const estimateCost = (tokens: number, pricePerMillion: number = 0.27): number => {
  return (tokens / 1_000_000) * pricePerMillion;
};

/**
 * Форматирует стоимость для отображения
 */
export const formatCost = (cost: number): string => {
  if (cost < 0.001) {
    return `<$0.001`;
  } else if (cost < 1) {
    return `$${cost.toFixed(3)}`;
  }
  return `$${cost.toFixed(2)}`;
};

/**
 * Создает детальную статистику с учетом стоимости
 */
export interface DetailedTokenStats extends TokenStats {
  costBefore: string;
  costAfter: string;
  costSaved: string;
}

export const createDetailedTokenStats = (
  before: number,
  after: number,
  pricePerMillion: number = 0.27
): DetailedTokenStats => {
  const baseStats = createTokenStats(before, after);
  const costBefore = estimateCost(before, pricePerMillion);
  const costAfter = estimateCost(after, pricePerMillion);
  const costSaved = costBefore - costAfter;

  return {
    ...baseStats,
    costBefore: formatCost(costBefore),
    costAfter: formatCost(costAfter),
    costSaved: formatCost(costSaved),
  };
};

/**
 * Логирует детальную статистику с стоимостью
 */
export const logDetailedTokenStats = (label: string, stats: DetailedTokenStats): void => {
  console.log(`\n💰 ${label} - Detailed Token & Cost Statistics:`);
  console.log(`   Before: ${stats.formattedBefore} tokens (${stats.costBefore})`);
  console.log(`   After:  ${stats.formattedAfter} tokens (${stats.costAfter})`);
  console.log(`   Saved:  ${stats.formattedSaved} tokens (${stats.costSaved}) - ${stats.savingsPercent} reduction`);
};
