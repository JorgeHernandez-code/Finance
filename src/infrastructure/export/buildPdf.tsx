import { Document, Page, Text, View, StyleSheet, renderToBuffer } from '@react-pdf/renderer';
import type { ReportTransactionRow } from '@/domain/entities/Report';
import { formatMoney } from '@/shared/lib/format';

const styles = StyleSheet.create({
  page: { padding: 32, fontSize: 9, fontFamily: 'Helvetica' },
  title: { fontSize: 16, marginBottom: 4, fontFamily: 'Helvetica-Bold' },
  subtitle: { fontSize: 10, marginBottom: 16, color: '#666666' },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 },
  summaryBox: { flexGrow: 1, marginRight: 8, padding: 8, backgroundColor: '#f3f4f6', borderRadius: 4 },
  summaryBoxLast: { marginRight: 0 },
  summaryLabel: { fontSize: 8, color: '#666666', marginBottom: 2 },
  summaryValue: { fontSize: 12, fontFamily: 'Helvetica-Bold' },
  table: { width: '100%' },
  tableHeader: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#000000', paddingBottom: 4, marginBottom: 4 },
  tableRow: { flexDirection: 'row', borderBottomWidth: 0.5, borderBottomColor: '#dddddd', paddingVertical: 3 },
  colDate: { width: '12%' },
  colType: { width: '10%' },
  colDesc: { width: '28%' },
  colCategory: { width: '18%' },
  colAccount: { width: '17%' },
  colAmount: { width: '15%', textAlign: 'right' },
  headerCell: { fontFamily: 'Helvetica-Bold' },
});

interface ReportDocumentProps {
  year: number;
  rows: ReportTransactionRow[];
  totalIncome: number;
  totalExpense: number;
}

function ReportDocument({ year, rows, totalIncome, totalExpense }: ReportDocumentProps) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.title}>Reporte financiero {year}</Text>
        <Text style={styles.subtitle}>{rows.length} transacciones</Text>

        <View style={styles.summaryRow}>
          <View style={styles.summaryBox}>
            <Text style={styles.summaryLabel}>Ingresos</Text>
            <Text style={styles.summaryValue}>{formatMoney(totalIncome)}</Text>
          </View>
          <View style={styles.summaryBox}>
            <Text style={styles.summaryLabel}>Gastos</Text>
            <Text style={styles.summaryValue}>{formatMoney(totalExpense)}</Text>
          </View>
          <View style={[styles.summaryBox, styles.summaryBoxLast]}>
            <Text style={styles.summaryLabel}>Balance</Text>
            <Text style={styles.summaryValue}>{formatMoney(totalIncome - totalExpense)}</Text>
          </View>
        </View>

        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={[styles.colDate, styles.headerCell]}>Fecha</Text>
            <Text style={[styles.colType, styles.headerCell]}>Tipo</Text>
            <Text style={[styles.colDesc, styles.headerCell]}>Descripción</Text>
            <Text style={[styles.colCategory, styles.headerCell]}>Categoría</Text>
            <Text style={[styles.colAccount, styles.headerCell]}>Cuenta</Text>
            <Text style={[styles.colAmount, styles.headerCell]}>Monto</Text>
          </View>
          {rows.map((row, index) => (
            <View style={styles.tableRow} key={`${row.date}-${index}`} wrap={false}>
              <Text style={styles.colDate}>{row.date}</Text>
              <Text style={styles.colType}>{row.type === 'income' ? 'Ingreso' : 'Gasto'}</Text>
              <Text style={styles.colDesc}>{row.description}</Text>
              <Text style={styles.colCategory}>{row.categoryName ?? '—'}</Text>
              <Text style={styles.colAccount}>{row.accountName}</Text>
              <Text style={styles.colAmount}>{formatMoney(row.amount)}</Text>
            </View>
          ))}
        </View>
      </Page>
    </Document>
  );
}

export async function buildPdf(rows: ReportTransactionRow[], year: number): Promise<Buffer> {
  const totalIncome = rows.filter((r) => r.type === 'income').reduce((sum, r) => sum + r.amount, 0);
  const totalExpense = rows.filter((r) => r.type === 'expense').reduce((sum, r) => sum + r.amount, 0);

  return renderToBuffer(<ReportDocument year={year} rows={rows} totalIncome={totalIncome} totalExpense={totalExpense} />);
}
