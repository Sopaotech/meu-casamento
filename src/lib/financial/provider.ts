/** Contracts only: no provider is connected, and no production payment flow is enabled. */
export type ProviderName = 'asaas' | 'mercado-pago';
export type AccountState = 'pending' | 'under-review' | 'active' | 'restricted' | 'closed' | 'unknown';
export type PaymentState = 'pending' | 'confirmed' | 'failed' | 'cancelled' | 'refunded' | 'disputed' | 'unknown';
export type SettlementState = 'pending' | 'settled' | 'reversed' | 'unknown';
export type TransferState = 'pending' | 'completed' | 'failed' | 'cancelled' | 'unknown';

/** Identifiers are mapped to a tenant on the server, never taken as proof of ownership. */
export type AccountRef = { provider: ProviderName; externalAccountId: string };
export type ProviderCharge = { externalChargeId: string; amountCents: number; paymentState: PaymentState; settlementState: SettlementState };
export type ProviderBalance = { availableCents: number; observedAt: Date };
export type ProviderStatementEntry = { externalId: string; amountCents: number; occurredAt: Date; description: string };
export type ProviderTransfer = { externalId: string; amountCents: number; state: TransferState; occurredAt: Date };
export type VerifiedNotification = { externalEventId: string; eventType: string; externalAccountId: string; externalChargeId?: string; occurredAt: Date };

export interface FinancialProvider {
  readonly name: ProviderName;
  initiateAccountLink(input: { weddingId: string; returnUrl: string }): Promise<{ redirectUrl: string }>;
  getAccountState(account: AccountRef): Promise<AccountState>;
  createCharge(account: AccountRef, input: { contributionId: string; amountCents: number; idempotencyKey: string }): Promise<ProviderCharge>;
  getCharge(account: AccountRef, externalChargeId: string): Promise<ProviderCharge>;
  getBalance(account: AccountRef): Promise<ProviderBalance>;
  getStatement(account: AccountRef, input: { from: Date; to: Date }): Promise<ProviderStatementEntry[]>;
  verifyNotification(input: { rawBody: Uint8Array; headers: Readonly<Record<string, string>> }): Promise<VerifiedNotification>;
  getTransfers(account: AccountRef, input: { from: Date; to: Date }): Promise<ProviderTransfer[]>;
}
