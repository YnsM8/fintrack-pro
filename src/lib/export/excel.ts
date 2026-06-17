import * as XLSX from 'xlsx';

export function exportTransactionsToExcel(transactions: any[]) {
  const ws = XLSX.utils.json_to_sheet(
    transactions.map((t) => ({
      Fecha: t.transaction_date,
      Descripción: t.description || 'Sin descripción',
      Tipo: t.type === 'income' ? 'Ingreso' : 'Gasto',
      Monto: t.amount,
      Divisa: t.currency,
      'Monto Base (USD)': t.base_amount,
      'Tasa de Cambio': t.exchange_rate,
    }))
  );

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Transacciones');
  XLSX.writeFile(wb, 'FinTrackPro_Reporte.xlsx');
}
