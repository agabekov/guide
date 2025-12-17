/**
 * Content Assistant App - Editor Review Mode
 * Shows editor suggestions as inline comments that user can accept/reject
 * Uses RAG for style consistency with existing FAQ database
 */

import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  RefreshCw,
  Upload,
  MessageSquare,
  AlertCircle,
  Lightbulb,
  FileText,
  Database,
} from 'lucide-react';
import { generateTextWithAI, getAvailableModels, sanitizeJSON } from './utils/aiService';
import { HighlightedText, SuggestionCard, ReviewComplete } from './components';
import { findSimilarFAQs, preloadModel } from '../question/services/ragService';
import { compressChecklist } from '../question/services/checklistCompressor';
import editorChecklistRaw from '../question/data/editor-checklist.txt?raw';
import type { EditorSuggestion, EditorReview, SuggestionType } from '../shared/types';
import type { FAQItem } from '../question/types';

// Process checklist
const editorChecklist = editorChecklistRaw
  .split('\n')
  .map((line) => line.trim())
  .filter((line) => line.length > 0)
  .join('\n');

type ReviewState = 'input' | 'loading' | 'reviewing' | 'complete';

// Format RAG examples for prompt
const formatRAGExamples = (faqs: FAQItem[]): string => {
  if (!faqs || faqs.length === 0) return '';

  const examples = faqs.slice(0, 7).map((faq, i) => {
    const answer = faq.answer.length > 300 ? faq.answer.slice(0, 300) + '...' : faq.answer;
    return `${i + 1}. В: ${faq.question}
   О: ${answer}`;
  }).join('\n\n');

  return `
═══════════════════════════════════════
ПРИМЕРЫ ИЗ БАЗЫ KASPI ГИДА (ориентируйся на их стиль):
═══════════════════════════════════════
${examples}
`;
};

