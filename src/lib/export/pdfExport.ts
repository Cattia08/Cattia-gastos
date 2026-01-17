import jsPDF from "jspdf";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import type { ExportTransaction, ExportOptions, CategoryStats } from "./types";

/**
 * Sanitize text for PDF - removes emojis and special characters that cause encoding issues
 */
const sanitizeText = (text: string): string => {
  if (!text) return '';
  // Remove emojis and other problematic unicode characters
  return text
    .replace(/[\u{1F600}-\u{1F64F}]/gu, '') // Emoticons
    .replace(/[\u{1F300}-\u{1F5FF}]/gu, '') // Misc Symbols and Pictographs
    .replace(/[\u{1F680}-\u{1F6FF}]/gu, '') // Transport and Map
    .replace(/[\u{1F1E0}-\u{1F1FF}]/gu, '') // Flags
    .replace(/[\u{2600}-\u{26FF}]/gu, '')   // Misc symbols
    .replace(/[\u{2700}-\u{27BF}]/gu, '')   // Dingbats
    .replace(/[\u{FE00}-\u{FE0F}]/gu, '')   // Variation Selectors
    .replace(/[\u{1F900}-\u{1F9FF}]/gu, '') // Supplemental Symbols
    .replace(/[\u{1FA00}-\u{1FA6F}]/gu, '') // Chess Symbols
    .replace(/[\u{1FA70}-\u{1FAFF}]/gu, '') // Symbols and Pictographs Extended-A
    .replace(/[\u{231A}-\u{231B}]/gu, '')   // Watch, Hourglass
    .replace(/[\u{23E9}-\u{23F3}]/gu, '')   // Various symbols
    .replace(/[\u{23F8}-\u{23FA}]/gu, '')   // More symbols
    .replace(/[\u{25AA}-\u{25AB}]/gu, '')   // Squares
    .replace(/[\u{25B6}]/gu, '')            // Play button
    .replace(/[\u{25C0}]/gu, '')            // Reverse button
    .replace(/[\u{25FB}-\u{25FE}]/gu, '')   // More squares
    .replace(/[\u{2614}-\u{2615}]/gu, '')   // Umbrella, Hot beverage
    .replace(/[\u{2648}-\u{2653}]/gu, '')   // Zodiac
    .replace(/[\u{267F}]/gu, '')            // Wheelchair
    .replace(/[\u{2693}]/gu, '')            // Anchor
    .replace(/[\u{26A1}]/gu, '')            // High voltage
    .replace(/[\u{26AA}-\u{26AB}]/gu, '')   // Circles
    .replace(/[\u{26BD}-\u{26BE}]/gu, '')   // Sports balls
    .replace(/[\u{26C4}-\u{26C5}]/gu, '')   // Snowman, Sun
    .replace(/[\u{26CE}]/gu, '')            // Ophiuchus
    .replace(/[\u{26D4}]/gu, '')            // No entry
    .replace(/[\u{26EA}]/gu, '')            // Church
    .replace(/[\u{26F2}-\u{26F3}]/gu, '')   // Fountain, Golf
    .replace(/[\u{26F5}]/gu, '')            // Sailboat
    .replace(/[\u{26FA}]/gu, '')            // Tent
    .replace(/[\u{26FD}]/gu, '')            // Fuel pump
    .replace(/[^\x00-\x7F\xA0-\xFF\u0100-\u017F]/g, '') // Remove remaining non-latin chars
    .trim();
};

// Color palette for PDF
const COLORS = {
  primary: [93, 190, 138] as [number, number, number],
  secondary: [232, 121, 168] as [number, number, number],
  accent: [184, 169, 232] as [number, number, number],
  dark: [45, 45, 55] as [number, number, number],
  muted: [120, 120, 130] as [number, number, number],
  light: [248, 250, 252] as [number, number, number],
  white: [255, 255, 255] as [number, number, number],
};

const BAR_COLORS = [
  COLORS.primary,
  COLORS.secondary,
  COLORS.accent,
  [245, 200, 105] as [number, number, number],
  [124, 184, 153] as [number, number, number],
];

