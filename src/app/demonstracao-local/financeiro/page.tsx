import { headers } from 'next/headers';
import { notFound } from 'next/navigation';
import { FinancialDashboard } from '@/components/financial-dashboard';

export const dynamic = 'force-dynamic';
export const metadata = { robots: { index: false, follow: false } };

export default async function FinancialDemo() {
  const host = (await headers()).get('host') ?? '';
  if (process.env.NODE_ENV !== 'development' || !/^(?:localhost|127\.0\.0\.1|\[::1\])(?::\d{1,5})?$/i.test(host)) notFound();
  return <main className="container" style={{ paddingBlock: '3rem 6rem' }}><h1>Exemplo de presentes e recebimentos</h1><FinancialDashboard demo /></main>;
}
