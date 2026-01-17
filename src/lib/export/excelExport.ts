import ExcelJS from "exceljs";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import type { ExportTransaction, ExportOptions } from "./types";

/**
 * Sanitize text for export
 */
const sanitizeText = (text: string): string => {
  if (!text) return '';
  return text
    .replace(/[\u{1F600}-\u{1F64F}]/gu, '')
    .replace(/[\u{1F300}-\u{1F5FF}]/gu, '')
    .replace(/[\u{1F680}-\u{1F6FF}]/gu, '')
    .replace(/[\u{1F1E0}-\u{1F1FF}]/gu, '')
    .replace(/[\u{2600}-\u{26FF}]/gu, '')
    .replace(/[\u{2700}-\u{27BF}]/gu, '')
    .replace(/[\u{FE00}-\u{FE0F}]/gu, '')
    .replace(/[\u{1F900}-\u{1F9FF}]/gu, '')
    .replace(/[\u{1FA00}-\u{1FA6F}]/gu, '')
    .replace(/[\u{1FA70}-\u{1FAFF}]/gu, '')
    .replace(/[^\x00-\x7F\xA0-\xFF\u0100-\u017F]/g, '')
    .trim();
};

// Theme colors
const COLORS = {
  primary: '5DBE8A',      // theme-green
  secondary: 'E879A8',    // theme-rose
  accent: 'B8A9E8',       // theme-lavender
  dark: '2D2D37',
  muted: '787882',
  light: 'F8FAFC',
  white: 'FFFFFF',
};

/**
 * Apply header style to a row
 */
function styleHeaderRow(row: ExcelJS.Row, color: string = COLORS.primary): void {
  row.eachCell(cell => {
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: color },
    };
    cell.font = {
      bold: true,
      color: { argb: 'FFFFFF' },
      size: 11,
    };
    cell.alignment = {
      vertical: 'middle',
      horizontal: 'center',
    };
    cell.border = {
      bottom: { style: 'thin', color: { argb: '000000' } },
    };
  });
  row.height = 22;
}

/**
 * Apply title style to a cell
 */
function styleTitleCell(cell: ExcelJS.Cell, color: string = COLORS.primary): void {
  cell.font = {
    bold: true,
    size: 14,
    color: { argb: color },
  };
}

/**
 * Apply alternating row colors
 */
function styleDataRow(row: ExcelJS.Row, isEven: boolean): void {
  const bgColor = isEven ? 'F5F7FA' : 'FFFFFF';
  row.eachCell(cell => {
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: bgColor },
    };
    cell.alignment = {
      vertical: 'middle',
    };
    cell.border = {
      bottom: { style: 'hair', color: { argb: 'E5E5E5' } },
    };
  });
}

/**
 * Style total row
 */
function styleTotalRow(row: ExcelJS.Row): void {
  row.eachCell(cell => {
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: COLORS.light },
    };
    cell.font = {
      bold: true,
      size: 11,
    };
    cell.border = {
      top: { style: 'double', color: { argb: COLORS.primary } },
    };
  });
}

/**
 * Export transactions to Excel with professional styling
 */
