import type { QAPair as QAPairType } from '../../types';

interface QAPairProps {
  qa: QAPairType;
  showEditSection?: boolean;
  editComment?: string;
  onEditCommentChange?: (comment: string) => void;
}

export const QAPair: React.FC<QAPairProps> = ({
  qa,
  showEditSection = false,
  editComment = '',
  onEditCommentChange,
}) => {
  return (
    <div className="qa-pair">
      <div className="qa-question">{qa.question}</div>
      <div className="qa-answer">{qa.answer}</div>

      {showEditSection && onEditCommentChange && (
        <div className="edit-section">
          <label className="edit-label">
            Комментарий для исправления (оставьте пустым, если всё устраивает)
          </label>
          <textarea
            className="edit-textarea"
            placeholder="Например: Добавьте информацию о сроках, Упростите формулировку, Уберите упоминание о..."
            value={editComment}
            onChange={(e) => onEditCommentChange(e.target.value)}
          />
        </div>
      )}
    </div>
  );
};
