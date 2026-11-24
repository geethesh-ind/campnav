import React, { useMemo, useState } from 'react';
import {
  Navigation,
  X,
  Clock,
  Mail,
  Share2,
  Building2,
  MapPin,
  Check,
  AlertTriangle,
} from 'lucide-react';
import { useCampus } from '../context/CampusContext';
import { findOptimalPath } from '../utils/navigationEngine';

export const DestinationCard: React.FC = () => {
  const {
    selectedDestination,
    setSelectedDestination,
    startNavigation,
    startLocation,
    setStartLocation,
    isNavigating,
    userPosition,
    buildings,
    floors,
    locations,
    nodes,
    connections,
    routingPreference,
    getShareableRouteUrl,
  } = useCampus();

  const [copied, setCopied] = useState(false);

  const building = useMemo(
    () => (selectedDestination ? buildings.find(b => b.id === selectedDestination.buildingId) : undefined),
    [buildings, selectedDestination]
  );
  const floor = useMemo(
    () => (selectedDestination ? floors.find(f => f.id === selectedDestination.floorId) : undefined),
    [floors, selectedDestination]
  );

  const routePreview = useMemo(() => {
    if (!selectedDestination || nodes.length === 0) {
      return { distance: 0, time: 1, reachable: true };
    }

    let startNodeId = startLocation?.associatedNodeId;
    if (!startNodeId) {
      const sameFloorNodes = nodes.filter(
        n => n.floorId === userPosition.floorId && n.buildingId === userPosition.buildingId
      );
      const candidates = sameFloorNodes.length > 0 ? sameFloorNodes : nodes;
      let closestNode = candidates[0];
      let minDist = Infinity;
      for (const n of candidates) {
        const d = Math.hypot(n.x - userPosition.x, n.y - userPosition.y);
        if (d < minDist) {
          minDist = d;
          closestNode = n;
        }
      }
      startNodeId = closestNode.id;
    }

    const path = findOptimalPath(
      startNodeId,
      selectedDestination.associatedNodeId,
      nodes,
      connections,
      routingPreference
    );

    if (!path) {
      return { distance: 0, time: 0, reachable: false };
    }

    return {
      distance: path.totalDistanceMeters,
      time: Math.max(1, Math.ceil(path.totalDistanceMeters / 60)),
      reachable: true,
    };
  }, [userPosition, startLocation, selectedDestination, nodes, connections, routingPreference]);

  if (!selectedDestination || isNavigating) {
    return null;
  }

  const handleShare = async () => {
    const url = getShareableRouteUrl();
    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(url);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    } catch {
      // fallback
    }
  };

  return (
    <div className="fixed bottom-3 left-0 right-0 z-20 pointer-events-none px-3">
      <div className="max-w-xl mx-auto pointer-events-auto">
        <div className="bg-white rounded-2xl shadow-xl border border-slate-300 overflow-hidden divide-y divide-slate-100 transition-all">
          {/* Header Info */}
          <div className="p-3.5 sm:p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-800 text-xs font-mono font-bold uppercase border border-slate-200">
                    {selectedDestination.roomNumber}
                  </span>
                  <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                    {selectedDestination.category.replace('_', ' ')}
                  </span>
                </div>
                <h3 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight leading-snug">
                  {selectedDestination.name}
                </h3>
                <p className="text-xs text-slate-500 mt-1 flex items-center gap-1.5 font-medium">
                  <Building2 className="w-3.5 h-3.5 text-[#0f3b7a] shrink-0" />
                  <span className="truncate">{building?.name.split(' (')[0] || 'Campus Grounds'}</span>
                  <span>•</span>
                  <span className="shrink-0 text-amber-800 font-semibold">{floor?.floorName || 'Ground'}</span>
                </p>
              </div>

              <button
                onClick={() => setSelectedDestination(null)}
                className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center cursor-pointer transition-colors shrink-0"
                aria-label="Close destination details"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-600 mt-2 leading-relaxed">
              {selectedDestination.description}
            </p>

            {/* Starting point selector */}
            <div className="mt-3 flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5">
              <MapPin className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <label htmlFor="dest-start-select" className="text-[11px] font-bold text-slate-500 uppercase tracking-wide shrink-0">
                From:
              </label>
              <select
                id="dest-start-select"
                value={startLocation?.id || ''}
                onChange={e => {
                  const chosen = locations.find(l => l.id === e.target.value) || null;
                  setStartLocation(chosen);
                }}
                className="w-full text-xs font-semibold text-slate-800 bg-transparent focus:outline-hidden cursor-pointer truncate"
              >
                <option value="">
                  Current Position ({userPosition.confirmedLocationName || 'Campus Pin'})
                </option>
                {locations
                  .filter(l => l.id !== selectedDestination.id)
                  .map(loc => (
                    <option key={loc.id} value={loc.id}>
                      {loc.name} ({loc.roomNumber})
                    </option>
                  ))}
              </select>
            </div>

            {/* Faculty Details if available */}
            {selectedDestination.facultyInfo && (
              <div className="mt-2.5 p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-700">
                <p className="font-bold text-slate-900">
                  {selectedDestination.facultyInfo.name}
                </p>
                <p className="text-slate-600 text-[11px]">
                  {selectedDestination.facultyInfo.designation} • {selectedDestination.facultyInfo.department}
                </p>
                <div className="mt-1.5 pt-1.5 border-t border-slate-200 flex flex-wrap gap-x-4 gap-y-1 text-slate-600 text-[11px]">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3 text-[#0f3b7a]" />
                    <span>{selectedDestination.facultyInfo.officeHours}</span>
                  </span>
                  <span className="flex items-center gap-1">
                    <Mail className="w-3 h-3 text-[#0f3b7a]" />
                    <span>{selectedDestination.facultyInfo.email}</span>
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Action Buttons & Distance metrics (min 44px tap targets) */}
          <div className="p-3 bg-slate-50 flex items-center justify-between gap-2.5">
            {routePreview.reachable ? (
              <div className="flex items-baseline gap-1.5 text-xs">
                <span className="text-base font-bold text-slate-900 font-mono">
                  {routePreview.distance}m
                </span>
                <span className="text-slate-500 font-medium">
                  (~{routePreview.time} min)
                </span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 text-xs text-amber-700 font-semibold">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>No lift path available in wheelchair mode</span>
              </div>
            )}

            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={handleShare}
                className="min-h-[44px] px-3 rounded-lg bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 shadow-2xs transition-colors cursor-pointer flex items-center gap-1 text-xs font-semibold"
                title="Copy shareable link"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Share2 className="w-4 h-4" />}
                <span>{copied ? 'Copied' : 'Share'}</span>
              </button>

              <button
                onClick={() => startNavigation(selectedDestination, startLocation || undefined)}
                disabled={!routePreview.reachable}
                className="min-h-[44px] px-4 rounded-lg bg-[#0f3b7a] hover:bg-[#0a2752] disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-bold text-xs sm:text-sm flex items-center gap-2 shadow-xs transition-colors cursor-pointer"
              >
                <Navigation className="w-4 h-4 text-amber-400" />
                <span>Start Navigation</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