/**
 * Calculate category statistics from transactions
 */
function calculateCategoryStats(
  transactions: ExportTransaction[],
  categoryMap: Record<number, string>
): CategoryStats[] {
  const total = transactions.reduce((s, t) => s + t.amount, 0);
  
  const statsMap = transactions.reduce((acc, t) => {
    const catName = sanitizeText(categoryMap[t.category_id as number] || 'Sin categoria');
    if (!acc[catName]) acc[catName] = { name: catName, total: 0, count: 0, percentage: 0 };
    acc[catName].total += t.amount;
    acc[catName].count += 1;
    return acc;
  }, {} as Record<string, CategoryStats>);

  return Object.values(statsMap)
    .map(stat => ({ ...stat, percentage: (stat.total / total) * 100 }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 5);
}

/**
 * Get date text for display based on export mode
 */
function getDateText(options: ExportOptions): string {
  if (options.mode === 'all') return 'Historico completo';
  
  if (options.mode === 'range' && options.startDate) {
    if (options.endDate) {
      return `${format(options.startDate, 'd MMM', { locale: es })} - ${format(options.endDate, 'd MMM yyyy', { locale: es })}`;
    }
    return format(options.startDate, 'd MMMM yyyy', { locale: es });
  }
  
  if (options.mode === 'months' && options.months && options.months.length > 0) {
    if (options.months.length === 1) {
      return format(new Date(options.months[0] + '-01'), 'MMMM yyyy', { locale: es });
    }
    return `${options.months.length} meses seleccionados`;
  }
  
  return 'Periodo seleccionado';
}

/**
 * Draw the cover page with header and summary cards
 */
function drawCoverPage(
  doc: jsPDF,
  transactions: ExportTransaction[],
  categoryStats: CategoryStats[],
  options: ExportOptions,
  pageWidth: number,
  margin: number,
  contentWidth: number
): void {
  const total = transactions.reduce((s, t) => s + t.amount, 0);
  const uniqueDays = new Set(transactions.map(t => format(new Date(t.date), 'yyyy-MM-dd'))).size;
  const avgPerDay = total / Math.max(1, uniqueDays);
  
  // Gradient-style header background
  doc.setFillColor(...COLORS.primary);
  doc.rect(0, 0, pageWidth, 70, 'F');
  
  // Decorative accent stripe
  doc.setFillColor(...COLORS.secondary);
  doc.rect(0, 65, pageWidth, 8, 'F');
  
  // App branding
  doc.setTextColor(...COLORS.white);
  doc.setFontSize(28);
  doc.setFont('helvetica', 'bold');
  doc.text('Cattia', margin, 28);
  
  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.text('Reporte de Gastos', margin, 38);
  
  // Date range badge
  const dateText = getDateText(options);
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(margin, 48, 80, 10, 2, 2, 'F');
  doc.setTextColor(...COLORS.primary);
  doc.setFontSize(9);
  doc.text(dateText, margin + 4, 55);
  
  // Generation date on right
  doc.setTextColor(...COLORS.white);
  doc.setFontSize(9);
  doc.text(`Generado: ${format(new Date(), "d MMM yyyy, HH:mm", { locale: es })}`, pageWidth - margin, 55, { align: 'right' });

  // Summary Cards
  let y = 85;
  const cardWidth = (contentWidth - 10) / 3;
  const cardHeight = 35;
  
  // Card 1: Total
  doc.setFillColor(...COLORS.light);
  doc.roundedRect(margin, y, cardWidth, cardHeight, 3, 3, 'F');
  doc.setDrawColor(...COLORS.primary);
  doc.setLineWidth(0.5);
  doc.roundedRect(margin, y, cardWidth, cardHeight, 3, 3, 'S');
  
  doc.setTextColor(...COLORS.muted);
  doc.setFontSize(9);
  doc.text('TOTAL GASTOS', margin + 5, y + 10);
  doc.setTextColor(...COLORS.dark);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text(`S/ ${total.toFixed(2)}`, margin + 5, y + 23);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...COLORS.primary);
  doc.text(`${transactions.length} transacciones`, margin + 5, y + 30);
  
  // Card 2: Average per day
  const card2X = margin + cardWidth + 5;
  doc.setFillColor(...COLORS.light);
  doc.roundedRect(card2X, y, cardWidth, cardHeight, 3, 3, 'F');
  doc.setDrawColor(...COLORS.secondary);
  doc.roundedRect(card2X, y, cardWidth, cardHeight, 3, 3, 'S');
  
  doc.setTextColor(...COLORS.muted);
  doc.setFontSize(9);
  doc.text('PROMEDIO DIARIO', card2X + 5, y + 10);
  doc.setTextColor(...COLORS.dark);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text(`S/ ${avgPerDay.toFixed(2)}`, card2X + 5, y + 23);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...COLORS.secondary);
  doc.text(`${uniqueDays} dias con gastos`, card2X + 5, y + 30);
  
  // Card 3: Top category
  const card3X = margin + (cardWidth + 5) * 2;
  const topCat = categoryStats[0];
  doc.setFillColor(...COLORS.light);
  doc.roundedRect(card3X, y, cardWidth, cardHeight, 3, 3, 'F');
  doc.setDrawColor(...COLORS.accent);
  doc.roundedRect(card3X, y, cardWidth, cardHeight, 3, 3, 'S');
  
  doc.setTextColor(...COLORS.muted);
  doc.setFontSize(9);
  doc.text('TOP CATEGORIA', card3X + 5, y + 10);
  doc.setTextColor(...COLORS.dark);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text((topCat?.name || 'N/A').slice(0, 15), card3X + 5, y + 22);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...COLORS.accent);
  if (topCat) {
    doc.text(`${topCat.percentage.toFixed(0)}% del total`, card3X + 5, y + 30);
  }

  // Category Breakdown
  y = 135;
  doc.setTextColor(...COLORS.dark);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('Desglose por Categoria', margin, y);
  doc.setFont('helvetica', 'normal');
  
  y += 8;
  const barMaxWidth = 100;
  const maxCatTotal = categoryStats[0]?.total || 1;
  
  categoryStats.forEach((stat, index) => {
    const barWidth = (stat.total / maxCatTotal) * barMaxWidth;
    
    doc.setTextColor(...COLORS.dark);
    doc.setFontSize(9);
    doc.text(stat.name.slice(0, 20), margin, y + 4);
    
    // Bar background
    doc.setFillColor(230, 230, 235);
    doc.roundedRect(margin + 45, y, barMaxWidth, 5, 1, 1, 'F');
    
    // Bar fill
    doc.setFillColor(...BAR_COLORS[index % BAR_COLORS.length]);
    doc.roundedRect(margin + 45, y, barWidth, 5, 1, 1, 'F');
    
    // Amount and percentage
    doc.setTextColor(...COLORS.muted);
    doc.setFontSize(8);
    doc.text(`S/ ${stat.total.toFixed(2)} (${stat.percentage.toFixed(1)}%)`, margin + 150, y + 4);
    
    y += 10;
  });
}

