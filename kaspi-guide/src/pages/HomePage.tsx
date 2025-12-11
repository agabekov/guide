import React, { useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Sparkles, FileText, CheckSquare, Download, ArrowLeft, ArrowRight, Copy, Check } from 'lucide-react';
import { generateQuestions, generateAnswers, type GeneratedQuestion, type GeneratedFAQ } from '../services/geminiService';
import faqData from '../data/faq.json';

type StepKey = 'input' | 'questions' | 'answers' | 'result';

const stepsFlow: Array<{ key: StepKey; number: number; title: string; description: string }> = [
  {
    key: 'input',
    number: 1,
    title: 'Исходный текст',
    description: 'Вставьте выдержку из инструкции, правил или кампании',
  },
  {
    key: 'questions',
    number: 2,
    title: 'Выбор вопросов',
    description: 'Отметьте только важные для клиента формулировки',
  },
  {
    key: 'answers',
    number: 3,
    title: 'Генерация ответов',
    description: 'AI пишет в тоне Kaspi, без воды и повтора',
  },
  {
    key: 'result',
    number: 4,
    title: 'Результат',
    description: 'Сохраните готовый FAQ или скопируйте текст',
  },
];

const HomePage: React.FC = () => {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const [sourceText, setSourceText] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [step, setStep] = useState<StepKey>('input');
  const [questions, setQuestions] = useState<GeneratedQuestion[]>([]);
  const [generatedFAQs, setGeneratedFAQs] = useState<GeneratedFAQ[]>([]);
  const [error, setError] = useState<string>('');
  const [copied, setCopied] = useState(false);

  const handleGenerateQuestions = async () => {
    if (!sourceText.trim()) return;

    setIsGenerating(true);
    setError('');

    try {
      const generated = await generateQuestions(sourceText, faqData);
      setQuestions(generated);
      setStep('questions');
    } catch (err: any) {
      setError(err.message || 'Произошла ошибка при генерации вопросов');
    } finally {
      setIsGenerating(false);
    }
  };

  const toggleQuestion = (id: string) => {
    setQuestions(prev => prev.map(q =>
      q.id === id ? { ...q, selected: !q.selected } : q
    ));
  };

  const selectAll = () => {
    setQuestions(prev => prev.map(q => ({ ...q, selected: true })));
  };

  const deselectAll = () => {
    setQuestions(prev => prev.map(q => ({ ...q, selected: false })));
  };

  const handleGenerateAnswers = async () => {
    const selectedQuestions = questions.filter(q => q.selected).map(q => q.question);

    if (selectedQuestions.length === 0) {
      setError('Выберите хотя бы один вопрос');
      return;
    }

    setIsGenerating(true);
    setError('');
    setStep('answers');

    try {
      const faqs = await generateAnswers(selectedQuestions, sourceText, faqData);
      setGeneratedFAQs(faqs);
      setStep('result');
    } catch (err: any) {
      setError(err.message || 'Произошла ошибка при генерации ответов');
      setStep('questions');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleExport = () => {
    const text = generatedFAQs.map((faq, i) =>
      `${i + 1}. ${faq.question}\n${faq.answer}\n\n`
    ).join('');

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
    const text = generatedFAQs.map((faq, i) =>
      `${i + 1}. ${faq.question}\n${faq.answer}\n`
    ).join('\n');

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleReset = () => {
    setSourceText('');
    setQuestions([]);
    setGeneratedFAQs([]);
    setError('');
    setStep('input');
  };

  const selectedCount = questions.filter(q => q.selected).length;
  const currentStepIndex = stepsFlow.findIndex((item) => item.key === step);

  const scrollToInput = () => {
    setStep('input');
    setTimeout(() => {
      textareaRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      textareaRef.current?.focus();
    }, 50);
  };

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-aurora">
        <div className="absolute inset-0 opacity-70 gradient-mesh" />
        <div className="section-container relative pt-16 pb-12 md:pb-16">
          <div className="grid items-center gap-10 lg:grid-cols-[1.05fr_0.95fr]">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              <div className="pill bg-white/90 shadow-sm">
                <Sparkles className="w-4 h-4 text-kaspi-red" />
                <span className="text-sm font-semibold text-kaspi-dark">
                  Kaspi Guide · AI
                </span>
              </div>

              <div className="space-y-3">
                <h1 className="text-4xl sm:text-5xl font-display font-bold leading-tight text-kaspi-dark">
                  Сервис для быстрого создания FAQ в стиле Kaspi.kz
                </h1>
                <p className="text-lg text-kaspi-gray max-w-3xl">
                  Превратите инструкцию или текст кампании в готовую базу вопросов и ответов, сохранив фирменные формулировки и тон общения Kaspi.
                </p>
              </div>

              <div className="grid sm:grid-cols-2 gap-3">
                <div className="flex items-center gap-3 rounded-xl border border-white/70 bg-white/80 px-4 py-3 shadow-sm">
                  <FileText className="w-5 h-5 text-kaspi-red" />
                  <div>
                    <p className="font-semibold text-kaspi-dark">Понимает длинные тексты</p>
                    <p className="text-sm text-kaspi-gray">Можно вставить инструкцию целиком</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 rounded-xl border border-white/70 bg-white/80 px-4 py-3 shadow-sm">
                  <CheckSquare className="w-5 h-5 text-kaspi-red" />
                  <div>
                    <p className="font-semibold text-kaspi-dark">Чистый тон Kaspi</p>
                    <p className="text-sm text-kaspi-gray">Без лишней воды и повтора</p>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <button
                  onClick={scrollToInput}
                  className="btn-primary shine flex items-center gap-2"
                >
                  <Sparkles className="w-5 h-5" />
                  <span>Начать с текста</span>
                </button>
                <Link to="/examples" className="btn-secondary flex items-center gap-2">
                  <ArrowRight className="w-5 h-5" />
                  <span>Смотреть примеры FAQ</span>
                </Link>
                <span className="text-sm text-kaspi-gray">
                  Без регистрации и лишних экранов
                </span>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="card relative p-6 md:p-7 overflow-hidden shadow-xl"
            >
              <div className="absolute -right-16 -top-20 w-52 h-52 bg-gradient-kaspi rounded-full blur-3xl opacity-20" />
              <div className="absolute -left-10 -bottom-10 w-48 h-48 bg-kaspi-accent/30 rounded-full blur-3xl opacity-60" />
              <div className="relative space-y-5">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-kaspi-gray">
                      Процесс
                    </p>
                    <p className="text-2xl font-display font-bold text-kaspi-dark">
                      Шаг {currentStepIndex + 1} из 4
                    </p>
                  </div>
                  <div className="pill bg-white/90">
                    <Check className="w-4 h-4 text-kaspi-red" />
                    <span className="text-sm text-kaspi-dark">
                      {selectedCount} выбрано
                    </span>
                  </div>
                </div>

                <div className="space-y-3">
                  {stepsFlow.map((item) => {
                    const index = stepsFlow.findIndex((flow) => flow.key === item.key);
                    const isActive = currentStepIndex === index;
                    const isCompleted = currentStepIndex > index;

                    return (
                      <div
                        key={item.key}
                        className={`flex items-start gap-3 rounded-xl border px-4 py-3 transition-all ${
                          isActive
                            ? 'border-kaspi-red/35 bg-white shadow-md shadow-[0_12px_30px_-18px_rgba(226,59,59,0.35)]'
                            : isCompleted
                            ? 'border-green-200/80 bg-green-50/80'
                            : 'border-white/70 bg-white/80'
                        }`}
                      >
                        <div
                          className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold ${
                            isActive
                              ? 'bg-kaspi-red text-white'
                              : isCompleted
                              ? 'bg-kaspi-success text-white'
                              : 'bg-gray-100 text-kaspi-gray'
                          }`}
                        >
                          {isCompleted ? <Check className="w-5 h-5" /> : item.number}
                        </div>
                        <div className="flex-1">
                          <p className={`text-sm font-semibold ${isActive ? 'text-kaspi-red' : 'text-kaspi-dark'}`}>
                            {item.title}
                          </p>
                          <p className="text-xs text-kaspi-gray">
                            {item.description}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="grid grid-cols-2 gap-3 pt-2">
                  <div className="rounded-xl bg-white/80 border border-white/70 p-4 shadow-sm">
                    <p className="text-xs text-kaspi-gray">Вопросов</p>
                    <p className="text-xl font-display font-bold text-kaspi-dark">
                      {questions.length || '—'}
                    </p>
                  </div>
                  <div className="rounded-xl bg-white/80 border border-white/70 p-4 shadow-sm">
                    <p className="text-xs text-kaspi-gray">Готовых ответов</p>
                    <p className="text-xl font-display font-bold text-kaspi-dark">
                      {generatedFAQs.length || '—'}
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <section className="section-container relative z-10 -mt-10">
        <div className="max-w-5xl mx-auto">
          {/* Step Indicator */}
          <div className="mb-8">
            <div className="card p-5 sm:p-6">
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:gap-3">
                {stepsFlow.map((item, index) => (
                  <React.Fragment key={item.key}>
                    <StepIndicator
                      number={item.number}
                      title={item.title}
                      description={item.description}
                      isActive={step === item.key}
                      isCompleted={currentStepIndex > index}
                    />
                    {index < stepsFlow.length - 1 && (
                      <div className="hidden md:block flex-1 h-px bg-gradient-to-r from-transparent via-kaspi-red/30 to-transparent" />
                    )}
                  </React.Fragment>
                ))}
              </div>
            </div>
          </div>

          {/* Error Message */}
          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg"
              >
                <p className="text-red-700 font-semibold">{error}</p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Step 1: Input Text */}
          {step === 'input' && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="card p-6 sm:p-8 relative overflow-hidden"
            >
              <div className="absolute inset-0 pointer-events-none bg-gradient-to-br from-white/85 via-kaspi-sand/60 to-white" />
              <div className="relative space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-kaspi-red/10 flex items-center justify-center">
                      <FileText className="w-6 h-6 text-kaspi-red" />
                    </div>
                    <div>
                      <h2 className="text-2xl font-display font-bold text-kaspi-dark">
                        Вставьте исходный текст
                      </h2>
                      <p className="text-sm text-kaspi-gray">
                        Лучше всего подходит инструкция, условия кампании или FAQ из документации
                      </p>
                    </div>
                  </div>
                  <div className="pill">
                    <Sparkles className="w-4 h-4 text-kaspi-red" />
                    <span className="text-sm">AI очистит шум и повторы</span>
                  </div>
                </div>

                <textarea
                  ref={textareaRef}
                  value={sourceText}
                  onChange={(e) => setSourceText(e.target.value)}
                  placeholder="Вставьте текст здесь..."
                  className="w-full min-h-[22rem] px-4 py-3 border border-kaspi-sand rounded-xl resize-none focus:border-kaspi-red focus:outline-none transition-colors font-body text-kaspi-dark bg-white/90 shadow-inner"
                />

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <p className="text-sm text-kaspi-gray">
                    {sourceText.length} символов · Поддерживаются русский, казахский и английский
                  </p>
                  <button
                    onClick={handleGenerateQuestions}
                    disabled={!sourceText.trim() || isGenerating}
                    className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
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
              </div>
            </motion.div>
          )}

          {/* Step 2: Select Questions */}
          {step === 'questions' && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="card p-6 sm:p-8"
            >
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-kaspi-red/10 flex items-center justify-center">
                    <CheckSquare className="w-6 h-6 text-kaspi-red" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-display font-bold text-kaspi-dark">
                      Выберите вопросы
                    </h2>
                    <p className="text-sm text-kaspi-gray">
                      Выбрано: {selectedCount} из {questions.length}
                    </p>
                  </div>
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

              <div className="space-y-3 mb-6 max-h-[28rem] overflow-y-auto pr-1">
                {questions.map((q, index) => (
                  <label
                    key={q.id}
                    className={`group flex items-start gap-3 p-4 rounded-xl border cursor-pointer transition-all ${
                      q.selected
                        ? 'border-kaspi-red/50 bg-white shadow-sm shadow-[0_10px_24px_-18px_rgba(226,59,59,0.3)]'
                        : 'border-white/70 bg-white/80 hover:border-kaspi-red/25'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={q.selected}
                      onChange={() => toggleQuestion(q.id)}
                      className="mt-1 w-5 h-5 text-kaspi-red rounded focus:ring-kaspi-red"
                    />
                    <div className="flex-1">
                      <p className="text-kaspi-dark font-medium leading-relaxed">
                        {index + 1}. {q.question}
                      </p>
                      <p className="text-xs text-kaspi-gray mt-1">
                        AI предложил вопрос на основе вашего текста
                      </p>
                    </div>
                    {q.selected && (
                      <Check className="w-5 h-5 text-kaspi-red" />
                    )}
                  </label>
                ))}
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <button
                  onClick={() => setStep('input')}
                  className="btn-ghost flex items-center gap-2"
                >
                  <ArrowLeft className="w-5 h-5" />
                  <span>Назад к тексту</span>
                </button>
                <button
                  onClick={handleGenerateAnswers}
                  disabled={selectedCount === 0 || isGenerating}
                  className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  <Sparkles className="w-5 h-5" />
                  <span>Подготовить ответы ({selectedCount})</span>
                </button>
              </div>
            </motion.div>
          )}

          {/* Step 3: Generating Answers */}
          {step === 'answers' && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="card p-8 text-center"
            >
              <div className="spinner w-16 h-16 border-4 mx-auto mb-6" />
              <h2 className="text-2xl font-display font-bold text-kaspi-dark mb-2">
                Генерация ответов...
              </h2>
              <p className="text-kaspi-gray">
                AI создает ответы в стиле Kaspi FAQ. Это может занять некоторое время.
              </p>
            </motion.div>
          )}

          {/* Step 4: Result */}
          {step === 'result' && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="card p-6 sm:p-8"
            >
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-green-100 flex items-center justify-center">
                    <Check className="w-6 h-6 text-green-600" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-display font-bold text-kaspi-dark">
                      Готово!
                    </h2>
                    <p className="text-sm text-kaspi-gray">
                      {generatedFAQs.length} FAQ успешно сгенерировано
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={handleCopy}
                    className="btn-secondary flex items-center gap-2"
                  >
                    {copied ? (
                      <>
                        <Check className="w-5 h-5" />
                        <span>Скопировано!</span>
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

              <div className="space-y-4 mb-6 max-h-[28rem] overflow-y-auto pr-1">
                {generatedFAQs.map((faq, index) => (
                  <div key={index} className="rounded-xl border border-kaspi-sand bg-white/85 p-5 shadow-sm">
                    <h3 className="font-display font-bold text-lg text-kaspi-dark mb-2">
                      {index + 1}. {faq.question}
                    </h3>
                    <p className="text-kaspi-dark whitespace-pre-line leading-relaxed">
                      {faq.answer}
                    </p>
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-center">
                <button
                  onClick={handleReset}
                  className="btn-ghost flex items-center gap-2"
                >
                  <ArrowLeft className="w-5 h-5" />
                  <span>Создать новый FAQ</span>
                </button>
              </div>
            </motion.div>
          )}
        </div>
      </section>

      {/* Info Section */}
      {step === 'input' && (
        <section className="section-container pt-0">
          <div className="max-w-5xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="card p-8 gradient-mesh"
            >
              <h2 className="text-3xl font-display font-bold text-kaspi-dark text-center mb-10">
                Как это работает?
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
                <FeatureCard
                  icon={FileText}
                  title="1. Вставьте текст"
                  description="Добавьте исходный текст из документации Kaspi"
                />
                <FeatureCard
                  icon={Sparkles}
                  title="2. Генерация вопросов"
                  description="AI анализирует текст и создает релевантные вопросы"
                />
                <FeatureCard
                  icon={CheckSquare}
                  title="3. Выберите вопросы"
                  description="Отметьте нужные вопросы для генерации ответов"
                />
                <FeatureCard
                  icon={Download}
                  title="4. Получите FAQ"
                  description="Экспортируйте готовые вопросы и ответы"
                />
              </div>
            </motion.div>
          </div>
        </section>
      )}
    </div>
  );
};

// Helper Components
interface StepIndicatorProps {
  number: number;
  title: string;
  description?: string;
  isActive: boolean;
  isCompleted: boolean;
}

const StepIndicator: React.FC<StepIndicatorProps> = ({ number, title, description, isActive, isCompleted }) => {
  return (
    <div
      className={`flex-1 min-w-[180px] rounded-xl border px-4 py-3 transition-all ${
        isActive
          ? 'border-kaspi-red/40 bg-white shadow-sm shadow-[0_10px_24px_-18px_rgba(226,59,59,0.3)]'
          : isCompleted
          ? 'border-green-200/70 bg-green-50/80'
          : 'border-white/70 bg-white/80'
      }`}
    >
      <div className="flex items-center gap-3">
        <div
          className={`w-11 h-11 rounded-xl flex items-center justify-center font-bold ${
            isCompleted
              ? 'bg-kaspi-success text-white'
              : isActive
              ? 'bg-kaspi-red text-white'
              : 'bg-gray-100 text-kaspi-gray'
          }`}
        >
          {isCompleted ? <Check className="w-5 h-5" /> : number}
        </div>
        <div className="flex-1">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-kaspi-gray">Шаг {number}</p>
          <p className={`text-sm font-semibold ${isActive ? 'text-kaspi-red' : 'text-kaspi-dark'}`}>
            {title}
          </p>
        </div>
      </div>
      {description && (
        <p className="text-xs text-kaspi-gray mt-2">
          {description}
        </p>
      )}
    </div>
  );
};

interface FeatureCardProps {
  icon: React.ElementType;
  title: string;
  description: string;
}

const FeatureCard: React.FC<FeatureCardProps> = ({ icon: Icon, title, description }) => {
  return (
    <div className="relative rounded-2xl border border-white/60 bg-white/80 p-6 shadow-sm overflow-hidden">
      <div className="absolute inset-x-0 top-0 h-1 bg-gradient-kaspi" />
      <div className="w-12 h-12 rounded-xl bg-kaspi-red/10 flex items-center justify-center mb-4">
        <Icon className="w-6 h-6 text-kaspi-red" />
      </div>
      <h3 className="font-display font-bold text-kaspi-dark mb-2">
        {title}
      </h3>
      <p className="text-sm text-kaspi-gray leading-relaxed">
        {description}
      </p>
    </div>
  );
};

export default HomePage;
