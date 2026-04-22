import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { FileText, Download, RefreshCw, Calendar, Wrench, CheckCircle, AlertTriangle, Clock } from 'lucide-react';
import API from '../../services/api';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

function exportTechReportPDF(data, techName, date) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const W = doc.internal.pageSize.getWidth();
  const fmtDate = (d) => new Date(d + 'T00:00').toLocaleDateString('en-RW', { weekday:'long', day:'numeric', month:'long', year:'numeric' });

  // Header
  doc.setFillColor(13, 18, 48); doc.rect(0, 0, W, 52, 'F');
  doc.setFillColor(43, 62, 230); doc.rect(0, 0, 6, 52, 'F');

  doc.setFontSize(22); doc.setFont('helvetica', 'bold');
  doc.setTextColor(200, 240, 0); doc.text('SPIRO', 34, 18);
  doc.setFontSize(7); doc.setFont('helvetica', 'normal');
  doc.setTextColor(160, 160, 180);
  doc.text('An Equitane group company', 34, 23);
  doc.text('Energy on the move', 34, 28);

  doc.setFontSize(13); doc.setFont('helvetica', 'bold');
  doc.setTextColor(255, 255, 255);
  doc.text('TECHNICIAN REPAIR REPORT', W - 14, 16, { align: 'right' });
  doc.setFontSize(8); doc.setFont('helvetica', 'normal');
  doc.setTextColor(160, 160, 180);
  doc.text(fmtDate(date), W - 14, 22, { align: 'right' });
  doc.text(`Technician: ${techName}`, W - 14, 28, { align: 'right' });
  doc.text(`Generated: ${new Date().toLocaleString('en-RW')}`, W - 14, 34, { align: 'right' });

  doc.setDrawColor(43, 62, 230); doc.setLineWidth(0.5);
  doc.line(6, 52, W - 6, 52);

  // Summary cards
  const cards = [
    { label: 'Total Tickets',  value: String(data.length),                                    color: [43, 62, 230] },
    { label: 'Resolved',       value: String(data.filter(t => t.status === 'RESOLVED').length), color: [61, 181, 74] },
    { label: 'In Progress',    value: String(data.filter(t => t.status === 'IN_PROGRESS').length), color: [200, 240, 0] },
    { label: 'Open',           value: String(data.filter(t => t.status === 'OPEN').length),    color: [239, 68, 68] },
  ];
  const cW = (W - 20) / 4;
  cards.forEach((c, i) => {
    const x = 10 + i * (cW + 2);
    doc.setFillColor(20, 26, 60); doc.roundedRect(x, 57, cW, 20, 2, 2, 'F');
    doc.setDrawColor(...c.color); doc.setLineWidth(0.4); doc.roundedRect(x, 57, cW, 20, 2, 2, 'S');
    doc.setFontSize(7); doc.setFont('helvetica', 'normal'); doc.setTextColor(160, 160, 180);
    doc.text(c.label, x + cW / 2, 63, { align: 'center' });
    doc.setFontSize(11); doc.setFont('helvetica', 'bold'); doc.setTextColor(...c.color);
    doc.text(c.value, x + cW / 2, 72, { align: 'center' });
  });

  // Table
  doc.setFontSize(9); doc.setFont('helvetica', 'bold');
  doc.setTextColor(200, 240, 0); doc.text('REPAIR TICKET DETAILS', 10, 84);

  autoTable(doc, {
    startY: 88,
    head: [['Ticket #', 'Battery', 'Issue', 'SoH Before', 'SoH After', 'Components', 'Status', 'Date']],
    body: data.map(t => [
      `#${t.ticket_id}`,
      `#${t.battery_id}${t.battery_serial ? '\n' + t.battery_serial : ''}`,
      t.issue_description?.length > 40 ? t.issue_description.slice(0, 40) + '…' : t.issue_description,
      `${t.soh_before}%`,
      t.soh_after ? `${t.soh_after}%` : '—',
      t.components_replaced || '—',
      t.status,
      new Date(t.created_at).toLocaleDateString('en-RW'),
    ]),
    theme: 'plain',
    styles: { fontSize: 7.5, textColor: [220, 220, 240], cellPadding: 2.5, fillColor: [20, 26, 60] },
    headStyles: { fillColor: [13, 18, 48], textColor: [200, 240, 0], fontStyle: 'bold', fontSize: 8 },
    alternateRowStyles: { fillColor: [16, 22, 52] },
    columnStyles: {
      3: { halign: 'center', textColor: [239, 68, 68] },
      4: { halign: 'center', textColor: [61, 181, 74] },
      6: { halign: 'center' },
    },
    didParseCell: (d) => {
      if (d.column.index === 6) {
        if (d.cell.raw === 'RESOLVED')    d.cell.styles.textColor = [61, 181, 74];
        if (d.cell.raw === 'OPEN')        d.cell.styles.textColor = [239, 68, 68];
        if (d.cell.raw === 'IN_PROGRESS') d.cell.styles.textColor = [200, 240, 0];
      }
    },
    margin: { left: 10, right: 10 },
  });

  // Footer
  const pH = doc.internal.pageSize.getHeight();
  doc.setFillColor(13, 18, 48); doc.rect(0, pH - 14, W, 14, 'F');
  doc.setFillColor(43, 62, 230); doc.rect(0, pH - 14, 6, 14, 'F');
  doc.setFontSize(7); doc.setFont('helvetica', 'normal');
  doc.setTextColor(160, 160, 180);
  doc.text('Spiro Intelligent Battery Ecosystem  |  Kigali, Rwanda  |  An Equitane group company', W / 2, pH - 7, { align: 'center' });
  doc.setTextColor(200, 240, 0);
  doc.text('Energy on the move', W / 2, pH - 3, { align: 'center' });

  doc.save(`Spiro_Technician_Report_${techName.replace(' ', '_')}_${date}.pdf`);
}