/**
 * Draw the table header
 */
function drawTableHeader(doc: jsPDF, startY: number, margin: number, contentWidth: number): number {
  doc.setFillColor(...COLORS.primary);
  doc.roundedRect(margin, startY, contentWidth, 10, 2, 2, 'F');
  
  doc.setTextColor(...COLORS.white);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text('Fecha', margin + 4, startY + 7);
  doc.text('Descripcion', margin + 28, startY + 7);
  doc.text('Categoria', margin + 95, startY + 7);
  doc.text('Metodo', margin + 130, startY + 7);
  doc.text('Monto', margin + 165, startY + 7, { align: 'right' });
  doc.setFont('helvetica', 'normal');
  
  return startY + 14;
}

/**
 * Draw transactions table pages
 */
function drawTransactionsTable(
  doc: jsPDF,
  transactions: ExportTransaction[],
  options: ExportOptions,
  pageWidth: number,
  pageHeight: number,
  margin: number,
  contentWidth: number
): void {
  doc.addPage();
  
  // Table title
  doc.setTextColor(...COLORS.dark);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Detalle de Transacciones', margin, 20);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...COLORS.muted);
  doc.text(`${transactions.length} transacciones ordenadas por fecha`, margin, 27);
  
  let y = drawTableHeader(doc, 32, margin, contentWidth);
  
  const sorted = [...transactions].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  
  sorted.forEach((t, index) => {
    if (y > pageHeight - 25) { 
      doc.addPage();
      // Mini header on continuation pages
      doc.setFillColor(...COLORS.light);
      doc.rect(0, 0, pageWidth, 15, 'F');
      doc.setTextColor(...COLORS.muted);
      doc.setFontSize(8);
      doc.text('Cattia - Reporte de Gastos (continuacion)', margin, 10);
      y = drawTableHeader(doc, 20, margin, contentWidth);
    }
    
    // Alternate row background
    if (index % 2 === 0) {
      doc.setFillColor(252, 252, 254);
      doc.rect(margin, y - 4.5, contentWidth, 7, 'F');
    }
    
    // Row content
    doc.setTextColor(...COLORS.dark);
    doc.setFontSize(7);
    doc.text(format(new Date(t.date), 'dd MMM yy', { locale: es }), margin + 4, y);
    
    const name = sanitizeText(t.name);
    const truncatedName = name.length > 28 ? name.slice(0, 28) + '...' : name;
    doc.text(truncatedName, margin + 28, y);
    
    doc.setTextColor(...COLORS.muted);
    const catName = sanitizeText(options.categoryMap[t.category_id as number] || 'Sin cat.');
    doc.text(catName.slice(0, 14), margin + 95, y);
    
    const methodName = sanitizeText(options.paymentMethodMap[t.payment_method_id as number] || '-');
    doc.text(methodName.slice(0, 12), margin + 130, y);
    
    doc.setTextColor(...COLORS.dark);
    doc.setFont('helvetica', 'bold');
    doc.text(`S/ ${t.amount.toFixed(2)}`, margin + 165, y, { align: 'right' });
    doc.setFont('helvetica', 'normal');
    
    y += 7;
  });
}

