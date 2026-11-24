import React, { useState, useEffect } from 'react';
import {
  Compass,
  X,
  Radio,
  QrCode,
  MapPin,
  Wifi,
  Navigation,
  CheckCircle2,
  AlertCircle,
  Footprints,
  Smartphone,
  Cpu,
  ShieldCheck,
  AlertTriangle,
} from 'lucide-react';
import QRCode from 'qrcode';
import { useCampus } from '../context/CampusContext';

interface PositioningModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PositioningModal: React.FC<PositioningModalProps> = ({ isOpen, onClose }) => {
  const {
    userPosition,
    requestRealGPS,
    simulateBLEScan,
    beacons,
    motionTelemetry,
    stepMetersForward,
    requestMotionPermission,
    isLiveTracking,
  } = useCampus();

  const [mobileHttpsUrl, setMobileHttpsUrl] = useState('https://192.168.1.34:3001/');
  const [mobileQrDataUrl, setMobileQrDataUrl] = useState('');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const host = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
        ? '192.168.1.34'
        : window.location.hostname;
      const url = `https://${host}:3001${window.location.search}`;
      setMobileHttpsUrl(url);
      QRCode.toDataURL(url, { width: 180, margin: 1 })
        .then(setMobileQrDataUrl)
        .catch(() => {});
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-[#0f3b7a]/10 text-[#0f3b7a] flex items-center justify-center">
              <Radio className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-slate-900">
                Live Indoor Positioning & Motion
              </h3>
              <p className="text-xs text-slate-500">
                Multi-Sensor Fusion: Pedometer (PDR) + Gyro Heading + QR Ground-Truth
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center cursor-pointer transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Current Active Mode Banner */}
        <div className="bg-slate-50 px-5 py-3 border-b border-slate-100 flex items-center justify-between text-xs">
          <div>
            <span className="text-slate-500 font-medium">Active Position: </span>
            <span className="font-bold text-slate-800">
              {userPosition.confirmedLocationName || 'Campus Grounds'}
            </span>
          </div>
          <div className="flex items-center gap-1.5 font-bold text-[#0f3b7a] bg-[#0f3b7a]/10 px-2.5 py-1 rounded-full">
            <span>±{userPosition.accuracyMeters}m accuracy</span>
          </div>
        </div>

        {/* Body content */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 text-xs sm:text-sm">
          {/* Live Hardware Telemetry Card */}
          <div className="p-4 rounded-xl bg-[#0f3b7a] text-white">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2 font-bold text-sm text-white">
                <Footprints className="w-4 h-4 text-amber-400" />
                <span>Real-Time Pedestrian Dead Reckoning (PDR)</span>
              </div>
              <span className="text-[10px] font-black px-2 py-0.5 rounded bg-emerald-500 text-slate-950 uppercase">
                {isLiveTracking ? 'Active' : 'Standby'}
              </span>
            </div>
            <p className="text-xs text-blue-100 leading-relaxed">
              Detects footstep oscillations via smartphone accelerometer and calculates direction using device compass. Moves your dot along campus corridors automatically as you walk.
            </p>

            <div className="mt-3 grid grid-cols-4 gap-2 bg-white/10 rounded-lg p-2.5 text-center font-mono">
              <div>
                <span className="text-[10px] text-blue-200 block uppercase">Steps</span>
                <span className="text-sm font-bold text-white">{motionTelemetry.stepCount}</span>
              </div>
              <div>
                <span className="text-[10px] text-blue-200 block uppercase">Heading</span>
                <span className="text-sm font-bold text-amber-300">{userPosition.heading}°</span>
              </div>
              <div>
                <span className="text-[10px] text-blue-200 block uppercase">Speed</span>
                <span className="text-sm font-bold text-emerald-300">{motionTelemetry.currentSpeedMps} m/s</span>
              </div>
              <div>
                <span className="text-[10px] text-blue-200 block uppercase">Accel</span>
                <span className="text-sm font-bold text-blue-200">{motionTelemetry.lastAccelerationMagnitude}</span>
              </div>
            </div>

            <div className="mt-3 flex items-center gap-2">
              <button
                onClick={async () => {
                  await requestMotionPermission();
                }}
                className="flex-1 min-h-[36px] px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-xs transition-colors"
              >
                <Smartphone className="w-3.5 h-3.5" />
                <span>Calibrate / Grant Sensor Access</span>
              </button>

              <button
                onClick={() => stepMetersForward(1.4)}
                className="px-3 py-1.5 min-h-[36px] rounded-lg bg-white/20 hover:bg-white/30 text-white font-semibold text-xs flex items-center gap-1 cursor-pointer transition-colors"
              >
                <Footprints className="w-3.5 h-3.5" />
                <span>Step +1.4m</span>
              </button>
            </div>
          </div>

          {/* Mobile HTTPS QR Launcher for Walking Sensors */}
          <div className="p-4 rounded-xl bg-amber-50 border border-amber-300 flex flex-col sm:flex-row items-center gap-4">
            {mobileQrDataUrl && (
              <img
                src={mobileQrDataUrl}
                alt="Mobile HTTPS QR Code"
                className="w-28 h-28 rounded-xl border border-amber-300 bg-white p-1 shrink-0"
              />
            )}
            <div className="flex-1 text-left">
              <div className="flex items-center gap-1.5 font-bold text-slate-900 text-sm">
                <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Test Live Walking on Your Phone (HTTPS Required)</span>
              </div>
              <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                Mobile browsers block accelerometer footsteps and compass sensors over plain <code className="bg-amber-100 px-1 rounded">http://</code>. Scan this QR code or open the secure HTTPS link on your phone (if prompted about the local certificate, tap <b>Advanced → Proceed</b>):
              </p>
              <a
                href={mobileHttpsUrl}
                className="mt-2 inline-block font-mono text-xs font-bold text-[#0f3b7a] underline break-all"
              >
                {mobileHttpsUrl}
              </a>
            </div>
          </div>

          {/* 1. Outdoor GPS */}
          <div className="p-4 rounded-xl bg-white border border-slate-200 hover:border-[#0f3b7a]/30 transition-all">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2 font-bold text-slate-900 text-sm">
                <Navigation className="w-4 h-4 text-[#0f3b7a]" />
                <span>1. Outdoor Satellite GPS</span>
              </div>
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800">
                5 – 15m Accuracy
              </span>
            </div>
            <p className="text-xs text-slate-600 mt-2 leading-relaxed">
              <strong>Best for:</strong> Campus walkways, parking grounds, and auto-detecting which entrance you are approaching.
            </p>
            <div className="mt-3">
              <button
                onClick={async () => {
                  await requestRealGPS();
                  onClose();
                }}
                className="px-3 py-1.5 rounded-lg bg-[#0f3b7a] hover:bg-[#0c2f62] text-white font-bold text-xs cursor-pointer"
              >
                Acquire Live Browser GPS Fix
              </button>
            </div>
          </div>

          {/* 2. QR-Code Ground-Truth Checkpoints */}
          <div className="p-4 rounded-xl bg-white border border-slate-200 hover:border-emerald-300 transition-all">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2 font-bold text-slate-900 text-sm">
                <QrCode className="w-4 h-4 text-emerald-600" />
                <span>2. High-Precision QR Checkpoints</span>
              </div>
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                &lt; 0.5m Exact
              </span>
            </div>
            <p className="text-xs text-slate-600 mt-2 leading-relaxed">
              <strong>Zero Cost &amp; 100% Reliable:</strong> High-contrast plaques mounted beside classroom doors and elevators instantly reset any drift.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
