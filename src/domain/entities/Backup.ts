export interface BackupAccount {
  id: string;
  name: string;
  type: string;
  institution: string | null;
  currency: string;
  initialBalance: number;
  color: string;
  icon: string;
  isArchived: boolean;
}

export interface BackupCategory {
  id: string;
  name: string;
  type: string;
  parentId: string | null;
  color: string;
  icon: string;
  isSystem: boolean;
}

export interface BackupClient {
  id: string;
  name: string;
  color: string;
  icon: string;
  status: string;
  notes: string | null;
}

export interface BackupSubscription {
  id: string;
  name: string;
  categoryId: string | null;
  accountId: string | null;
  amount: number;
  currency: string;
  billingCycle: string;
  nextBillingDate: string;
  status: string;
  icon: string;
  color: string;
}

export interface BackupBudget {
  id: string;
  categoryId: string;
  amount: number;
  period: string;
  startDate: string;
  endDate: string | null;
  alertThresholdPercent: number;
}

export interface BackupDebt {
  id: string;
  creditorName: string;
  direction: string;
  principalAmount: number;
  interestRate: number | null;
  startDate: string;
  dueDate: string | null;
  status: string;
  notes: string | null;
}

export interface BackupDebtPayment {
  debtId: string;
  amount: number;
  paymentDate: string;
  notes: string | null;
}

export interface BackupSavingsGoal {
  id: string;
  name: string;
  targetAmount: number;
  targetDate: string | null;
  icon: string;
  color: string;
  status: string;
}

export interface BackupSavingsContribution {
  savingsGoalId: string;
  amount: number;
  contributionDate: string;
  notes: string | null;
}

export interface BackupInvestment {
  id: string;
  name: string;
  type: string;
  amountInvested: number;
  startDate: string;
  notes: string | null;
}

export interface BackupInvestmentValuation {
  investmentId: string;
  value: number;
  valuationDate: string;
}

export interface BackupTransaction {
  id: string;
  accountId: string;
  categoryId: string | null;
  clientId: string | null;
  type: string;
  amount: number;
  currency: string;
  description: string;
  notes: string | null;
  transactionDate: string;
}

export interface BackupBundle {
  version: 1;
  exportedAt: string;
  profile: { fullName: string | null; defaultCurrency: string; locale: string; theme: string };
  accounts: BackupAccount[];
  categories: BackupCategory[];
  clients: BackupClient[];
  subscriptions: BackupSubscription[];
  budgets: BackupBudget[];
  debts: BackupDebt[];
  debtPayments: BackupDebtPayment[];
  savingsGoals: BackupSavingsGoal[];
  savingsContributions: BackupSavingsContribution[];
  investments: BackupInvestment[];
  investmentValuations: BackupInvestmentValuation[];
  transactions: BackupTransaction[];
}

export interface BackupImportSummary {
  accounts: number;
  categories: number;
  clients: number;
  subscriptions: number;
  budgets: number;
  debts: number;
  debtPayments: number;
  savingsGoals: number;
  savingsContributions: number;
  investments: number;
  investmentValuations: number;
  transactions: number;
  /** Filas que se saltaron por referenciar una entidad que no se pudo resolver (p. ej. categoría de un presupuesto ausente). */
  skipped: number;
}