/**
 * Add footer to all pages
 */
function addFooters(doc: jsPDF, pageHeight: number, pageWidth: number, margin: number): void {
  const pageCount = doc.getNumberOfPages();
  
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    
    // Footer line
    doc.setDrawColor(...COLORS.light);
    doc.setLineWidth(0.5);
    doc.line(margin, pageHeight - 15, pageWidth - margin, pageHeight - 15);
    
    // Footer content
    doc.setTextColor(...COLORS.muted);
    doc.setFontSize(7);
    doc.text('Generado con Cattia - Tu asistente de finanzas personales', margin, pageHeight - 8);
    doc.text(`Pagina ${i} de ${pageCount}`, pageWidth - margin, pageHeight - 8, { align: 'right' });
  }
}

/**
 * Export transactions to PDF format
 */
export async function exportToPdf(
  transactions: ExportTransaction[],
  options: ExportOptions
): Promise<void> {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const pageWidth = 210;
  const pageHeight = 297;
  const margin = 15;
  const contentWidth = pageWidth - (margin * 2);
  
  // Calculate stats
  const categoryStats = calculateCategoryStats(transactions, options.categoryMap);
  
  // Draw cover page
  drawCoverPage(doc, transactions, categoryStats, options, pageWidth, margin, contentWidth);
  
  // Draw transactions table
  drawTransactionsTable(doc, transactions, options, pageWidth, pageHeight, margin, contentWidth);
  
  // Add footers
  addFooters(doc, pageHeight, pageWidth, margin);
  
  // Save
  doc.save(`cattia-reporte-${format(new Date(), 'yyyy-MM-dd')}.pdf`);
}
