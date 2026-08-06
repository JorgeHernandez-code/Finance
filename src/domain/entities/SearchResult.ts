export type SearchResultType =
  | 'transaction'
  | 'account'
  | 'category'
  | 'client'
  | 'debt'
  | 'savings_goal'
  | 'investment'
  | 'subscription';

export interface SearchResult {
  id: string;
  type: SearchResultType;
  title: string;
  subtitle: string | null;
  href: string;
}
