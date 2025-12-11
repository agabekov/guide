import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles,
  FileText,
  CheckSquare,
  Download,
  ArrowLeft,
  Copy,
  Check,
  Edit2,
  Plus,
  Trash,
  Repeat,
  Image as ImageIcon,
  Folder,
} from 'lucide-react';
import { generateQuestions, generateAnswers, type GeneratedQuestion, type GeneratedFAQ } from '../services/geminiService';
import faqData from '../data/faq.json';

type StepKey = 'input' | 'questions' | 'answers' | 'result';

type UploadItem = {
  id: string;
  name: string;
  size: number;
  kind: 'doc' | 'image';
  preview?: string;
};

type ExtendedFAQ = GeneratedFAQ & { id: string };

const acceptedDocs = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];

const acceptedImages = ['image/png', 'image/jpeg'];

const HomePage: React.FC = () => {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const [sourceText, setSourceText] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [step, setStep] = useState<StepKey>('input');
  const [questions, setQuestions] = useState<GeneratedQuestion[]>([]);
  const [generatedFAQs, setGeneratedFAQs] = useState<ExtendedFAQ[]>([]);
  const [error, setError] = useState<string>('');
  const [copied, setCopied] = useState(false);
  const [uploads, setUploads] = useState<UploadItem[]>([]);
  const [manualQuestion, setManualQuestion] = useState('');
  const [editingQuestion, setEditingQuestion] = useState<{ id: string; text: string } | null>(null);
  const [reviewNotes, setReviewNotes] = useState<Record<string, string>>({});
  const [progressValue, setProgressValue] = useState(0);
  const progressTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const uploadsRef = useRef<UploadItem[]>([]);

  const handleGenerateQuestions = async () => {
    if (!sourceText.trim()) return;

    setIsGenerating(true);
    setError('');

    try {
      const generated = await generateQuestions(sourceText, faqData);
      setQuestions(generated.map((q) => ({ ...q, selected: true })));
      setStep('questions');
    } catch (err: any) {
      setError(err.message || 'Произошла ошибка при генерации вопросов');
    } finally {
      setIsGenerating(false);
    }
  };

  const toggleQuestion = (id: string) => {
    setQuestions((prev) =>
      prev.map((q) => (q.id === id ? { ...q, selected: !q.selected } : q))
    );
  };

  const selectAll = () => {
    setQuestions((prev) => prev.map((q) => ({ ...q, selected: true })));
  };

  const deselectAll = () => {
    setQuestions((prev) => prev.map((q) => ({ ...q, selected: false })));
  };

  const startProgress = () => {
    if (progressTimer.current) clearInterval(progressTimer.current);
    setProgressValue(12);
    progressTimer.current = setInterval(() => {
      setProgressValue((val) => Math.min(val + Math.random() * 10, 92));
    }, 420);
  };

  const stopProgress = (value = 100) => {
    if (progressTimer.current) clearInterval(progressTimer.current);
    setProgressValue(value);
    setTimeout(() => setProgressValue(0), 600);
  };

  const handleGenerateAnswers = async () => {
    const selectedQuestions = questions.filter((q) => q.selected);
    const questionsForPrompt = selectedQuestions.map((q) => {
      const note = reviewNotes[q.id];
      return note?.trim()
        ? `${q.question}\nКомментарий редактора: ${note}`
        : q.question;
    });

    if (questionsForPrompt.length === 0) {
      setError('Выберите хотя бы один вопрос');
      return;
    }

    setIsGenerating(true);
    setError('');
    setStep('answers');
    startProgress();

    try {
      const faqs = await generateAnswers(questionsForPrompt, sourceText, faqData);
      const withIds: ExtendedFAQ[] = faqs.map((faq, index) => ({
        ...faq,
        id: selectedQuestions[index]?.id || `${faq.question}-${index}`,
      }));
      setGeneratedFAQs(withIds);
      setStep('result');
    } catch (err: any) {
      setError(err.message || 'Произошла ошибка при генерации ответов');
      setStep('questions');
    } finally {
      stopProgress();
      setIsGenerating(false);
    }
  };

  const handleApplyFixes = async () => {
    const toFix = generatedFAQs.filter((faq) => reviewNotes[faq.id]?.trim());
    if (toFix.length === 0) {
      setError('Добавьте комментарии к вопросам, которые нужно исправить');
      return;
    }

    setIsGenerating(true);
    setError('');
    setStep('answers');
    startProgress();

    try {
      const fixPrompts = toFix.map((faq) => `${faq.question}\nКомментарий редактора: ${reviewNotes[faq.id]}`);
      const fixed = await generateAnswers(fixPrompts, sourceText, faqData);
      setGeneratedFAQs((prev) =>
        prev.map((faq) => {
          const idx = toFix.findIndex((item) => item.id === faq.id);
          return idx !== -1 ? { ...faq, answer: fixed[idx].answer } : faq;
        })
      );
      setStep('result');
    } catch (err: any) {
      setError(err.message || 'Не удалось применить исправления. Попробуйте снова.');
      setStep('result');
    } finally {
      stopProgress();
      setIsGenerating(false);
    }
  };

  const handleExport = () => {
    const text = generatedFAQs
      .map((faq, i) => `${i + 1}. ${faq.question}\n${faq.answer}\n\n`)
      .join('');

    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `kaspi-faq-${Date.now()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleCopy = () => {
    const text = generatedFAQs
      .map((faq, i) => `${i + 1}. ${faq.question}\n${faq.answer}\n`)
      .join('\n');

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleReset = () => {
    uploads.forEach((u) => u.preview && URL.revokeObjectURL(u.preview));
    setSourceText('');
    setQuestions([]);
    setGeneratedFAQs([]);
    setError('');
    setStep('input');
    setManualQuestion('');
    setUploads([]);
    setReviewNotes({});
  };

  const formatFileSize = (size: number) => {
    if (size >= 1_048_576) return `${(size / 1_048_576).toFixed(1)} МБ`;
    return `${Math.round(size / 1024)} КБ`;
  };

  const handleFilesSelect = (files: FileList | File[] | null, kind?: 'doc' | 'image') => {
    const normalized = files ? (Array.isArray(files) ? files : Array.from(files)) : [];
    if (!normalized.length) return;

    const newItems: UploadItem[] = [];

    normalized.forEach((file) => {
      const detectedKind =
        kind || (acceptedDocs.includes(file.type) ? 'doc' : acceptedImages.includes(file.type) ? 'image' : null);

      if (!detectedKind) {
        setError('Поддерживаются .pdf, .docx, .jpg и .png');
        return;
      }

      const maxSize = detectedKind === 'doc' ? 10 * 1024 * 1024 : 20 * 1024 * 1024;
      if (file.size > maxSize) {
        setError(`Файл ${file.name} превышает лимит ${detectedKind === 'doc' ? '10 МБ' : '20 МБ'}`);
        return;
      }

      const item: UploadItem = {
        id: `${detectedKind}-${Date.now()}-${file.name}`,
        name: file.name,
        size: file.size,
        kind: detectedKind,
      };

      if (detectedKind === 'image') {
        item.preview = URL.createObjectURL(file);
      }

      newItems.push(item);
    });

    if (newItems.length) {
      setUploads((prev) => [...prev, ...newItems].slice(0, 20));
    }
  };

  const removeUpload = (id: string) => {
    setUploads((prev) => {
      const target = prev.find((u) => u.id === id);
      if (target?.preview) {
        URL.revokeObjectURL(target.preview);
      }
      return prev.filter((u) => u.id !== id);
    });
  };

  const handleAddManualQuestion = () => {
    if (!manualQuestion.trim()) return;
    const newQuestion: GeneratedQuestion = {
      id: `manual-${Date.now()}`,
      question: manualQuestion.trim(),
      selected: true,
    };
    setQuestions((prev) => [...prev, newQuestion]);
    setManualQuestion('');
  };

  const handleEditSubmit = (id: string) => {
    if (!editingQuestion) return;
    setQuestions((prev) =>
      prev.map((q) => (q.id === id ? { ...q, question: editingQuestion.text.trim() || q.question } : q))
    );
    setEditingQuestion(null);
  };

  const sortedQuestions = questions.map((q, index) => ({ ...q, order: index + 1 }));
  const selectedCount = questions.filter((q) => q.selected).length;

  useEffect(() => {
    uploadsRef.current = uploads;
  }, [uploads]);

  useEffect(() => {
    return () => {
      if (progressTimer.current) clearInterval(progressTimer.current);
      uploadsRef.current.forEach((u) => u.preview && URL.revokeObjectURL(u.preview));
    };
  }, []);

  return (
    <div className="min-h-screen bg-aurora relative overflow-hidden">
      <div className="absolute inset-0 gradient-mesh opacity-60 pointer-events-none" />

      <div className="relative max-w-5xl mx-auto px-4 py-10 md:py-14 space-y-6">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="card px-6 py-6 md:px-8 md:py-7"
        >
          <h1 className="text-3xl md:text-4xl font-display font-bold text-kaspi-dark">
            Генератор вопросов и ответов
          </h1>
          <p className="text-sm md:text-base text-kaspi-gray mt-2">
            Автоматическая подготовка FAQ для Kaspi Гид с помощью AI
          </p>
        </motion.div>

        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="card border border-red-100 bg-red-50/80 px-4 py-3 text-red-700"
            >
              <p className="font-semibold text-red-700">{error}</p>
            </motion.div>
          )}
        </AnimatePresence>

        {step === 'input' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="card px-6 py-6 md:px-8 md:py-8 space-y-6"
          >
            <div className="space-y-1">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-kaspi-gray">Шаг 1</p>
              <h2 className="text-2xl md:text-3xl font-display font-semibold text-kaspi-dark">
                Загрузите информацию о продукте
              </h2>
              <p className="text-sm text-kaspi-gray">
                Вставьте текст, загрузите файлы или изображения
              </p>
            </div>

            <div className="space-y-2">
              <textarea
                ref={textareaRef}
                value={sourceText}
                onChange={(e) => setSourceText(e.target.value.slice(0, 10000))}
                placeholder="Вставьте текст с информацией о продукте или функции..."
                className="w-full min-h-[220px] px-4 py-3 rounded-2xl border border-slate-200 bg-white text-kaspi-dark resize-none focus:border-kaspi-red focus:ring-2 focus:ring-kaspi-red/20 transition"
              />
              <p className="text-xs text-kaspi-gray">
                {sourceText.length}/10 000 символов · переносы строк сохранятся
              </p>
            </div>

            <div
              className="rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/70 px-4 py-10 text-center transition hover:border-kaspi-red/50"
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                handleFilesSelect(e.dataTransfer.files);
              }}
            >
              <div className="mx-auto mb-3 w-16 h-16 rounded-full bg-white shadow-sm flex items-center justify-center text-amber-500">
                <Folder className="w-8 h-8" />
              </div>
              <p className="text-sm font-semibold text-kaspi-dark">Перетащите файлы сюда или нажмите для выбора</p>
              <p className="text-xs text-kaspi-gray mt-1">
                Поддерживаются: .docx, .pdf (до 10 МБ) и изображения .jpg, .png (до 20 МБ)
              </p>
              <label className="inline-flex mt-4 items-center justify-center px-4 py-2 rounded-full bg-white border border-slate-200 text-sm font-semibold text-kaspi-gray cursor-pointer hover:border-kaspi-red/40">
                <input
                  type="file"
                  accept=".pdf,.docx,image/png,image/jpeg"
                  multiple
                  className="hidden"
                  onChange={(e) => handleFilesSelect(e.target.files)}
                />
                Выбрать файлы
              </label>
            </div>

            {uploads.length > 0 && (
              <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4 space-y-3">
                <div className="flex items-center justify-between text-xs text-kaspi-gray">
                  <span>Загружено {uploads.length} / 20</span>
                  <span>Документы до 10 МБ · Изображения до 20 МБ</span>
                </div>
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {uploads.map((file) => (
                    <div
                      key={file.id}
                      className="flex items-center gap-3 rounded-xl bg-white px-3 py-2 border border-slate-200"
                    >
                      <div className="w-10 h-10 rounded-xl bg-kaspi-red/10 flex items-center justify-center">
                        {file.kind === 'doc' ? (
                          <FileText className="w-5 h-5 text-kaspi-red" />
                        ) : (
                          <ImageIcon className="w-5 h-5 text-kaspi-red" />
                        )}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-kaspi-dark truncate">{file.name}</p>
                        <p className="text-xs text-kaspi-gray">{formatFileSize(file.size)}</p>
                      </div>
                      <button
                        onClick={() => removeUpload(file.id)}
                        className="text-kaspi-gray hover:text-kaspi-red"
                        aria-label="Удалить файл"
                      >
                        <Trash className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <p className="text-sm text-kaspi-gray">
                Поддерживаются русский, казахский и английский · до 10 000 символов
              </p>
              <button
                onClick={handleGenerateQuestions}
                disabled={!sourceText.trim() || isGenerating}
                className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 self-start sm:self-auto"
              >
                {isGenerating ? (
                  <>
                    <div className="spinner w-5 h-5 border-2" />
                    <span>Генерация...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5" />
                    <span>Подготовить вопросы</span>
                  </>
                )}
              </button>
            </div>
          </motion.div>
        )}

        {step === 'questions' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="card px-6 py-6 md:px-8 md:py-8 space-y-6"
          >
            <div className="flex flex-col gap-1">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-kaspi-gray">Шаг 2</p>
              <h2 className="text-2xl md:text-3xl font-display font-semibold text-kaspi-dark">
                Выберите и отредактируйте вопросы
              </h2>
              <p className="text-sm text-kaspi-gray">
                AI сгенерировал {questions.length} вопросов на основе загруженной информации
              </p>
            </div>

            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
              <div className="flex items-center gap-2 text-sm text-kaspi-dark">
                <CheckSquare className="w-5 h-5 text-kaspi-red" />
                <span>Выбрано: {selectedCount} из {questions.length}</span>
              </div>
              <div className="flex flex-wrap gap-2">
                <button onClick={selectAll} className="btn-secondary text-sm">
                  Выбрать все
                </button>
                <button onClick={deselectAll} className="btn-ghost text-sm">
                  Снять все
                </button>
              </div>
            </div>

            <div className="space-y-2 max-h-[28rem] overflow-y-auto pr-1">
              {sortedQuestions.map((q) => (
                <label
                  key={q.id}
                  className="group flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50/70 px-4 py-3 cursor-pointer hover:border-kaspi-red/30 transition"
                >
                  <input
                    type="checkbox"
                    checked={q.selected}
                    onChange={() => toggleQuestion(q.id)}
                    className="mt-1 w-5 h-5 text-kaspi-red rounded focus:ring-kaspi-red"
                  />
                  <div className="flex-1">
                    {editingQuestion?.id === q.id ? (
                      <div className="flex items-center gap-2">
                        <input
                          value={editingQuestion.text}
                          onChange={(e) => setEditingQuestion({ id: q.id, text: e.target.value })}
                          onBlur={() => handleEditSubmit(q.id)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleEditSubmit(q.id);
                            if (e.key === 'Escape') setEditingQuestion(null);
                          }}
                          autoFocus
                          className="w-full input text-sm"
                        />
                        <button
                          onClick={() => handleEditSubmit(q.id)}
                          className="btn-secondary text-xs px-3 py-2"
                        >
                          Сохранить
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-start gap-2">
                        <p className="text-kaspi-dark font-medium leading-relaxed">
                          {q.order}. {q.question}
                        </p>
                        <button
                          type="button"
                          onClick={() => setEditingQuestion({ id: q.id, text: q.question })}
                          className="text-kaspi-gray hover:text-kaspi-red"
                          aria-label="Редактировать"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                    <p className="text-xs text-kaspi-gray mt-1">
                      AI предложил вопрос · можно изменить формулировку
                    </p>
                  </div>
                  {q.selected && <Check className="w-5 h-5 text-kaspi-red" />}
                </label>
              ))}
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-4 space-y-2">
              <p className="text-sm font-semibold text-kaspi-dark">Добавьте свои вопросы</p>
              <div className="flex flex-col sm:flex-row gap-3">
                <input
                  value={manualQuestion}
                  onChange={(e) => setManualQuestion(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddManualQuestion()}
                  placeholder="Например: Как продлить подписку?"
                  className="input flex-1"
                />
                <button onClick={handleAddManualQuestion} className="btn-primary flex items-center gap-2">
                  <Plus className="w-5 h-5" />
                  <span>Добавить</span>
                </button>
              </div>
              <p className="text-xs text-kaspi-gray">Новый вопрос сразу будет выбран</p>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <button
                onClick={() => setStep('input')}
                className="btn-ghost flex items-center gap-2 self-start sm:self-auto"
              >
                <ArrowLeft className="w-5 h-5" />
                <span>Назад к тексту</span>
              </button>
              <button
                onClick={handleGenerateAnswers}
                disabled={selectedCount === 0 || isGenerating}
                className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 self-start sm:self-auto"
              >
                <Sparkles className="w-5 h-5" />
                <span>Подготовить ответы ({selectedCount})</span>
              </button>
            </div>
          </motion.div>
        )}

        {step === 'answers' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="card px-6 py-10 md:px-10 text-center space-y-4"
          >
            <div className="spinner w-16 h-16 border-4 mx-auto" />
            <div className="space-y-1">
              <h2 className="text-2xl font-display font-bold text-kaspi-dark">Генерация ответов...</h2>
              <p className="text-kaspi-gray">AI создаёт ответы в тоне Kaspi Гид. Это займёт пару секунд.</p>
            </div>
            <div className="max-w-xl mx-auto text-left space-y-2">
              <div className="flex items-center justify-between text-xs text-kaspi-gray">
                <span>Прогресс</span>
                <span>{Math.round(progressValue)}%</span>
              </div>
              <div className="w-full h-2 rounded-full bg-slate-200">
                <div
                  className="h-2 rounded-full bg-gradient-kaspi transition-all duration-300"
                  style={{ width: `${Math.min(progressValue, 100)}%` }}
                />
              </div>
              <p className="text-xs text-kaspi-gray">
                {selectedCount} вопросов в очереди · автостоп через 60 секунд
              </p>
            </div>
          </motion.div>
        )}

        {step === 'result' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="card px-6 py-6 md:px-8 md:py-8 space-y-5"
          >
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-kaspi-gray">Шаг 3</p>
                <h2 className="text-2xl md:text-3xl font-display font-semibold text-kaspi-dark mt-1">
                  Проверьте результат
                </h2>
                <p className="text-sm text-kaspi-gray">
                  AI создал ответы с учётом чек-листа контент-менеджера и стиля Kaspi Гид
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={handleCopy}
                  className="btn-secondary flex items-center gap-2"
                >
                  {copied ? (
                    <>
                      <Check className="w-5 h-5" />
                      <span>Скопировано</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-5 h-5" />
                      <span>Копировать</span>
                    </>
                  )}
                </button>
                <button
                  onClick={handleExport}
                  className="btn-primary flex items-center gap-2"
                >
                  <Download className="w-5 h-5" />
                  <span>Скачать</span>
                </button>
              </div>
            </div>

            <div className="space-y-4 max-h-[28rem] overflow-y-auto pr-1">
              {generatedFAQs.map((faq, index) => (
                <div key={faq.id} className="rounded-xl border border-slate-200 bg-slate-50/80 p-5 shadow-sm space-y-2">
                  <h3 className="font-display font-semibold text-lg text-kaspi-dark">
                    {index + 1}. {faq.question}
                  </h3>
                  <p className="text-kaspi-dark whitespace-pre-line leading-relaxed">
                    {faq.answer}
                  </p>
                  <div className="space-y-1">
                    <label className="text-xs text-kaspi-gray">Комментарий для исправления</label>
                    <textarea
                      value={reviewNotes[faq.id] || ''}
                      onChange={(e) =>
                        setReviewNotes((prev) => ({
                          ...prev,
                          [faq.id]: e.target.value,
                        }))
                      }
                      placeholder="Напишите, что нужно поправить: добавить сроки, упростить формулировку, убрать лишнее..."
                      className="w-full min-h-[80px] px-3 py-2 border border-slate-200 rounded-lg bg-white text-sm focus:border-kaspi-red focus:outline-none"
                    />
                  </div>
                </div>
              ))}
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={handleApplyFixes}
                  disabled={isGenerating}
                  className="btn-secondary flex items-center gap-2 disabled:opacity-60"
                >
                  <Repeat className="w-5 h-5" />
                  <span>Применить исправления</span>
                </button>
                <button
                  onClick={handleReset}
                  className="btn-ghost flex items-center gap-2"
                >
                  <ArrowLeft className="w-5 h-5" />
                  <span>Создать новый FAQ</span>
                </button>
              </div>
              <p className="text-xs text-kaspi-gray">Готово: {generatedFAQs.length} ответов</p>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default HomePage;
