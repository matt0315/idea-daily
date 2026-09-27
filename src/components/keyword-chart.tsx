export function KeywordChart({ series }: { series: { month: string; volume: number }[] }) {
  if (series.length < 2) return null;
  const values = series.map((point) => point.volume);
  const max = Math.max(...values);
  const min = Math.min(...values);
  const width = 560;
  const height = 120;
  const points = values
    .map((value, index) => {
      const x = (index / (values.length - 1)) * width;
      const y = height - 12 - ((value - min) / (max - min || 1)) * (height - 28);
      return `${x},${y}`;
    })
    .join(" ");
  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="mt-4 h-28 w-full" role="img" aria-label="Sample search volume series">
      <polyline fill="none" stroke="#0e6b56" strokeWidth="3" points={points} />
      <text x="0" y="116" fill="#5e584e" fontSize="12">
        {series[0].month}
      </text>
      <text x="560" y="116" fill="#5e584e" fontSize="12" textAnchor="end">
        {series[series.length - 1].month}
      </text>
    </svg>
  );
}
