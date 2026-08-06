import Papa from 'papaparse';
import type { ReportTransactionRow } from '@/domain/entities/Report';

/**
 * CSV plano de las transacciones del reporte. Se antepone un BOM UTF-8 para
 * que Excel (Windows) detecte automáticamente la codificación y no rompa
 * tildes/ñ al abrir el archivo directamente.
 */
export function buildCsv(rows: ReportTransactionRow[]): Buffer {
  const csv = Papa.unparse(
    rows.map((row) => ({
      Fecha: row.date,
      Tipo: row.type === 'income' ? 'Ingreso' : 'Gasto',
      Descripción: row.description,
      Categoría: row.categoryName ?? '',
      Cuenta: row.accountName,
      Cliente: row.clientName ?? '',
      Monto: row.amount,
    }))
  );

  return Buffer.from('﻿' + csv, 'utf-8');
}
