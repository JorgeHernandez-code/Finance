import ExcelJS from 'exceljs';
import type { ReportTransactionRow } from '@/domain/entities/Report';

export async function buildExcel(rows: ReportTransactionRow[], year: number): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Finance';
  workbook.created = new Date();

  const sheet = workbook.addWorksheet(`Transacciones ${year}`);
  sheet.columns = [
    { header: 'Fecha', key: 'date', width: 14 },
    { header: 'Tipo', key: 'type', width: 12 },
    { header: 'Descripción', key: 'description', width: 32 },
    { header: 'Categoría', key: 'category', width: 20 },
    { header: 'Cuenta', key: 'account', width: 18 },
    { header: 'Cliente', key: 'client', width: 20 },
    { header: 'Monto', key: 'amount', width: 16 },
  ];
  sheet.getRow(1).font = { bold: true };

  for (const row of rows) {
    sheet.addRow({
      date: row.date,
      type: row.type === 'income' ? 'Ingreso' : 'Gasto',
      description: row.description,
      category: row.categoryName ?? '',
      account: row.accountName,
      client: row.clientName ?? '',
      amount: row.amount,
    });
  }

  sheet.getColumn('amount').numFmt = '#,##0';

  const totalIncome = rows.filter((r) => r.type === 'income').reduce((sum, r) => sum + r.amount, 0);
  const totalExpense = rows.filter((r) => r.type === 'expense').reduce((sum, r) => sum + r.amount, 0);

  sheet.addRow({});
  sheet.addRow({ description: 'Total ingresos', amount: totalIncome }).font = { bold: true };
  sheet.addRow({ description: 'Total gastos', amount: totalExpense }).font = { bold: true };
  sheet.addRow({ description: 'Balance', amount: totalIncome - totalExpense }).font = { bold: true };

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}
