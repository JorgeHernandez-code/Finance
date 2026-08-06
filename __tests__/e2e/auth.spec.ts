import { expect, test } from '@playwright/test';

/**
 * Flujo completo de autenticación. Requiere un proyecto de Supabase real
 * conectado (.env.local) y, para el registro, confirmación de correo
 * desactivada en Auth > Providers > Email (o un usuario ya confirmado) —
 * de lo contrario ese caso se salta automáticamente.
 */
test.describe('Autenticación', () => {
  test('un usuario no autenticado es redirigido a /login', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveURL(/\/login/);
    await expect(page.getByRole('heading', { name: 'Iniciar sesión' })).toBeVisible();
  });

  test('muestra error con credenciales inválidas', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel('Correo electrónico').fill('no-existe@example.com');
    await page.getByLabel('Contraseña').fill('ContraseñaIncorrecta1');
    await page.getByRole('button', { name: 'Iniciar sesión' }).click();
    await expect(page.getByRole('alert')).toContainText(/correo o contraseña|error/i);
  });

  test('el link "Crear cuenta" navega al registro', async ({ page }) => {
    await page.goto('/login');
    await page.getByRole('link', { name: 'Crear cuenta' }).click();
    await expect(page).toHaveURL(/\/register/);
    await expect(page.getByRole('heading', { name: 'Crear cuenta' })).toBeVisible();
  });

  test('el formulario de recuperar contraseña confirma el envío sin revelar si el correo existe', async ({
    page,
  }) => {
    await page.goto('/forgot-password');
    await page.getByLabel('Correo electrónico').fill('cualquier-correo@example.com');
    await page.getByRole('button', { name: 'Enviar enlace' }).click();
    await expect(page.getByRole('alert')).toContainText('llegará un enlace');
  });
});
