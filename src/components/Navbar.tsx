import React from 'react';
import {
  QrCode,
  Settings,
  Pencil,
  Accessibility,
  Compass,
  Radio,
} from 'lucide-react';
import { useCampus } from '../context/CampusContext';

interface NavbarProps {
  onOpenQRScanner: () => void;
  onOpenPositioningModal: () => void;
  isAdminOpen: boolean;
  onToggleAdmin: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  onOpenQRScanner,
  onOpenPositioningModal,
  isAdminOpen,
  onToggleAdmin,
}) => {
  const {
    isEditMode,
    setIsEditMode,
    routingPreference,
    setRoutingPreference,
    motionTelemetry,
  } = useCampus();

  const isWheelchair = routingPreference === 'wheelchair';

  const toggleAccessibility = () => {
    setRoutingPreference(isWheelchair ? 'shortest' : 'wheelchair');
  };

  return (
    <header className="sticky top-0 z-30 bg-gradient-to-r from-[#0a234e] via-[#0f3b7a] to-[#134790] text-white border-b border-white/10 shadow-md px-3 sm:px-6 py-2.5 backdrop-blur-md">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-2 sm:gap-4">
        {/* Canara Engineering College Brand */}
        <div className="flex items-center gap-2.5 sm:gap-3.5 min-w-0">
          <div className="relative w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-gradient-to-br from-white to-blue-50 flex items-center justify-center font-black text-[#0f3b7a] text-sm tracking-wider ring-2 ring-amber-400/80 shadow-md flex-shrink-0">
            <Compass className="w-5 h-5 text-[#0f3b7a] mr-0.5" />
            <span className="text-[11px] font-black tracking-tighter">CEC</span>
          </div>
          <div className="flex flex-col text-left min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="font-extrabold text-sm sm:text-base tracking-tight text-white leading-tight truncate">
                Canara Engineering College
              </h1>
              <span className="hidden sm:inline-flex items-center gap-1 text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/40 shadow-2xs">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                CampusNav 2.0
              </span>
            </div>
            <p className="text-[11px] text-blue-200/90 leading-tight truncate font-medium mt-0.5">
              Sudhindra Nagar, Benjanapadavu • Smart Indoor &amp; Outdoor Wayfinding
            </p>
          </div>
        </div>

        {/* Action Controls (min 42px tap targets for mobile) */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {/* Accessibility toggle (Lift Only vs Stairs) */}
          <button
            onClick={toggleAccessibility}
            className={`min-h-[40px] sm:min-h-[42px] px-2.5 sm:px-3.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer border ${
              isWheelchair
                ? 'bg-amber-400 text-slate-950 border-amber-300 shadow-md shadow-amber-500/20 scale-[1.02]'
                : 'bg-white/10 hover:bg-white/18 text-blue-50 border-white/15'
            }`}
            title={isWheelchair ? 'Accessible Routing: Lift only (Stairs avoided)' : 'Click to enable Lift-only accessible routing'}
            aria-label="Toggle lift-only routing"
          >
            <Accessibility className="w-4 h-4" />
            <span className="hidden md:inline">
              {isWheelchair ? 'Lift Only' : 'Accessible'}
            </span>
          </button>

          {/* Dev-only Edit Mode Toggle */}
          <button
            onClick={() => setIsEditMode(!isEditMode)}
            className={`min-h-[40px] sm:min-h-[42px] px-2.5 sm:px-3 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer border ${
              isEditMode
                ? 'bg-amber-400 text-slate-950 border-amber-300 shadow-md'
                : 'bg-white/10 hover:bg-white/18 text-blue-50 border-white/15'
            }`}
            title="Dev Edit Mode: Click on floor plans to place/move nodes and export JSON"
          >
            <Pencil className="w-3.5 h-3.5" />
            <span className="hidden lg:inline">
              {isEditMode ? 'Editing Map' : 'Edit Map'}
            </span>
          </button>

          {/* Live Motion & Positioning Status */}
          <button
            onClick={onOpenPositioningModal}
            className="min-h-[40px] sm:min-h-[42px] px-2.5 sm:px-3.5 rounded-xl bg-white/10 hover:bg-white/18 text-white text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer border border-white/15"
            title="Real-time motion tracking, HTTPS mobile QR, and indoor positioning details"
            aria-label="Positioning details"
          >
            <span className="relative flex h-2 w-2">
              <span
                className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                  motionTelemetry.isReceivingSensorEvents ? 'bg-emerald-400' : 'bg-amber-400'
                }`}
              />
              <span
                className={`relative inline-flex rounded-full h-2 w-2 ${
                  motionTelemetry.isReceivingSensorEvents ? 'bg-emerald-400' : 'bg-amber-400'
                }`}
              />
            </span>
            <Radio className="w-3.5 h-3.5 text-blue-200 sm:hidden" />
            <span className="hidden sm:inline">
              {motionTelemetry.stepCount > 0 ? `${motionTelemetry.stepCount} Steps` : 'Sensors'}
            </span>
          </button>

          {/* Scan QR Checkpoint / Set Start */}
          <button
            onClick={onOpenQRScanner}
            className="min-h-[40px] sm:min-h-[42px] px-3 sm:px-3.5 rounded-xl bg-white text-[#0f3b7a] hover:bg-blue-50 text-xs font-extrabold flex items-center gap-1.5 transition-all cursor-pointer border border-white shadow-sm hover:shadow"
            title="Scan QR checkpoint or preset starting point"
          >
            <QrCode className="w-4 h-4 text-[#0f3b7a]" />
            <span className="hidden xs:inline">QR Start</span>
          </button>

          {/* Admin Database Settings */}
          <button
            onClick={onToggleAdmin}
            className={`min-h-[40px] sm:min-h-[42px] w-10 sm:w-10 rounded-xl text-xs font-semibold flex items-center justify-center transition-all cursor-pointer border ${
              isAdminOpen
                ? 'bg-white text-[#0f3b7a] border-white shadow-sm'
                : 'bg-white/10 hover:bg-white/18 text-blue-50 border-white/15'
            }`}
            title="Campus Data & Map Settings"
            aria-label="Campus Data Settings"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
