export type ProfileTheme = 'dark' | 'light' | 'system';

export interface Profile {
  id: string;
  email: string;
  fullName: string | null;
  avatarUrl: string | null;
  defaultCurrency: string;
  locale: string;
  theme: ProfileTheme;
  createdAt: string;
}
