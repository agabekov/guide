import { QAPair as QAPairComponent } from '../shared';
import type { QAPair } from '../../types';

interface Step4EditProps {
  qaData: QAPair[];
  editComments: Record<string, string>;
  onEditCommentChange: (qaId: string, comment: string) => void;
  onBackToStep3: () => void;
  onApplyEdits: () => void;
  onSkipToExport: () => void;
}

export const Step4Edit: React.FC<Step4EditProps> = ({
  qaData,
  editComments,
  onEditCommentChange,
  onBackToStep3,
  onApplyEdits,
  onSkipToExport,
}) => {
  return (
    <div className="card active">
      <div className="card-title">Шаг 4. Внесите исправления</div>

      <div>
        {qaData.map((qa) => (
          <QAPairComponent
            key={qa.id}
            qa={qa}
            showEditSection={true}
            editComment={editComments[qa.id] || ''}
            onEditCommentChange={(comment) => onEditCommentChange(qa.id, comment)}
          />
        ))}
      </div>

      <div className="btn-group">
        <button className="btn btn-secondary" onClick={onBackToStep3}>
          ← Назад
        </button>
        <button className="btn btn-primary" onClick={onApplyEdits}>
          ✨ Применить исправления
        </button>
        <button className="btn btn-primary" onClick={onSkipToExport}>
          → Пропустить и экспортировать
        </button>
      </div>
    </div>
  );
};
