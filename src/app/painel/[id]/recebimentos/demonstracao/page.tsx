import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireUser } from '@/lib/auth';
import { assertHomologationPerimeter } from '@/lib/security';
import { isHomologationAccount } from '@/lib/homologation';
import { ownedWedding } from '@/lib/weddings';
import { FinancialDashboard } from '@/components/financial-dashboard';
import styles from '@/components/financial-dashboard.module.css';

export const dynamic = 'force-dynamic';
export const metadata = { robots: { index: false, follow: false } };

export default async function HomologationFinancialDemo({ params }: { params: Promise<{ id: string }> }) {
  await assertHomologationPerimeter();
  const user = await requireUser();
  if (!isHomologationAccount(user.id)) notFound();
  const { id } = await params;
  if (!await ownedWedding(user.id, id)) notFound();
  return <main className={`container ${styles.page}`}>
    <Link className={styles.back} href={`/painel/${encodeURIComponent(id)}/recebimentos`}>← Voltar aos recebimentos</Link>
    <header className={styles.pageHeader}><h1>Exemplo de presentes e recebimentos</h1></header>
    <FinancialDashboard demo />
  </main>;
}
