/**
 * Tipos de la base de datos — equivalente escrito a mano de lo que genera
 * `supabase gen types typescript --project-id <ref> > src/shared/types/database.ts`.
 *
 * Cuando tengas la Supabase CLI instalada y el proyecto enlazado, corre ese
 * comando y reemplaza este archivo por el generado — quedará siempre
 * perfectamente sincronizado con las migraciones. Mientras tanto, este
 * archivo sigue exactamente el esquema de supabase/migrations/*.sql y le da
 * tipado fuerte a createClient<Database>() en toda la capa infrastructure.
 */

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          full_name: string | null;
          avatar_url: string | null;
          default_currency: string;
          locale: string;
          theme: 'dark' | 'light' | 'system';
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          full_name?: string | null;
          avatar_url?: string | null;
          default_currency?: string;
          locale?: string;
          theme?: 'dark' | 'light' | 'system';
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['profiles']['Insert']>;
      };
      accounts: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          type: 'cash' | 'bank' | 'digital_wallet' | 'credit_card' | 'other';
          institution: string | null;
          currency: string;
          initial_balance: number;
          account_number_encrypted: string | null;
          color: string;
          icon: string;
          is_archived: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          type: 'cash' | 'bank' | 'digital_wallet' | 'credit_card' | 'other';
          institution?: string | null;
          currency?: string;
          initial_balance?: number;
          account_number_encrypted?: string | null;
          color?: string;
          icon?: string;
          is_archived?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['accounts']['Insert']>;
      };
      categories: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          type: 'income' | 'expense';
          parent_id: string | null;
          color: string;
          icon: string;
          is_system: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          type: 'income' | 'expense';
          parent_id?: string | null;
          color?: string;
          icon?: string;
          is_system?: boolean;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['categories']['Insert']>;
      };
      tags: {
        Row: { id: string; user_id: string; name: string; color: string; created_at: string };
        Insert: { id?: string; user_id: string; name: string; color?: string; created_at?: string };
        Update: Partial<Database['public']['Tables']['tags']['Insert']>;
      };
      clients: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          color: string;
          icon: string;
          status: 'active' | 'inactive';
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          color?: string;
          icon?: string;
          status?: 'active' | 'inactive';
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['clients']['Insert']>;
      };
      transactions: {
        Row: {
          id: string;
          user_id: string;
          account_id: string;
          category_id: string | null;
          client_id: string | null;
          type: 'income' | 'expense' | 'transfer';
          amount: number;
          currency: string;
          description: string;
          notes: string | null;
          transaction_date: string;
          is_recurring: boolean;
          recurring_rule: Json | null;
          transfer_pair_id: string | null;
          deleted_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          account_id: string;
          category_id?: string | null;
          client_id?: string | null;
          type: 'income' | 'expense' | 'transfer';
          amount: number;
          currency?: string;
          description: string;
          notes?: string | null;
          transaction_date?: string;
          is_recurring?: boolean;
          recurring_rule?: Json | null;
          transfer_pair_id?: string | null;
          deleted_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['transactions']['Insert']>;
      };
      transaction_tags: {
        Row: { transaction_id: string; tag_id: string };
        Insert: { transaction_id: string; tag_id: string };
        Update: Partial<Database['public']['Tables']['transaction_tags']['Insert']>;
      };
      attachments: {
        Row: {
          id: string;
          transaction_id: string;
          user_id: string;
          storage_path: string;
          file_name: string;
          file_type: string;
          file_size_bytes: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          transaction_id: string;
          user_id: string;
          storage_path: string;
          file_name: string;
          file_type: string;
          file_size_bytes: number;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['attachments']['Insert']>;
      };
      budgets: {
        Row: {
          id: string;
          user_id: string;
          category_id: string;
          amount: number;
          period: 'monthly' | 'yearly';
          start_date: string;
          end_date: string | null;
          alert_threshold_percent: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          category_id: string;
          amount: number;
          period?: 'monthly' | 'yearly';
          start_date: string;
          end_date?: string | null;
          alert_threshold_percent?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['budgets']['Insert']>;
      };
      debts: {
        Row: {
          id: string;
          user_id: string;
          creditor_name: string;
          direction: 'i_owe' | 'owed_to_me';
          principal_amount: number;
          interest_rate: number | null;
          start_date: string;
          due_date: string | null;
          status: 'active' | 'paid' | 'overdue';
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          creditor_name: string;
          direction: 'i_owe' | 'owed_to_me';
          principal_amount: number;
          interest_rate?: number | null;
          start_date?: string;
          due_date?: string | null;
          status?: 'active' | 'paid' | 'overdue';
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['debts']['Insert']>;
      };
      debt_payments: {
        Row: { id: string; debt_id: string; amount: number; payment_date: string; notes: string | null; created_at: string };
        Insert: {
          id?: string;
          debt_id: string;
          amount: number;
          payment_date?: string;
          notes?: string | null;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['debt_payments']['Insert']>;
      };
      savings_goals: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          target_amount: number;
          target_date: string | null;
          icon: string;
          color: string;
          status: 'active' | 'completed' | 'archived';
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          target_amount: number;
          target_date?: string | null;
          icon?: string;
          color?: string;
          status?: 'active' | 'completed' | 'archived';
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['savings_goals']['Insert']>;
      };
      savings_contributions: {
        Row: {
          id: string;
          savings_goal_id: string;
          amount: number;
          contribution_date: string;
          notes: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          savings_goal_id: string;
          amount: number;
          contribution_date?: string;
          notes?: string | null;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['savings_contributions']['Insert']>;
      };
      investments: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          type: 'stocks' | 'crypto' | 'real_estate' | 'business' | 'other';
          amount_invested: number;
          start_date: string;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          type: 'stocks' | 'crypto' | 'real_estate' | 'business' | 'other';
          amount_invested: number;
          start_date?: string;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['investments']['Insert']>;
      };
      investment_valuations: {
        Row: { id: string; investment_id: string; value: number; valuation_date: string; created_at: string };
        Insert: {
          id?: string;
          investment_id: string;
          value: number;
          valuation_date?: string;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['investment_valuations']['Insert']>;
      };
      subscriptions: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          category_id: string | null;
          account_id: string | null;
          amount: number;
          currency: string;
          billing_cycle: 'weekly' | 'monthly' | 'yearly';
          next_billing_date: string;
          status: 'active' | 'paused' | 'cancelled';
          icon: string;
          color: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          category_id?: string | null;
          account_id?: string | null;
          amount: number;
          currency?: string;
          billing_cycle: 'weekly' | 'monthly' | 'yearly';
          next_billing_date: string;
          status?: 'active' | 'paused' | 'cancelled';
          icon?: string;
          color?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['subscriptions']['Insert']>;
      };
      audit_log: {
        Row: {
          id: string;
          user_id: string | null;
          action: string;
          entity_type: string | null;
          entity_id: string | null;
          metadata: Json | null;
          ip_address: string | null;
          user_agent: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          action: string;
          entity_type?: string | null;
          entity_id?: string | null;
          metadata?: Json | null;
          ip_address?: string | null;
          user_agent?: string | null;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['audit_log']['Insert']>;
      };
      notifications: {
        Row: {
          id: string;
          user_id: string;
          type: 'budget_alert' | 'payment_due' | 'subscription_renewal' | 'goal_completed';
          title: string;
          message: string;
          is_read: boolean;
          related_entity_type: string | null;
          related_entity_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          type: 'budget_alert' | 'payment_due' | 'subscription_renewal' | 'goal_completed';
          title: string;
          message: string;
          is_read?: boolean;
          related_entity_type?: string | null;
          related_entity_id?: string | null;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['notifications']['Insert']>;
      };
    };
    Views: {
      v_account_balances: {
        Row: { account_id: string; user_id: string; name: string; currency: string; current_balance: number };
      };
      v_monthly_summary: {
        Row: { user_id: string; month: string; total_income: number; total_expense: number; balance: number };
      };
      v_category_breakdown: {
        Row: {
          user_id: string;
          month: string;
          category_id: string;
          category_name: string;
          category_color: string;
          category_type: 'income' | 'expense';
          total_amount: number;
        };
      };
      v_budget_progress: {
        Row: {
          budget_id: string;
          user_id: string;
          category_id: string;
          category_name: string;
          budget_amount: number;
          period: 'monthly' | 'yearly';
          start_date: string;
          end_date: string | null;
          alert_threshold_percent: number;
          spent_amount: number;
          available_amount: number;
          spent_percent: number | null;
        };
      };
      v_debt_balance: {
        Row: {
          debt_id: string;
          user_id: string;
          creditor_name: string;
          direction: 'i_owe' | 'owed_to_me';
          principal_amount: number;
          status: 'active' | 'paid' | 'overdue';
          due_date: string | null;
          total_paid: number;
          remaining_balance: number;
        };
      };
      v_savings_progress: {
        Row: {
          goal_id: string;
          user_id: string;
          name: string;
          target_amount: number;
          target_date: string | null;
          status: 'active' | 'completed' | 'archived';
          current_amount: number;
          progress_percent: number | null;
        };
      };
      v_client_totals: {
        Row: { client_id: string; user_id: string; name: string; status: 'active' | 'inactive'; total_income: number };
      };
      v_net_worth: {
        Row: { user_id: string; available: number; invested: number; saved: number; debt: number; net_worth: number };
      };
    };
    Functions: Record<string, never>;
    Enums: Record<string, never>;
  };
}

export type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row'];
export type TablesInsert<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Insert'];
export type TablesUpdate<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Update'];
export type Views<T extends keyof Database['public']['Views']> = Database['public']['Views'][T]['Row'];
