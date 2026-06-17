import jsPDF from 'jspdf';
import 'jspdf-autotable';

export function exportTransactionsToPDF(transactions: any[]) {
  const doc = new jsPDF() as any;
  doc.setFont('helvetica', 'normal');
  doc.text('FinTrack Pro - Reporte Financiero', 14, 20);

  const columns = ['Fecha', 'Descripción', 'Tipo', 'Monto', 'Divisa'];
  const rows = transactions.map((t) => [
    t.transaction_date,
    t.description || 'Sin descripción',
    t.type === 'income' ? 'Ingreso' : 'Gasto',
    `$${Number(t.amount).toFixed(2)}`,
    t.currency,
  ]);

  doc.autoTable({
    head: [columns],
    body: rows,
    startY: 28,
  });

  doc.save('FinTrackPro_Reporte.pdf');
}
