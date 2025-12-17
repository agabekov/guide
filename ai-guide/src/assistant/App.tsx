/**
 * Content Assistant App - Editor Review Mode
 * Shows editor suggestions as inline comments that user can accept/reject
 */

import React, { useState, useRef, useCallback } from 'react';
import {
  RefreshCw,
  Upload,
  MessageSquare,
  AlertCircle,
  Lightbulb,
  FileText,
} from 'lucide-react';
import { generateTextWithAI, getAvailableModels, sanitizeJSON } from './utils/aiService';
import { HighlightedText, SuggestionCard, ReviewComplete } from './components';
import type { EditorSuggestion, EditorReview, SuggestionType } from '../shared/types';

type ReviewState = 'input' | 'loading' | 'reviewing' | 'complete';

export const ContentAssistant: React.FC = () => {
  const [inputText, setInputText] = useState('');
  const [comments, setComments] = useState('');
  const [reviewState, setReviewState] = useState<ReviewState>('input');
  const [review, setReview] = useState<EditorReview | null>(null);
  const [activeSuggestionIndex, setActiveSuggestionIndex] = useState(0);
  const [copiedNotification, setCopiedNotification] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Get pending suggestions
  const pendingSuggestions = review?.suggestions.filter(s => s.status === 'pending') || [];
  const activeSuggestion = pendingSuggestions[activeSuggestionIndex];

  // Build AI prompt for editor review
  const buildPrompt = (text: string, userComments: string) => {
    return `Я работаю контент-менеджером Kaspi Гида — FAQ-системы о продуктах и сервисах Kaspi. Kaspi — это казахстанский финтех сервис с широким спектром продуктов и сервисов.

Ты — мой главный редактор. Твоя задача — НЕ переписывать текст, а оставить КОММЕНТАРИИ к конкретным фрагментам, которые нужно улучшить.

ПРИНЦИПЫ РАБОТЫ:
1. Найди конкретные фрагменты текста, которые можно улучшить
2. Для каждого фрагмента объясни:
   - Что не так (problem)
   - Почему это важно исправить (why)
   - Предложи конкретную замену (suggestedText)
3. Сохрани исходный текст — ты только комментируешь!

ЧТО ИСКАТЬ:
- Канцеляризмы и сложные конструкции
- Непонятные формулировки
- Нарушения чек-листа контент-менеджера
- Проблемы с SEO (отсутствие ключевых слов)
- Стилистические несоответствия

ТИПЫ ЗАМЕЧАНИЙ:
- critical: критические ошибки (нарушения чек-листа, фактические ошибки)
- style: стилистические улучшения (канцеляризмы, сложные предложения)
- seo: SEO-оптимизация (ключевые слова, заголовки)

ИСХОДНЫЙ ТЕКСТ:
"""
${text}
"""

${userComments ? `КОММЕНТАРИИ ОТ ПОЛЬЗОВАТЕЛЯ:\n${userComments}\n` : ''}

ФОРМАТ ОТВЕТА (строго JSON):
{
  "suggestions": [
    {
      "originalText": "точная цитата из исходного текста",
      "suggestedText": "предлагаемая замена",
      "type": "critical|style|seo",
      "problem": "что не так с этим фрагментом (1-2 предложения)",
      "why": "почему важно это исправить, какому принципу соответствует (1-2 предложения)",
      "checklistItem": "пункт чек-листа или принцип"
    }
  ],
  "overallComment": "общий комментарий редактора о тексте (2-3 предложения, дружелюбным тоном)"
}

ВАЖНО:
- originalText должен быть ТОЧНОЙ цитатой из исходного текста
- Не более 5-7 замечаний (самые важные)
- Приоритет: critical > style > seo
- Если текст хороший — не придумывай замечания искусственно

Верни ТОЛЬКО JSON, без дополнительного текста.`;
  };

  // Parse AI response and create EditorReview
  const parseAIResponse = (response: string, originalText: string): EditorReview => {
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('AI вернул некорректный формат ответа');
    }

    const sanitizedJSON = sanitizeJSON(jsonMatch[0]);
    const result = JSON.parse(sanitizedJSON);

    // Find positions of each suggestion in the original text
    const suggestions: EditorSuggestion[] = result.suggestions.map(
      (s: { originalText: string; suggestedText: string; type: SuggestionType; problem: string; why: string; checklistItem: string }, idx: number) => {
        const startIndex = originalText.indexOf(s.originalText);
        const endIndex = startIndex !== -1 ? startIndex + s.originalText.length : -1;

        return {
          id: `suggestion-${idx}-${Date.now()}`,
          startIndex: startIndex !== -1 ? startIndex : 0,
          endIndex: endIndex !== -1 ? endIndex : 0,
          originalText: s.originalText,
          suggestedText: s.suggestedText,
          type: s.type as SuggestionType,
          problem: s.problem,
          why: s.why,
          checklistItem: s.checklistItem,
          status: 'pending' as const,
        };
      }
    ).filter((s: EditorSuggestion) => s.startIndex !== -1); // Filter out not found

    // Calculate stats
    const stats = {
      critical: suggestions.filter((s: EditorSuggestion) => s.type === 'critical').length,
      style: suggestions.filter((s: EditorSuggestion) => s.type === 'style').length,
      seo: suggestions.filter((s: EditorSuggestion) => s.type === 'seo').length,
    };

    return {
      originalText,
      suggestions,
      overallComment: result.overallComment || 'Текст проанализирован.',
      stats,
    };
  };

  // Check text with AI
  const handleCheckText = async () => {
    setReviewState('loading');

    try {
      const availableModels = getAvailableModels();
      if (availableModels.length === 0) {
        alert('Не настроен ни один API ключ. Добавьте VITE_GROQ_API_KEY или VITE_OPENROUTER_API_KEY в .env файл.');
        setReviewState('input');
        return;
      }

      const prompt = buildPrompt(inputText, comments);
      const response = await generateTextWithAI(prompt);
      const editorReview = parseAIResponse(response, inputText);

      setReview(editorReview);
      setActiveSuggestionIndex(0);

      if (editorReview.suggestions.length === 0) {
        setReviewState('complete');
      } else {
        setReviewState('reviewing');
      }
    } catch (error) {
      alert(`Ошибка при проверке текста: ${(error as Error).message}`);
      console.error(error);
      setReviewState('input');
    }
  };

  // Handle suggestion actions
  const handleAccept = useCallback((id: string) => {
    if (!review) return;

    const updatedSuggestions = review.suggestions.map(s =>
      s.id === id ? { ...s, status: 'accepted' as const } : s
    );

    setReview({ ...review, suggestions: updatedSuggestions });

    // Move to next pending suggestion or complete
    const nextPending = updatedSuggestions.filter(s => s.status === 'pending');
    if (nextPending.length === 0) {
      setReviewState('complete');
    } else {
      setActiveSuggestionIndex(Math.min(activeSuggestionIndex, nextPending.length - 1));
    }
  }, [review, activeSuggestionIndex]);

  const handleReject = useCallback((id: string) => {
    if (!review) return;

    const updatedSuggestions = review.suggestions.map(s =>
      s.id === id ? { ...s, status: 'rejected' as const } : s
    );

    setReview({ ...review, suggestions: updatedSuggestions });

    const nextPending = updatedSuggestions.filter(s => s.status === 'pending');
    if (nextPending.length === 0) {
      setReviewState('complete');
    } else {
      setActiveSuggestionIndex(Math.min(activeSuggestionIndex, nextPending.length - 1));
    }
  }, [review, activeSuggestionIndex]);

  const handleAcceptAll = useCallback(() => {
    if (!review) return;

    const updatedSuggestions = review.suggestions.map(s =>
      s.status === 'pending' ? { ...s, status: 'accepted' as const } : s
    );

    setReview({ ...review, suggestions: updatedSuggestions });
    setReviewState('complete');
  }, [review]);

  const handleRejectAll = useCallback(() => {
    if (!review) return;

    const updatedSuggestions = review.suggestions.map(s =>
      s.status === 'pending' ? { ...s, status: 'rejected' as const } : s
    );

    setReview({ ...review, suggestions: updatedSuggestions });
    setReviewState('complete');
  }, [review]);

  // Navigation
  const handlePrevious = () => {
    setActiveSuggestionIndex(Math.max(0, activeSuggestionIndex - 1));
  };

  const handleNext = () => {
    setActiveSuggestionIndex(Math.min(pendingSuggestions.length - 1, activeSuggestionIndex + 1));
  };

  const handleSuggestionClick = (id: string) => {
    const index = pendingSuggestions.findIndex(s => s.id === id);
    if (index !== -1) {
      setActiveSuggestionIndex(index);
    }
  };

  // Get final text
  const getFinalText = useCallback(() => {
    if (!review) return '';

    let result = review.originalText;
    const acceptedSuggestions = [...review.suggestions]
      .filter(s => s.status === 'accepted')
      .sort((a, b) => b.startIndex - a.startIndex);

    acceptedSuggestions.forEach(suggestion => {
      result =
        result.slice(0, suggestion.startIndex) +
        suggestion.suggestedText +
        result.slice(suggestion.endIndex);
    });

    return result;
  }, [review]);

  // Copy result to clipboard
  const handleCopy = () => {
    const textToCopy = getFinalText();
    navigator.clipboard.writeText(textToCopy);
    setCopiedNotification(true);
    setTimeout(() => setCopiedNotification(false), 2000);
  };

  // Download DOCX (placeholder)
  const handleDownload = () => {
    alert('В финальной версии здесь будет скачивание .docx файла');
  };

  // Upload file (placeholder)
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setInputText(`Как получить золотую карту?\n\nНеобходимо осуществить заполнение анкеты в мобильном приложении Kaspi.kz. После этого нужно дождаться одобрения. Карту доставят бесплатно.`);
    }
  };

  // Start new check
  const handleNewCheck = () => {
    if (reviewState !== 'input' && !window.confirm('Начать новую проверку? Несохранённые данные будут потеряны.')) {
      return;
    }
    setInputText('');
    setComments('');
    setReview(null);
    setActiveSuggestionIndex(0);
    setReviewState('input');
  };

  // Stats display
  const renderStats = () => {
    if (!review) return null;

    return (
      <div className="flex items-center gap-4 text-sm">
        {review.stats.critical > 0 && (
          <div className="flex items-center gap-1.5">
            <AlertCircle className="w-4 h-4 text-red-500" />
            <span className="text-gray-700">{review.stats.critical} критических</span>
          </div>
        )}
        {review.stats.style > 0 && (
          <div className="flex items-center gap-1.5">
            <Lightbulb className="w-4 h-4 text-yellow-500" />
            <span className="text-gray-700">{review.stats.style} стилистических</span>
          </div>
        )}
        {review.stats.seo > 0 && (
          <div className="flex items-center gap-1.5">
            <FileText className="w-4 h-4 text-blue-500" />
            <span className="text-gray-700">{review.stats.seo} SEO</span>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-6">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Ассистент контент-менеджера</h1>
          <p className="text-gray-600">Редактор проверит ваш текст и оставит комментарии к местам, которые можно улучшить</p>
        </div>

        {/* Step 1: Input */}
        {(reviewState === 'input' || reviewState === 'loading') && (
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
                disabled={reviewState === 'loading'}
              />
              <div className="flex justify-between items-center mt-2">
                <span className="text-xs text-gray-500">
                  Редактор найдёт места для улучшения и объяснит, что исправить
                </span>
                <span className="text-xs text-gray-500">
                  {inputText.length} / 3000
                </span>
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-semibold text-gray-900 mb-2">
                Комментарии для редактора <span className="text-gray-400 font-normal">(необязательно)</span>
              </label>
              <textarea
                value={comments}
                onChange={(e) => setComments(e.target.value)}
                placeholder='Например: "Обрати внимание на длину предложений", "Проверь SEO"'
                className="w-full h-20 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none text-sm"
                maxLength={1000}
                disabled={reviewState === 'loading'}
              />
            </div>

            <button
              onClick={handleCheckText}
              disabled={!inputText.trim() || reviewState === 'loading'}
              className="w-full bg-blue-600 text-white py-3 px-6 rounded-lg font-medium hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-all shadow-sm hover:shadow-md disabled:shadow-none flex items-center justify-center gap-2"
            >
              {reviewState === 'loading' ? (
                <>
                  <RefreshCw className="w-5 h-5 animate-spin" />
                  Редактор анализирует текст...
                </>
              ) : (
                <>
                  <MessageSquare className="w-5 h-5" />
                  Получить комментарии редактора
                </>
              )}
            </button>
          </div>
        )}

        {/* Step 2: Review Mode */}
        {reviewState === 'reviewing' && review && (
          <>
            {/* Stats Header */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-sm">2</div>
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900">Рассмотрите замечания редактора</h2>
                    <p className="text-sm text-gray-500">
                      Осталось: {pendingSuggestions.length} из {review.suggestions.length}
                    </p>
                  </div>
                </div>
                {renderStats()}
              </div>
            </div>

            {/* Main Review Area */}
            <div className="grid grid-cols-2 gap-6">
              {/* Left: Text with Highlights */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="px-5 py-3 border-b border-gray-200 bg-gray-50">
                  <h3 className="font-semibold text-gray-900">Ваш текст</h3>
                  <p className="text-xs text-gray-500">Нажмите на выделенный фрагмент, чтобы увидеть комментарий</p>
                </div>
                <div className="p-5">
                  <HighlightedText
                    text={review.originalText}
                    suggestions={review.suggestions}
                    activeSuggestionId={activeSuggestion?.id || null}
                    onSuggestionClick={handleSuggestionClick}
                  />
                </div>
              </div>

              {/* Right: Suggestion Card */}
              <div>
                {activeSuggestion && (
                  <SuggestionCard
                    suggestion={activeSuggestion}
                    currentIndex={activeSuggestionIndex}
                    totalCount={pendingSuggestions.length}
                    onAccept={handleAccept}
                    onReject={handleReject}
                    onPrevious={handlePrevious}
                    onNext={handleNext}
                    onAcceptAll={handleAcceptAll}
                    onRejectAll={handleRejectAll}
                  />
                )}
              </div>
            </div>
          </>
        )}

        {/* Step 3: Complete */}
        {reviewState === 'complete' && review && (
          <ReviewComplete
            originalText={review.originalText}
            suggestions={review.suggestions}
            overallComment={review.overallComment}
            onCopy={handleCopy}
            onDownload={handleDownload}
            onNewCheck={handleNewCheck}
          />
        )}

        {/* Notification */}
        {copiedNotification && (
          <div className="fixed bottom-6 right-6 bg-green-600 text-white px-6 py-3 rounded-lg shadow-lg flex items-center gap-2 animate-fade-in z-50">
            Скопировано!
          </div>
        )}
      </div>
    </div>
  );
};

export default ContentAssistant;
