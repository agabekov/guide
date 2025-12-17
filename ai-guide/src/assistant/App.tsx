/**
 * Content Assistant App
 * Main component for the Kaspi Guide content checking tool
 */

import React, { useState, useRef } from 'react';
import {
  Settings,
  AlertCircle,
  CheckCircle,
  Download,
  Copy,
  RefreshCw,
  Upload,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { SettingsModal } from './components/SettingsModal';
import { generateTextWithAI, getAvailableModels } from './utils/aiService';
import type { CheckResult, Change } from '../shared/types';

export const ContentAssistant: React.FC = () => {
  const [inputText, setInputText] = useState('');
  const [comments, setComments] = useState('');
  const [isChecking, setIsChecking] = useState(false);
  const [checkResult, setCheckResult] = useState<CheckResult | null>(null);
  const [additionalComment, setAdditionalComment] = useState('');
  const [isApplyingComment, setIsApplyingComment] = useState(false);
  const [iterationCount, setIterationCount] = useState(0);
  const [showDetailedChanges, setShowDetailedChanges] = useState(true);
  const [copiedNotification, setCopiedNotification] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Check text with AI
  const handleCheckText = async () => {
    setIsChecking(true);
    setIterationCount(prev => prev + 1);

    try {
      // Check if API keys are configured
      const availableModels = getAvailableModels();
      if (availableModels.length === 0) {
        alert('Пожалуйста, настройте API ключи в настройках перед использованием.');
        setShowSettings(true);
        setIsChecking(false);
        return;
      }

      // Create prompt for checking text
      const prompt = `Ты - редактор контента для Kaspi Гид. Проанализируй и улучши следующий вопрос и ответ.

ИСХОДНЫЙ ТЕКСТ:
${inputText}

${comments ? `КОММЕНТАРИИ ОТ ПОЛЬЗОВАТЕЛЯ:\n${comments}\n` : ''}

ТРЕБОВАНИЯ:
1. Исправь терминологию (используй официальные названия продуктов Kaspi)
2. Улучши SEO (добавь ключевые слова)
3. Структурируй ответ (используй нумерованные списки для инструкций)
4. Упрости формулировки
5. Добавь конкретику (сроки, условия)

ФОРМАТ ОТВЕТА (строго JSON):
{
  "correctedQuestion": "исправленный вопрос",
  "correctedAnswer": "исправленный ответ",
  "changes": [
    {
      "category": "SEO|Терминология|Структура|Стиль",
      "type": "critical|style|seo",
      "description": "описание изменения",
      "before": "текст до",
      "after": "текст после",
      "checklistItem": "пункт чеклиста"
    }
  ],
  "complianceScore": 0-100,
  "seoScore": 0-10
}

Верни ТОЛЬКО JSON, без дополнительного текста.`;

      const response = await generateTextWithAI(prompt);

      // Parse JSON from response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('AI вернул некорректный формат ответа');
      }

      const result = JSON.parse(jsonMatch[0]);

      // Add metadata
      result.originalText = inputText;
      result.appliedComments = comments ? [comments] : [];

      setCheckResult(result);
    } catch (error) {
      alert(`Ошибка при проверке текста: ${(error as Error).message}`);
      console.error(error);
    } finally {
      setIsChecking(false);
    }
  };

  // Apply additional comment with AI
  const handleApplyComment = async () => {
    if (!additionalComment.trim() || !checkResult) return;

    setIsApplyingComment(true);
    setIterationCount(prev => prev + 1);

    try {
      const prompt = `Ты - редактор контента для Kaspi Гид. Доработай текст с учётом комментария пользователя.

ТЕКУЩИЙ ВОПРОС:
${checkResult.correctedQuestion}

ТЕКУЩИЙ ОТВЕТ:
${checkResult.correctedAnswer}

КОММЕНТАРИЙ ДЛЯ ДОРАБОТКИ:
${additionalComment}

ТРЕБОВАНИЯ:
1. Внеси изменения согласно комментарию
2. Сохрани качество и стиль текста
3. Не ухудшай SEO
4. Верни доработанный текст

ФОРМАТ ОТВЕТА (строго JSON):
{
  "correctedQuestion": "доработанный вопрос",
  "correctedAnswer": "доработанный ответ",
  "changes": [
    {
      "category": "категория",
      "type": "critical|style|seo",
      "description": "что изменилось",
      "before": "до",
      "after": "после",
      "checklistItem": "пункт"
    }
  ]
}

Верни ТОЛЬКО JSON, без дополнительного текста.`;

      const response = await generateTextWithAI(prompt);

      // Parse JSON from response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('AI вернул некорректный формат ответа');
      }

      const result = JSON.parse(jsonMatch[0]);

      // Update result with new changes
      const updatedResult: CheckResult = {
        ...checkResult,
        correctedQuestion: result.correctedQuestion,
        correctedAnswer: result.correctedAnswer,
        changes: [...checkResult.changes, ...result.changes],
        appliedComments: [...checkResult.appliedComments, additionalComment]
      };

      setCheckResult(updatedResult);
      setAdditionalComment('');
    } catch (error) {
      alert(`Ошибка при доработке текста: ${(error as Error).message}`);
      console.error(error);
    } finally {
      setIsApplyingComment(false);
    }
  };

  // Copy result to clipboard
  const handleCopy = () => {
    if (!checkResult) return;
    const textToCopy = `${checkResult.correctedQuestion}\n\n${checkResult.correctedAnswer}`;
    navigator.clipboard.writeText(textToCopy);
    setCopiedNotification(true);
    setTimeout(() => setCopiedNotification(false), 2000);
  };

  // Download DOCX (placeholder)
  const handleDownload = () => {
    // In production version this will generate .docx file
    alert('В финальной версии здесь будет скачивание .docx файла');
  };

  // Upload file (placeholder)
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // In production version this will parse .docx file
      setInputText(`Как получить золотую карту?\n\nНеобходимо осуществить заполнение анкеты в мобильном приложении Kaspi.kz. После этого нужно дождаться одобрения. Карту доставят бесплатно.`);
    }
  };

  // Start new check
  const handleNewCheck = () => {
    if (checkResult && !window.confirm('Начать новую проверку? Несохранённые данные будут потеряны.')) {
      return;
    }
    setInputText('');
    setComments('');
    setCheckResult(null);
    setAdditionalComment('');
    setIterationCount(0);
    setShowDetailedChanges(false);
  };

  const getChangeIcon = (type: Change['type']) => {
    switch(type) {
      case 'critical': return <AlertCircle className="w-4 h-4 text-red-500" />;
      case 'style': return <AlertCircle className="w-4 h-4 text-yellow-500" />;
      case 'seo': return <AlertCircle className="w-4 h-4 text-blue-500" />;
      default: return <AlertCircle className="w-4 h-4 text-gray-500" />;
    }
  };

  const criticalCount = checkResult?.changes.filter(c => c.type === 'critical').length || 0;
  const styleCount = checkResult?.changes.filter(c => c.type === 'style').length || 0;
  const seoCount = checkResult?.changes.filter(c => c.type === 'seo').length || 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-6">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Ассистент контент-менеджера</h1>
              <p className="text-gray-600">Автоматическая проверка вопросов и ответов на соответствие стандартам Kaspi Гид</p>
            </div>
            <button
              onClick={() => setShowSettings(true)}
              className="flex items-center gap-2 bg-white text-gray-700 py-2 px-4 rounded-lg font-medium hover:bg-gray-50 border border-gray-300 transition-all shadow-sm"
            >
              <Settings className="w-5 h-5" />
              Настройки
            </button>
          </div>
        </div>

        {/* Settings Modal */}
        <SettingsModal
          isOpen={showSettings}
          onClose={() => setShowSettings(false)}
        />

        {/* Step 1: Input */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-sm">1</div>
            <h2 className="text-xl font-semibold text-gray-900">Введите текст для проверки</h2>
          </div>

          <div className="mb-4">
            <div className="flex items-center justify-between mb-3">
              <label className="block text-sm font-semibold text-gray-900">
                Вопрос и ответ
              </label>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700 transition-colors"
              >
                <Upload className="w-4 h-4" />
                Загрузить .docx
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".docx"
                onChange={handleFileUpload}
                className="hidden"
              />
            </div>
            <textarea
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Вставьте вопрос и ответ"
              className="w-full h-48 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none text-sm"
              maxLength={3000}
            />
            <div className="flex justify-between items-center mt-2">
              <span className="text-xs text-gray-500">
                AI автоматически определит вопрос и ответ
              </span>
              <span className="text-xs text-gray-500">
                {inputText.length} / 3000
              </span>
            </div>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-semibold text-gray-900 mb-2">
              Комментарии для AI <span className="text-gray-400 font-normal">(необязательно)</span>
            </label>
            <textarea
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              placeholder='Например: "Сделай короче", "Добавь информацию о сроках", "Упрости формулировки"'
              className="w-full h-20 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none text-sm"
              maxLength={1000}
            />
            <div className="flex justify-between items-center mt-2">
              <span className="text-xs text-gray-500">
                AI учтёт ваши комментарии при проверке
              </span>
              <span className="text-xs text-gray-500">
                {comments.length} / 1000
              </span>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={handleCheckText}
              disabled={!inputText.trim() || isChecking}
              className="flex-1 bg-blue-600 text-white py-3 px-6 rounded-lg font-medium hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-all shadow-sm hover:shadow-md disabled:shadow-none flex items-center justify-center gap-2"
            >
              {isChecking ? (
                <>
                  <RefreshCw className="w-5 h-5 animate-spin" />
                  {comments.trim() ? 'Проверяем ваш текст с учётом комментариев...' : 'Проверяем ваш текст...'}
                </>
              ) : (
                'Проверить текст'
              )}
            </button>

            {checkResult && (
              <button
                onClick={handleNewCheck}
                className="bg-white text-gray-700 py-3 px-6 rounded-lg font-medium hover:bg-gray-50 border border-gray-300 transition-all flex items-center justify-center gap-2"
              >
                <RefreshCw className="w-5 h-5" />
                Новая проверка
              </button>
            )}
          </div>
        </div>

        {/* Step 2: Results */}
        {checkResult && (
          <>
            {/* Status Overview */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 rounded-full bg-green-600 text-white flex items-center justify-center">
                  <CheckCircle className="w-5 h-5" />
                </div>
                <h2 className="text-xl font-semibold text-gray-900">Результаты проверки</h2>
              </div>

              <div className="grid grid-cols-3 gap-4 mb-4">
                <div className="bg-green-50 rounded-lg p-4 text-center">
                  <div className="text-3xl font-bold text-green-600">{checkResult.complianceScore}%</div>
                  <div className="text-xs text-green-700 mt-1">Соответствие стандартам</div>
                </div>
                <div className="bg-blue-50 rounded-lg p-4 text-center">
                  <div className="text-3xl font-bold text-blue-600">{checkResult.seoScore}/10</div>
                  <div className="text-xs text-blue-700 mt-1">SEO-оценка</div>
                </div>
                <div className="bg-purple-50 rounded-lg p-4 text-center">
                  <div className="text-3xl font-bold text-purple-600">{checkResult.changes.length}</div>
                  <div className="text-xs text-purple-700 mt-1">Исправлений</div>
                </div>
              </div>

              {iterationCount > 0 && (
                <div className="text-sm text-gray-600 mb-3">
                  <span className="font-medium">Итерация:</span> {iterationCount}
                </div>
              )}

              {checkResult.appliedComments.length > 0 && (
                <div className="bg-blue-50 rounded-lg p-3">
                  <div className="text-xs font-semibold text-blue-900 mb-2">Учтены комментарии:</div>
                  {checkResult.appliedComments.map((comment, idx) => (
                    <div key={idx} className="text-xs text-blue-700 mb-1">• {comment}</div>
                  ))}
                </div>
              )}

              <div className="mt-4 flex items-center gap-4 text-sm">
                <span className="font-medium text-gray-900">Типы исправлений:</span>
                {criticalCount > 0 && (
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-3 rounded-full bg-red-500"></div>
                    <span className="text-gray-700">{criticalCount} критических</span>
                  </div>
                )}
                {styleCount > 0 && (
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                    <span className="text-gray-700">{styleCount} стилистических</span>
                  </div>
                )}
                {seoCount > 0 && (
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                    <span className="text-gray-700">{seoCount} SEO</span>
                  </div>
                )}
              </div>
            </div>

            {/* Side-by-side Comparison */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-sm">2</div>
                <h2 className="text-xl font-semibold text-gray-900">Сравнение: Было → Стало</h2>
              </div>

              <div className="grid grid-cols-2 gap-6">
                {/* Before */}
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <div className="text-sm font-bold text-red-700 bg-red-50 px-3 py-1 rounded-full">БЫЛО</div>
                  </div>
                  <div className="bg-red-50 rounded-lg p-4 border-2 border-red-200 min-h-[300px]">
                    <div className="text-base font-bold text-gray-900 mb-3 whitespace-pre-wrap">
                      {checkResult.originalText.split('\n\n')[0] || 'Как получить золотую карту?'}
                    </div>
                    <div className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
                      {checkResult.originalText.split('\n\n').slice(1).join('\n\n') || 'Необходимо осуществить заполнение анкеты в мобильном приложении Kaspi.kz. После этого нужно дождаться одобрения. Карту доставят бесплатно.'}
                    </div>
                  </div>
                </div>

                {/* After */}
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <div className="text-sm font-bold text-green-700 bg-green-50 px-3 py-1 rounded-full">СТАЛО</div>
                  </div>
                  <div className="bg-green-50 rounded-lg p-4 border-2 border-green-200 min-h-[300px]">
                    <div className="text-base font-bold text-gray-900 mb-3">
                      {checkResult.correctedQuestion}
                    </div>
                    <div className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
                      {checkResult.correctedAnswer}
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-6 flex gap-3">
                <button
                  onClick={handleCopy}
                  className="flex-1 bg-blue-600 text-white py-3 px-6 rounded-lg font-medium hover:bg-blue-700 transition-all flex items-center justify-center gap-2"
                >
                  <Copy className="w-5 h-5" />
                  Копировать исправленный текст
                </button>
                <button
                  onClick={handleDownload}
                  className="bg-white text-gray-700 py-3 px-6 rounded-lg font-medium hover:bg-gray-50 border border-gray-300 transition-all flex items-center justify-center gap-2"
                >
                  <Download className="w-5 h-5" />
                  Скачать .docx
                </button>
              </div>
            </div>

            {/* Detailed Changes */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
              <button
                onClick={() => setShowDetailedChanges(!showDetailedChanges)}
                className="w-full flex items-center justify-between mb-4"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-sm">3</div>
                  <h2 className="text-xl font-semibold text-gray-900">Детализация изменений ({checkResult.changes.length})</h2>
                </div>
                {showDetailedChanges ? <ChevronUp className="w-6 h-6 text-gray-600" /> : <ChevronDown className="w-6 h-6 text-gray-600" />}
              </button>

              {showDetailedChanges && (
                <div className="space-y-4">
                  {checkResult.changes.map((change, idx) => (
                    <div key={idx} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-start gap-3 mb-3">
                        {getChangeIcon(change.type)}
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-sm font-bold text-gray-900">{change.category}</span>
                            <span className="text-xs text-gray-500">• {change.checklistItem}</span>
                          </div>
                          <div className="text-sm text-gray-700">{change.description}</div>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <div className="text-xs font-semibold text-red-700 mb-2">Было:</div>
                          <div className="bg-red-50 rounded p-3 border border-red-200">
                            <div className="text-sm text-red-900">{change.before}</div>
                          </div>
                        </div>
                        <div>
                          <div className="text-xs font-semibold text-green-700 mb-2">Стало:</div>
                          <div className="bg-green-50 rounded p-3 border border-green-200">
                            <div className="text-sm text-green-900">{change.after}</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Additional Comments */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-sm">4</div>
                <h2 className="text-xl font-semibold text-gray-900">Доработка текста</h2>
              </div>

              <label className="block text-sm font-semibold text-gray-900 mb-2">
                Комментарий для доработки
              </label>
              <textarea
                value={additionalComment}
                onChange={(e) => setAdditionalComment(e.target.value)}
                placeholder="Укажите, что нужно изменить или добавить"
                className="w-full h-24 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none text-sm"
                maxLength={1000}
              />
              <div className="flex justify-between items-center mt-2 mb-4">
                <span className="text-xs text-gray-500">
                  AI доработает текст с учётом комментария
                </span>
                <span className="text-xs text-gray-500">
                  {additionalComment.length} / 1000
                </span>
              </div>
              <button
                onClick={handleApplyComment}
                disabled={!additionalComment.trim() || isApplyingComment}
                className="w-full bg-blue-600 text-white py-3 px-6 rounded-lg font-medium hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
              >
                {isApplyingComment ? (
                  <>
                    <RefreshCw className="w-5 h-5 animate-spin" />
                    Дорабатываем текст...
                  </>
                ) : (
                  'Применить комментарий'
                )}
              </button>
            </div>
          </>
        )}

        {/* Notification */}
        {copiedNotification && (
          <div className="fixed bottom-6 right-6 bg-green-600 text-white px-6 py-3 rounded-lg shadow-lg flex items-center gap-2 animate-fade-in z-50">
            <CheckCircle className="w-5 h-5" />
            Скопировано!
          </div>
        )}
      </div>
    </div>
  );
};

export default ContentAssistant;