export default function TechnicianReport() {
  const { user } = useAuth();
  const [tickets, setTickets]   = useState([]);
  const [loading, setLoading]   = useState(false);
  const [date, setDate]         = useState(new Date().toISOString().split('T')[0]);
  const [filter, setFilter]     = useState('ALL');

  const load = async () => {
    setLoading(true);
    try {
      const res = await API.get('/tickets');
      setTickets(res.data.data ?? []);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  // Filter by date and status
  const filtered = tickets.filter(t => {
    const sameDay = new Date(t.created_at).toISOString().split('T')[0] === date;
    const statusOk = filter === 'ALL' || t.status === filter;
    return sameDay && statusOk;
  });

  const fmt = (n) => n ?? '—';
  const statusBadge = (s) => {
    if (s === 'RESOLVED')    return 'bg-green-500/15 text-green-400';
    if (s === 'IN_PROGRESS') return 'bg-yellow-500/15 text-yellow-400';
    if (s === 'OPEN')        return 'bg-red-500/15 text-red-400';
    return 'bg-white/10 text-white/40';
  };

  const summary = {
    total:      filtered.length,
    resolved:   filtered.filter(t => t.status === 'RESOLVED').length,
    inProgress: filtered.filter(t => t.status === 'IN_PROGRESS').length,
    open:       filtered.filter(t => t.status === 'OPEN').length,
  };

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">My Repair Report</h1>
          <p className="text-white/40 text-sm mt-1">Daily summary of battery repairs and maintenance tickets</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {/* Status filter */}
          <select value={filter} onChange={e => setFilter(e.target.value)}
            className="bg-[#1a2255] border border-[#2B3EE6]/40 text-white text-sm rounded-xl px-3 py-2 focus:outline-none focus:border-[#C8F000]/50">
            <option value="ALL">All Status</option>
            <option value="OPEN">Open</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="RESOLVED">Resolved</option>
          </select>
          {/* Date */}
          <div className="relative">
            <Calendar size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
            <input type="date" value={date} onChange={e => setDate(e.target.value)}
              className="input-field pl-9 text-sm py-2" />
          </div>
          <button onClick={load} disabled={loading}
            className="p-2 rounded-xl bg-white/5 border border-white/10 text-white/60 hover:text-white transition">
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          </button>
          <button onClick={() => exportTechReportPDF(filtered, user?.full_name, date)}
            disabled={filtered.length === 0}
            className="btn-primary flex items-center gap-2 py-2 px-4 text-sm disabled:opacity-40">
            <Download size={14} /> Export PDF
          </button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { icon: FileText,     label: 'Total Tickets',  value: summary.total,      color: '#2B3EE6' },
          { icon: CheckCircle,  label: 'Resolved',       value: summary.resolved,   color: '#3DB54A' },
          { icon: Wrench,       label: 'In Progress',    value: summary.inProgress, color: '#C8F000' },
          { icon: AlertTriangle,label: 'Open',           value: summary.open,       color: '#ef4444' },
        ].map(({ icon: Icon, label, value, color }) => (
          <div key={label} className="bg-white/5 border border-white/10 rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: color + '22' }}>
                <Icon size={16} style={{ color }} />
              </div>
              <span className="text-white/50 text-xs">{label}</span>
            </div>
            <p className="text-white font-bold text-lg">{value}</p>
          </div>
        ))}
      </div>

      {/* Tickets table */}
      <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-white/10 flex items-center gap-2">
          <FileText size={16} className="text-[#C8F000]" />
          <span className="text-white font-semibold text-sm">Ticket Details</span>
          <span className="ml-auto text-white/30 text-xs">{filtered.length} records</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10">
                {['Ticket #', 'Battery', 'Issue', 'SoH Before', 'SoH After', 'Components Replaced', 'Status', 'Date'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-white/40 text-xs font-medium whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={8} className="px-4 py-10 text-center text-white/30 text-sm">No tickets for this date</td></tr>
              ) : filtered.map(t => (
                <tr key={t.ticket_id} className="border-b border-white/5 hover:bg-white/5 transition">
                  <td className="px-4 py-3 text-white font-semibold text-xs">#{t.ticket_id}</td>
                  <td className="px-4 py-3">
                    <p className="text-white text-xs font-medium">#{t.battery_id}</p>
                    {t.battery_serial && <p className="text-white/40 text-xs font-mono">{t.battery_serial}</p>}
                  </td>
                  <td className="px-4 py-3 text-white/60 text-xs max-w-[180px]">
                    <span className="line-clamp-2">{t.issue_description}</span>
                  </td>
                  <td className="px-4 py-3 text-red-400 font-semibold text-xs">{t.soh_before}%</td>
                  <td className="px-4 py-3 text-green-400 font-semibold text-xs">{fmt(t.soh_after)}{t.soh_after ? '%' : ''}</td>
                  <td className="px-4 py-3 text-white/50 text-xs">{t.components_replaced || '—'}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${statusBadge(t.status)}`}>{t.status}</span>
                  </td>
                  <td className="px-4 py-3 text-white/40 text-xs whitespace-nowrap">
                    {new Date(t.created_at).toLocaleDateString('en-RW')}
                    {t.resolved_at && (
                      <p className="text-green-400/60 text-xs">✓ {new Date(t.resolved_at).toLocaleDateString('en-RW')}</p>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
