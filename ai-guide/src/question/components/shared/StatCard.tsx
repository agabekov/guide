interface StatCardProps {
  value: number | string;
  label: string;
}

export const StatCard: React.FC<StatCardProps> = ({ value, label }) => {
  return (
    <div className="stat-card">
      <div className="stat-value">{value}</div>
      <div className="stat-label">{label}</div>
    </div>
  );
};
