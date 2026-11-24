import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  Search,
  X,
  FlaskConical,
  GraduationCap,
  Coffee,
  Briefcase,
  DoorOpen,
  ArrowRight,
  Compass,
  MapPin,
  Navigation,
} from 'lucide-react';
import { useCampus } from '../context/CampusContext';
import { CampusLocation } from '../types/campus';

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
  { key: 'all', label: 'All Places', icon: Compass },
  { key: 'classrooms', label: 'Classrooms', icon: GraduationCap },
  { key: 'labs', label: 'Labs', icon: FlaskConical },
  { key: 'office', label: 'HOD & Staff', icon: Briefcase },
  { key: 'washrooms', label: 'Washrooms', icon: DoorOpen },
  { key: 'canteen', label: 'Library & Pantry', icon: Coffee },
  { key: 'exits', label: 'Gates', icon: DoorOpen },
];

export const SearchBar: React.FC = () => {
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
        list = list.filter(l => l.category === 'canteen' || l.category === 'library' || l.name.toLowerCase().includes('stationary') || l.name.toLowerCase().includes('store') || l.name.toLowerCase().includes('kitchen'));
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
      confirmedLocationName: `${loc.name} (${loc.roomNumber})`,
      method: 'manual',
    });
    setActiveBuildingId(loc.buildingId === 'outdoor' ? null : loc.buildingId);
    setActiveFloorId(loc.floorId);
    setIsOpen(false);
  };

  const getFloorBadge = (floorId: string) => {
    const f = floors.find(item => item.id === floorId);
    if (!f) return 'Ground Floor';
    return f.floorName;
  };

  const getBuildingBadge = (buildingId: string) => {
    const b = buildings.find(item => item.id === buildingId);
    return b ? b.code : 'OUT';
  };

  return (
    <div ref={containerRef} className="relative w-full z-20">
      <div className="bg-white/95 backdrop-blur-md rounded-2xl p-2.5 border border-slate-200/90 shadow-sm">
        {/* Search Input Box */}
        <div className="relative flex items-center bg-slate-50 hover:bg-slate-100/70 rounded-xl border border-slate-200/90 transition-all focus-within:bg-white focus-within:ring-2 focus-within:ring-[#0f3b7a] focus-within:border-[#0f3b7a]">
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
            placeholder="Search classroom, lab, HOD, or washroom (e.g. CRB-FF-04)..."
            className="w-full py-2.5 pr-9 text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 bg-transparent focus:outline-hidden font-semibold"
            aria-label="Search campus rooms and locations"
          />
          {searchQuery && (
            <button
              onClick={() => {
                setSearchQuery('');
                searchInputRef.current?.focus();
              }}
              className="p-2 text-slate-400 hover:text-slate-700 cursor-pointer flex items-center justify-center"
              aria-label="Clear search"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Quick Category Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto pt-2 pb-0.5 px-0.5 no-scrollbar text-xs">
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
                className={`min-h-[30px] flex items-center gap-1.5 px-2.5 py-1 rounded-lg whitespace-nowrap font-bold text-[11px] transition-all cursor-pointer border ${
                  isActive
                    ? 'bg-[#0f3b7a] text-white border-[#0f3b7a] shadow-xs'
                    : 'bg-slate-50 hover:bg-slate-100 text-slate-600 border-slate-200/80'
                }`}
              >
                <Icon className="w-3 h-3" />
                <span>{cat.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Search Results Dropdown */}
      {isOpen && (
        <div className="absolute left-0 right-0 top-full mt-1.5 bg-white rounded-2xl shadow-2xl border border-slate-200 max-h-[390px] overflow-y-auto divide-y divide-slate-100 z-50">
          <div className="px-3.5 py-2 bg-slate-50/90 border-b border-slate-100 flex items-center justify-between text-[11px] font-bold text-slate-500">
            <span>Showing {Math.min(filteredLocations.length, 20)} of {filteredLocations.length} campus locations</span>
            <button
              onClick={() => setIsOpen(false)}
              className="text-slate-400 hover:text-slate-700 cursor-pointer font-semibold"
            >
              Close
            </button>
          </div>
          {filteredLocations.length > 0 ? (
            filteredLocations.slice(0, 20).map(loc => {
              const floorLabel = getFloorBadge(loc.floorId);
              const blockCode = getBuildingBadge(loc.buildingId);
              const isStart = startLocation?.id === loc.id;

              return (
                <div
                  key={loc.id}
                  className="p-3 hover:bg-blue-50/40 transition-colors flex items-center justify-between gap-2.5"
                >
                  <div
                    className="flex-1 cursor-pointer text-left min-w-0"
                    onClick={() => handleSelectLocation(loc, false)}
                  >
                    <div className="flex items-center gap-1.5 flex-wrap mb-1">
                      {loc.roomNumber && (
                        <span className="font-mono text-[11px] font-extrabold px-1.5 py-0.5 bg-slate-900 text-white rounded-md">
                          {loc.roomNumber}
                        </span>
                      )}
                      <span className="text-[10px] font-extrabold text-[#0f3b7a] bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200/70">
                        {blockCode} • {floorLabel.split(' (')[0]}
                      </span>
                    </div>
                    <div className="font-bold text-xs sm:text-sm text-slate-900 truncate">
                      {loc.name}
                    </div>
                    <p className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">
                      {loc.description || `${loc.name} at Canara Engineering College`}
                    </p>
                  </div>

                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <button
                      onClick={() => handleSetAsStart(loc)}
                      className={`min-h-[36px] px-2.5 py-1 text-[11px] font-bold rounded-xl border transition-all cursor-pointer flex items-center gap-1 ${
                        isStart
                          ? 'bg-emerald-600 text-white border-emerald-600 shadow-2xs'
                          : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                      }`}
                      title="Set as starting location (You Are Here)"
                    >
                      <MapPin className="w-3 h-3" />
                      <span>{isStart ? 'Start' : 'From Here'}</span>
                    </button>
                    <button
                      onClick={() => handleSelectLocation(loc, true)}
                      className="min-h-[36px] px-3 py-1 text-xs font-extrabold rounded-xl bg-[#0f3b7a] hover:bg-[#0a2752] text-white flex items-center gap-1 transition-all cursor-pointer shadow-xs"
                      title="Start turn-by-turn navigation to this room"
                    >
                      <Navigation className="w-3 h-3 text-amber-300" />
                      <span>Go</span>
                    </button>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="p-8 text-center text-slate-500 text-sm">
              <p className="font-bold text-slate-700">No matching room found for &ldquo;{searchQuery}&rdquo;</p>
              <p className="mt-1 text-xs text-slate-400">
                Try searching for &ldquo;CRB-GF-01&rdquo;, &ldquo;Computer Lab&rdquo;, &ldquo;Library&rdquo;, &ldquo;HOD&rdquo;, or &ldquo;Toilet&rdquo;.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
