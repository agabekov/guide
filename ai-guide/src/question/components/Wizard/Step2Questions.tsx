import { QuestionItem, StatCard } from '../shared';
import type { Question } from '../../types';

interface Step2QuestionsProps {
  questions: Question[];
  onToggleQuestion: (index: number) => void;
  onEditQuestion: (index: number, newText: string) => void;
  onAddCustomQuestion: (text: string) => void;
  onBackToStep1: () => void;
  onGenerateAnswers: () => void;
  stats: {
    selected: number;
    edited: number;
    custom: number;
  };
  canGenerate: boolean;
}

export const Step2Questions: React.FC<Step2QuestionsProps> = ({
  questions,
  onToggleQuestion,
  onEditQuestion,
  onAddCustomQuestion,
  onBackToStep1,
  onGenerateAnswers,
  stats,
  canGenerate,
}) => {
  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      const input = e.currentTarget;
      if (input.value.trim()) {
        onAddCustomQuestion(input.value.trim());
        input.value = '';
      }
    }
  };

  return (
    <div className="card active">
      <div className="card-title">Шаг 2. Выберите и отредактируйте вопросы</div>

      <div>
        {questions.map((question, index) => (
          <QuestionItem
            key={question.id}
            question={question}
            index={index}
            onToggle={() => onToggleQuestion(index)}
            onEdit={(newText) => onEditQuestion(index, newText)}
          />
        ))}
      </div>

      <div className="add-question">
        <input
          type="text"
          placeholder="Добавьте свой вопрос и нажмите Enter..."
          onKeyPress={handleKeyPress}
        />
      </div>

      <div className="stats" style={{ marginTop: '24px' }}>
        <StatCard value={stats.selected} label="Выбрано вопросов" />
        <StatCard value={stats.edited} label="Отредактировано" />
        <StatCard value={stats.custom} label="Добавлено вручную" />
      </div>

      <div className="btn-group">
        <button className="btn btn-secondary" onClick={onBackToStep1}>
          ← Назад
        </button>
        <button className="btn btn-primary" onClick={onGenerateAnswers} disabled={!canGenerate}>
          ✨ Подготовить ответы
        </button>
      </div>
    </div>
  );
};
