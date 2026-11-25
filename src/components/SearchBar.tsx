import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  Search,
  X,
  ArrowRight,
  MapPin,
  Navigation,
} from 'lucide-react';
import { useCampus } from '../context/CampusContext';
import { CampusLocation } from '../types/campus';

function levenshteinDistance(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;

  const d: number[][] = [];
  for (let i = 0; i <= m; i++) d[i] = [i];
  for (let j = 0; j <= n; j++) d[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      d[i][j] = Math.min(
        d[i - 1][j] + 1,
        d[i][j - 1] + 1,
        d[i - 1][j - 1] + cost
      );
    }
  }
  return d[m][n];
}

const CATEGORY_ITEMS = [
  { key: 'all', label: 'All' },
  { key: 'classrooms', label: 'Classrooms' },
  { key: 'labs', label: 'Labs' },
  { key: 'office', label: 'HOD & Staff' },
  { key: 'washrooms', label: 'Washrooms' },
  { key: 'canteen', label: 'Library' },
];

interface SearchBarProps {
  onCollapse?: () => void;
}

export const SearchBar: React.FC<SearchBarProps> = () => {
  const {
    locations,
    buildings,
    floors,
    searchQuery,
    setSearchQuery,
    setSelectedDestination,
    setStartLocation,
    setUserPositionManual,
    startNavigation,
    setActiveBuildingId,
    setActiveFloorId,
    startLocation,
  } = useCampus();

  const [isOpen, setIsOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const searchInputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const filteredLocations = useMemo(() => {
    let list = locations;

    if (selectedCategory !== 'all') {
      if (selectedCategory === 'washrooms') {
        list = list.filter(l => l.category === 'restroom' || l.name.toLowerCase().includes('toilet') || l.name.toLowerCase().includes('washroom'));
      } else if (selectedCategory === 'canteen') {
        list = list.filter(l => l.category === 'canteen' || l.category === 'library' || l.name.toLowerCase().includes('stationary') || l.name.toLowerCase().includes('store'));
      } else if (selectedCategory === 'labs') {
        list = list.filter(l => l.category === 'lab' || l.name.toLowerCase().includes('lab') || l.name.toLowerCase().includes('computer'));
      } else if (selectedCategory === 'office') {
        list = list.filter(l => l.category === 'office' || l.category === 'staff_room' || l.category === 'department' || l.name.toLowerCase().includes('hod') || l.name.toLowerCase().includes('staff') || l.name.toLowerCase().includes('office'));
      } else if (selectedCategory === 'classrooms') {
        list = list.filter(l => l.category === 'classroom' || l.name.toLowerCase().includes('class'));
      }
    }

    if (!searchQuery.trim()) {
      return list;
    }

    const q = searchQuery.toLowerCase().trim();
    const qClean = q.replace(/[^a-z0-9]/g, '');

    const scored = list.map(loc => {
      let score = 0;
      const nameLower = loc.name.toLowerCase();
      const roomLower = loc.roomNumber.toLowerCase();
      const roomClean = roomLower.replace(/[^a-z0-9]/g, '');
      const descLower = loc.description.toLowerCase();
      const tags = (loc.tags || []).map(t => t.toLowerCase());

      if (roomLower === q || roomClean === qClean) score += 100;
      else if (roomClean.startsWith(qClean) || roomLower.includes(q)) score += 60;

      if (nameLower === q) score += 80;
      else if (nameLower.includes(q)) score += 50;

      if (loc.facultyInfo?.department.toLowerCase().includes(q) || loc.facultyInfo?.name.toLowerCase().includes(q)) {
        score += 40;
      }

      if (tags.some(t => t.includes(q) || q.includes(t))) score += 35;
      if (descLower.includes(q)) score += 20;

      if (score === 0 && q.length >= 3) {
        const words = nameLower.split(/\s+/);
        for (const w of words) {
          if (Math.abs(w.length - q.length) <= 2) {
            const dist = levenshteinDistance(w, q);
            if (dist <= 2) {
              score += 25 - dist * 5;
              break;
            }
          }
        }
      }

      return { loc, score };
    });

    return scored
      .filter(item => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .map(item => item.loc);
  }, [locations, selectedCategory, searchQuery]);

  const handleSelectLocation = (loc: CampusLocation, autoStart = false) => {
    setSelectedDestination(loc);
    setIsOpen(false);

    if (autoStart) {
      startNavigation(loc);
    } else {
      setActiveBuildingId(loc.buildingId === 'outdoor' ? null : loc.buildingId);
      setActiveFloorId(loc.floorId);
    }
  };

  const handleSetAsStart = (loc: CampusLocation) => {
    setStartLocation(loc);
    setUserPositionManual({
      x: loc.coordinates.x,
      y: loc.coordinates.y,
      buildingId: loc.buildingId,
      floorId: loc.floorId,
      confirmedLocationName: `${loc.name.split(' (')[0]} (${loc.roomNumber})`,
      method: 'manual',
    });
    setActiveBuildingId(loc.buildingId === 'outdoor' ? null : loc.buildingId);
    setActiveFloorId(loc.floorId);
    setIsOpen(false);
  };

  const getFloorBadge = (floorId: string) => {
    const f = floors.find(item => item.id === floorId);
    return f ? f.code : 'OUT';
  };

  const getBuildingBadge = (buildingId: string) => {
    const b = buildings.find(item => item.id === buildingId);
    return b ? b.name.split(' (')[0] : 'Campus';
  };

  return (
    <div ref={containerRef} className="relative w-full">
      {/* Clean Floating Search Input */}
      <div className="relative flex items-center bg-white rounded-2xl shadow-lg ring-1 ring-black/8 transition-shadow focus-within:ring-2 focus-within:ring-neutral-900">
        <div className="pl-3.5 pr-2 text-neutral-400">
          <Search className="w-4 h-4" />
        </div>
        <input
          ref={searchInputRef}
          type="text"
          value={searchQuery}
          onChange={e => {
            setSearchQuery(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          placeholder="Search rooms, labs, HOD, or washrooms..."
          className="w-full py-2.5 sm:py-3 pr-9 text-base sm:text-[13px] text-neutral-900 placeholder:text-neutral-400 bg-transparent focus:outline-hidden font-medium"
          aria-label="Search campus rooms and locations"
        />
        {searchQuery && (
          <button
            onClick={() => {
              setSearchQuery('');
              searchInputRef.current?.focus();
            }}
            className="p-2.5 text-neutral-400 hover:text-neutral-800 cursor-pointer"
            aria-label="Clear search"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Minimal Floating Filter Pills */}
      <div className="flex items-center gap-1.5 overflow-x-auto pt-2 pb-0.5 no-scrollbar">
        {CATEGORY_ITEMS.map(cat => {
          const isActive = selectedCategory === cat.key;
          return (
            <button
              key={cat.key}
              onClick={() => {
                setSelectedCategory(cat.key);
                setIsOpen(true);
              }}
              className={`px-3 py-1.5 rounded-full text-[11px] font-semibold whitespace-nowrap transition-all cursor-pointer shadow-sm ring-1 ${
                isActive
                  ? 'bg-neutral-900 text-white ring-neutral-900'
                  : 'bg-white/95 hover:bg-white text-neutral-700 ring-black/8'
              }`}
            >
              {cat.label}
            </button>
          );
        })}
      </div>

      {/* Results Popover */}
      {isOpen && (
        <div className="fixed sm:absolute left-2.5 right-2.5 sm:left-0 sm:right-0 top-[96px] sm:top-[52px] mt-1 bg-white rounded-2xl shadow-2xl ring-1 ring-black/10 max-h-[55dvh] sm:max-h-[380px] overflow-y-auto divide-y divide-neutral-100 z-50">
          {filteredLocations.length > 0 ? (
            filteredLocations.slice(0, 18).map(loc => {
              const floorCode = getFloorBadge(loc.floorId);
              const blockName = getBuildingBadge(loc.buildingId);
              const isStart = startLocation?.id === loc.id;

              return (
                <div
                  key={loc.id}
                  className="px-3.5 py-2.5 hover:bg-neutral-50 transition-colors flex items-center justify-between gap-2"
                >
                  <div
                    className="flex-1 cursor-pointer text-left min-w-0"
                    onClick={() => handleSelectLocation(loc, false)}
                  >
                    <div className="text-[13px] font-semibold text-neutral-900 truncate">
                      {loc.name.split(' (')[0]}
                    </div>
                    <div className="flex items-center gap-1.5 text-[11px] text-neutral-500 mt-0.5">
                      <span className="font-mono font-semibold text-neutral-700">
                        {loc.roomNumber}
                      </span>
                      <span>·</span>
                      <span className="truncate">
                        {blockName}, {floorCode}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => handleSetAsStart(loc)}
                      className={`h-8 px-2.5 text-[11px] font-semibold rounded-lg transition-colors cursor-pointer flex items-center gap-1 ${
                        isStart
                          ? 'bg-emerald-600 text-white'
                          : 'bg-neutral-100 hover:bg-neutral-200 text-neutral-700'
                      }`}
                      title="Set as starting point"
                    >
                      <MapPin className="w-3 h-3" />
                      <span>{isStart ? 'Start' : 'From'}</span>
                    </button>
                    <button
                      onClick={() => handleSelectLocation(loc, true)}
                      className="h-8 px-2.5 text-[11px] font-semibold rounded-lg bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-1 transition-colors cursor-pointer"
                      title="Start navigation"
                    >
                      <Navigation className="w-3 h-3" />
                      <span>Go</span>
                    </button>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="p-6 text-center text-neutral-500 text-xs">
              <p className="font-semibold text-neutral-800">No rooms matching &ldquo;{searchQuery}&rdquo;</p>
              <p className="mt-1 text-neutral-400">Try CRB-GF-01, Library, Lab, HOD, or Toilet</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
