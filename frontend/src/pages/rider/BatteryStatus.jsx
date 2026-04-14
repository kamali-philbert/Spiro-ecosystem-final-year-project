import { useEffect, useState } from 'react';
import API from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { Battery, Thermometer, Zap, Activity, RefreshCw, AlertTriangle, CheckCircle, Info, XCircle } from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';

const severityConfig = {
  GOOD:     { color: 'text-green-400',  bg: 'bg-green-500/10  border-green-500/30',  icon: CheckCircle },
  MODERATE: { color: 'text-yellow-400', bg: 'bg-yellow-500/10 border-yellow-500/30', icon: Info },
  WARNING:  { color: 'text-orange-400', bg: 'bg-orange-500/10 border-orange-500/30', icon: AlertTriangle },
  CRITICAL: { color: 'text-red-400',    bg: 'bg-red-500/10    border-red-500/30',    icon: XCircle },
};

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-gray-900 border border-white/10 rounded-lg px-3 py-2 text-sm text-white shadow-xl">
      <p className="text-white/50 text-xs mb-1">{label}</p>
      <p className="text-[#C8F000]">SoC: <strong>{payload[0]?.value}%</strong></p>
    </div>
  );
};

export default function BatteryStatus() {
  const { user } = useAuth();
  const [battery, setBattery] = useState(null);
  const [logs,    setLogs]    = useState([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');

  const load = async () => {
    setLoading(true); setError('');
    try {
      const swapsRes = await API.get(`/swaps/history/${user.user_id}`);
      const swaps = swapsRes.data.data ?? [];
      const lastSwap = swaps.find(s => s.status === 'COMPLETED');

      if (!lastSwap) {
        setError('No completed swaps found. Your battery info will appear after your first swap.');
        setLoading(false);
        return;
      }

      const batteryId = lastSwap.battery_received_id;
      const [battRes, telRes] = await Promise.all([
        API.get(`/batteries/${batteryId}`),
        API.get(`/telemetry/${batteryId}`),
      ]);

      setBattery(battRes.data.data);
      setLogs(telRes.data.data ?? []);
    } catch {
      setError('Could not load battery data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [user]);

  const sohColor = (v) => v < 20 ? 'text-red-400' : v < 50 ? 'text-yellow-400' : 'text-green-400';

  // Build SoC trend data from telemetry logs (oldest first)
  const chartData = [...logs].reverse().slice(-20).map((l, i) => ({
    time: `#${i + 1}`,
    soc: parseFloat(l.soc),
  }));

  const severity = battery?.ai_severity;
  const sevCfg = severityConfig[severity] ?? severityConfig.GOOD;
  const SevIcon = sevCfg.icon;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">My Battery</h1>
          <p className="text-white/50 text-sm">Health and telemetry of your current battery.</p>
        </div>
        <button onClick={load} className="btn-secondary flex items-center gap-2 text-sm py-2 px-4">
          <RefreshCw size={15} /> Refresh
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-40">
          <div className="w-8 h-8 border-2 border-[#C8F000] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : error ? (
        <div className="glass p-8 text-center text-white/40 space-y-2">
          <Battery size={40} className="mx-auto opacity-40" />
          <p>{error}</p>
        </div>
      ) : (
        <>
          {/* Battery Summary */}
          {battery && (
            <div className="glass p-6 grid grid-cols-2 sm:grid-cols-4 gap-6">
              <div className="text-center">
                <p className={`text-3xl font-bold ${sohColor(battery.state_of_health)}`}>
                  {battery.state_of_health}%
                </p>
                <p className="text-white/40 text-xs mt-1">State of Health</p>
              </div>
              <div className="text-center">
                <p className="text-3xl font-bold text-blue-400">{battery.state_of_charge}%</p>
                <p className="text-white/40 text-xs mt-1">State of Charge</p>
              </div>
              <div className="text-center">
                <p className="text-sm font-semibold text-white">{battery.serial_number}</p>
                <p className="text-white/40 text-xs mt-1">Serial Number</p>
              </div>
              <div className="text-center">
                <span className={`badge ${battery.status === 'IN_USE' ? 'badge-blue' : battery.status === 'FLAGGED' ? 'badge-red' : 'badge-green'}`}>
                  {battery.status}
                </span>
                <p className="text-white/40 text-xs mt-1">Status</p>
              </div>
            </div>
          )}

          {/* AI Recommendation */}
          {battery?.ai_recommendation && (
            <div className={`glass p-5 border ${sevCfg.bg} flex items-start gap-3`}>
              <SevIcon size={20} className={`${sevCfg.color} shrink-0 mt-0.5`} />
              <div>
                <p className={`font-semibold text-sm ${sevCfg.color} mb-1`}>
                  AI Diagnosis — {severity}
                </p>
                <p className="text-white/70 text-sm">{battery.ai_recommendation}</p>
              </div>
            </div>
          )}

          {/* SoC Trend Chart */}
          {chartData.length > 1 && (
            <div className="glass p-6">
              <h2 className="text-white font-semibold mb-4">Battery Charge Trend (Last {chartData.length} Readings)</h2>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="time" tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 11 }} />
                  <YAxis domain={[0, 100]} tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 11 }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Line
                    type="monotone" dataKey="soc" stroke="#C8F000"
                    strokeWidth={2} dot={false} name="SoC"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Telemetry Logs */}
          {logs.length > 0 ? (
            <div className="space-y-3">
              <h2 className="text-white/70 text-sm font-medium">Latest telemetry readings</h2>
              {logs.slice(0, 5).map(log => (
                <div key={log.log_id} className="glass p-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="flex items-center gap-2 text-sm">
                    <Zap size={14} className="text-yellow-400" />
                    <span className="text-white/50">Voltage</span>
                    <span className="text-white font-medium ml-auto">{log.voltage}V</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Thermometer size={14} className="text-red-400" />
                    <span className="text-white/50">Temp</span>
                    <span className="text-white font-medium ml-auto">{log.temperature}°C</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Activity size={14} className="text-blue-400" />
                    <span className="text-white/50">SoC</span>
                    <span className="text-white font-medium ml-auto">{log.soc}%</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Battery size={14} className="text-[#C8F000]" />
                    <span className="text-white/50">Resistance</span>
                    <span className="text-white font-medium ml-auto">{log.internal_resistance}Ω</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="glass p-6 text-center text-white/30 text-sm">
              No telemetry readings yet for this battery.
            </div>
          )}
        </>
      )}
    </div>
  );
}
