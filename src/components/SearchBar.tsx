import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  Search,
  X,
  MapPin,
  Building2,
  Users,
  FlaskConical,
  GraduationCap,
  Coffee,
  Briefcase,
  DoorOpen,
  ArrowRight,
  Compass,
  CornerDownRight,
} from 'lucide-react';
import { useCampus } from '../context/CampusContext';
import { CampusLocation, LocationCategory } from '../types/campus';

// Levenshtein distance for typo forgiveness
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

const CATEGORY_ITEMS: {
  key: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  { key: 'all', label: 'All', icon: Compass },
  { key: 'washrooms', label: 'Washrooms', icon: DoorOpen },
  { key: 'canteen', label: 'Canteen & Store', icon: Coffee },
  { key: 'labs', label: 'Labs', icon: FlaskConical },
  { key: 'office', label: 'Admin & HOD', icon: Briefcase },
  { key: 'classrooms', label: 'Classrooms', icon: GraduationCap },
  { key: 'exits', label: 'Exits & Gates', icon: DoorOpen },
];

export const SearchBar: React.FC = () => {
  const {
    locations,
    floors,
    searchQuery,
    setSearchQuery,
    setSelectedDestination,
    setStartLocation,
    startNavigation,
    setActiveBuildingId,
    setActiveFloorId,
    startLocation,
  } = useCampus();

  const [isOpen, setIsOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const searchInputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  // Forgiving fuzzy filter logic
  const filteredLocations = useMemo(() => {
    let list = locations;

    // Filter by quick category chip
    if (selectedCategory !== 'all') {
      if (selectedCategory === 'washrooms') {
        list = list.filter(l => l.category === 'restroom' || l.name.toLowerCase().includes('toilet') || l.name.toLowerCase().includes('washroom'));
      } else if (selectedCategory === 'canteen') {
        list = list.filter(l => l.category === 'canteen' || l.name.toLowerCase().includes('stationary') || l.name.toLowerCase().includes('store') || l.name.toLowerCase().includes('kitchen'));
      } else if (selectedCategory === 'labs') {
        list = list.filter(l => l.category === 'lab' || l.name.toLowerCase().includes('lab') || l.name.toLowerCase().includes('computer'));
      } else if (selectedCategory === 'office') {
        list = list.filter(l => l.category === 'office' || l.category === 'staff_room' || l.category === 'department' || l.name.toLowerCase().includes('hod') || l.name.toLowerCase().includes('staff') || l.name.toLowerCase().includes('office'));
      } else if (selectedCategory === 'classrooms') {
        list = list.filter(l => l.category === 'classroom' || l.name.toLowerCase().includes('class'));
      } else if (selectedCategory === 'exits') {
        list = list.filter(l => l.category === 'emergency' || l.name.toLowerCase().includes('gate') || l.name.toLowerCase().includes('entrance') || l.name.toLowerCase().includes('exit'));
      }
    }

    if (!searchQuery.trim()) {
      return list;
    }

    const q = searchQuery.toLowerCase().trim();
    const qClean = q.replace(/[^a-z0-9]/g, '');

    // Score matches
    const scored = list.map(loc => {
      let score = 0;
      const nameLower = loc.name.toLowerCase();
      const roomLower = loc.roomNumber.toLowerCase();
      const roomClean = roomLower.replace(/[^a-z0-9]/g, '');
      const descLower = loc.description.toLowerCase();
      const tags = (loc.tags || []).map(t => t.toLowerCase());

      // Exact or prefix match on room number
      if (roomLower === q || roomClean === qClean) score += 100;
      else if (roomClean.startsWith(qClean) || roomLower.includes(q)) score += 60;

      // Exact or partial name match
      if (nameLower === q) score += 80;
      else if (nameLower.includes(q)) score += 50;

      // Department or faculty match
      if (loc.facultyInfo?.department.toLowerCase().includes(q) || loc.facultyInfo?.name.toLowerCase().includes(q)) {
        score += 40;
      }

      // Tag match
      if (tags.some(t => t.includes(q) || q.includes(t))) score += 35;

      // Description match
      if (descLower.includes(q)) score += 20;

      // Typo tolerance: check Levenshtein distance on words
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
    setActiveBuildingId(loc.buildingId === 'outdoor' ? null : loc.buildingId);
    setActiveFloorId(loc.floorId);
    setIsOpen(false);

    if (autoStart) {
      startNavigation(loc);
    }
  };

  const handleSetAsStart = (loc: CampusLocation) => {
    setStartLocation(loc);
    setActiveBuildingId(loc.buildingId === 'outdoor' ? null : loc.buildingId);
    setActiveFloorId(loc.floorId);
  };

  const getFloorBadge = (floorId: string) => {
    const f = floors.find(item => item.id === floorId);
    if (!f) return 'Ground Floor';
    return f.floorName;
  };

  return (
    <div ref={containerRef} className="relative w-full max-w-xl mx-auto z-20">
      {/* Search Input Box */}
      <div className="relative flex items-center bg-white rounded-xl shadow-xs border border-slate-300 transition-all focus-within:ring-2 focus-within:ring-[#0f3b7a] focus-within:border-[#0f3b7a]">
        <div className="pl-3.5 pr-2 text-[#0f3b7a]">
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
          placeholder="Search room (e.g. CR-104, Physics Lab, HOD, Toilet)"
          className="w-full py-2.5 pr-9 text-sm text-slate-900 placeholder:text-slate-400 bg-transparent focus:outline-hidden font-medium"
          aria-label="Search campus rooms and locations"
        />
        {searchQuery && (
          <button
            onClick={() => {
              setSearchQuery('');
              searchInputRef.current?.focus();
            }}
            className="p-2 text-slate-400 hover:text-slate-700 cursor-pointer min-h-[44px] min-w-[44px] flex items-center justify-center"
            aria-label="Clear search"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Quick Category Chips */}
      <div className="flex items-center gap-1.5 overflow-x-auto py-2 px-0.5 no-scrollbar text-xs">
        {CATEGORY_ITEMS.map(cat => {
          const Icon = cat.icon;
          const isActive = selectedCategory === cat.key;
          return (
            <button
              key={cat.key}
              onClick={() => {
                setSelectedCategory(cat.key);
                setIsOpen(true);
              }}
              className={`min-h-[36px] flex items-center gap-1.5 px-3 py-1 rounded-full whitespace-nowrap font-medium transition-colors cursor-pointer border ${
                isActive
                  ? 'bg-[#0f3b7a] text-white border-[#0f3b7a] shadow-xs'
                  : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-200 shadow-2xs'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{cat.label}</span>
            </button>
          );
        })}
      </div>

      {/* Search Results Dropdown */}
      {isOpen && (
        <div className="absolute left-0 right-0 top-full mt-1 bg-white rounded-xl shadow-xl border border-slate-200 max-h-[380px] overflow-y-auto divide-y divide-slate-100 z-50">
          {filteredLocations.length > 0 ? (
            filteredLocations.slice(0, 15).map(loc => {
              const floorLabel = getFloorBadge(loc.floorId);
              const isStart = startLocation?.id === loc.id;

              return (
                <div
                  key={loc.id}
                  className="p-3 hover:bg-slate-50 transition-colors flex items-center justify-between gap-2"
                >
                  <div
                    className="flex-1 cursor-pointer text-left"
                    onClick={() => handleSelectLocation(loc, false)}
                  >
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      {loc.roomNumber && (
                        <span className="font-mono text-xs font-bold px-1.5 py-0.5 bg-slate-100 text-slate-800 rounded border border-slate-200">
                          {loc.roomNumber}
                        </span>
                      )}
                      <span className="font-semibold text-sm text-slate-900">
                        {loc.name}
                      </span>
                      <span className="text-[11px] font-medium text-[#0f3b7a] bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200/60">
                        {floorLabel}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 line-clamp-1">
                      {loc.description || `${loc.name} at Canara Engineering College`}
                    </p>
                  </div>

                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <button
                      onClick={() => handleSetAsStart(loc)}
                      className={`min-h-[40px] px-2.5 py-1 text-xs font-semibold rounded-lg border transition-colors cursor-pointer ${
                        isStart
                          ? 'bg-emerald-600 text-white border-emerald-600'
                          : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                      }`}
                      title="Set as starting location"
                    >
                      {isStart ? 'Start Point' : 'Set Start'}
                    </button>
                    <button
                      onClick={() => handleSelectLocation(loc, true)}
                      className="min-h-[40px] px-3 py-1 text-xs font-bold rounded-lg bg-[#0f3b7a] hover:bg-[#0a2752] text-white flex items-center gap-1 transition-colors cursor-pointer shadow-xs"
                      title="Navigate directly to this location"
                    >
                      <span>Route</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="p-6 text-center text-slate-500 text-sm">
              No matching room or facility found for "{searchQuery}".
              <div className="mt-1 text-xs text-slate-400">
                Try searching for room number like "CR-104", "Physics Lab", "HOD", or "Washroom".
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
