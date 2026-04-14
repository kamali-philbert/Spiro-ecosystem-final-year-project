import { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import API from '../../services/api';
import { QrCode, Battery, CheckCircle, XCircle, ChevronRight, RotateCcw, Zap } from 'lucide-react';
import QrScanner from '../../components/QrScanner';

// Steps: 1 = select station, 2 = scan given battery, 3 = confirm & swap
const STEPS = ['Select Station', 'Scan Your Battery', 'Confirm Swap'];

export default function SwapScreen() {
  const { user } = useAuth();
  const [step,        setStep]        = useState(1);
  const [stations,    setStations]    = useState([]);
  const [stationId,   setStationId]   = useState('');
  const [scanning,    setScanning]    = useState(false);
  const [manualSerial, setManualSerial] = useState('');
  const [scannedBattery, setScannedBattery] = useState(null);
  const [scanError,   setScanError]   = useState('');
  const [swapResult,  setSwapResult]  = useState(null);
  const [loading,     setLoading]     = useState(false);
  const [transaction, setTransaction] = useState(null); // pending transaction from initiate
  const [newBattery,  setNewBattery]  = useState(null); // battery rider will receive
  const [costEstimate, setCostEstimate] = useState(null);

  useEffect(() => {
    API.get('/stations').then(r => setStations(r.data.data ?? [])).catch(() => {});
  }, []);

  // After scanning, look up the battery by serial number (QR contains serial)
  const handleScan = async (text) => {
    setScanning(false);
    setScanError('');
    const serial = text.trim();
    if (!serial) return;
    setLoading(true);
    try {
      // Look up the scanned battery
      const res = await API.get(`/batteries/lookup?serial=${encodeURIComponent(serial)}`);
      const battery = res.data.data;
      setScannedBattery(battery);
      setManualSerial('');

      // Initiate swap to get the new battery details and cost estimate
      const initRes = await API.post('/swaps/initiate', {
        station_id:       parseInt(stationId),
        battery_given_id: battery.battery_id,
        rider_id:         user.user_id,
        soc_given:        battery.state_of_charge,
      });
      setTransaction(initRes.data.data.transaction);
      setCostEstimate(initRes.data.data.cost_estimate);

      // Fetch the new battery details to show in summary
      const newBattRes = await API.get(`/batteries/${initRes.data.data.transaction.battery_received_id}`);
      setNewBattery(newBattRes.data.data);

      setStep(3);
    } catch (err) {
      const msg = err.response?.data?.message ?? `Battery "${serial}" not found or swap cannot be initiated.`;
      setScanError(msg);
    } finally {
      setLoading(false);
    }
  };

  // Step 3 polling: Check if the transaction has been completed by the cashier
  useEffect(() => {
    let interval;
    if (step === 3 && transaction?.transaction_id) {
      interval = setInterval(async () => {
        try {
          const { data } = await API.get(`/swaps`);
          const currentSwap = data.data.find(s => s.transaction_id === transaction.transaction_id);
          if (currentSwap && currentSwap.status === 'COMPLETED') {
            setSwapResult({ success: true, msg: 'Swap confirmed by cashier! Take your new battery.', data: currentSwap });
            setStep(4);
          }
        } catch (err) {
          console.error("Status check failed", err);
        }
      }, 3000);
    }
    return () => clearInterval(interval);
  }, [step, transaction]);

  const handleManualCheck = async () => {
    setLoading(true);
    try {
      const { data } = await API.get(`/swaps`);
      const currentSwap = data.data.find(s => s.transaction_id === transaction.transaction_id);
      if (currentSwap && currentSwap.status === 'COMPLETED') {
        setSwapResult({ success: true, msg: 'Swap confirmed by cashier! Take your new battery.', data: currentSwap });
        setStep(4);
      } else {
        // Still pending
      }
    } catch (err) {
      setScanError("Failed to check status. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setStep(1); setStationId(''); setScannedBattery(null);
    setScanError(''); setSwapResult(null); setScanning(false); setManualSerial('');
    setTransaction(null); setNewBattery(null); setCostEstimate(null);
  };

  const selectedStation = stations.find(s => String(s.station_id) === String(stationId));

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Battery Swap</h1>
        <p className="text-white/50 text-sm">Follow the steps to swap your battery.</p>
      </div>

      {/* Step indicator */}
      {step < 4 && (
        <div className="flex items-center gap-2">
          {STEPS.map((label, i) => {
            const n = i + 1;
            const active = step === n;
            const done   = step > n;
            return (
              <div key={n} className="flex items-center gap-2 flex-1">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 transition-all ${
                  done   ? 'bg-spiro-500 text-white' :
                  active ? 'bg-spiro-600 text-white ring-2 ring-spiro-400' :
                           'bg-white/10 text-white/30'}`}>
                  {done ? <CheckCircle size={14} /> : n}
                </div>
                <span className={`text-xs hidden sm:block ${active ? 'text-white' : 'text-white/30'}`}>{label}</span>
                {i < STEPS.length - 1 && <ChevronRight size={14} className="text-white/20 shrink-0" />}
              </div>
            );
          })}
        </div>
      )}

      {/* STEP 1 — Select Station */}
      {step === 1 && (
        <div className="glass p-6 space-y-4">
          <h2 className="text-white font-semibold">Which station are you at?</h2>
          <div className="space-y-2">
            {stations.length === 0 && (
              <p className="text-white/30 text-sm">No stations available.</p>
            )}
            {stations.map(s => (
              <button key={s.station_id}
                onClick={() => setStationId(String(s.station_id))}
                className={`w-full flex items-center justify-between p-4 rounded-xl border transition-all ${
                  String(stationId) === String(s.station_id)
                    ? 'border-spiro-500 bg-spiro-500/10 text-white'
                    : 'border-white/10 bg-white/5 text-white/60 hover:bg-white/10'
                }`}>
                <div className="flex items-center gap-3">
                  <Zap size={16} className="text-spiro-400" />
                  <div className="text-left">
                    <p className="font-medium text-sm">{s.station_name}</p>
                    <p className="text-xs text-white/30">{s.available_count} batteries available</p>
                  </div>
                </div>
                {String(stationId) === String(s.station_id) && (
                  <CheckCircle size={18} className="text-spiro-400" />
                )}
              </button>
            ))}
          </div>
          <button onClick={() => setStep(2)} disabled={!stationId}
            className="btn-primary w-full flex items-center justify-center gap-2">
            Next — Scan Battery <ChevronRight size={16} />
          </button>
        </div>
      )}

      {/* STEP 2 — Scan depleted battery */}
      {step === 2 && (
        <div className="glass p-6 space-y-4">
          <h2 className="text-white font-semibold">Scan your depleted battery</h2>
          <p className="text-white/40 text-sm">Scan the QR code on your battery, or enter the serial number manually.</p>

          {scanError && (
            <div className="flex items-center gap-2 text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 text-sm">
              <XCircle size={15} /> {scanError}
            </div>
          )}

          {scanning ? (
            <div className="space-y-3">
              <QrScanner
                onScan={handleScan}
                onError={e => { setScanError(e); setScanning(false); }}
              />
              <button onClick={() => setScanning(false)} className="btn-secondary w-full text-sm">
                Cancel Camera
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <button onClick={() => { setScanError(''); setScanning(true); }}
                className="btn-primary w-full flex items-center justify-center gap-2">
                <QrCode size={18} /> Open Camera & Scan QR
              </button>

              {/* Divider */}
              <div className="flex items-center gap-3">
                <div className="flex-1 h-px bg-white/10" />
                <span className="text-white/30 text-xs">or enter manually</span>
                <div className="flex-1 h-px bg-white/10" />
              </div>

              {/* Manual entry */}
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Battery serial number e.g. SPR-BAT-001"
                  value={manualSerial}
                  onChange={e => setManualSerial(e.target.value)}
                  className="input-field flex-1 text-sm"
                  onKeyDown={e => e.key === 'Enter' && manualSerial && !loading && handleScan(manualSerial)}
                />
                <button
                  onClick={() => handleScan(manualSerial)}
                  disabled={!manualSerial || loading}
                  className="btn-primary px-4 text-sm disabled:opacity-40 flex items-center gap-1">
                  {loading ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : 'Go'}
                </button>
              </div>

              <button onClick={() => setStep(1)} className="btn-secondary w-full text-sm">← Back</button>
            </div>
          )}
        </div>
      )}

      {/* STEP 3 — Confirm */}
      {step === 3 && scannedBattery && (
        <div className="glass p-6 space-y-5">
          <div className="flex items-center justify-between">
            <h2 className="text-white font-semibold">Swap Summary</h2>
            <div className="flex items-center gap-2 bg-yellow-500/10 border border-yellow-500/30 px-3 py-1 rounded-full text-[10px] font-bold text-yellow-500 tracking-wider uppercase animate-pulse">
               Waiting for Cashier
            </div>
          </div>

          <div className="space-y-3">
            <div className="bg-white/5 rounded-xl p-4 space-y-2">
              <p className="text-white/40 text-xs uppercase tracking-wider">Station</p>
              <p className="text-white font-medium">{selectedStation?.station_name}</p>
            </div>
            <div className="bg-white/5 rounded-xl p-4 space-y-2">
              <p className="text-white/40 text-xs uppercase tracking-wider">Battery You're Returning</p>
              <p className="text-white font-medium font-mono">{scannedBattery.serial_number}</p>
              <div className="flex gap-4 text-sm">
                <span className="text-white/50">SoH: <span className="text-yellow-400">{scannedBattery.state_of_health}%</span></span>
                <span className="text-white/50">SoC: <span className="text-blue-400">{scannedBattery.state_of_charge}%</span></span>
              </div>
            </div>
            <div className="bg-spiro-500/10 border border-spiro-500/20 rounded-xl p-4 space-y-2">
              <p className="text-white/40 text-xs uppercase tracking-wider">Battery You'll Receive</p>
              {newBattery ? (
                <>
                  <p className="text-spiro-400 font-medium font-mono">{newBattery.serial_number}</p>
                  <div className="flex gap-4 text-sm">
                    <span className="text-white/50">SoH: <span className="text-green-400">{newBattery.state_of_health}%</span></span>
                    <span className="text-white/50">SoC: <span className="text-green-400">{newBattery.state_of_charge}%</span></span>
                  </div>
                </>
              ) : (
                <p className="text-spiro-400 font-medium">A fully charged battery</p>
              )}
            </div>
            {costEstimate !== null && (
              <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-4">
                <p className="text-white/40 text-xs uppercase tracking-wider mb-1">Estimated Cost</p>
                <p className="text-yellow-400 font-bold text-lg">{costEstimate} RWF</p>
              </div>
            )}
          </div>

          <div className="bg-blue-500/5 border border-blue-500/20 p-4 rounded-xl text-center space-y-3">
            <p className="text-sm text-[#aeb2d5]">Please show your phone to the cashier to complete the swap.</p>
            <button onClick={handleManualCheck} disabled={loading} className="btn-secondary w-full flex items-center justify-center gap-2 text-xs">
              {loading ? <span className="w-3 h-3 border-2 border-white/20 border-t-white rounded-full animate-spin" /> : <RotateCcw size={12} />}
              I've already swapped, refresh status
            </button>
          </div>
        </div>
      )}

      {/* STEP 4 — Result */}
      {step === 4 && swapResult && (
        <div className="glass p-8 text-center space-y-4">
          {swapResult.success ? (
            <>
              <div className="w-16 h-16 rounded-full bg-spiro-500/20 flex items-center justify-center mx-auto">
                <CheckCircle size={36} className="text-spiro-400" />
              </div>
              <h2 className="text-xl font-bold text-white">Swap Complete!</h2>
              <p className="text-white/50 text-sm">{swapResult.msg}</p>
              <div className="bg-white/5 rounded-xl p-4 text-sm text-white/60">
                Your new battery is ready. Ride safe!
              </div>
            </>
          ) : (
            <>
              <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center mx-auto">
                <XCircle size={36} className="text-red-400" />
              </div>
              <h2 className="text-xl font-bold text-white">Swap Failed</h2>
              <p className="text-white/50 text-sm">{swapResult.msg}</p>
            </>
          )}
          <button onClick={reset} className="btn-secondary w-full flex items-center justify-center gap-2">
            <RotateCcw size={15} /> Start New Swap
          </button>
        </div>
      )}
    </div>
  );
}
