/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { CampusProvider, useCampus } from './context/CampusContext';
import { SearchBar } from './components/SearchBar';
import { CampusMap } from './components/CampusMap';
import { NavigationSheet } from './components/NavigationSheet';
import { DestinationCard } from './components/DestinationCard';
import { QRScannerModal } from './components/QRScannerModal';
import { PositioningModal } from './components/PositioningModal';
import { AdminDashboard } from './components/AdminDashboard';
import {
  QrCode,
  Settings,
  Pencil,
  Accessibility,
  Smartphone,
  ChevronRight,
  MapPin,
  PanelLeftClose,
  PanelLeftOpen,
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
    isEditMode,
    setIsEditMode,
    routingPreference,
    setRoutingPreference,
    motionTelemetry,
  } = useCampus();

  const [isQROpen, setIsQROpen] = useState(false);
  const [isPositioningOpen, setIsPositioningOpen] = useState(false);
  const [isAdminOpen, setIsAdminOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  const popularPlaces = locations.filter(l => l.isPopular).slice(0, 6);
  const isWheelchair = routingPreference === 'wheelchair';

  const handleQuickGo = (loc: typeof locations[0]) => {
    setSelectedDestination(loc);
    startNavigation(loc);
  };

  const currentStartLabel = startLocation
    ? `${startLocation.name.split(' (')[0]} (${startLocation.roomNumber})`
    : userPosition.confirmedLocationName || 'Main Gate';

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-[#e8ecef] text-neutral-900 select-none">
      {/* FULL-VIEWPORT INTERACTIVE MAP CANVAS */}
      <div className="absolute inset-0 z-0">
        <CampusMap />
      </div>

      {/* FLOATING TOP-LEFT SEARCH & EXPLORE DRAWER (Google / Apple Maps style) */}
      <div
        className={`absolute top-3 left-3 z-20 flex flex-col gap-2 transition-all duration-200 pointer-events-none ${
          isSidebarCollapsed ? 'w-auto' : 'w-[calc(100vw-24px)] sm:w-[376px]'
        }`}
      >
        {/* Top Row: Search Box + Sidebar Toggle */}
        <div className="pointer-events-auto flex items-start gap-2">
          {!isSidebarCollapsed ? (
            <div className="flex-1 min-w-0">
              <SearchBar onCollapse={() => setIsSidebarCollapsed(true)} />
            </div>
          ) : (
            <button
              onClick={() => setIsSidebarCollapsed(false)}
              className="h-11 px-3.5 rounded-xl bg-white hover:bg-neutral-50 text-neutral-900 shadow-lg ring-1 ring-black/8 flex items-center gap-2 text-xs font-semibold cursor-pointer transition-all"
              title="Open Campus Search & Directory"
            >
              <PanelLeftOpen className="w-4 h-4 text-neutral-700" />
              <span>Canara Campus</span>
            </button>
          )}
        </div>

        {/* Floating Left Panel Body (hidden during active navigation or when collapsed) */}
        {!isSidebarCollapsed && !isNavigating && (
          <div className="hidden sm:flex flex-col bg-white/96 backdrop-blur-xl rounded-2xl shadow-xl ring-1 ring-black/8 overflow-hidden pointer-events-auto max-h-[calc(100vh-140px)]">
            {/* Compact Campus Identity & Start Location */}
            <div className="px-4 py-3 border-b border-neutral-100 flex items-center justify-between gap-2">
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                  <span className="text-[11px] font-medium text-neutral-500 truncate">
                    Canara Engineering College
                  </span>
                </div>
                <button
                  onClick={() => setIsQROpen(true)}
                  className="mt-0.5 flex items-center gap-1.5 text-left group cursor-pointer max-w-full"
                  title="Change starting location or scan QR"
                >
                  <MapPin className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                  <span className="text-xs font-semibold text-neutral-900 group-hover:text-blue-600 truncate transition-colors">
                    {currentStartLabel}
                  </span>
                </button>
              </div>
              <button
                onClick={() => setIsQROpen(true)}
                className="px-2.5 py-1.5 rounded-lg bg-neutral-100 hover:bg-neutral-200/80 text-neutral-800 text-[11px] font-semibold flex items-center gap-1 cursor-pointer shrink-0 transition-colors"
                title="Scan QR plaque or set start point"
              >
                <QrCode className="w-3.5 h-3.5" />
                <span>QR</span>
              </button>
            </div>

            {/* Buildings & Floor Blueprints Selector */}
            <div className="px-4 py-3 border-b border-neutral-100">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-semibold text-neutral-500">
                  Campus Blocks &amp; Floors
                </span>
                <button
                  onClick={() => {
                    setActiveBuildingId(null);
                    setActiveFloorId('outdoor');
                  }}
                  className={`text-[11px] font-semibold px-2 py-0.5 rounded-md cursor-pointer transition-colors ${
                    !activeBuildingId || activeBuildingId === 'outdoor'
                      ? 'bg-neutral-900 text-white'
                      : 'text-neutral-600 hover:bg-neutral-100'
                  }`}
                >
                  Overview
                </button>
              </div>

              <div className="space-y-1.5">
                {buildings.map(b => {
                  const bFloors = floors
                    .filter(f => f.buildingId === b.id)
                    .sort((a, z) => a.floorNumber - z.floorNumber);
                  const isBlockActive = activeBuildingId === b.id;

                  return (
                    <div
                      key={b.id}
                      className={`flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-xl transition-colors ${
                        isBlockActive ? 'bg-blue-50/70 ring-1 ring-blue-200/80' : 'hover:bg-neutral-50'
                      }`}
                    >
                      <button
                        onClick={() => setActiveBuildingId(b.id)}
                        className="text-left min-w-0 flex-1 cursor-pointer"
                      >
                        <div className="text-xs font-semibold text-neutral-900 truncate">
                          {b.name.split(' (')[0]}
                        </div>
                      </button>
                      <div className="flex items-center gap-1 shrink-0">
                        {bFloors.map(f => {
                          const isFloorActive = activeFloorId === f.id;
                          return (
                            <button
                              key={f.id}
                              onClick={() => {
                                setActiveBuildingId(b.id);
                                setActiveFloorId(f.id);
                              }}
                              className={`h-6 min-w-[28px] px-1.5 rounded-md text-[11px] font-mono font-semibold cursor-pointer transition-colors ${
                                isFloorActive
                                  ? 'bg-neutral-900 text-white'
                                  : 'bg-neutral-100 hover:bg-neutral-200 text-neutral-700'
                              }`}
                              title={`${b.name.split(' (')[0]} – ${f.floorName}`}
                            >
                              {f.code}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Quick Places Directory */}
            <div className="px-4 py-3 overflow-y-auto">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[11px] font-semibold text-neutral-500">
                  Quick Destinations
                </span>
                <button
                  onClick={() => setIsSidebarCollapsed(true)}
                  className="text-neutral-400 hover:text-neutral-700 p-1 rounded cursor-pointer"
                  title="Hide panel"
                >
                  <PanelLeftClose className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="divide-y divide-neutral-100">
                {popularPlaces.map(place => {
                  const placeFloor = floors.find(f => f.id === place.floorId);
                  return (
                    <button
                      key={place.id}
                      onClick={() => handleQuickGo(place)}
                      className="w-full py-2 flex items-center justify-between gap-2 text-left hover:bg-neutral-50 -mx-2 px-2 rounded-lg transition-colors group cursor-pointer"
                    >
                      <div className="min-w-0">
                        <div className="text-xs font-semibold text-neutral-900 group-hover:text-blue-600 truncate transition-colors">
                          {place.name.split(' (')[0]}
                        </div>
                        <div className="text-[11px] text-neutral-500 flex items-center gap-1.5 mt-0.5">
                          <span className="font-mono text-[10px] text-neutral-600">{place.roomNumber}</span>
                          <span>·</span>
                          <span>{placeFloor?.floorName.split(' (')[0] || 'Ground'}</span>
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-neutral-300 group-hover:text-neutral-700 shrink-0 transition-colors" />
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* FLOATING TOP-RIGHT COMPACT TOOL CLUSTER */}
      <div className="absolute top-3 right-3 z-20 flex items-center gap-1.5">
        <button
          onClick={() => setRoutingPreference(isWheelchair ? 'shortest' : 'wheelchair')}
          className={`h-10 px-3 rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-lg ring-1 transition-all cursor-pointer ${
            isWheelchair
              ? 'bg-neutral-900 text-white ring-neutral-900'
              : 'bg-white/95 hover:bg-white text-neutral-800 ring-black/8 backdrop-blur-md'
          }`}
          title={isWheelchair ? 'Lift-Only accessible routing active' : 'Switch to Lift-Only accessible routing'}
        >
          <Accessibility className="w-4 h-4" />
          <span className="hidden md:inline">{isWheelchair ? 'Lift Only' : 'Accessible'}</span>
        </button>

        <button
          onClick={() => setIsPositioningOpen(true)}
          className="h-10 px-3 rounded-xl bg-white/95 hover:bg-white text-neutral-800 text-xs font-semibold flex items-center gap-1.5 shadow-lg ring-1 ring-black/8 backdrop-blur-md transition-all cursor-pointer"
          title="Live walking sensors & Mobile HTTPS QR"
        >
          <span
            className={`w-2 h-2 rounded-full ${
              motionTelemetry.isReceivingSensorEvents ? 'bg-emerald-500' : 'bg-amber-500'
            }`}
          />
          <Smartphone className="w-3.5 h-3.5 text-neutral-600 md:hidden" />
          <span className="hidden md:inline">
            {motionTelemetry.stepCount > 0 ? `${motionTelemetry.stepCount} steps` : 'Walk Sensors'}
          </span>
        </button>

        <button
          onClick={() => setIsQROpen(true)}
          className="sm:hidden h-10 w-10 rounded-xl bg-white/95 hover:bg-white text-neutral-800 flex items-center justify-center shadow-lg ring-1 ring-black/8 backdrop-blur-md cursor-pointer"
          title="Scan QR Checkpoint"
        >
          <QrCode className="w-4 h-4" />
        </button>

        <button
          onClick={() => setIsEditMode(!isEditMode)}
          className={`hidden sm:flex h-10 w-10 rounded-xl items-center justify-center shadow-lg ring-1 transition-all cursor-pointer ${
            isEditMode
              ? 'bg-amber-400 text-neutral-950 ring-amber-500'
              : 'bg-white/95 hover:bg-white text-neutral-700 ring-black/8 backdrop-blur-md'
          }`}
          title="Map Node Editor"
        >
          <Pencil className="w-4 h-4" />
        </button>

        <button
          onClick={() => setIsAdminOpen(prev => !prev)}
          className={`h-10 w-10 rounded-xl flex items-center justify-center shadow-lg ring-1 transition-all cursor-pointer ${
            isAdminOpen
              ? 'bg-neutral-900 text-white ring-neutral-900'
              : 'bg-white/95 hover:bg-white text-neutral-700 ring-black/8 backdrop-blur-md'
          }`}
          title="Campus Data Admin"
        >
          <Settings className="w-4 h-4" />
        </button>
      </div>

      {/* MOBILE BOTTOM QUICK BLOCK BAR (only on small screens when not navigating) */}
      {!isNavigating && (
        <div className="sm:hidden absolute bottom-3 left-3 right-16 z-10 flex items-center gap-1.5 overflow-x-auto no-scrollbar pointer-events-auto">
          <button
            onClick={() => {
              setActiveBuildingId(null);
              setActiveFloorId('outdoor');
            }}
            className={`px-3 py-2 rounded-xl text-xs font-semibold shadow-md ring-1 whitespace-nowrap cursor-pointer ${
              !activeBuildingId || activeBuildingId === 'outdoor'
                ? 'bg-neutral-900 text-white ring-neutral-900'
                : 'bg-white/95 text-neutral-800 ring-black/8'
            }`}
          >
            Campus
          </button>
          {buildings.map(b => (
            <button
              key={b.id}
              onClick={() => setActiveBuildingId(b.id)}
              className={`px-3 py-2 rounded-xl text-xs font-semibold shadow-md ring-1 whitespace-nowrap cursor-pointer ${
                activeBuildingId === b.id
                  ? 'bg-neutral-900 text-white ring-neutral-900'
                  : 'bg-white/95 text-neutral-800 ring-black/8'
              }`}
            >
              {b.name.split(' (')[0]}
            </button>
          ))}
        </div>
      )}

      {/* FLOATING BOTTOM DESTINATION CARD & NAVIGATION SHEET */}
      <DestinationCard />
      <NavigationSheet />

      {/* MODALS */}
      <QRScannerModal isOpen={isQROpen} onClose={() => setIsQROpen(false)} />
      <PositioningModal isOpen={isPositioningOpen} onClose={() => setIsPositioningOpen(false)} />
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
