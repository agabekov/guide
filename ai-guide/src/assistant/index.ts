/**
 * Assistant Module Entry Point
 */

export { default as ContentAssistant } from './App';
export { SettingsModal } from './components/SettingsModal';
export { getApiKey, setApiKey, removeApiKey, hasApiKey } from './utils/apiKeyStorage';
export { generateTextWithAI, getAvailableModels, MODEL_CONFIGS } from './utils/aiService';
