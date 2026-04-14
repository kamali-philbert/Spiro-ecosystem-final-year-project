import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const BLUE   = [43,  62,  230];
const YELLOW = [200, 240,   0];
const GREEN  = [61,  181,  74];
const DARK   = [13,  18,   48];
const GRAY   = [160, 160, 180];

const fmt     = (n)  => Number(n).toLocaleString('en-RW') + ' RWF';
const fmtDate = (d)  => new Date(d + 'T00:00').toLocaleDateString('en-RW', { weekday:'long', day:'numeric', month:'long', year:'numeric' });
const fmtTime = (ts) => new Date(ts).toLocaleTimeString('en-RW', { hour:'2-digit', minute:'2-digit' });

export function generateDailyReportPDF(report, options = {}) {
  const { role = 'CASHIER', stationName = 'All Stations' } = options;
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const W = doc.internal.pageSize.getWidth();

  // ── HEADER ─────────────────────────────────────────────────────────────────
  doc.setFillColor(...DARK);
  doc.rect(0, 0, W, 52, 'F');
  doc.setFillColor(...BLUE);
  doc.rect(0, 0, 6, 52, 'F');

  // Logo box
  doc.setFillColor(...BLUE);
  doc.roundedRect(12, 8, 18, 18, 3, 3, 'F');
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...YELLOW);
  doc.text('Z', 18, 20); // lightning approximation

  // Company name
  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...YELLOW);
  doc.text('SPIRO', 34, 18);
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...GRAY);
  doc.text('An Equitane group company', 34, 23);
  doc.setFontSize(7.5);
  doc.setTextColor(180, 180, 200);
  doc.text('Energy on the move', 34, 28);

  // Report info (right side)
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(255, 255, 255);
  doc.text('DAILY SWAP REPORT', W - 14, 16, { align: 'right' });
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...GRAY);
  doc.text(fmtDate(report.date), W - 14, 22, { align: 'right' });
  doc.text(`Station: ${stationName}`, W - 14, 28, { align: 'right' });
  doc.text(`Generated: ${new Date().toLocaleString('en-RW')}`, W - 14, 34, { align: 'right' });

  doc.setDrawColor(...BLUE);
  doc.setLineWidth(0.5);
  doc.line(6, 52, W - 6, 52);

  // ── SUMMARY CARDS ──────────────────────────────────────────────────────────
  // Group by rider for unique count
  const grouped = Object.values(
    report.transactions.reduce((acc, t) => {
      if (!acc[t.rider_name]) acc[t.rider_name] = { swaps: [], total: 0 };
      acc[t.rider_name].swaps.push(t);
      acc[t.rider_name].total += Number(t.cost);
      return acc;
    }, {})
  );

  const cards = [
    { label: 'Total Swaps',     value: String(report.total_swaps),    color: BLUE  },
    { label: 'Total Revenue',   value: fmt(report.total_revenue),      color: GREEN },
    { label: 'Avg SoC Returned',value: `${report.avg_soc}%`,           color: YELLOW},
    { label: 'Unique Riders',   value: String(grouped.length),         color: BLUE  },
  ];

  const cardW = (W - 20) / 4;
  cards.forEach((c, i) => {
    const x = 10 + i * (cardW + 2);
    doc.setFillColor(20, 26, 60);
    doc.roundedRect(x, 57, cardW, 20, 2, 2, 'F');
    doc.setDrawColor(...c.color);
    doc.setLineWidth(0.4);
    doc.roundedRect(x, 57, cardW, 20, 2, 2, 'S');
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...GRAY);
    doc.text(c.label, x + cardW / 2, 63, { align: 'center' });
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...c.color);
    doc.text(c.value, x + cardW / 2, 72, { align: 'center' });
  });

  let yPos = 84;

  // ── STATION BREAKDOWN (admin) ───────────────────────────────────────────────
  if (report.by_station && Object.keys(report.by_station).length > 1) {
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...YELLOW);
    doc.text('REVENUE BY STATION', 10, yPos);
    yPos += 4;

    autoTable(doc, {
      startY: yPos,
      head: [['Station', 'Swaps', 'Revenue']],
      body: Object.entries(report.by_station).map(([name, d]) => [name, d.swaps, fmt(d.revenue)]),
      theme: 'plain',
      styles: { fontSize: 8, textColor: [220, 220, 240], cellPadding: 2.5, fillColor: [20, 26, 60] },
      headStyles: { fillColor: DARK, textColor: YELLOW, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [16, 22, 52] },
      columnStyles: { 2: { halign: 'right' } },
      margin: { left: 10, right: 10 },
    });
    yPos = doc.lastAutoTable.finalY + 8;
  }

  // ── TRANSACTIONS GROUPED BY RIDER ──────────────────────────────────────────
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...YELLOW);
  doc.text('SWAP RECORDS BY RIDER', 10, yPos);
  yPos += 4;

  // Build rows: each rider's swaps, then a subtotal row if > 1 swap
  const tableBody = [];
  grouped.forEach((rider, ri) => {
    rider.swaps.forEach((t, si) => {
      tableBody.push({
        isSubtotal: false,
        isFirstRow: si === 0,
        riderName:  si === 0 ? t.rider_name : '  ↳',
        phone:      si === 0 ? (t.rider_phone || '—') : '',
        station:    t.station_name,
        time:       fmtTime(t.swap_timestamp),
        given:      t.battery_given,
        received:   t.battery_received,
        soc:        `${t.soc_at_return}%`,
        cost:       fmt(t.cost),
        rawSoc:     Number(t.soc_at_return),
      });
    });
    if (rider.swaps.length > 1) {
      tableBody.push({
        isSubtotal: true,
        riderName: '',
        phone: '',
        station: '',
        time: '',
        given: '',
        received: '',
        soc: `Subtotal (${rider.swaps.length} swaps):`,
        cost: fmt(rider.total),
      });
    }
  });

  const cols = role === 'ADMIN'
    ? ['#', 'Rider', 'Phone', 'Station', 'Time', 'Given', 'Received', 'SoC', 'Cost']
    : ['#', 'Rider', 'Phone', 'Time', 'Given', 'Received', 'SoC', 'Cost'];

  let rowIndex = 0;
  let displayNum = 1;
  const bodyRows = tableBody.map((r) => {
    if (r.isSubtotal) {
      return role === 'ADMIN'
        ? ['', '', '', '', '', '', '', r.soc, r.cost]
        : ['', '', '', '', '', '', r.soc, r.cost];
    }
    const num = r.isFirstRow ? String(displayNum++) : '';
    rowIndex++;
    return role === 'ADMIN'
      ? [num, r.riderName, r.phone, r.station, r.time, r.given, r.received, r.soc, r.cost]
      : [num, r.riderName, r.phone, r.time, r.given, r.received, r.soc, r.cost];
  });

  const lastCol = cols.length - 1;
  const socCol  = cols.length - 2;

  autoTable(doc, {
    startY: yPos,
    head: [cols],
    body: bodyRows,
    theme: 'plain',
    styles: { fontSize: 7.5, textColor: [220, 220, 240], cellPadding: 2.5, fillColor: [20, 26, 60] },
    headStyles: { fillColor: DARK, textColor: YELLOW, fontStyle: 'bold', fontSize: 8 },
    alternateRowStyles: { fillColor: [16, 22, 52] },
    columnStyles: {
      0: { cellWidth: 8, halign: 'center' },
      [lastCol]: { halign: 'right', textColor: [200, 240, 0] },
    },
    didParseCell: (data) => {
      const row = tableBody[data.row.index];
      if (!row) return;
      if (row.isSubtotal) {
        data.cell.styles.fillColor = [30, 40, 90];
        data.cell.styles.fontStyle = 'bold';
        if (data.column.index === lastCol) data.cell.styles.textColor = YELLOW;
        else data.cell.styles.textColor = GRAY;
      }
    },
    margin: { left: 10, right: 10 },
    didDrawPage: (data) => {
      doc.setFillColor(...DARK);
      doc.rect(0, 0, W, 10, 'F');
      doc.setFontSize(7);
      doc.setTextColor(...GRAY);
      doc.text(`Spiro Daily Report — ${report.date}`, 10, 7);
      doc.text(`Page ${data.pageNumber}`, W - 10, 7, { align: 'right' });
    },
  });

  // ── GRAND TOTAL ────────────────────────────────────────────────────────────
  const finalY = doc.lastAutoTable.finalY + 4;
  doc.setFillColor(...BLUE);
  doc.roundedRect(10, finalY, W - 20, 12, 2, 2, 'F');
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(255, 255, 255);
  doc.text(`${report.total_swaps} swaps  ·  ${grouped.length} riders  ·  Avg SoC: ${report.avg_soc}%`, 14, finalY + 7.5);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...YELLOW);
  doc.text(`Grand Total: ${fmt(report.total_revenue)}`, W - 14, finalY + 7.5, { align: 'right' });

  // ── FOOTER ─────────────────────────────────────────────────────────────────
  const pageH = doc.internal.pageSize.getHeight();
  doc.setFillColor(...DARK);
  doc.rect(0, pageH - 14, W, 14, 'F');
  doc.setFillColor(...BLUE);
  doc.rect(0, pageH - 14, 6, 14, 'F');
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...GRAY);
  doc.text('Spiro Intelligent Battery Ecosystem  |  Kigali, Rwanda  |  An Equitane group company', W / 2, pageH - 7, { align: 'center' });
  doc.setTextColor(...YELLOW);
  doc.text('Energy on the move', W / 2, pageH - 3, { align: 'center' });

  doc.save(`Spiro_Daily_Report_${report.date}.pdf`);
}
