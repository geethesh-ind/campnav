import React, { useMemo, useState } from 'react';
import {
  Navigation,
  X,
  Clock,
  Mail,
  Share2,
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
    setUserPositionManual,
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
    <div className="fixed bottom-2.5 sm:bottom-4 left-1/2 -translate-x-1/2 z-30 w-[calc(100vw-16px)] sm:w-[calc(100vw-24px)] max-w-[440px] pointer-events-auto pb-safe">
      <div className="bg-white/98 backdrop-blur-xl rounded-2xl shadow-2xl ring-1 ring-black/10 overflow-hidden">
        <div className="p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 text-[11px] font-medium text-neutral-500">
                <span className="font-mono font-semibold text-neutral-800">{selectedDestination.roomNumber}</span>
                <span>·</span>
                <span className="truncate">{building?.name.split(' (')[0] || 'Campus Grounds'}</span>
                <span>·</span>
                <span>{floor?.floorName.split(' (')[0] || 'Ground'}</span>
              </div>
              <h3 className="text-base font-bold text-neutral-900 leading-snug mt-0.5">
                {selectedDestination.name.split(' (')[0]}
              </h3>
            </div>

            <button
              onClick={() => setSelectedDestination(null)}
              className="w-7 h-7 rounded-full bg-neutral-100 hover:bg-neutral-200 text-neutral-500 flex items-center justify-center cursor-pointer shrink-0 transition-colors"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <p className="text-xs text-neutral-500 mt-1.5 leading-relaxed">
            {selectedDestination.description}
          </p>

          {/* From Selector */}
          <div className="mt-3 flex items-center gap-2 bg-neutral-100/80 rounded-xl px-3 py-2">
            <MapPin className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <span className="text-[11px] font-semibold text-neutral-500 shrink-0">From</span>
            <select
              value={startLocation?.id || ''}
              onChange={e => {
                const chosen = locations.find(l => l.id === e.target.value) || null;
                setStartLocation(chosen);
                if (chosen) {
                  setUserPositionManual({
                    x: chosen.coordinates.x,
                    y: chosen.coordinates.y,
                    buildingId: chosen.buildingId,
                    floorId: chosen.floorId,
                    confirmedLocationName: `${chosen.name.split(' (')[0]} (${chosen.roomNumber})`,
                    method: 'manual',
                  });
                }
              }}
              className="w-full text-xs font-semibold text-neutral-900 bg-transparent focus:outline-hidden cursor-pointer truncate"
            >
              <option value="">
                Current Position ({userPosition.confirmedLocationName || 'Main Gate'})
              </option>
              {locations
                .filter(l => l.id !== selectedDestination.id)
                .map(loc => (
                  <option key={loc.id} value={loc.id}>
                    {loc.name.split(' (')[0]} ({loc.roomNumber})
                  </option>
                ))}
            </select>
          </div>

          {selectedDestination.facultyInfo && (
            <div className="mt-2.5 p-2.5 rounded-xl bg-neutral-50 ring-1 ring-black/5 text-xs">
              <div className="font-semibold text-neutral-900">{selectedDestination.facultyInfo.name}</div>
              <div className="text-[11px] text-neutral-500 mt-0.5 flex flex-wrap gap-x-3 gap-y-0.5">
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {selectedDestination.facultyInfo.officeHours}
                </span>
                <span className="flex items-center gap-1">
                  <Mail className="w-3 h-3" />
                  {selectedDestination.facultyInfo.email}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-4 py-3 bg-neutral-50 border-t border-neutral-100 flex items-center justify-between gap-3">
          {routePreview.reachable ? (
            <div>
              <div className="text-sm font-bold text-neutral-900">
                {routePreview.time} min <span className="text-neutral-400 font-normal">({routePreview.distance} m)</span>
              </div>
              <div className="text-[11px] text-neutral-500">Fastest indoor route</div>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 text-xs text-amber-700 font-semibold">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>No lift path available</span>
            </div>
          )}

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handleShare}
              className="h-10 px-3 rounded-xl bg-white hover:bg-neutral-100 text-neutral-700 ring-1 ring-black/10 transition-colors cursor-pointer flex items-center gap-1.5 text-xs font-semibold"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Share2 className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied' : 'Share'}</span>
            </button>

            <button
              onClick={() => startNavigation(selectedDestination, startLocation || undefined)}
              disabled={!routePreview.reachable}
              className="h-10 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:bg-neutral-300 text-white font-semibold text-xs flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
            >
              <Navigation className="w-3.5 h-3.5" />
              <span>Directions</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
