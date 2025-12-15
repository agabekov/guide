import { QAPair as QAPairComponent } from '../shared';
import type { QAPair } from '../../types';

interface Step3AnswersProps {
  qaData: QAPair[];
  onEditAnswers: () => void;
  onToExport: () => void;
}

export const Step3Answers: React.FC<Step3AnswersProps> = ({
  qaData,
  onEditAnswers,
  onToExport,
}) => {
  return (
    <div className="card active">
      <div className="card-title">Шаг 3. Проверьте результат</div>

      <div>
        {qaData.map((qa) => (
          <QAPairComponent key={qa.id} qa={qa} />
        ))}
      </div>

      <div className="btn-group">
        <button className="btn btn-secondary" onClick={onEditAnswers}>
          ✏️ Редактировать ответы
        </button>
        <button className="btn btn-primary" onClick={onToExport}>
          → Экспортировать
        </button>
      </div>
    </div>
  );
};
