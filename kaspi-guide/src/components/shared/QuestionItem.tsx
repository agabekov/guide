import { useState } from 'react';
import type { Question } from '../../types';

interface QuestionItemProps {
  question: Question;
  index: number;
  onToggle: () => void;
  onEdit: (newText: string) => void;
}

export const QuestionItem: React.FC<QuestionItemProps> = ({
  question,
  index,
  onToggle,
  onEdit,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(question.text);

  const handleSave = () => {
    if (editText.trim() && editText !== question.text) {
      onEdit(editText.trim());
    }
    setIsEditing(false);
  };

  return (
    <div className={`question-item ${isEditing ? 'editing' : ''}`}>
      <input
        type="checkbox"
        className="checkbox"
        checked={question.selected}
        onChange={onToggle}
      />
      <div className="question-content">
        {!isEditing ? (
          <>
            <span className="question-number">{index + 1}.</span>
            <span className="question-text" onClick={() => setIsEditing(true)}>
              {question.text}
            </span>
            {question.edited && <span className="edit-icon">✏️</span>}
          </>
        ) : (
          <input
            type="text"
            className="question-input"
            value={editText}
            onChange={(e) => setEditText(e.target.value)}
            onBlur={handleSave}
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                handleSave();
              }
            }}
            autoFocus
          />
        )}
      </div>
    </div>
  );
};
