/**
 * API Key Storage Utility
 * Manages API keys using localStorage
 */

export type Provider = 'groq' | 'openrouter';

/**
 * Get API key for a specific provider from localStorage
 */
export const getApiKey = (provider: Provider): string => {
  return localStorage.getItem(`${provider}_api_key`) || '';
};

/**
 * Set API key for a specific provider in localStorage
 */
export const setApiKey = (provider: Provider, key: string): void => {
  localStorage.setItem(`${provider}_api_key`, key);
};

/**
 * Remove API key for a specific provider from localStorage
 */
export const removeApiKey = (provider: Provider): void => {
  localStorage.removeItem(`${provider}_api_key`);
};

/**
 * Check if an API key exists for a provider
 */
export const hasApiKey = (provider: Provider): boolean => {
  const key = getApiKey(provider);
  return key.trim() !== '';
};
