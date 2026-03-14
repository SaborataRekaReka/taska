import styles from './RadarChart.module.css';

export function RadarChart() {
  const cx = 150;
  const cy = 150;
  const size = 150;

  const axes = [
    { label: 'Длительность', angle: -90 },
    { label: 'Важность', angle: 210 },
    { label: 'Срочность', angle: 30 },
  ];

  function point(angle: number, r: number) {
    const rad = (angle * Math.PI) / 180;
    return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
  }

  const levels = [0.33, 0.66, 1.0];
  const dataValues = [0.6, 0.75, 0.55];

  const dataPoints = axes.map((a, i) => point(a.angle, size * dataValues[i]!));
  const dataPath = dataPoints.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ') + 'Z';

  return (
    <div className={styles.wrap}>
      <svg className={styles.svg} viewBox="0 0 300 300" fill="none">
        {levels.map((l) => {
          const pts = axes.map((a) => point(a.angle, size * l));
          const d = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ') + 'Z';
          return <path key={l} d={d} stroke="rgba(255,255,255,0.25)" strokeWidth="0.8" fill="none" />;
        })}

        {axes.map((a) => {
          const end = point(a.angle, size);
          return <line key={a.label} x1={cx} y1={cy} x2={end.x} y2={end.y} stroke="rgba(255,255,255,0.18)" strokeWidth="0.6" />;
        })}

        <path d={dataPath} fill="rgba(255,255,255,0.08)" stroke="rgba(255,255,255,0.45)" strokeWidth="1.2" />

        {axes.map((a) => {
          const p = point(a.angle, size + 28);
          return (
            <text key={a.label} x={p.x} y={p.y} textAnchor="middle" dominantBaseline="middle" fill="rgba(255,255,255,0.6)" fontSize="12" fontFamily="Inter, sans-serif">
              {a.label}
            </text>
          );
        })}

        <text x={cx} y={cy + size + 40} textAnchor="middle" fill="rgba(255,255,255,0.45)" fontSize="11" fontFamily="Inter, sans-serif">
          Срочность
        </text>
      </svg>
    </div>
  );
}
