/**
 * AI Service for Content Assistant
 * Handles AI API calls with automatic model fallback
 */

import type { ModelConfig } from '../../shared/types';

const groqApiKey = import.meta.env.VITE_GROQ_API_KEY;
const openrouterApiKey = import.meta.env.VITE_OPENROUTER_API_KEY;

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';

// Model configurations (same as in the HTML version)
export const MODEL_CONFIGS: ModelConfig[] = [
  // Groq models (fast and free)
  { name: 'llama-3.3-70b-versatile', provider: 'groq', displayName: 'LLaMA 3.3 70B' },
  { name: 'meta-llama/llama-4-scout-17b-16e-instruct', provider: 'groq', displayName: 'LLaMA 4 Scout' },
  { name: 'llama-3.1-8b-instant', provider: 'groq', displayName: 'LLaMA 3.1 8B' },

  // OpenRouter models (fallback)
  { name: 'meta-llama/llama-3.3-70b-instruct', provider: 'openrouter', displayName: 'LLaMA 3.3 70B (OR)' },
  { name: 'google/gemini-2.0-flash-exp:free', provider: 'openrouter', displayName: 'Gemini 2.0 Flash' },
];

/**
 * Get available models based on configured API keys
 */
export const getAvailableModels = (): ModelConfig[] => {
  return MODEL_CONFIGS.filter(config => {
    if (config.provider === 'groq') {
      return groqApiKey && groqApiKey.trim() !== '';
    } else if (config.provider === 'openrouter') {
      return openrouterApiKey && openrouterApiKey.trim() !== '';
    }
    return false;
  });
};

/**
 * Universal API call function (supports both Groq and OpenRouter)
 */
const callAPI = async (
  messages: Array<{ role: string; content: string }>,
  modelConfig: ModelConfig
): Promise<string> => {
  const { name: modelName, provider } = modelConfig;
  const apiUrl = provider === 'groq' ? GROQ_API_URL : OPENROUTER_API_URL;
  const apiKey = provider === 'groq' ? groqApiKey : openrouterApiKey;

  if (!apiKey) {
    throw new Error(`API ключ для ${provider} не настроен. Добавьте ${provider === 'groq' ? 'VITE_GROQ_API_KEY' : 'VITE_OPENROUTER_API_KEY'} в .env файл.`);
  }

  const headers: Record<string, string> = {
    'Authorization': `Bearer ${apiKey}`,
    'Content-Type': 'application/json',
  };

  // OpenRouter requires additional headers
  if (provider === 'openrouter') {
    headers['HTTP-Referer'] = window.location.origin;
    headers['X-Title'] = 'Kaspi Guide Assistant';
  }

  const response = await fetch(apiUrl, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      model: modelName,
      messages: messages,
      temperature: 0.7,
      max_tokens: 2048,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const errorMessage = errorData.error?.message || response.statusText;
    throw new Error(`${provider} API Error: ${response.status} - ${errorMessage}`);
  }

  const data = await response.json();
  return data.choices[0]?.message?.content || '';
};

/**
 * Generate text using AI with automatic model fallback
 */
export const generateTextWithAI = async (prompt: string): Promise<string> => {
  const availableModels = getAvailableModels();

  if (availableModels.length === 0) {
    throw new Error('Не настроен ни один API ключ. Добавьте VITE_GROQ_API_KEY или VITE_OPENROUTER_API_KEY в .env файл.');
  }

  let lastError: Error | null = null;

  // Try each available model
  for (const modelConfig of availableModels) {
    try {
      const result = await callAPI([
        { role: 'user', content: prompt }
      ], modelConfig);
      return result;
    } catch (error) {
      lastError = error as Error;
      continue; // Try next model
    }
  }

  throw new Error(`Не удалось сгенерировать текст: ${lastError?.message || 'Попробуйте еще раз'}`);
};
