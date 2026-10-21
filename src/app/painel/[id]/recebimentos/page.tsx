import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireUser } from '@/lib/auth';
import { ownedWedding } from '@/lib/weddings';
import { FinancialDashboard } from '@/components/financial-dashboard';
import styles from '@/components/financial-dashboard.module.css';
import { isHomologationAccount } from '@/lib/homologation';

export default async function ReceiptsPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  if (!await ownedWedding(user.id, id)) notFound();
  return <main className={`container ${styles.page}`}><Link className={styles.back} href={`/painel/${encodeURIComponent(id)}`}>← Voltar ao casamento</Link><header className={styles.pageHeader}><p className={styles.eyebrow}>ACOMPANHE COM TRANQUILIDADE</p><h1>Presentes e recebimentos</h1><p>Um espaço para acompanhar as contribuições quando a integração financeira estiver disponível.</p><Link href={`/painel/${encodeURIComponent(id)}/presentes`}>Gerenciar lista de presentes →</Link>{isHomologationAccount(user.id) && <p><Link href={`/painel/${encodeURIComponent(id)}/recebimentos/demonstracao`}>Ver exemplo com dados fictícios →</Link></p>}</header><FinancialDashboard /></main>;
}