export async function exportToExcel(
  transactions: ExportTransaction[],
  options: ExportOptions
): Promise<void> {
  const workbook = new ExcelJS.Workbook();
  
  workbook.creator = 'Cattia';
  workbook.created = new Date();
  
  const total = transactions.reduce((s, t) => s + t.amount, 0);
  const sorted = [...transactions].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  // ==================== SHEET 1: TRANSACCIONES ====================
  const txSheet = workbook.addWorksheet('Transacciones', {
    views: [{ state: 'frozen', ySplit: 1 }],
  });

  // Set columns
  txSheet.columns = [
    { header: '#', key: 'num', width: 6 },
    { header: 'Fecha', key: 'fecha', width: 12 },
    { header: 'Descripcion', key: 'descripcion', width: 38 },
    { header: 'Categoria', key: 'categoria', width: 16 },
    { header: 'Metodo Pago', key: 'metodo', width: 14 },
    { header: 'Monto (S/)', key: 'monto', width: 14 },
  ];

  // Style header
  styleHeaderRow(txSheet.getRow(1));

  // Add data rows
  sorted.forEach((t, index) => {
    const row = txSheet.addRow({
      num: index + 1,
      fecha: format(new Date(t.date), 'dd/MM/yyyy'),
      descripcion: sanitizeText(t.name),
      categoria: sanitizeText(options.categoryMap[t.category_id as number] || 'Sin categoria'),
      metodo: sanitizeText(options.paymentMethodMap[t.payment_method_id as number] || '-'),
      monto: t.amount,
    });
    styleDataRow(row, index % 2 === 0);
    
    // Format amount as currency
    row.getCell('monto').numFmt = '"S/" #,##0.00';
  });

  // Add total row
  const totalRow = txSheet.addRow({
    num: '',
    fecha: '',
    descripcion: '',
    categoria: '',
    metodo: 'TOTAL:',
    monto: total,
  });
  styleTotalRow(totalRow);
  totalRow.getCell('monto').numFmt = '"S/" #,##0.00';

  // Auto filter
  txSheet.autoFilter = {
    from: { row: 1, column: 1 },
    to: { row: sorted.length + 1, column: 6 },
  };

  // ==================== SHEET 2: RESUMEN ====================
  const summarySheet = workbook.addWorksheet('Resumen');
  
  const uniqueDays = new Set(transactions.map(t => format(new Date(t.date), 'yyyy-MM-dd'))).size;
  const avgPerDay = total / Math.max(1, uniqueDays);
  const avgTransaction = total / Math.max(1, transactions.length);
  
  const dates = transactions.map(t => new Date(t.date));
  const minDate = dates.length ? new Date(Math.min(...dates.map(d => d.getTime()))) : new Date();
  const maxDate = dates.length ? new Date(Math.max(...dates.map(d => d.getTime()))) : new Date();

  // Title
  summarySheet.mergeCells('A1:B1');
  const titleCell = summarySheet.getCell('A1');
  titleCell.value = 'CATTIA - RESUMEN EJECUTIVO';
  styleTitleCell(titleCell);
  summarySheet.getRow(1).height = 28;

  // Metrics section
  const summaryData = [
    ['', ''],
    ['METRICAS PRINCIPALES', ''],
    ['Total de Gastos', `S/ ${total.toFixed(2)}`],
    ['Transacciones', transactions.length],
    ['Promedio por Transaccion', `S/ ${avgTransaction.toFixed(2)}`],
    ['Promedio Diario', `S/ ${avgPerDay.toFixed(2)}`],
    ['Dias con Movimientos', uniqueDays],
    ['', ''],
    ['PERIODO', ''],
    ['Desde', format(minDate, 'dd MMMM yyyy', { locale: es })],
    ['Hasta', format(maxDate, 'dd MMMM yyyy', { locale: es })],
    ['', ''],
    ['Generado el', format(new Date(), 'dd/MM/yyyy HH:mm')],
  ];

  summaryData.forEach((rowData, i) => {
    const row = summarySheet.addRow(rowData);
    if (rowData[0] === 'METRICAS PRINCIPALES' || rowData[0] === 'PERIODO') {
      row.getCell(1).font = { bold: true, color: { argb: COLORS.primary } };
    }
  });

  summarySheet.getColumn(1).width = 28;
  summarySheet.getColumn(2).width = 25;

  // ==================== SHEET 3: POR CATEGORIA ====================
  const catSheet = workbook.addWorksheet('Por Categoria');
  
  const categoryTotals = transactions.reduce((acc, t) => {
    const cat = sanitizeText(options.categoryMap[t.category_id as number] || 'Sin categoria');
    if (!acc[cat]) acc[cat] = { total: 0, count: 0 };
    acc[cat].total += t.amount;
    acc[cat].count += 1;
    return acc;
  }, {} as Record<string, { total: number; count: number }>);

  catSheet.columns = [
    { header: 'Categoria', key: 'cat', width: 22 },
    { header: 'Total (S/)', key: 'total', width: 14 },
    { header: 'Transacciones', key: 'count', width: 14 },
    { header: 'Porcentaje', key: 'pct', width: 12 },
    { header: 'Promedio (S/)', key: 'avg', width: 14 },
  ];

  styleHeaderRow(catSheet.getRow(1), COLORS.accent);

  Object.entries(categoryTotals)
    .sort(([, a], [, b]) => b.total - a.total)
    .forEach(([name, stats], i) => {
      const row = catSheet.addRow({
        cat: name,
        total: stats.total,
        count: stats.count,
        pct: ((stats.total / total) * 100).toFixed(1) + '%',
        avg: stats.total / stats.count,
      });
      styleDataRow(row, i % 2 === 0);
      row.getCell('total').numFmt = '"S/" #,##0.00';
      row.getCell('avg').numFmt = '"S/" #,##0.00';
    });

  // ==================== SHEET 4: POR METODO PAGO ====================
  const methodSheet = workbook.addWorksheet('Por Metodo Pago');

  const methodTotals = transactions.reduce((acc, t) => {
    const method = sanitizeText(options.paymentMethodMap[t.payment_method_id as number] || 'Sin especificar');
    if (!acc[method]) acc[method] = { total: 0, count: 0 };
    acc[method].total += t.amount;
    acc[method].count += 1;
    return acc;
  }, {} as Record<string, { total: number; count: number }>);

  methodSheet.columns = [
    { header: 'Metodo de Pago', key: 'method', width: 20 },
    { header: 'Total (S/)', key: 'total', width: 14 },
    { header: 'Transacciones', key: 'count', width: 14 },
    { header: 'Porcentaje', key: 'pct', width: 12 },
  ];

  styleHeaderRow(methodSheet.getRow(1), COLORS.secondary);

  Object.entries(methodTotals)
    .sort(([, a], [, b]) => b.total - a.total)
    .forEach(([name, stats], i) => {
      const row = methodSheet.addRow({
        method: name,
        total: stats.total,
        count: stats.count,
        pct: ((stats.total / total) * 100).toFixed(1) + '%',
      });
      styleDataRow(row, i % 2 === 0);
      row.getCell('total').numFmt = '"S/" #,##0.00';
    });

  // ==================== SAVE ====================
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.href = url;
  link.download = `Cattia_Gastos_${format(new Date(), 'yyyy-MM-dd')}.xlsx`;
  link.click();
  
  URL.revokeObjectURL(url);
}
