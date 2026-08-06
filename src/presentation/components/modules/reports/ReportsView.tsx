'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { ArrowUpCircle, ArrowDownCircle, Scale, FileText, FileSpreadsheet, FileDown, Loader2 } from 'lucide-react';
import { useReportSummary } from '@/presentation/hooks/useReportSummary';
import { exportReportAction } from '@/app/(dashboard)/reports/actions';
import { formatMoney } from '@/shared/lib/format';
import { downloadBase64File } from '@/shared/lib/download';
import { KpiCard } from '@/presentation/components/modules/dashboard/KpiCard';
import { IncomeExpenseChart } from '@/presentation/components/charts/IncomeExpenseChart';
import { CategoryDonutChart } from '@/presentation/components/charts/CategoryDonutChart';
import { Card, CardContent, CardHeader, CardTitle } from '@/presentation/components/ui/card';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/presentation/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/presentation/components/ui/select';
import { Button } from '@/presentation/components/ui/button';
import type { ReportSummary } from '@/domain/entities/Report';

interface ReportsViewProps {
  userId: string;
  initialYear: number;
  initialData: ReportSummary;
}

type ExportFormat = 'csv' | 'xlsx' | 'pdf';

function emptyReport(year: number): ReportSummary {
  return { year, totalIncome: 0, totalExpense: 0, totalBalance: 0, monthlySeries: [], categoryBreakdown: [], accountBreakdown: [] };
}

export function ReportsView({ userId, initialYear, initialData }: ReportsViewProps) {
  const [year, setYear] = useState(initialYear);
  const [exporting, setExporting] = useState<ExportFormat | null>(null);
  const { data, isFetching } = useReportSummary(userId, year, initialYear, initialData);
  const report = data ?? emptyReport(year);

  const yearOptions = Array.from({ length: 6 }, (_, i) => initialYear - i);
  const hasActivity = report.totalIncome > 0 || report.totalExpense > 0;

  async function handleExport(format: ExportFormat) {
    setExporting(format);
    const result = await exportReportAction({ year, format });
    setExporting(null);

    if (result.error || !result.data) {
      toast.error(result.error ?? 'No se pudo generar el archivo.');
      return;
    }

    downloadBase64File(result.data.fileBase64, result.data.fileName, result.data.mimeType);
    toast.success('Archivo descargado.');
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Reportes</h1>
          <p className="text-sm text-muted-foreground">Resumen anual de tus movimientos.</p>
        </div>

        <Select value={String(year)} onValueChange={(value) => setYear(Number(value))}>
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {yearOptions.map((y) => (
              <SelectItem key={y} value={String(y)}>
                {y}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <KpiCard label="Ingresos del año" amount={report.totalIncome} icon={ArrowUpCircle} tone="success" />
        <KpiCard label="Gastos del año" amount={report.totalExpense} icon={ArrowDownCircle} tone="danger" />
        <KpiCard
          label="Balance del año"
          amount={report.totalBalance}
          icon={Scale}
          tone={report.totalBalance >= 0 ? 'success' : 'danger'}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Exportar</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={() => handleExport('csv')} disabled={exporting !== null}>
            {exporting === 'csv' ? <Loader2 className="size-4 animate-spin" /> : <FileText className="size-4" />}
            CSV
          </Button>
          <Button variant="outline" size="sm" onClick={() => handleExport('xlsx')} disabled={exporting !== null}>
            {exporting === 'xlsx' ? <Loader2 className="size-4 animate-spin" /> : <FileSpreadsheet className="size-4" />}
            Excel
          </Button>
          <Button variant="outline" size="sm" onClick={() => handleExport('pdf')} disabled={exporting !== null}>
            {exporting === 'pdf' ? <Loader2 className="size-4 animate-spin" /> : <FileDown className="size-4" />}
            PDF
          </Button>
        </CardContent>
      </Card>

      {hasActivity ? (
        <>
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Ingresos vs. gastos ({year})</CardTitle>
              </CardHeader>
              <CardContent>
                <IncomeExpenseChart data={report.monthlySeries} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Gastos por categoría ({year})</CardTitle>
              </CardHeader>
              <CardContent>
                {report.categoryBreakdown.length > 0 ? (
                  <CategoryDonutChart data={report.categoryBreakdown} />
                ) : (
                  <p className="py-10 text-center text-sm text-muted-foreground">Sin gastos categorizados este año.</p>
                )}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Por cuenta ({year})</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Cuenta</TableHead>
                    <TableHead className="text-right">Ingresos</TableHead>
                    <TableHead className="text-right">Gastos</TableHead>
                    <TableHead className="text-right">Balance</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {report.accountBreakdown.map((account) => (
                    <TableRow key={account.accountId}>
                      <TableCell className="font-medium text-foreground">{account.name}</TableCell>
                      <TableCell className="tabular text-right text-success">{formatMoney(account.income)}</TableCell>
                      <TableCell className="tabular text-right text-danger">{formatMoney(account.expense)}</TableCell>
                      <TableCell className={`tabular text-right font-medium ${account.balance >= 0 ? 'text-success' : 'text-danger'}`}>
                        {formatMoney(account.balance)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      ) : (
        <div className="glass rounded-lg p-8 text-center">
          <p className="text-sm font-medium text-foreground">Sin movimientos registrados en {year}.</p>
          <p className="mt-1 text-sm text-muted-foreground">Los gráficos aparecen en cuanto haya transacciones en ese año.</p>
        </div>
      )}

      {isFetching && <p className="text-center text-xs text-muted-foreground">Actualizando...</p>}
    </div>
  );
}
