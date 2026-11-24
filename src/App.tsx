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
  Building2,
  Layers,
  Compass,
  Sparkles,
  Navigation,
  Footprints,
  Globe,
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
    startLocation,
  } = useCampus();

  const [isQROpen, setIsQROpen] = useState(false);
  const [isPositioningOpen, setIsPositioningOpen] = useState(false);
  const [isAdminOpen, setIsAdminOpen] = useState(false);

  // Popular campus shortcuts
  const popularPlaces = locations.filter(l => l.isPopular).slice(0, 6);

  const handleQuickGo = (loc: typeof locations[0]) => {
    setSelectedDestination(loc);
    startNavigation(loc);
  };

  const currentStartLabel = startLocation
    ? `${startLocation.name} (${startLocation.roomNumber})`
    : userPosition.confirmedLocationName || 'Main Campus Gate';

  return (
    <div className="min-h-screen flex flex-col text-slate-800 font-sans selection:bg-[#0f3b7a] selection:text-white">
      {/* 1. Header Navbar */}
      <Navbar
        onOpenQRScanner={() => setIsQROpen(true)}
        onOpenPositioningModal={() => setIsPositioningOpen(true)}
        isAdminOpen={isAdminOpen}
        onToggleAdmin={() => setIsAdminOpen(prev => !prev)}
      />

      {/* 2. Main Interactive Map Area */}
      <main className="flex-1 flex flex-col max-w-7xl w-full mx-auto px-2.5 sm:px-5 py-3 gap-3 relative">
        {/* Top Control Deck: Search + Block/Floor Blueprint Selector */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 items-start">
          {/* Forgiving Search Bar */}
          <div className={isNavigating ? 'lg:col-span-12' : 'lg:col-span-5 w-full'}>
            <SearchBar />
          </div>

          {/* Current Start Point & Building / Floor Blueprint Switcher */}
          {!isNavigating && (
            <div className="lg:col-span-7 bg-white/95 backdrop-blur-md rounded-2xl p-3 sm:p-3.5 border border-slate-200/90 shadow-sm flex flex-col gap-2.5">
              {/* Current Location Status Row */}
              <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-100">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-200/60 shrink-0">
                    <MapPin className="w-3.5 h-3.5" />
                  </span>
                  <div className="min-w-0">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block leading-none">
                      Starting Point (You Are Here)
                    </span>
                    <span className="text-xs font-extrabold text-slate-800 truncate block mt-0.5">
                      {currentStartLabel}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    onClick={() => setIsPositioningOpen(true)}
                    className="min-h-[32px] inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200/80 text-slate-700 font-bold text-[11px] cursor-pointer transition-colors"
                    title="Calibrate mobile walking sensors or GPS"
                  >
                    <Footprints className="w-3 h-3 text-[#0f3b7a]" />
                    <span>Mobile Walk QR</span>
                  </button>
                  <button
                    onClick={() => setIsQROpen(true)}
                    className="min-h-[32px] inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-[#0f3b7a] hover:bg-[#0a2752] text-white font-bold text-[11px] cursor-pointer transition-all shadow-2xs"
                    title="Scan QR checkpoint or change starting point"
                  >
                    <QrCode className="w-3 h-3 text-amber-300" />
                    <span>Change Start</span>
                  </button>
                </div>
              </div>

              {/* Block & Floor Blueprint Segmented Switcher */}
              <div className="flex flex-wrap items-center gap-1.5 text-xs">
                <button
                  onClick={() => {
                    setActiveBuildingId(null);
                    setActiveFloorId('outdoor');
                  }}
                  className={`min-h-[36px] px-3 py-1.5 rounded-xl text-xs font-extrabold border transition-all cursor-pointer flex items-center gap-1.5 ${
                    !activeBuildingId || activeBuildingId === 'outdoor'
                      ? 'bg-[#0f3b7a] text-white border-[#0f3b7a] shadow-xs'
                      : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200/80'
                  }`}
                >
                  <Globe className="w-3.5 h-3.5" />
                  <span>Campus Map</span>
                </button>

                {buildings.map(b => {
                  const bFloors = floors
                    .filter(f => f.buildingId === b.id)
                    .sort((a, z) => a.floorNumber - z.floorNumber);
                  const isBlockActive = activeBuildingId === b.id;

                  return (
                    <div
                      key={b.id}
                      className={`flex items-center gap-1 rounded-xl border p-1 transition-all ${
                        isBlockActive
                          ? 'bg-blue-50/90 border-[#0f3b7a]/40 shadow-2xs'
                          : 'bg-slate-50/70 border-slate-200/80 hover:border-slate-300'
                      }`}
                    >
                      <button
                        onClick={() => setActiveBuildingId(b.id)}
                        className="min-h-[28px] text-xs font-extrabold text-slate-800 hover:text-[#0f3b7a] px-2 cursor-pointer flex items-center gap-1.5"
                        title={b.name}
                      >
                        <span
                          className="w-2 h-2 rounded-full shrink-0 shadow-2xs"
                          style={{ backgroundColor: b.color }}
                        />
                        <span>{b.code}</span>
                      </button>

                      <div className="flex items-center gap-1">
                        {bFloors.map(f => {
                          const isFloorActive = activeFloorId === f.id;
                          return (
                            <button
                              key={f.id}
                              onClick={() => {
                                setActiveBuildingId(b.id);
                                setActiveFloorId(f.id);
                              }}
                              className={`min-h-[28px] px-2 py-0.5 rounded-lg text-[11px] font-mono font-extrabold transition-all cursor-pointer flex items-center gap-0.5 ${
                                isFloorActive
                                  ? 'bg-[#0f3b7a] text-white shadow-xs'
                                  : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200/70'
                              }`}
                              title={`${b.name} – ${f.floorName}`}
                            >
                              <span>{f.code}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Interactive Map Surface */}
        <div className="relative w-full flex-1">
          <CampusMap />
        </div>

        {/* Frequently Visited Destinations Tray */}
        {!isNavigating && (
          <div className="bg-white/95 backdrop-blur-md rounded-2xl p-3.5 border border-slate-200/90 shadow-sm">
            <div className="flex items-center justify-between mb-2.5">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-lg bg-amber-50 border border-amber-200/60 flex items-center justify-center text-amber-600">
                  <Sparkles className="w-3.5 h-3.5" />
                </span>
                <span className="text-xs font-extrabold text-slate-800 uppercase tracking-wider">
                  Popular Campus Destinations
                </span>
              </div>
              <span className="text-[11px] font-medium text-slate-400">
                One-tap instant turn-by-turn route
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
              {popularPlaces.map(place => {
                const placeFloor = floors.find(f => f.id === place.floorId);
                return (
                  <button
                    key={place.id}
                    onClick={() => handleQuickGo(place)}
                    className="min-h-[68px] p-2.5 rounded-xl bg-gradient-to-br from-slate-50 to-white hover:from-blue-50/70 hover:to-white border border-slate-200/90 hover:border-[#0f3b7a] transition-all text-left flex flex-col justify-between group cursor-pointer shadow-2xs hover:shadow-md hover:-translate-y-0.5"
                  >
                    <div className="flex items-center justify-between gap-1 mb-1.5">
                      <span className="font-mono text-[10px] font-extrabold text-[#0f3b7a] bg-blue-50 px-1.5 py-0.5 rounded-md border border-blue-200/80">
                        {place.roomNumber}
                      </span>
                      <span className="w-5 h-5 rounded-full bg-slate-100 group-hover:bg-[#0f3b7a] text-slate-500 group-hover:text-white flex items-center justify-center transition-colors">
                        <Navigation className="w-2.5 h-2.5" />
                      </span>
                    </div>
                    <div>
                      <span className="text-xs font-extrabold text-slate-800 group-hover:text-[#0f3b7a] line-clamp-1 block">
                        {place.name.split(' (')[0]}
                      </span>
                      <span className="text-[10px] font-semibold text-slate-400 block mt-0.5">
                        {placeFloor?.floorName || 'Ground Floor'}
                      </span>
                    </div>
                  </button>
                );
              })}
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
