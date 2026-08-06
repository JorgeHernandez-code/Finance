import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/presentation/components/ui/card';
import { ThemeToggle } from '@/presentation/components/modules/shell/ThemeToggle';

export function AppearanceCard() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Apariencia</CardTitle>
        <CardDescription>El mismo control que tienes en la barra superior.</CardDescription>
      </CardHeader>
      <CardContent className="flex items-center gap-3">
        <ThemeToggle />
        <span className="text-sm text-muted-foreground">Cambiar entre tema oscuro y claro.</span>
      </CardContent>
    </Card>
  );
}
