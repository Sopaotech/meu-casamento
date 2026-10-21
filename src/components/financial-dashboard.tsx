import styles from './financial-dashboard.module.css';

const labels = ['Contribuições confirmadas', 'Pagamentos pendentes', 'Tarifas financeiras', 'Valor líquido recebido', 'Saldo disponível no provedor', 'Transferências registradas'] as const;
const demoValues = ['R$ 15.000,00', 'R$ 500,00', 'R$ 249,90', 'R$ 14.750,10', 'R$ 10.000,00', 'R$ 4.750,10'] as const;

/** Demo values are fixed presentation data and are never read from or written to a tenant. */
export function FinancialDashboard({ demo = false }: { demo?: boolean }) {
  return <div className={styles.dashboard}>
    {demo ? <p className={styles.demo} role="status">DADOS FICTÍCIOS — DEMONSTRAÇÃO</p> : <p className={styles.notice}>Aguardando integração financeira. Os valores e transferências serão apresentados somente com dados verificáveis do provedor.</p>}
    <section className={styles.account} aria-labelledby="account-state"><div><p className={styles.eyebrow}>CONTA FINANCEIRA</p><h2 id="account-state">Situação da conta vinculada</h2><p>{demo ? 'Exemplo visual. Nenhuma conta financeira foi vinculada nesta demonstração.' : 'A vinculação com um provedor financeiro ainda não está disponível.'}</p></div><span>Aguardando integração financeira</span></section>
    <div className={styles.title}><div><p className={styles.eyebrow}>SEUS PRESENTES</p><h2>Visão dos recebimentos</h2></div><p>{demo ? 'Valores de exemplo, sem movimentação real.' : 'Os dados aparecerão quando a integração estiver disponível.'}</p></div>
    <div className={styles.grid}>{labels.map((label, i) => <article className={styles.card} key={label}><h2>{label}</h2><p>{demo ? demoValues[i] : '—'}</p>{demo && <small>Valor fictício</small>}</article>)}</div>
    <section className={styles.history} aria-labelledby="financial-history"><h2 id="financial-history">Histórico de contribuições</h2>
      <p>{demo ? 'Exemplo ilustrativo, sem transação real.' : 'Aguardando integração financeira. Nenhuma transação ou saldo real é exibido neste momento.'}</p>
      <div className={styles.tableWrap}><table><thead><tr><th>Presente</th><th>Convidado</th><th>Valor</th><th>Data</th><th>Status</th><th>Identificador</th></tr></thead><tbody>
        {demo ? <tr><td>Lua de mel</td><td>Convidado fictício</td><td>R$ 500,00</td><td>01/01/2026</td><td>Confirmado (fictício)</td><td>DEMO-001</td></tr>
          : <tr><td colSpan={6}>Aguardando integração financeira</td></tr>}
      </tbody></table></div>
    </section>
  </div>;
}
