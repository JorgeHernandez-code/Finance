import { redirect } from 'next/navigation';
import { createClient } from '@/infrastructure/supabase/server';
import { SupabaseProfileRepository } from '@/infrastructure/supabase/repositories/SupabaseProfileRepository';
import { GetProfile } from '@/application/use-cases/profile/GetProfile';
import { ProfileSettingsForm } from '@/presentation/components/modules/settings/ProfileSettingsForm';
import { AppearanceCard } from '@/presentation/components/modules/settings/AppearanceCard';
import { BackupCard } from '@/presentation/components/modules/settings/BackupCard';

export const metadata = { title: 'Configuración' };

export default async function SettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  const profile = await new GetProfile(new SupabaseProfileRepository(supabase)).execute(user.id);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Configuración</h1>
        <p className="text-sm text-muted-foreground">Tu perfil, apariencia y respaldo de datos.</p>
      </div>

      <ProfileSettingsForm userId={user.id} initialData={profile} />
      <AppearanceCard />
      <BackupCard />
    </div>
  );
}
