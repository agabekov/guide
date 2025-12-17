interface ProgressBarProps {
  value: number; // 0-100
}

export const ProgressBar: React.FC<ProgressBarProps> = ({ value }) => {
  return (
    <div className="progress-bar">
      <div className="progress-fill" style={{ width: `${value}%` }} />
    </div>
  );
};
