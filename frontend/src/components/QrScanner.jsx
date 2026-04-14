import { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { Camera, CameraOff } from 'lucide-react';

export default function QrScanner({ onScan, onError }) {
  const scannerRef = useRef(null);
  const startedRef = useRef(false);
  const [camError, setCamError] = useState('');
  const ELEMENT_ID = 'html5-qr-reader';

  useEffect(() => {
    // Small delay to ensure the div is mounted in the DOM
    const timer = setTimeout(() => {
      if (startedRef.current) return;

      const el = document.getElementById(ELEMENT_ID);
      if (!el) {
        setCamError('Scanner element not found. Please refresh.');
        return;
      }

      try {
        const scanner = new Html5Qrcode(ELEMENT_ID);
        scannerRef.current = scanner;

        scanner.start(
          { facingMode: 'environment' },
          { fps: 10, qrbox: { width: 220, height: 220 } },
          (decodedText) => {
            startedRef.current = false;
            scanner.stop().catch(() => {});
            onScan(decodedText);
          },
          () => {} // per-frame errors — ignore
        ).then(() => {
          startedRef.current = true;
        }).catch((err) => {
          const msg = typeof err === 'string' ? err : err?.message ?? 'Camera access denied.';
          setCamError(msg);
          if (onError) onError(msg);
        });
      } catch (err) {
        const msg = err?.message ?? 'Failed to start scanner.';
        setCamError(msg);
        if (onError) onError(msg);
      }
    }, 200);

    return () => {
      clearTimeout(timer);
      if (scannerRef.current && startedRef.current) {
        scannerRef.current.stop().catch(() => {});
        startedRef.current = false;
      }
    };
  }, []);

  if (camError) {
    return (
      <div className="flex flex-col items-center gap-3 py-4">
        <CameraOff size={32} className="text-red-400" />
        <p className="text-red-400 text-sm text-center">{camError}</p>
        <p className="text-white/30 text-xs text-center">
          Allow camera access in your browser settings, or use manual entry below.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="flex items-center gap-2 text-white/50 text-xs">
        <Camera size={14} className="text-spiro-400 animate-pulse" />
        Camera active — scanning…
      </div>
      {/* This div MUST exist before scanner.start() is called */}
      <div
        id={ELEMENT_ID}
        className="w-full rounded-xl overflow-hidden border border-white/10"
        style={{ minHeight: '280px' }}
      />
      <p className="text-white/30 text-xs text-center">
        Point your camera at the QR code on the battery
      </p>
    </div>
  );
}