export const ContentAssistant: React.FC = () => {
  const [inputText, setInputText] = useState('');
  const [comments, setComments] = useState('');
  const [reviewState, setReviewState] = useState<ReviewState>('input');
  const [review, setReview] = useState<EditorReview | null>(null);
  const [activeSuggestionIndex, setActiveSuggestionIndex] = useState(0);
  const [copiedNotification, setCopiedNotification] = useState(false);
  const [ragStatus, setRagStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Preload RAG model on mount
  useEffect(() => {
    const initRAG = async () => {
      try {
        setRagStatus('loading');
        await preloadModel();
        setRagStatus('ready');
      } catch (error) {
        console.warn('RAG preload failed:', error);
        setRagStatus('error');
      }
    };
    initRAG();
  }, []);

  // Get pending suggestions
  const pendingSuggestions = review?.suggestions.filter(s => s.status === 'pending') || [];
  const activeSuggestion = pendingSuggestions[activeSuggestionIndex];

  // Build AI prompt for editor review
  const buildPrompt = (text: string, userComments: string, ragExamples: string, checklistSection: string) => {
    return `Ты — главный редактор Kaspi Гида с 10-летним опытом. Kaspi Гид — это FAQ-система для клиентов Kaspi (финтех, Казахстан).

ТВОЯ ФИЛОСОФИЯ:
Хороший текст — когда клиент прочитал один раз и всё понял. Без перечитывания, без вопросов, без звонков в поддержку.
${ragExamples}
═══════════════════════════════════════
КЛЮЧЕВЫЕ ПРАВИЛА ЧЕК-ЛИСТА (проверяй КАЖДЫЙ пункт!):
═══════════════════════════════════════

🚫 ЧАСТИЦА «ЛИ» В ВОПРОСАХ — ЗАПРЕЩЕНА!
Это КРИТИЧЕСКАЯ ошибка. Вопрос формулируй БЕЗ частицы «ли».
❌ Можно ли получить карту по доверенности? → ✅ Я могу получить карту по доверенности?
❌ Должен ли я давать чек? → ✅ Я должен давать чек?
❌ Могу ли я снимать деньги? → ✅ Можно снимать деньги?

🚫 ПОРЯДОК СЛОВ — ПРЯМОЙ
Пиши в прямом порядке, не инвертируй.
❌ Могу я подать заявку? → ✅ Я могу подать заявку?
❌ Сделать это можно в... → ✅ Это можно сделать в...

🚫 ОТГЛАГОЛЬНЫЕ СУЩЕСТВИТЕЛЬНЫЕ — ЗАМЕНЯЙ НА ГЛАГОЛЫ
Отглагольное существительное — это мёртвая канцелярская конструкция.
❌ После сохранения данных → ✅ Когда вы сохраните данные
❌ Осуществить заполнение → ✅ Заполнить
❌ Произвести оплату → ✅ Оплатить

🚫 «НЕ БОЛЕЕ», «НЕ МЕНЕЕ» — ИЗБЕГАЙ
Читателю тяжело представить отсутствие. Показывай нужное, а не ненужное.
❌ не более 4 миллионов → ✅ максимум 4 миллиона / до 4 миллионов
❌ не менее 183 дней → ✅ от 183 дней / минимум 183 дня

📝 ЗАКРЫТЫЙ ВОПРОС — НАЧИНАЙ С «ДА.» ИЛИ «НЕТ.»
Если вопрос подразумевает да/нет — начни ответ с этих слов и ТОЧКИ (не запятой!).
❌ Да, нажмите «Скрыть сумму»... → ✅ Да. Нажмите «Скрыть сумму»...

📝 SEO — ВОПРОС НЕ ДОЛЖЕН БЫТЬ БЕЗЛИКИМ
Мы рассказываем о продуктах Kaspi — называй их!
❌ Как оплатить поездку в такси? → ✅ Как оплатить поездку в Kaspi Такси с Kaspi Gold?

📝 ЕДИНАЯ ТЕРМИНОЛОГИЯ
❌ отделения Kaspi → ✅ отделения Kaspi.kz
❌ Депозит на Kaspi → ✅ Kaspi Депозит
❌ в разделе «Мой Банк» → ✅ в сервисе «Мой Банк»

📝 ВРЕМЕНА ГЛАГОЛОВ
Вопрос и ответ должны быть в одном времени.

📝 БЕЗ «МЫ»
По умолчанию пиши без «мы».

═══════════════════════════════════════
ДОПОЛНИТЕЛЬНЫЕ СЕКЦИИ ЧЕК-ЛИСТА:
═══════════════════════════════════════
${checklistSection}

═══════════════════════════════════════
ТИПЫ ЗАМЕЧАНИЙ:
═══════════════════════════════════════

🔴 critical — ЧАСТИЦА «ЛИ», канцелярит, нарушение чек-листа, непонятность
🟡 style — можно лучше (порядок слов, повторы, стиль)
🔵 seo — безликий вопрос, нет ключевых слов

═══════════════════════════════════════
КАК ПИСАТЬ КОММЕНТАРИИ:
═══════════════════════════════════════

Комментарии должны ОБУЧАТЬ. Объясняй ПОЧЕМУ плохо и КАК влияет на клиента.

❌ ПЛОХОЙ КОММЕНТАРИЙ:
"Фраза не совсем дружелюбна" — это пустые слова, нет конкретики.

✅ ХОРОШИЙ КОММЕНТАРИЙ:
{
  "originalText": "Можно ли получить карту по доверенности?",
  "suggestedText": "Я могу получить карту по доверенности?",
  "problem": "Частица «ли» запрещена в вопросах Kaspi Гида. Это правило чек-листа 1.14. Конструкции «Можно ли», «Могу ли», «Должен ли» не используются.",
  "why": "Вопросы без «ли» звучат более естественно и соответствуют тому, как реальные клиенты формулируют запросы в поиске. Это улучшает SEO и читаемость.",
  "checklistItem": "1.14. Частица ли"
}

✅ ЕЩЁ ПРИМЕР:
{
  "originalText": "Осуществить заполнение анкеты",
  "suggestedText": "Заполните анкету",
  "problem": "«Осуществить заполнение» — отглагольное существительное + вспомогательный глагол. Это канцелярит из официальных документов. Правило 3.4 чек-листа: везде, где можешь, используй глагол вместо отглагольного существительного.",
  "why": "Клиент читает на бегу. «Заполните» вместо «осуществите заполнение» экономит слова и звучит по-человечески. Глагол — это текстовый Брюс Уиллис, он спасает унылое предложение.",
  "checklistItem": "3.4. Отглагольное существительное"
}

═══════════════════════════════════════
ИСХОДНЫЙ ТЕКСТ:
═══════════════════════════════════════
"""
${text}
"""

${userComments ? `КОММЕНТАРИЙ ОТ АВТОРА:\n${userComments}\n\nУчти это при редактуре.\n` : ''}

═══════════════════════════════════════
ФОРМАТ ОТВЕТА (строго JSON):
═══════════════════════════════════════
{
  "suggestions": [
    {
      "originalText": "точная цитата из текста (копируй посимвольно!)",
      "suggestedText": "твоё предложение",
      "type": "critical|style|seo",
      "problem": "что конкретно не так и почему это проблема (2-4 предложения, с примерами)",
      "why": "как это влияет на клиента, почему ему будет лучше после исправления (2-3 предложения)",
      "checklistItem": "какой пункт чек-листа нарушен"
    }
  ],
  "overallComment": "общая оценка текста как коллеге (2-3 предложения: что хорошо, над чем поработать)"
}

ПРАВИЛА:
- originalText = ТОЧНАЯ цитата, иначе не найдём в тексте
- Максимум 7 замечаний, начинай с critical
- Если текст хороший — скажи это, не выдумывай замечания
- Пиши problem и why РАЗВЁРНУТО — это главная ценность

Верни ТОЛЬКО JSON.`;
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

      // 1. Get similar FAQs from RAG (for style reference)
      console.log('🔍 Searching similar FAQs...');
      let ragExamples = '';
      try {
        const similarFAQs = await findSimilarFAQs(inputText, 7);
        ragExamples = formatRAGExamples(similarFAQs);
        console.log(`✅ Found ${similarFAQs.length} similar FAQs`);
      } catch (ragError) {
        console.warn('⚠️ RAG search failed, continuing without examples:', ragError);
      }

      // 2. Compress checklist to relevant sections
      console.log('📋 Compressing checklist...');
      const compressedChecklist = compressChecklist(inputText, editorChecklist);

      // 3. Build prompt with RAG examples and checklist
      const prompt = buildPrompt(inputText, comments, ragExamples, compressedChecklist);

      // 4. Generate AI response
      console.log('🤖 Generating editor review...');
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
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Ассистент контент-менеджера</h1>
              <p className="text-gray-600">Редактор проверит ваш текст и оставит комментарии к местам, которые можно улучшить</p>
            </div>
            {/* RAG Status Indicator */}
            <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 rounded-lg">
              <Database className={`w-4 h-4 ${
                ragStatus === 'ready' ? 'text-green-500' :
                ragStatus === 'loading' ? 'text-yellow-500 animate-pulse' :
                ragStatus === 'error' ? 'text-red-500' : 'text-gray-400'
              }`} />
              <span className="text-xs text-gray-600">
                {ragStatus === 'ready' ? 'База знаний готова' :
                 ragStatus === 'loading' ? 'Загрузка базы...' :
                 ragStatus === 'error' ? 'База недоступна' : 'Инициализация...'}
              </span>
            </div>
          </div>
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
