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
        <div className="loading-text">Исправляем ответы...</div>
        <div style={{ color: '#718096', fontSize: '14px', marginTop: '8px' }}>
          {current} из {total}
        </div>
      </div>
    </div>
  );
};
