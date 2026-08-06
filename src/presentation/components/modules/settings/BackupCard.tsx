'use client';

import { useRef, useState } from 'react';
import { toast } from 'sonner';
import { Download, Upload, Loader2, ShieldAlert } from 'lucide-react';
import { exportBackupAction, importBackupAction } from '@/app/(dashboard)/settings/actions';
import { downloadBase64File } from '@/shared/lib/download';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/presentation/components/ui/card';
import { Button } from '@/presentation/components/ui/button';
import { Input } from '@/presentation/components/ui/input';
import { Label } from '@/presentation/components/ui/label';

function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ''));
    reader.onerror = () => reject(reader.error ?? new Error('No se pudo leer el archivo.'));
    reader.readAsText(file);
  });
}

export function BackupCard() {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [exportPassphrase, setExportPassphrase] = useState('');
  const [exportPassphraseConfirm, setExportPassphraseConfirm] = useState('');
  const [isExporting, setIsExporting] = useState(false);

  const [importFile, setImportFile] = useState<File | null>(null);
  const [importPassphrase, setImportPassphrase] = useState('');
  const [isImporting, setIsImporting] = useState(false);

  async function handleExport() {
    if (exportPassphrase.length < 8) {
      toast.error('La contraseña debe tener al menos 8 caracteres.');
      return;
    }
    if (exportPassphrase !== exportPassphraseConfirm) {
      toast.error('Las contraseñas no coinciden.');
      return;
    }

    setIsExporting(true);
    const result = await exportBackupAction(exportPassphrase);
    setIsExporting(false);

    if (result.error || !result.data) {
      toast.error(result.error ?? 'No se pudo generar el respaldo.');
      return;
    }

    downloadBase64File(result.data.fileBase64, result.data.fileName, result.data.mimeType);
    setExportPassphrase('');
    setExportPassphraseConfirm('');
    toast.success('Respaldo descargado. Guarda la contraseña — sin ella no se puede recuperar.');
  }

  async function handleImport() {
    if (!importFile) {
      toast.error('Selecciona un archivo de respaldo.');
      return;
    }
    if (!importPassphrase) {
      toast.error('Escribe la contraseña del respaldo.');
      return;
    }

    setIsImporting(true);
    try {
      const fileContent = await readFileAsText(importFile);
      const result = await importBackupAction({ fileContent, passphrase: importPassphrase });

      if (result.error || !result.data) {
        toast.error(result.error ?? 'No se pudo restaurar el respaldo.');
        return;
      }

      const summary = result.data;
      const totalImported =
        summary.accounts +
        summary.categories +
        summary.clients +
        summary.subscriptions +
        summary.budgets +
        summary.debts +
        summary.debtPayments +
        summary.savingsGoals +
        summary.savingsContributions +
        summary.investments +
        summary.investmentValuations +
        summary.transactions;

      toast.success(
        `Restauración completa: ${totalImported} registros importados${summary.skipped > 0 ? `, ${summary.skipped} omitidos` : ''}.`
      );
      setImportFile(null);
      setImportPassphrase('');
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No se pudo leer el archivo.');
    } finally {
      setIsImporting(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Respaldo</CardTitle>
        <CardDescription>Exporta o restaura todos tus datos en un archivo cifrado.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-6">
        <div className="flex flex-col gap-3">
          <p className="text-sm font-medium text-foreground">Exportar</p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="export-passphrase">Contraseña</Label>
              <Input
                id="export-passphrase"
                type="password"
                value={exportPassphrase}
                onChange={(e) => setExportPassphrase(e.target.value)}
                placeholder="Mínimo 8 caracteres"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="export-passphrase-confirm">Confirmar contraseña</Label>
              <Input
                id="export-passphrase-confirm"
                type="password"
                value={exportPassphraseConfirm}
                onChange={(e) => setExportPassphraseConfirm(e.target.value)}
              />
            </div>
          </div>
          <p className="flex items-start gap-1.5 text-xs text-muted-foreground">
            <ShieldAlert className="mt-0.5 size-3.5 shrink-0" />
            El archivo se cifra con esta contraseña (AES-256). Sin ella, nadie —ni nosotros— puede recuperar los datos.
          </p>
          <div>
            <Button variant="outline" size="sm" onClick={handleExport} disabled={isExporting}>
              {isExporting ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />}
              Exportar respaldo
            </Button>
          </div>
        </div>

        <div className="flex flex-col gap-3 border-t border-border pt-6">
          <p className="text-sm font-medium text-foreground">Restaurar</p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="import-file">Archivo de respaldo</Label>
              <Input
                id="import-file"
                type="file"
                accept="application/json"
                ref={fileInputRef}
                onChange={(e) => setImportFile(e.target.files?.[0] ?? null)}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="import-passphrase">Contraseña</Label>
              <Input
                id="import-passphrase"
                type="password"
                value={importPassphrase}
                onChange={(e) => setImportPassphrase(e.target.value)}
              />
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Los datos se agregan a tu cuenta actual (no reemplazan lo que ya tienes). Las categorías del sistema se enlazan con las
            tuyas, no se duplican.
          </p>
          <div>
            <Button variant="outline" size="sm" onClick={handleImport} disabled={isImporting}>
              {isImporting ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}
              Restaurar
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
