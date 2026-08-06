import type { Profile, ProfileTheme } from '@/domain/entities/Profile';

export interface ProfileInput {
  fullName: string | null;
  defaultCurrency: string;
  locale: string;
  theme: ProfileTheme;
}

export interface IProfileRepository {
  getProfile(userId: string): Promise<Profile>;
  updateProfile(userId: string, input: ProfileInput): Promise<Profile>;
}
