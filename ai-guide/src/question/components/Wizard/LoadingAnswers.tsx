import { ProgressBar } from '../shared';

interface LoadingAnswersProps {
  progress: number;
  current: number;
  total: number;
}

export const LoadingAnswers: React.FC<LoadingAnswersProps> = ({ progress, current, total }) => {
  return (
    <div className="card active">
      <div className="loading active">
        <ProgressBar value={progress} />
        <div className="spinner"></div>
        <div className="loading-text">✨ Готовим ответы на основе загруженного контента...</div>
        <div style={{ color: '#4a5568', fontSize: '16px', marginTop: '16px', fontWeight: 600 }}>
          Обработано: {current} из {total} вопросов
        </div>
        <div style={{ color: '#718096', fontSize: '14px', marginTop: '8px' }}>
          Генерируем подробные и точные ответы
        </div>
      </div>
    </div>
  );
};
