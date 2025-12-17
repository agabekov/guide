import { ProgressBar } from '../shared';

interface LoadingEditsProps {
  progress: number;
  current: number;
  total: number;
}

export const LoadingEdits: React.FC<LoadingEditsProps> = ({ progress, current, total }) => {
  return (
    <div className="card active">
      <div className="loading active">
        <ProgressBar value={progress} />
        <div className="spinner"></div>
        <div className="loading-text">🔧 Исправляем ответы с учетом ваших комментариев...</div>
        <div style={{ color: '#4a5568', fontSize: '16px', marginTop: '16px', fontWeight: 600 }}>
          Обработано: {current} из {total} правок
        </div>
        <div style={{ color: '#718096', fontSize: '14px', marginTop: '8px' }}>
          Корректируем ответы для максимальной точности
        </div>
      </div>
    </div>
  );
};
