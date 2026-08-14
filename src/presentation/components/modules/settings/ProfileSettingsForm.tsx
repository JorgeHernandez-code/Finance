'use client';

import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { useTheme } from 'next-themes';
import { profileInputSchema, type ProfileInputDto, LOCALES } from '@/application/dto/profile';
import { updateProfileAction } from '@/app/(dashboard)/settings/actions';
import { useProfile } from '@/presentation/hooks/useProfile';
import { CURRENCIES } from '@/shared/config/currencies';
import type { Profile } from '@/domain/entities/Profile';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/presentation/components/ui/card';
import { Button } from '@/presentation/components/ui/button';
import { Input } from '@/presentation/components/ui/input';
import { Label } from '@/presentation/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/presentation/components/ui/select';

interface ProfileSettingsFormProps {
  userId: string;
  initialData: Profile;
}

/**
 * El esquema en DB también acepta theme = 'system', pero el ThemeProvider
 * (app/providers.tsx) se configuró con `enableSystem={false}` y solo
 * `themes={['dark', 'light']}` — se deja fuera del selector para no ofrecer
 * una opción que en la práctica no cambia nada.
 */
export function ProfileSettingsForm({ userId, initialData }: ProfileSettingsFormProps) {
  const { data: profile } = useProfile(userId, initialData);
  const { setTheme } = useTheme();

  const form = useForm<ProfileInputDto>({
    resolver: zodResolver(profileInputSchema),
    defaultValues: {
      fullName: profile.fullName,
      defaultCurrency: profile.defaultCurrency,
      locale: profile.locale,
      theme: profile.theme === 'system' ? 'dark' : profile.theme,
    },
  });

  const onSubmit = form.handleSubmit(async (values) => {
    const result = await updateProfileAction(values);

    if (result.error) {
      toast.error(result.error);
      return;
    }

    setTheme(values.theme);
    toast.success('Perfil actualizado.');
  });

  return (
    <Card id="profile" className="scroll-mt-20">
      <CardHeader>
        <CardTitle>Perfil</CardTitle>
        <CardDescription>Tu información personal y preferencias.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="email">Correo</Label>
            <Input id="email" value={profile.email} disabled />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="fullName">Nombre completo</Label>
            <Input id="fullName" placeholder="Jorge Hernández Torres" {...form.register('fullName')} />
            {form.formState.errors.fullName && (
              <p className="text-xs text-danger">{form.formState.errors.fullName.message}</p>
            )}
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="flex flex-col gap-1.5">
              <Label>Moneda por defecto</Label>
              <Controller
                control={form.control}
                name="defaultCurrency"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CURRENCIES.map((currency) => (
                        <SelectItem key={currency.code} value={currency.code}>
                          {currency.code} — {currency.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label>Idioma</Label>
              <Controller
                control={form.control}
                name="locale"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {LOCALES.map((locale) => (
                        <SelectItem key={locale.code} value={locale.code}>
                          {locale.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label>Tema</Label>
              <Controller
                control={form.control}
                name="theme"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="dark">Oscuro</SelectItem>
                      <SelectItem value="light">Claro</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
          </div>

          <div className="mt-2 flex justify-end">
            <Button type="submit" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? 'Guardando...' : 'Guardar cambios'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
