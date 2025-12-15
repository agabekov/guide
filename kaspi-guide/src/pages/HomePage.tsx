import { useState, useEffect } from 'react';
import {
  Step1Input,
  Step2Questions,
  Step3Answers,
  Step4Edit,
  Step5Export,
  LoadingQuestions,
  LoadingAnswers,
  LoadingEdits,
} from '../components/Wizard';
import { Notification } from '../components/shared';
import type { WizardStep, UploadedFile, Question, QAPair } from '../types';
import { generateQuestions, generateAnswers } from '../services/groqService';
import faqDataRaw from '../data/faq.json';

const faqData = faqDataRaw as any[];

const HomePage: React.FC = () => {
  // Mode selection
  const [mode, setMode] = useState<'client' | 'business'>('client');

  // Apply mode class to body
  useEffect(() => {
    document.body.className = `mode-${mode}`;
  }, [mode]);

  // Step navigation
  const [currentStep, setCurrentStep] = useState<WizardStep>('step1');

  // Step 1: Input
  const [sourceText, setSourceText] = useState<string>('');
  const [files, setFiles] = useState<UploadedFile[]>([]);

  // Step 2: Questions
  const [questions, setQuestions] = useState<Question[]>([]);
  const [customQuestionCount, setCustomQuestionCount] = useState<number>(0);

  // Loading states
  const [progressValue, setProgressValue] = useState<number>(0);
  const [progressCurrent, setProgressCurrent] = useState<number>(0);
  const [progressTotal, setProgressTotal] = useState<number>(0);

  // Step 3-5: Results
  const [qaData, setQaData] = useState<QAPair[]>([]);
  const [editComments, setEditComments] = useState<Record<string, string>>({});

  // UI state
  const [notification, setNotification] = useState<string>('');
  const [showNotification, setShowNotification] = useState<boolean>(false);

  // File upload handling
  const handleFilesSelect = (fileList: FileList) => {
    Array.from(fileList).forEach((file) => {
      if (files.length >= 20) {
        alert('Максимум 20 файлов');
        return;
      }

      const isDoc = file.name.endsWith('.docx') || file.name.endsWith('.pdf');
      const isImage = file.name.endsWith('.jpg') || file.name.endsWith('.jpeg') || file.name.endsWith('.png');

      if (!isDoc && !isImage) {
        alert(`Формат файла ${file.name} не поддерживается`);
        return;
      }

      const maxSize = isDoc ? 10 * 1024 * 1024 : 20 * 1024 * 1024;
      if (file.size > maxSize) {
        alert(`Файл ${file.name} слишком большой`);
        return;
      }

      const newFile: UploadedFile = {
        id: `file-${Date.now()}-${Math.random()}`,
        name: file.name,
        size: file.size,
        type: isDoc ? 'doc' : 'image',
        file: file,
      };

      setFiles((prev) => [...prev, newFile]);
    });
  };

  const handleFileRemove = (fileId: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== fileId));
  };

  // Step 1 → Step 2: Generate Questions
  const handleGenerateQuestions = async () => {
    if (!sourceText.trim()) {
      alert('Пожалуйста, добавьте текст с информацией');
      return;
    }

    setCurrentStep('loadingQuestions');

    try {
      const generated = await generateQuestions(sourceText, faqData);
      const newQuestions: Question[] = generated.map((q) => ({
        id: q.id,
        text: q.question,
        selected: true,
        edited: false,
        custom: false,
      }));

      setQuestions(newQuestions);
      setCurrentStep('step2');
    } catch (error: any) {
      alert(error.message || 'Ошибка при генерации вопросов');
      setCurrentStep('step1');
    }
  };

  // Step 2: Question management
  const handleToggleQuestion = (index: number) => {
    setQuestions((prev) =>
      prev.map((q, i) => (i === index ? { ...q, selected: !q.selected } : q))
    );
  };

  const handleEditQuestion = (index: number, newText: string) => {
    setQuestions((prev) =>
      prev.map((q, i) =>
        i === index
          ? { ...q, text: newText, edited: true }
          : q
      )
    );
  };

  const handleAddCustomQuestion = (text: string) => {
    const newQuestion: Question = {
      id: `custom-${Date.now()}`,
      text: text,
      selected: true,
      edited: false,
      custom: true,
    };
    setQuestions((prev) => [...prev, newQuestion]);
    setCustomQuestionCount((prev) => prev + 1);
  };

  // Step 2 → Step 3: Generate Answers
  const handleGenerateAnswers = async () => {
    const selectedQuestions = questions.filter((q) => q.selected).map((q) => q.text);

    if (selectedQuestions.length === 0) {
      alert('Выберите хотя бы один вопрос');
      return;
    }

    setCurrentStep('loadingAnswers');
    setProgressValue(0);
    setProgressCurrent(0);
    setProgressTotal(selectedQuestions.length);

    try {
      const generated = await generateAnswers(
        selectedQuestions,
        sourceText,
        faqData,
        (current, total) => {
          // Реальный прогресс от API
          setProgressCurrent(current);
          setProgressTotal(total);
          setProgressValue((current / total) * 100);
        }
      );

      setProgressValue(100);

      const newQAData: QAPair[] = generated.map((faq, i) => ({
        id: `qa-${i}`,
        question: faq.question,
        answer: faq.answer,
      }));

      setQaData(newQAData);

      setTimeout(() => {
        setCurrentStep('step3');
        setProgressValue(0);
      }, 500);
    } catch (error: any) {
      alert(error.message || 'Ошибка при генерации ответов');
      setCurrentStep('step2');
    }
  };

  // Step 4: Apply Edits
  const handleApplyEdits = async () => {
    const commentsToApply = Object.entries(editComments).filter(([_, comment]) => comment.trim());

    if (commentsToApply.length === 0) {
      alert('Добавьте комментарии к ответам, которые нужно исправить');
      return;
    }

    setCurrentStep('loadingEdits');
    setProgressValue(0);
    setProgressCurrent(0);
    setProgressTotal(commentsToApply.length);

    try {
      // Get questions that need editing
      const questionsToEdit = commentsToApply.map(([qaId, comment]) => {
        const qa = qaData.find((q) => q.id === qaId);
        return `${qa?.question}\n[Комментарий редактора: ${comment}]`;
      });

      const regenerated = await generateAnswers(
        questionsToEdit,
        sourceText,
        faqData,
        (current, total) => {
          // Реальный прогресс от API
          setProgressCurrent(current);
          setProgressTotal(total);
          setProgressValue((current / total) * 100);
        }
      );

      setProgressValue(100);

      // Update only edited Q&A pairs
      setQaData((prev) =>
        prev.map((qa) => {
          const commentIndex = commentsToApply.findIndex(([id]) => id === qa.id);
          if (commentIndex !== -1) {
            return { ...qa, answer: regenerated[commentIndex].answer };
          }
          return qa;
        })
      );

      setEditComments({});

      setTimeout(() => {
        setCurrentStep('step3');
        setProgressValue(0);
      }, 500);
    } catch (error: any) {
      alert(error.message || 'Ошибка при исправлении ответов');
      setCurrentStep('step4');
    }
  };

  // Export functionality
  const handleCopy = () => {
    let text = '';
    qaData.forEach((qa, index) => {
      text += `${index + 1}. ${qa.question}\n\n${qa.answer}\n\n---\n\n`;
    });

    navigator.clipboard.writeText(text).then(() => {
      setNotification('Скопировано в буфер обмена!');
      setShowNotification(true);
    });
  };

  const handleDownload = () => {
    const today = new Date().toISOString().split('T')[0];
    alert(`Файл "Kaspi Гид_Вопросы_${today}.docx" был бы скачан в реальной версии`);
    setNotification('Файл готов к скачиванию!');
    setShowNotification(true);
  };

  // Statistics
  const getStats = () => {
    const selected = questions.filter((q) => q.selected).length;
    const edited = questions.filter((q) => q.edited).length;
    return {
      selected,
      edited,
      custom: customQuestionCount,
    };
  };

  return (
    <>
      <div className="header">
        <h1>Генератор вопросов и ответов</h1>
        <p>Автоматическая подготовка FAQ для Kaspi Гид с помощью AI</p>

        {/* Mode Toggle */}
        <div className="mode-toggle-container">
          <button
            className={`mode-toggle-btn ${mode === 'client' ? 'active' : ''}`}
            onClick={() => setMode('client')}
          >
            Клиентам
          </button>
          <button
            className={`mode-toggle-btn ${mode === 'business' ? 'active' : ''}`}
            onClick={() => setMode('business')}
          >
            Бизнесу
          </button>
        </div>
      </div>

      {/* Step 1: Input */}
      {currentStep === 'step1' && (
        <Step1Input
          sourceText={sourceText}
          files={files}
          onSourceTextChange={setSourceText}
          onFilesSelect={handleFilesSelect}
          onFileRemove={handleFileRemove}
          onGenerateQuestions={handleGenerateQuestions}
          canGenerate={sourceText.trim().length > 0}
        />
      )}

      {/* Loading Questions */}
      {currentStep === 'loadingQuestions' && <LoadingQuestions />}

      {/* Step 2: Questions */}
      {currentStep === 'step2' && (
        <Step2Questions
          questions={questions}
          onToggleQuestion={handleToggleQuestion}
          onEditQuestion={handleEditQuestion}
          onAddCustomQuestion={handleAddCustomQuestion}
          onBackToStep1={() => setCurrentStep('step1')}
          onGenerateAnswers={handleGenerateAnswers}
          stats={getStats()}
          canGenerate={questions.filter((q) => q.selected).length > 0}
        />
      )}

      {/* Loading Answers */}
      {currentStep === 'loadingAnswers' && (
        <LoadingAnswers
          progress={progressValue}
          current={progressCurrent}
          total={progressTotal}
        />
      )}

      {/* Step 3: Answers */}
      {currentStep === 'step3' && (
        <Step3Answers
          qaData={qaData}
          onEditAnswers={() => setCurrentStep('step4')}
          onToExport={() => setCurrentStep('step5')}
        />
      )}

      {/* Step 4: Edit */}
      {currentStep === 'step4' && (
        <Step4Edit
          qaData={qaData}
          editComments={editComments}
          onEditCommentChange={(qaId, comment) =>
            setEditComments((prev) => ({ ...prev, [qaId]: comment }))
          }
          onBackToStep3={() => setCurrentStep('step3')}
          onApplyEdits={handleApplyEdits}
          onSkipToExport={() => setCurrentStep('step5')}
        />
      )}

      {/* Loading Edits */}
      {currentStep === 'loadingEdits' && (
        <LoadingEdits
          progress={progressValue}
          current={progressCurrent}
          total={progressTotal}
        />
      )}

      {/* Step 5: Export */}
      {currentStep === 'step5' && (
        <Step5Export
          qaData={qaData}
          onCopy={handleCopy}
          onDownload={handleDownload}
        />
      )}

      {/* Notification */}
      <Notification
        message={notification}
        show={showNotification}
        onHide={() => setShowNotification(false)}
      />
    </>
  );
};

export default HomePage;
