import { z } from 'zod';

const nullableString = z.string().nullable();

const backupAccountSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.string(),
  institution: nullableString,
  currency: z.string(),
  initialBalance: z.number(),
  color: z.string(),
  icon: z.string(),
  isArchived: z.boolean(),
});

const backupCategorySchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.string(),
  parentId: nullableString,
  color: z.string(),
  icon: z.string(),
  isSystem: z.boolean(),
});

const backupClientSchema = z.object({
  id: z.string(),
  name: z.string(),
  color: z.string(),
  icon: z.string(),
  status: z.string(),
  notes: nullableString,
});

const backupSubscriptionSchema = z.object({
  id: z.string(),
  name: z.string(),
  categoryId: nullableString,
  accountId: nullableString,
  amount: z.number(),
  currency: z.string(),
  billingCycle: z.string(),
  nextBillingDate: z.string(),
  status: z.string(),
  icon: z.string(),
  color: z.string(),
});

const backupBudgetSchema = z.object({
  id: z.string(),
  categoryId: z.string(),
  amount: z.number(),
  period: z.string(),
  startDate: z.string(),
  endDate: nullableString,
  alertThresholdPercent: z.number(),
});

const backupDebtSchema = z.object({
  id: z.string(),
  creditorName: z.string(),
  direction: z.string(),
  principalAmount: z.number(),
  interestRate: z.number().nullable(),
  startDate: z.string(),
  dueDate: nullableString,
  status: z.string(),
  notes: nullableString,
});

const backupDebtPaymentSchema = z.object({
  debtId: z.string(),
  amount: z.number(),
  paymentDate: z.string(),
  notes: nullableString,
});

const backupSavingsGoalSchema = z.object({
  id: z.string(),
  name: z.string(),
  targetAmount: z.number(),
  targetDate: nullableString,
  icon: z.string(),
  color: z.string(),
  status: z.string(),
});

const backupSavingsContributionSchema = z.object({
  savingsGoalId: z.string(),
  amount: z.number(),
  contributionDate: z.string(),
  notes: nullableString,
});

const backupInvestmentSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.string(),
  amountInvested: z.number(),
  startDate: z.string(),
  notes: nullableString,
});

const backupInvestmentValuationSchema = z.object({
  investmentId: z.string(),
  value: z.number(),
  valuationDate: z.string(),
});

const backupTransactionSchema = z.object({
  id: z.string(),
  accountId: z.string(),
  categoryId: nullableString,
  clientId: nullableString,
  type: z.string(),
  amount: z.number(),
  currency: z.string(),
  description: z.string(),
  notes: nullableString,
  transactionDate: z.string(),
});

export const backupBundleSchema = z.object({
  version: z.literal(1),
  exportedAt: z.string(),
  profile: z.object({
    fullName: nullableString,
    defaultCurrency: z.string(),
    locale: z.string(),
    theme: z.string(),
  }),
  accounts: z.array(backupAccountSchema),
  categories: z.array(backupCategorySchema),
  clients: z.array(backupClientSchema),
  subscriptions: z.array(backupSubscriptionSchema),
  budgets: z.array(backupBudgetSchema),
  debts: z.array(backupDebtSchema),
  debtPayments: z.array(backupDebtPaymentSchema),
  savingsGoals: z.array(backupSavingsGoalSchema),
  savingsContributions: z.array(backupSavingsContributionSchema),
  investments: z.array(backupInvestmentSchema),
  investmentValuations: z.array(backupInvestmentValuationSchema),
  transactions: z.array(backupTransactionSchema),
});
export type BackupBundleDto = z.infer<typeof backupBundleSchema>;

export const backupExportPassphraseSchema = z.string().min(8, 'La contraseña debe tener al menos 8 caracteres').max(200);

export const backupImportSchema = z.object({
  fileContent: z.string().min(1, 'Archivo vacío'),
  passphrase: backupExportPassphraseSchema,
});
export type BackupImportInputDto = z.infer<typeof backupImportSchema>;

export interface BackupExportResult {
  fileBase64: string;
  fileName: string;
  mimeType: string;
}
