export function scheduleByDifficulty(difficulty, baseDate = new Date()) {
  const days = { hard: 1, medium: 3, easy: 7 };
  const next = new Date(baseDate);
  next.setDate(next.getDate() + (days[difficulty] ?? 3));
  return next.toISOString().slice(0, 10);
}
