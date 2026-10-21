/** Count calendar days in Brazil, without depending on the server's timezone. */
export function countdownToWedding(date: string, now = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(now);
  const part = (name: string) => Number(parts.find(item => item.type === name)?.value);
  const today = Date.UTC(part('year'), part('month') - 1, part('day'));
  const [year, month, day] = date.split('-').map(Number);
  const remaining = Math.round((Date.UTC(year, month - 1, day) - today) / 86_400_000);
  if (remaining < 0) return 'Uma data para lembrar';
  if (remaining === 0) return 'É hoje!';
  return remaining === 1 ? 'Falta 1 dia' : `Faltam ${remaining} dias`;
}
