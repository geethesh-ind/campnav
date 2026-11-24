import React from 'react';
import {
  QrCode,
  Settings,
  Pencil,
  Accessibility,
  CheckCircle2,
  Building,
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
    userPosition,
    isEditMode,
    setIsEditMode,
    routingPreference,
    setRoutingPreference,
  } = useCampus();

  const isWheelchair = routingPreference === 'wheelchair';

  const toggleAccessibility = () => {
    setRoutingPreference(isWheelchair ? 'shortest' : 'wheelchair');
  };

  return (
    <header className="sticky top-0 z-30 bg-[#0f3b7a] text-white border-b border-[#0a2752] shadow-sm px-3 sm:px-6 py-2.5 transition-all">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-2 sm:gap-4">
        {/* Canara Engineering College Brand */}
        <div className="flex items-center gap-2.5 sm:gap-3">
          <div className="w-10 h-10 rounded-lg bg-white flex items-center justify-center font-black text-[#0f3b7a] text-sm tracking-wider border border-white/20 shadow-xs flex-shrink-0">
            CEC
          </div>
          <div className="flex flex-col text-left">
            <div className="flex items-center gap-1.5 flex-wrap">
              <h1 className="font-bold text-sm sm:text-base tracking-tight text-white leading-tight">
                Canara Engineering College
              </h1>
              <span className="hidden sm:inline-block text-[10px] font-mono font-semibold uppercase px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-400/30">
                Indoor Nav
              </span>
            </div>
            <p className="text-[11px] text-blue-200/90 leading-tight">
              Sudhindra Nagar, Benjanapadavu • 4 Floors
            </p>
          </div>
        </div>

        {/* Action Controls (min 44px tap targets for mobile) */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Accessibility toggle (Lift Only vs Stairs) */}
          <button
            onClick={toggleAccessibility}
            className={`min-h-[44px] px-2.5 sm:px-3 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer border ${
              isWheelchair
                ? 'bg-amber-500 text-slate-950 border-amber-400 font-bold'
                : 'bg-white/10 hover:bg-white/15 text-blue-100 border-white/15'
            }`}
            title={isWheelchair ? 'Accessible Routing: Lift only (Stairs avoided)' : 'Click to enable Lift-only accessible routing'}
            aria-label="Toggle lift-only routing"
          >
            <Accessibility className="w-4 h-4" />
            <span className="hidden md:inline">
              {isWheelchair ? 'Lift Only' : 'Allow Stairs'}
            </span>
          </button>

          {/* Dev-only Edit Mode Toggle */}
          <button
            onClick={() => setIsEditMode(!isEditMode)}
            className={`min-h-[44px] px-2.5 sm:px-3 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer border ${
              isEditMode
                ? 'bg-amber-400 text-slate-950 border-amber-300 font-bold'
                : 'bg-white/10 hover:bg-white/15 text-blue-100 border-white/15'
            }`}
            title="Dev Edit Mode: Click on floor plans to place/move nodes and export JSON"
          >
            <Pencil className="w-4 h-4" />
            <span className="hidden sm:inline">
              {isEditMode ? 'Editing' : 'Edit Mode'}
            </span>
          </button>

          {/* Live Motion & Positioning Status */}
          <button
            onClick={onOpenPositioningModal}
            className="min-h-[44px] px-2.5 sm:px-3 rounded-lg bg-white/10 hover:bg-white/15 text-blue-100 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer border border-white/15"
            title="Real-time motion tracking and indoor positioning details"
            aria-label="Positioning details"
          >
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="hidden sm:inline">Live Motion</span>
          </button>

          {/* Scan QR Checkpoint / Set Start */}
          <button
            onClick={onOpenQRScanner}
            className="min-h-[44px] px-2.5 sm:px-3 rounded-lg bg-white text-[#0f3b7a] hover:bg-blue-50 text-xs sm:text-sm font-semibold flex items-center gap-1.5 transition-colors cursor-pointer border border-white shadow-xs"
            title="Scan QR checkpoint or preset starting point"
          >
            <QrCode className="w-4 h-4 text-[#0f3b7a]" />
            <span className="hidden xs:inline">QR Start</span>
          </button>

          {/* Admin Database Settings */}
          <button
            onClick={onToggleAdmin}
            className={`min-h-[44px] px-2.5 rounded-lg text-xs font-semibold flex items-center justify-center transition-colors cursor-pointer border ${
              isAdminOpen
                ? 'bg-white text-[#0f3b7a] border-white'
                : 'bg-white/10 hover:bg-white/15 text-blue-100 border-white/15'
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
