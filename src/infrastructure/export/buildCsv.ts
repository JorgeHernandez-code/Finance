import Papa from 'papaparse';
import type { ReportTransactionRow } from '@/domain/entities/Report';

const FORMULA_TRIGGER_CHARS = ['=', '+', '-', '@', '\t', '\r'];

/**
 * Neutraliza inyección de fórmulas CSV (CWE-1236): un valor de usuario que
 * empiece con =, +, -, @, tab o CR es interpretado como fórmula por
 * Excel/Sheets al abrir el archivo. Anteponer un apóstrofe lo fuerza a texto.
 */
function escapeCsvFormula(value: string): string {
  const firstChar = value.charAt(0);
  return FORMULA_TRIGGER_CHARS.includes(firstChar) ? `'${value}` : value;
}

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
      Descripción: escapeCsvFormula(row.description),
      Categoría: row.categoryName ? escapeCsvFormula(row.categoryName) : '',
      Cuenta: escapeCsvFormula(row.accountName),
      Cliente: row.clientName ? escapeCsvFormula(row.clientName) : '',
      Monto: row.amount,
    }))
  );

  return Buffer.from('﻿' + csv, 'utf-8');
}
