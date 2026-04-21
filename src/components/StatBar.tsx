type Props = {
  label: string;
  value: number;
};

export default function StatBar({ label, value }: Props) {
  return (
    <div className="stat-block">
      <div className="stat-row">
        <span>{label}</span>
        <strong>{Math.round(value)}%</strong>
      </div>
      <div className="progress-track">
        <div className="progress-fill" style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
      </div>
    </div>
  );
}
