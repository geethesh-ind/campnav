/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { CampusProvider, useCampus } from './context/CampusContext';
import { Navbar } from './components/Navbar';
import { SearchBar } from './components/SearchBar';
import { CampusMap } from './components/CampusMap';
import { NavigationSheet } from './components/NavigationSheet';
import { DestinationCard } from './components/DestinationCard';
import { QRScannerModal } from './components/QRScannerModal';
import { PositioningModal } from './components/PositioningModal';
import { AdminDashboard } from './components/AdminDashboard';
import {
  MapPin,
  QrCode,
  ChevronRight,
  Building2,
  Layers,
  Compass,
} from 'lucide-react';

const MainScreenContent: React.FC = () => {
  const {
    buildings,
    floors,
    locations,
    activeBuildingId,
    activeFloorId,
    setSelectedDestination,
    startNavigation,
    setActiveBuildingId,
    setActiveFloorId,
    userPosition,
    isNavigating,
  } = useCampus();

  const [isQROpen, setIsQROpen] = useState(false);
  const [isPositioningOpen, setIsPositioningOpen] = useState(false);
  const [isAdminOpen, setIsAdminOpen] = useState(false);

  // Popular campus shortcuts
  const popularPlaces = locations.filter(l => l.isPopular).slice(0, 6);

  const handleQuickGo = (loc: typeof locations[0]) => {
    setSelectedDestination(loc);
    setActiveBuildingId(loc.buildingId === 'outdoor' ? null : loc.buildingId);
    setActiveFloorId(loc.floorId);
    startNavigation(loc);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col text-slate-800 font-sans">
      {/* 1. Header Navbar */}
      <Navbar
        onOpenQRScanner={() => setIsQROpen(true)}
        onOpenPositioningModal={() => setIsPositioningOpen(true)}
        isAdminOpen={isAdminOpen}
        onToggleAdmin={() => setIsAdminOpen(prev => !prev)}
      />

      {/* 2. Main Interactive Map Area */}
      <main className="flex-1 flex flex-col max-w-7xl w-full mx-auto p-2 sm:p-4 gap-2.5 relative">
        {/* Floating Forgiving Search Bar */}
        <SearchBar />

        {/* Current Start Point & Floor Plans Quick Switcher */}
        {!isNavigating && (
          <div className="bg-white rounded-xl p-2.5 sm:p-3 border border-slate-200 shadow-xs flex flex-col gap-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                <Building2 className="w-3.5 h-3.5 text-[#0f3b7a]" />
                <span>Canara Engineering College • 4 Floors</span>
              </div>

              <div className="flex items-center gap-2 text-xs">
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-slate-100 text-slate-700 border border-slate-200 font-semibold text-[11px]">
                  <MapPin className="w-3 h-3 text-[#0f3b7a]" />
                  <span className="truncate max-w-[200px]">
                    At: {userPosition.confirmedLocationName || 'Campus Gate'}
                  </span>
                </span>
                <button
                  onClick={() => setIsQROpen(true)}
                  className="min-h-[32px] inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-[#0f3b7a] hover:bg-[#0a2752] text-white font-semibold text-xs cursor-pointer transition-colors shadow-2xs"
                  title="Scan QR checkpoint or preset starting point"
                >
                  <QrCode className="w-3 h-3 text-amber-400" />
                  <span>Set Start</span>
                </button>
              </div>
            </div>

            {/* Block & Floor Blueprint Buttons */}
            <div className="flex flex-wrap items-center gap-1.5 text-xs">
              <button
                onClick={() => setActiveBuildingId(null)}
                className={`min-h-[36px] px-3 py-1 rounded-lg text-xs font-bold border transition-colors cursor-pointer ${
                  !activeBuildingId || activeBuildingId === 'outdoor'
                    ? 'bg-[#0f3b7a] text-white border-[#0f3b7a]'
                    : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                }`}
              >
                Campus Grounds
              </button>

              {buildings.map(b => {
                const bFloors = floors
                  .filter(f => f.buildingId === b.id && f.floorMapImage)
                  .sort((a, z) => a.floorNumber - z.floorNumber);
                const isBlockActive = activeBuildingId === b.id;

                return (
                  <div
                    key={b.id}
                    className={`flex items-center gap-1 rounded-lg border px-1.5 py-0.5 transition-colors ${
                      isBlockActive
                        ? 'bg-blue-50/80 border-[#0f3b7a]'
                        : 'bg-white border-slate-200'
                    }`}
                  >
                    <button
                      onClick={() => setActiveBuildingId(b.id)}
                      className="min-h-[34px] text-xs font-bold text-slate-800 hover:text-[#0f3b7a] px-1 cursor-pointer flex items-center gap-1"
                    >
                      <span
                        className="w-2 h-2 rounded-full shrink-0"
                        style={{ backgroundColor: b.color }}
                      />
                      <span>{b.code}</span>
                    </button>

                    {bFloors.map(f => {
                      const isFloorActive = activeFloorId === f.id;
                      return (
                        <button
                          key={f.id}
                          onClick={() => {
                            setActiveBuildingId(b.id);
                            setActiveFloorId(f.id);
                          }}
                          className={`min-h-[30px] px-2 py-0.5 rounded text-[11px] font-mono font-bold transition-colors cursor-pointer flex items-center gap-0.5 ${
                            isFloorActive
                              ? 'bg-[#0f3b7a] text-white'
                              : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                          }`}
                          title={`${b.name} – ${f.floorName}`}
                        >
                          <Layers className="w-2.5 h-2.5" />
                          <span>{f.code}</span>
                        </button>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Interactive Map Surface */}
        <div className="relative w-full flex-1 min-h-[460px] sm:min-h-[520px]">
          <CampusMap />
        </div>

        {/* Frequently Visited Rooms Shortcuts Tray */}
        {!isNavigating && (
          <div className="bg-white rounded-xl p-3 border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <Compass className="w-3.5 h-3.5 text-[#0f3b7a]" />
                <span>Quick Shortcuts</span>
              </span>
              <span className="text-[11px] text-slate-400">Tap to start route</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
              {popularPlaces.map(place => (
                <button
                  key={place.id}
                  onClick={() => handleQuickGo(place)}
                  className="min-h-[44px] p-2.5 rounded-lg bg-slate-50 hover:bg-blue-50/50 border border-slate-200 hover:border-[#0f3b7a] transition-all text-left flex flex-col justify-between group cursor-pointer shadow-2xs"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-mono text-[10px] font-bold text-[#0f3b7a] bg-blue-50 px-1 py-0.2 rounded border border-blue-200">
                      {place.roomNumber}
                    </span>
                    <ChevronRight className="w-3 h-3 text-slate-400 group-hover:text-[#0f3b7a] transition-colors" />
                  </div>
                  <span className="text-xs font-bold text-slate-800 group-hover:text-[#0f3b7a] truncate">
                    {place.name}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* 3. Bottom Cards & Modals */}
      <DestinationCard />
      <NavigationSheet />

      {/* QR Scanner & Generator Modal */}
      <QRScannerModal isOpen={isQROpen} onClose={() => setIsQROpen(false)} />

      {/* Positioning Infrastructure Modal */}
      <PositioningModal isOpen={isPositioningOpen} onClose={() => setIsPositioningOpen(false)} />

      {/* Admin Dashboard */}
      {isAdminOpen && <AdminDashboard onClose={() => setIsAdminOpen(false)} />}
    </div>
  );
};

export default function App() {
  return (
    <CampusProvider>
      <MainScreenContent />
    </CampusProvider>
  );
}
