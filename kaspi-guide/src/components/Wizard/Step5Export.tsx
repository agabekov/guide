import type { QAPair } from '../../types';

interface Step5ExportProps {
  qaData: QAPair[];
  onCopy: () => void;
  onDownload: () => void;
}

export const Step5Export: React.FC<Step5ExportProps> = ({ qaData, onCopy, onDownload }) => {
  return (
    <div className="card active">
      <div className="card-title">Шаг 5. Экспорт результата</div>
      <div className="card-subtitle">Скопируйте текст или скачайте готовый документ</div>

      <div className="export-area">
        {qaData.map((qa, index) => (
          <div key={qa.id} className="qa-pair">
            <div className="qa-question">
              {index + 1}. {qa.question}
            </div>
            <div className="qa-answer">{qa.answer}</div>
          </div>
        ))}
      </div>

      <div className="btn-group">
        <button className="btn btn-secondary" onClick={onCopy}>
          📋 Копировать
        </button>
        <button className="btn btn-primary" onClick={onDownload}>
          💾 Скачать .docx
        </button>
      </div>

      <div
        style={{
          marginTop: '24px',
          padding: '20px',
          background: '#f0fdf4',
          borderRadius: '10px',
          borderLeft: '4px solid #48bb78',
        }}
      >
        <div style={{ fontWeight: '600', color: '#166534', marginBottom: '8px' }}>✅ Готово!</div>
        <div style={{ color: '#166534', fontSize: '14px' }}>
          Теперь проверьте результат и согласуйте с заказчиком, редактором и директором перед
          публикацией.
        </div>
      </div>
    </div>
  );
};
