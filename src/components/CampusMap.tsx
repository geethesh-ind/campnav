import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  Plus,
  Minus,
  Locate,
  Layers,
  ArrowUp,
  ChevronsUpDown,
  DoorOpen,
  MapPin,
  RotateCcw,
  Pencil,
  Download,
  Trash2,
  Move,
  Check,
  X,
  Compass,
  Footprints,
} from 'lucide-react';
import { StairsIcon } from './icons/StairsIcon';
import { useCampus } from '../context/CampusContext';
import { Building, Floor, CampusLocation, NavigationNode, NodeType } from '../types/campus';

export const CampusMap: React.FC = () => {
  const {
    buildings,
    floors,
    locations,
    nodes,
    connections,
    activeBuildingId,
    activeFloorId,
    setActiveBuildingId,
    setActiveFloorId,
    userPosition,
    setUserPositionManual,
    selectedDestination,
    setSelectedDestination,
    activeRoute,
    currentStepIndex,
    isNavigating,
    wrongDirectionStatus,
    isEditMode,
    setIsEditMode,
    editTool,
    setEditTool,
    selectedEditNodeId,
    setSelectedEditNodeId,
    addNodeAtCoords,
    moveNodeToCoords,
    connectNodesDev,
    deleteNode,
    exportCampusJsonFile,
    isFollowUser,
  } = useCampus();

  // Viewport pan & zoom transform
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [showFloorMarkers, setShowFloorMarkers] = useState(true);
  const [newNodeType, setNewNodeType] = useState<NodeType>('junction');
  const [newNodeLabel, setNewNodeLabel] = useState('');
  const [connectFirstNodeId, setConnectFirstNodeId] = useState<string | null>(null);

  const dragStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const didDragRef = useRef(false);
  const touchStartDistRef = useRef<number | null>(null);
  const touchStartZoomRef = useRef<number>(1);
  const svgRef = useRef<SVGSVGElement>(null);

  // Active building & floor objects
  const currentBuilding = useMemo(
    () => buildings.find(b => b.id === activeBuildingId) || null,
    [buildings, activeBuildingId]
  );

  const currentFloor = useMemo(
    () => floors.find(f => f.id === activeFloorId) || floors[0],
    [floors, activeFloorId]
  );

  // 4 Primary academic floors for the Class Room Block
  const academicFloors = useMemo(() => {
    return floors
      .filter(f => f.buildingId === 'block_classroom')
      .sort((a, b) => a.floorNumber - b.floorNumber);
  }, [floors]);

  // Destination floor for indicator
  const destinationFloor = useMemo(() => {
    if (!selectedDestination) return null;
    return floors.find(f => f.id === selectedDestination.floorId) || null;
  }, [selectedDestination, floors]);

  // Multi-floor route legs breakdown
  const routeFloorsBreakdown = useMemo(() => {
    if (!activeRoute) return [];
    const legs: { floorId: string; floorName: string; count: number }[] = [];
    activeRoute.nodePath.forEach(n => {
      const lastLeg = legs[legs.length - 1];
      if (!lastLeg || lastLeg.floorId !== n.floorId) {
        const f = floors.find(fl => fl.id === n.floorId);
        legs.push({
          floorId: n.floorId,
          floorName: f ? f.floorName : 'Campus Grounds',
          count: 1,
        });
      } else {
        lastLeg.count += 1;
      }
    });
    return legs;
  }, [activeRoute, floors]);

  // Center on user position
  const handleCenterUser = () => {
    if (userPosition.buildingId !== 'outdoor' && userPosition.buildingId !== activeBuildingId) {
      setActiveBuildingId(userPosition.buildingId);
      setActiveFloorId(userPosition.floorId);
    } else if (userPosition.buildingId === 'outdoor' && activeBuildingId !== null) {
      setActiveBuildingId(null);
      setActiveFloorId('outdoor');
    }
    setZoom(1.1);
    setPan({ x: 0, y: 0 });
  };

  const handleZoomIn = () => setZoom(z => Math.min(2.8, z + 0.25));
  const handleZoomOut = () => setZoom(z => Math.max(0.6, z - 0.25));
  const handleResetView = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  // Auto-follow user camera centering when isFollowUser is enabled during navigation/movement
  useEffect(() => {
    if (!isFollowUser || !isNavigating || isDragging) return;
    const targetPanX = Math.round(500 - userPosition.x * zoom);
    const targetPanY = Math.round(325 - userPosition.y * zoom);

    setPan(prev => {
      const dx = targetPanX - prev.x;
      const dy = targetPanY - prev.y;
      if (Math.abs(dx) < 2 && Math.abs(dy) < 2) return prev;
      return {
        x: Math.round(prev.x + dx * 0.35),
        y: Math.round(prev.y + dy * 0.35),
      };
    });
  }, [userPosition.x, userPosition.y, isFollowUser, isNavigating, isDragging, zoom]);

  // Convert screen coordinates to SVG viewBox coordinates (1000 x 650)
  const getSvgCoordinates = (clientX: number, clientY: number) => {
    if (!svgRef.current) return { x: 500, y: 325 };
    const rect = svgRef.current.getBoundingClientRect();
    const rawX = ((clientX - rect.left) / rect.width) * 1000;
    const rawY = ((clientY - rect.top) / rect.height) * 650;
    // reverse pan & zoom
    return {
      x: (rawX - pan.x) / zoom,
      y: (rawY - pan.y) / zoom,
    };
  };

  // Pan & Drag handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if (isEditMode && editTool === 'add') return;
    setIsDragging(true);
    didDragRef.current = false;
    dragStartRef.current = { x: e.clientX - pan.x, y: e.clientY - pan.y };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    didDragRef.current = true;
    setPan({
      x: e.clientX - dragStartRef.current.x,
      y: e.clientY - dragStartRef.current.y,
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Touch & Pinch-zoom
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      touchStartDistRef.current = dist;
      touchStartZoomRef.current = zoom;
    } else if (e.touches.length === 1) {
      setIsDragging(true);
      didDragRef.current = false;
      dragStartRef.current = {
        x: e.touches[0].clientX - pan.x,
        y: e.touches[0].clientY - pan.y,
      };
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 2 && touchStartDistRef.current) {
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      const scale = dist / touchStartDistRef.current;
      setZoom(Math.min(2.8, Math.max(0.6, touchStartZoomRef.current * scale)));
    } else if (e.touches.length === 1 && isDragging) {
      didDragRef.current = true;
      setPan({
        x: e.touches[0].clientX - dragStartRef.current.x,
        y: e.touches[0].clientY - dragStartRef.current.y,
      });
    }
  };

  // Handle map click
  const handleSvgClick = (e: React.MouseEvent) => {
    if (didDragRef.current) return;
    const coords = getSvgCoordinates(e.clientX, e.clientY);

    // Dev Edit Mode: Add Node
    if (isEditMode && editTool === 'add') {
      const fId = activeFloorId || 'block_classroom_gf';
      addNodeAtCoords(coords.x, coords.y, fId, newNodeType, newNodeLabel || undefined);
      setNewNodeLabel('');
      return;
    }

    // Set user position if not in edit mode
    if (!isEditMode && !isNavigating) {
      setUserPositionManual({
        x: Math.round(coords.x),
        y: Math.round(coords.y),
        buildingId: activeBuildingId || 'outdoor',
        floorId: activeFloorId || 'outdoor',
        confirmedLocationName: `Position on ${currentFloor?.floorName || 'Ground'}`,
        method: 'manual',
      });
    }
  };

  // Visible items on current floor
  const visibleLocations = useMemo(() => {
    if (!activeFloorId || activeFloorId === 'outdoor') return [];
    return locations.filter(l => l.floorId === activeFloorId);
  }, [locations, activeFloorId]);

  const visibleNodes = useMemo(() => {
    if (!activeFloorId || activeFloorId === 'outdoor') {
      return nodes.filter(n => n.floorId === 'outdoor');
    }
    return nodes.filter(n => n.floorId === activeFloorId);
  }, [nodes, activeFloorId]);

  const visibleVerticalNodes = useMemo(() => {
    return visibleNodes.filter(n => n.nodeType === 'staircase' || n.nodeType === 'elevator');
  }, [visibleNodes]);

  // Active route polyline points on current floor
  const activeRoutePolyline = useMemo(() => {
    if (!activeRoute) return null;
    const sameFloorPoints = activeRoute.nodePath
      .filter(n => {
        if (!activeFloorId || activeFloorId === 'outdoor') {
          return n.floorId === 'outdoor';
        }
        return n.floorId === activeFloorId;
      })
      .map(n => `${n.x},${n.y}`);

    if (sameFloorPoints.length < 2) return null;
    return sameFloorPoints.join(' ');
  }, [activeRoute, activeFloorId]);

  const isUserVisibleOnMap = useMemo(() => {
    if (activeBuildingId === null || activeFloorId === 'outdoor') {
      return userPosition.floorId === 'outdoor';
    }
    return userPosition.buildingId === activeBuildingId && userPosition.floorId === activeFloorId;
  }, [userPosition, activeBuildingId, activeFloorId]);

  const isDestinationOnCurrentView = useMemo(() => {
    if (!selectedDestination) return false;
    if (activeBuildingId === null || activeFloorId === 'outdoor') {
      return selectedDestination.floorId === 'outdoor';
    }
    return (
      selectedDestination.buildingId === activeBuildingId &&
      selectedDestination.floorId === activeFloorId
    );
  }, [selectedDestination, activeBuildingId, activeFloorId]);

  return (
    <div className="relative w-full h-[470px] sm:h-[550px] lg:h-[600px] bg-[#f8fafc] rounded-2xl overflow-hidden border border-slate-300 shadow-inner select-none flex flex-col">
      {/* Top Status & Floor Legs Bar */}
      <div className="absolute top-3 left-3 z-10 flex flex-col gap-1.5 max-w-[85%] pointer-events-none">
        {/* Current Location / Floor Pill */}
        <div className="bg-white/95 backdrop-blur-xs px-3 py-1.5 rounded-lg border border-slate-300 shadow-xs flex items-center gap-2 pointer-events-auto">
          <div className="w-2 h-2 rounded-full bg-[#0f3b7a]" />
          <div className="text-xs">
            <span className="font-bold text-slate-900">
              {currentBuilding ? currentBuilding.name.split(' (')[0] : 'Canara Engineering College'}
            </span>
            {currentFloor && (
              <span className="text-slate-600 font-semibold ml-1.5">
                • {currentFloor.floorName}
              </span>
            )}
          </div>
        </div>

        {/* Multi-floor route leg switcher banner */}
        {activeRoute && routeFloorsBreakdown.length > 1 && (
          <div className="bg-[#0f3b7a] text-white px-2.5 py-1.5 rounded-lg shadow-md flex items-center gap-1.5 text-xs font-semibold overflow-x-auto no-scrollbar pointer-events-auto">
            <span className="text-amber-300 font-bold uppercase text-[10px] tracking-wider whitespace-nowrap">
              Route Legs:
            </span>
            {routeFloorsBreakdown.map((leg, idx) => {
              const isCurrentLegFloor = leg.floorId === activeFloorId;
              return (
                <button
                  key={`${leg.floorId}_${idx}`}
                  onClick={() => setActiveFloorId(leg.floorId)}
                  className={`px-2 py-0.5 rounded text-[11px] font-bold transition-colors cursor-pointer whitespace-nowrap ${
                    isCurrentLegFloor
                      ? 'bg-amber-400 text-slate-950 font-black'
                      : 'bg-white/20 hover:bg-white/30 text-white'
                  }`}
                  title={`View leg on ${leg.floorName}`}
                >
                  {idx + 1}. {leg.floorName.split(' ')[0]} ({leg.count} pts)
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Dev Edit Mode Floating Toolbar */}
      {isEditMode && (
        <div className="absolute top-14 left-3 z-20 bg-white/95 backdrop-blur-xs rounded-xl p-2.5 border-2 border-amber-500 shadow-xl flex flex-col gap-2 max-w-[340px]">
          <div className="flex items-center justify-between gap-2 border-b border-slate-200 pb-1.5">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900">
              <Pencil className="w-3.5 h-3.5 text-amber-600" />
              <span>Dev Node Editor</span>
            </div>
            <button
              onClick={() => setIsEditMode(false)}
              className="text-slate-400 hover:text-slate-700 p-1 cursor-pointer"
              title="Close Edit Mode"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Tool Selector */}
          <div className="grid grid-cols-4 gap-1 text-[11px] font-semibold">
            {(['add', 'move', 'connect', 'delete'] as const).map(tool => (
              <button
                key={tool}
                onClick={() => setEditTool(tool)}
                className={`py-1 rounded capitalize border transition-colors cursor-pointer ${
                  editTool === tool
                    ? 'bg-[#0f3b7a] text-white border-[#0f3b7a]'
                    : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                }`}
              >
                {tool}
              </button>
            ))}
          </div>

          {/* Add node config */}
          {editTool === 'add' && (
            <div className="flex flex-col gap-1.5 text-xs">
              <span className="text-[10px] text-slate-500 font-medium">Click plan to place node</span>
              <div className="flex gap-1.5">
                <select
                  value={newNodeType}
                  onChange={e => setNewNodeType(e.target.value as NodeType)}
                  className="bg-slate-50 border border-slate-300 rounded px-1.5 py-1 text-xs font-medium text-slate-800"
                >
                  <option value="junction">corridor junction</option>
                  <option value="room_door">room</option>
                  <option value="staircase">stairs</option>
                  <option value="elevator">lift</option>
                  <option value="building_entrance">entrance</option>
                </select>
                <input
                  type="text"
                  placeholder="Label (optional)"
                  value={newNodeLabel}
                  onChange={e => setNewNodeLabel(e.target.value)}
                  className="bg-slate-50 border border-slate-300 rounded px-2 py-1 text-xs flex-1 text-slate-800"
                />
              </div>
            </div>
          )}

          {/* Connect node config */}
          {editTool === 'connect' && (
            <div className="text-[11px] text-slate-600 bg-amber-50 p-1.5 rounded border border-amber-200">
              {connectFirstNodeId ? (
                <span>Click 2nd node to connect to <b>{connectFirstNodeId}</b></span>
              ) : (
                <span>Click 1st node, then click 2nd node to create edge</span>
              )}
            </div>
          )}

          {/* Export campus.json button */}
          <button
            onClick={exportCampusJsonFile}
            className="mt-1 flex items-center justify-center gap-1.5 bg-[#0f3b7a] hover:bg-[#0a2752] text-white text-xs font-bold py-1.5 px-3 rounded-lg shadow-xs transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-amber-400" />
            <span>Export campus.json</span>
          </button>
        </div>
      )}

      {/* ALWAYS-VISIBLE 4-FLOOR SWITCHER (Right side, large touch targets) */}
      <div className="absolute right-3 top-3 z-10 flex flex-col bg-white rounded-xl p-1.5 border border-slate-300 shadow-md">
        <div className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400 text-center pb-1 border-b border-slate-100 mb-1">
          Floor
        </div>
        <div className="flex flex-col gap-1">
          {academicFloors.map(f => {
            const isActive = f.id === activeFloorId;
            const isUserFloor = userPosition.floorId === f.id;
            const isDestFloor = destinationFloor?.id === f.id;
            const isPathFloor = activeRoute?.nodePath.some(n => n.floorId === f.id);

            return (
              <button
                key={f.id}
                onClick={() => {
                  setActiveBuildingId('block_classroom');
                  setActiveFloorId(f.id);
                }}
                className={`relative min-w-[44px] min-h-[44px] rounded-lg flex items-center justify-center font-bold text-xs transition-all cursor-pointer border ${
                  isActive
                    ? 'bg-[#0f3b7a] text-white border-[#0f3b7a] shadow-xs'
                    : isPathFloor
                    ? 'bg-blue-50 text-[#0f3b7a] border-blue-300'
                    : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                }`}
                title={f.floorName}
                aria-label={`Switch to ${f.floorName}`}
              >
                <span>{f.code}</span>

                {/* Status indicator badges */}
                {isUserFloor && (
                  <span
                    className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-emerald-500 rounded-full border-2 border-white ring-1 ring-emerald-600"
                    title="You are currently on this floor"
                  />
                )}
                {isDestFloor && !isUserFloor && (
                  <span
                    className="absolute -bottom-1 -right-1 w-2.5 h-2.5 bg-amber-500 rounded-full border-2 border-white ring-1 ring-amber-600"
                    title="Destination is on this floor"
                  />
                )}
              </button>
            );
          })}
        </div>

        {/* Master Campus Overview button */}
        <div className="mt-1 pt-1 border-t border-slate-100 flex flex-col gap-1">
          <button
            onClick={() => {
              setActiveBuildingId(null);
              setActiveFloorId('outdoor');
            }}
            className={`min-w-[44px] min-h-[40px] rounded-lg flex flex-col items-center justify-center text-[10px] font-bold transition-all cursor-pointer border ${
              activeBuildingId === null || activeFloorId === 'outdoor'
                ? 'bg-[#0f3b7a] text-white border-[#0f3b7a]'
                : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
            }`}
            title="Campus Grounds Overview"
          >
            <span>OUT</span>
          </button>
        </div>
      </div>

      {/* Floating Map Zoom / Center Controls */}
      <div className="absolute right-3 bottom-3 z-10 flex flex-col gap-1.5">
        <div className="bg-white rounded-xl border border-slate-300 shadow-md p-1 flex flex-col gap-1">
          <button
            onClick={handleZoomIn}
            className="w-10 h-10 rounded-lg flex items-center justify-center text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
            title="Zoom In"
            aria-label="Zoom In"
          >
            <Plus className="w-4 h-4" />
          </button>
          <div className="h-px bg-slate-200 mx-1" />
          <button
            onClick={handleZoomOut}
            className="w-10 h-10 rounded-lg flex items-center justify-center text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
            title="Zoom Out"
            aria-label="Zoom Out"
          >
            <Minus className="w-4 h-4" />
          </button>
          <div className="h-px bg-slate-200 mx-1" />
          <button
            onClick={handleResetView}
            className="w-10 h-10 rounded-lg flex items-center justify-center text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
            title="Reset View"
            aria-label="Reset View"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>

        <button
          onClick={handleCenterUser}
          className="w-10 h-10 bg-white rounded-xl border border-slate-300 shadow-md flex items-center justify-center text-[#0f3b7a] hover:bg-blue-50 transition-colors cursor-pointer"
          title="Center on My Location"
          aria-label="Center on My Location"
        >
          <Locate className="w-5 h-5" />
        </button>
      </div>

      {/* SVG Map Surface */}
      <svg
        ref={svgRef}
        viewBox="0 0 1000 650"
        className="w-full h-full cursor-grab active:cursor-grabbing flex-1"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleMouseUp}
        onClick={handleSvgClick}
      >
        <defs>
          <pattern id="cecGrid" width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#e2e8f0" strokeWidth="0.8" opacity="0.6" />
          </pattern>
        </defs>

        <g transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`}>
          {/* 1. OUTDOOR CAMPUS MASTER PLAN */}
          {activeBuildingId === null || activeFloorId === 'outdoor' ? (
            <g id="outdoorView">
              <rect x="0" y="0" width="1000" height="650" fill="#f8fafc" />
              <rect x="0" y="0" width="1000" height="650" fill="url(#cecGrid)" />

              <text x="500" y="60" textAnchor="middle" fill="#0f3b7a" fontSize="18" fontWeight="800" letterSpacing="1">
                CANARA ENGINEERING COLLEGE
              </text>
              <text x="500" y="82" textAnchor="middle" fill="#475569" fontSize="11" fontWeight="600">
                Sudhindra Nagar, Benjanapadavu • Campus Master Layout
              </text>

              {/* Campus Roads & Walkways */}
              <path d="M 500 560 L 500 310" stroke="#cbd5e1" strokeWidth="24" strokeLinecap="round" />
              <path d="M 210 420 L 795 420" stroke="#cbd5e1" strokeWidth="20" strokeLinecap="round" />
              <path d="M 210 420 L 210 310" stroke="#cbd5e1" strokeWidth="18" strokeLinecap="round" />
              <path d="M 795 420 L 795 310" stroke="#cbd5e1" strokeWidth="18" strokeLinecap="round" />
              <path d="M 500 560 L 500 420" stroke="#ffffff" strokeWidth="2" strokeDasharray="8 6" />

              {/* Central Courtyard Quad */}
              <rect x="330" y="345" width="340" height="55" rx="12" fill="#e2e8f0" stroke="#94a3b8" strokeWidth="1.5" />
              <text x="500" y="378" textAnchor="middle" fill="#334155" fontSize="11" fontWeight="700">
                CAMPUS COURTYARD
              </text>

              {/* Entrance Gate */}
              <circle cx="500" cy="560" r="28" fill="#e2e8f0" stroke="#475569" strokeWidth="2.5" />
              <text x="500" y="606" textAnchor="middle" fill="#1e293b" fontSize="11" fontWeight="700">
                MAIN ENTRANCE GATE
              </text>

              {/* Buildings */}
              {buildings.map(b => {
                const isSelected = selectedDestination?.buildingId === b.id;
                const bFloors = floors.filter(f => f.buildingId === b.id);
                const floorCodes = bFloors.map(f => f.code).join(' • ');

                return (
                  <g
                    key={b.id}
                    className="cursor-pointer group"
                    onClick={e => {
                      e.stopPropagation();
                      setActiveBuildingId(b.id);
                    }}
                  >
                    <rect
                      x={b.canvasBounds.x}
                      y={b.canvasBounds.y}
                      width={b.canvasBounds.width}
                      height={b.canvasBounds.height}
                      rx="12"
                      fill="#ffffff"
                      stroke={isSelected ? '#0f3b7a' : '#94a3b8'}
                      strokeWidth={isSelected ? 3.5 : 2}
                      className="transition-colors group-hover:brightness-95"
                    />

                    {/* Header bar */}
                    <rect
                      x={b.canvasBounds.x}
                      y={b.canvasBounds.y}
                      width={b.canvasBounds.width}
                      height="28"
                      rx="10"
                      fill="#0f3b7a"
                    />
                    <text
                      x={b.canvasBounds.x + b.canvasBounds.width / 2}
                      y={b.canvasBounds.y + 19}
                      textAnchor="middle"
                      fill="#ffffff"
                      fontSize="11"
                      fontWeight="800"
                    >
                      {b.code}
                    </text>

                    <text
                      x={b.canvasBounds.x + b.canvasBounds.width / 2}
                      y={b.canvasBounds.y + 60}
                      textAnchor="middle"
                      fill="#0f172a"
                      fontSize="13"
                      fontWeight="800"
                    >
                      {b.name.split(' (')[0]}
                    </text>
                    <text
                      x={b.canvasBounds.x + b.canvasBounds.width / 2}
                      y={b.canvasBounds.y + 80}
                      textAnchor="middle"
                      fill="#64748b"
                      fontSize="10"
                      fontWeight="600"
                    >
                      Floors: {floorCodes}
                    </text>

                    <rect
                      x={b.canvasBounds.x + b.canvasBounds.width / 2 - 60}
                      y={b.canvasBounds.y + 115}
                      width="120"
                      height="24"
                      rx="6"
                      fill="#f1f5f9"
                      stroke="#cbd5e1"
                      strokeWidth="1"
                    />
                    <text
                      x={b.canvasBounds.x + b.canvasBounds.width / 2}
                      y={b.canvasBounds.y + 131}
                      textAnchor="middle"
                      fill="#0f3b7a"
                      fontSize="10"
                      fontWeight="700"
                    >
                      View Floor Plans →
                    </text>
                  </g>
                );
              })}
            </g>
          ) : (
            /* 2. INDOOR FLOOR PLAN VIEW */
            <g id="indoorFloorPlan">
              <rect x="0" y="0" width="1000" height="650" fill="#f8fafc" />

              {currentFloor?.floorMapImage && (
                <g id="blueprintLayer">
                  <rect
                    x="10"
                    y="10"
                    width="980"
                    height="630"
                    rx="12"
                    fill="#ffffff"
                    stroke="#cbd5e1"
                    strokeWidth="1.5"
                  />
                  <image
                    href={currentFloor.floorMapImage}
                    x="10"
                    y="10"
                    width="980"
                    height="630"
                    preserveAspectRatio="xMidYMid meet"
                  />
                </g>
              )}

              {/* Corridor Connections overlay in navigation or edit mode */}
              {(isNavigating || isEditMode) &&
                connections
                  .filter(c => {
                    const s = nodes.find(n => n.id === c.startNodeId);
                    const e = nodes.find(n => n.id === c.endNodeId);
                    return s && e && s.floorId === activeFloorId && e.floorId === activeFloorId;
                  })
                  .map(c => {
                    const s = nodes.find(n => n.id === c.startNodeId)!;
                    const e = nodes.find(n => n.id === c.endNodeId)!;
                    return (
                      <line
                        key={c.id}
                        x1={s.x}
                        y1={s.y}
                        x2={e.x}
                        y2={e.y}
                        stroke="#94a3b8"
                        strokeWidth="1.5"
                        strokeDasharray="3 3"
                        opacity="0.5"
                      />
                    );
                  })}

              {/* Vertical Transition Badges (Stairs & Lift) */}
              {visibleVerticalNodes.map(vn => {
                const isLift = vn.nodeType === 'elevator';
                return (
                  <g
                    key={vn.id}
                    transform={`translate(${vn.x}, ${vn.y})`}
                    className="pointer-events-none"
                  >
                    <rect
                      x="-26"
                      y="-11"
                      width="52"
                      height="22"
                      rx="6"
                      fill={isLift ? '#0f3b7a' : '#d97706'}
                      stroke="#ffffff"
                      strokeWidth="1.5"
                    />
                    <text
                      x="0"
                      y="3.5"
                      textAnchor="middle"
                      fill="#ffffff"
                      fontSize="9"
                      fontWeight="800"
                    >
                      {isLift ? 'LIFT' : 'STAIRS'}
                    </text>
                  </g>
                );
              })}

              {/* Clickable Room Pins */}
              {showFloorMarkers &&
                visibleLocations.map(loc => {
                  const isSelected = selectedDestination?.id === loc.id;
                  const shortName =
                    loc.name.length > 18 ? `${loc.name.slice(0, 17)}…` : loc.name;

                  return (
                    <g
                      key={loc.id}
                      transform={`translate(${loc.coordinates.x}, ${loc.coordinates.y})`}
                      className="cursor-pointer group"
                      onClick={e => {
                        e.stopPropagation();
                        setSelectedDestination(loc);
                      }}
                    >
                      <circle
                        cx="0"
                        cy="0"
                        r={isSelected ? 9 : 6}
                        fill={isSelected ? '#d97706' : '#0f3b7a'}
                        stroke="#ffffff"
                        strokeWidth="2"
                      />
                      <g transform="translate(0, -14)">
                        <rect
                          x="-50"
                          y="-10"
                          width="100"
                          height="18"
                          rx="4"
                          fill={isSelected ? '#d97706' : '#0f172a'}
                          opacity="0.9"
                          className="group-hover:opacity-100 transition-opacity"
                        />
                        <text
                          x="0"
                          y="2"
                          textAnchor="middle"
                          fill="#ffffff"
                          fontSize="8"
                          fontWeight="700"
                        >
                          {shortName}
                        </text>
                      </g>
                    </g>
                  );
                })}

              {/* Dev Edit Mode Node Markers */}
              {isEditMode &&
                visibleNodes.map(n => {
                  const isSelected = selectedEditNodeId === n.id;
                  return (
                    <g
                      key={n.id}
                      transform={`translate(${n.x}, ${n.y})`}
                      className="cursor-pointer"
                      onClick={e => {
                        e.stopPropagation();
                        if (editTool === 'connect') {
                          if (!connectFirstNodeId) {
                            setConnectFirstNodeId(n.id);
                          } else {
                            connectNodesDev(connectFirstNodeId, n.id);
                            setConnectFirstNodeId(null);
                          }
                        } else if (editTool === 'delete') {
                          deleteNode(n.id);
                        } else {
                          setSelectedEditNodeId(n.id);
                        }
                      }}
                    >
                      <circle
                        cx="0"
                        cy="0"
                        r={isSelected ? 8 : 5}
                        fill={isSelected ? '#f59e0b' : '#3b82f6'}
                        stroke="#ffffff"
                        strokeWidth="2"
                      />
                      <text x="0" y="14" textAnchor="middle" fill="#0f172a" fontSize="7" fontWeight="bold">
                        {n.label || n.id}
                      </text>
                    </g>
                  );
                })}
            </g>
          )}

          {/* 3. ACTIVE ROUTE LINE & ANIMATION */}
          {activeRoutePolyline && (
            <g id="activeRouteOverlay">
              {/* Core Route Line */}
              <polyline
                points={activeRoutePolyline}
                fill="none"
                stroke="#0f3b7a"
                strokeWidth="5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              {/* Walking dashes animation */}
              <polyline
                points={activeRoutePolyline}
                fill="none"
                stroke="#d97706"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeDasharray="5 10"
                className="animate-route-flow"
              />
            </g>
          )}

          {/* 4. DESTINATION PIN */}
          {selectedDestination && isDestinationOnCurrentView && (
            <g
              transform={`translate(${selectedDestination.coordinates.x}, ${selectedDestination.coordinates.y})`}
              className="pointer-events-none"
            >
              <circle cx="0" cy="0" r="16" fill="#d97706" opacity="0.3" className="animate-ping" />
              <circle cx="0" cy="0" r="8" fill="#d97706" stroke="#ffffff" strokeWidth="2" />
              <g transform="translate(-10, -28)">
                <path
                  d="M 10 0 C 4.5 0 0 4.5 0 10 C 0 17.5 10 26 10 26 C 10 26 20 17.5 20 10 C 20 4.5 15.5 0 10 0 Z"
                  fill="#d97706"
                  stroke="#ffffff"
                  strokeWidth="1.5"
                />
                <circle cx="10" cy="9" r="3.5" fill="#ffffff" />
              </g>
              <rect x="-50" y="10" width="100" height="18" rx="4" fill="#0f172a" opacity="0.9" />
              <text x="0" y="22" textAnchor="middle" fill="#ffffff" fontSize="9" fontWeight="700">
                {selectedDestination.name.substring(0, 16)}
              </text>
            </g>
          )}

          {/* 5. USER LIVE LOCATION DOT WITH RADAR CONE & DIRECTION POINTER */}
          {isUserVisibleOnMap && (
            <g
              transform={`translate(${userPosition.x}, ${userPosition.y})`}
              className="cursor-pointer"
              style={{ transition: 'transform 0.15s ease-out' }}
            >
              {/* Dynamic GPS accuracy ring */}
              <circle
                cx="0"
                cy="0"
                r={Math.max(16, userPosition.accuracyMeters * 2)}
                fill="#0f3b7a"
                opacity="0.08"
                stroke="#0f3b7a"
                strokeWidth="1"
              />

              {/* Pulsing radar wave when active */}
              <circle cx="0" cy="0" r="14" fill="#0f3b7a" opacity="0.25" className="animate-ping" />

              {/* Directional Vision / Heading Radar Cone */}
              <g
                transform={`rotate(${userPosition.heading})`}
                style={{ transition: 'transform 0.18s ease-out' }}
              >
                {/* 45-degree field-of-view beam */}
                <path
                  d="M 0 0 L -16 -36 A 40 40 0 0 1 16 -36 Z"
                  fill="#0f3b7a"
                  opacity="0.18"
                />
                {/* Sharp navigation pointer triangle */}
                <polygon points="0,-18 -6,-4 6,-4" fill="#0f3b7a" opacity="0.95" />
              </g>

              {/* Core live blue dot */}
              <circle cx="0" cy="0" r="8" fill="#0f3b7a" stroke="#ffffff" strokeWidth="2.5" />
              <circle cx="0" cy="0" r="2.8" fill="#ffffff" />
            </g>
          )}
        </g>
      </svg>
    </div>
  );
};
