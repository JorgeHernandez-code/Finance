import { redirect } from 'next/navigation';
import { createClient } from '@/infrastructure/supabase/server';
import { SupabaseProfileRepository } from '@/infrastructure/supabase/repositories/SupabaseProfileRepository';
import { GetProfile } from '@/application/use-cases/profile/GetProfile';
import { ProfileSettingsForm } from '@/presentation/components/modules/settings/ProfileSettingsForm';
import { AppearanceCard } from '@/presentation/components/modules/settings/AppearanceCard';
import { BackupCard } from '@/presentation/components/modules/settings/BackupCard';
import { FinanceSettingsCard } from '@/presentation/components/modules/settings/FinanceSettingsCard';

export const metadata = { title: 'Configuración' };

export default async function SettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  const [profile, rates, extra] = await Promise.all([
    new GetProfile(new SupabaseProfileRepository(supabase)).execute(user.id),
    supabase
      .from('exchange_rates')
      .select('id, base_currency, quote_currency, rate, rate_date, source')
      .eq('user_id', user.id)
      .order('rate_date', { ascending: false })
      .limit(50),
    supabase.from('profiles').select('risk_tolerance').eq('id', user.id).maybeSingle(),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Configuración</h1>
        <p className="text-sm text-muted-foreground">Tu perfil, monedas, apariencia y respaldo de datos.</p>
      </div>

      <ProfileSettingsForm userId={user.id} initialData={profile} />
      <FinanceSettingsCard
        rates={(rates.data ?? []).map((r) => ({
          id: r.id,
          baseCurrency: r.base_currency,
          quoteCurrency: r.quote_currency,
          rate: Number(r.rate),
          rateDate: r.rate_date,
          source: r.source,
        }))}
        riskTolerance={extra.data?.risk_tolerance ?? null}
      />
      <AppearanceCard />
      <BackupCard />
    </div>
  );
}
