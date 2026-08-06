import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/shared/types/database';
import type { IProfileRepository, ProfileInput } from '@/domain/repositories/IProfileRepository';
import type { Profile, ProfileTheme } from '@/domain/entities/Profile';

interface RawProfileRow {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  default_currency: string;
  locale: string;
  theme: ProfileTheme;
  created_at: string;
}

function mapRow(row: RawProfileRow, email: string): Profile {
  return {
    id: row.id,
    email,
    fullName: row.full_name,
    avatarUrl: row.avatar_url,
    defaultCurrency: row.default_currency,
    locale: row.locale,
    theme: row.theme,
    createdAt: row.created_at,
  };
}

export class SupabaseProfileRepository implements IProfileRepository {
  constructor(private readonly client: SupabaseClient<Database>) {}

  /** El email vive en auth.users, no en profiles — se resuelve aparte con getUser(). */
  private async getEmail(userId: string): Promise<string> {
    const {
      data: { user },
    } = await this.client.auth.getUser();
    if (user?.id === userId && user.email) return user.email;
    return '';
  }

  async getProfile(userId: string): Promise<Profile> {
    const [{ data, error }, email] = await Promise.all([
      this.client.from('profiles').select('*').eq('id', userId).single(),
      this.getEmail(userId),
    ]);

    if (error) {
      console.error('[SupabaseProfileRepository.getProfile]', error);
      throw new Error(`No se pudo cargar el perfil: ${error.message}`);
    }

    return mapRow(data, email);
  }

  async updateProfile(userId: string, input: ProfileInput): Promise<Profile> {
    const [{ data, error }, email] = await Promise.all([
      this.client
        .from('profiles')
        .update({
          full_name: input.fullName,
          default_currency: input.defaultCurrency,
          locale: input.locale,
          theme: input.theme,
        })
        .eq('id', userId)
        .select('*')
        .single(),
      this.getEmail(userId),
    ]);

    if (error) {
      console.error('[SupabaseProfileRepository.updateProfile]', error);
      throw new Error(`No se pudo actualizar el perfil: ${error.message}`);
    }

    return mapRow(data, email);
  }
}
