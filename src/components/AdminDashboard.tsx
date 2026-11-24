import React, { useState } from 'react';
import {
  Building2,
  Layers,
  MapPin,
  GitBranch,
  QrCode,
  Radio,
  Plus,
  Trash2,
  Edit2,
  Save,
  RotateCcw,
  Download,
  Upload,
  X,
  CheckCircle2,
  ChevronsUpDown,
  DoorOpen,
  Users,
  Image as ImageIcon,
} from 'lucide-react';
import { StairsIcon } from './icons/StairsIcon';
import { useCampus } from '../context/CampusContext';
import {
  Building,
  Floor,
  CampusLocation,
  NavigationNode,
  NavigationConnection,
  QRCheckpoint,
  LocationCategory,
} from '../types/campus';

interface AdminDashboardProps {
  onClose: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ onClose }) => {
  const {
    buildings,
    floors,
    locations,
    nodes,
    connections,
    qrCheckpoints,
    addBuilding,
    deleteBuilding,
    addFloor,
    updateFloor,
    deleteFloor,
    addLocation,
    deleteLocation,
    addNode,
    deleteNode,
    addConnection,
    deleteConnection,
    addQRCheckpoint,
    deleteQRCheckpoint,
    resetToDefaultData,
    exportDatabaseJson,
    importDatabaseJson,
  } = useCampus();

  const [activeTab, setActiveTab] = useState<'buildings' | 'rooms' | 'nodes' | 'qr' | 'settings'>('buildings');
  const [saveToast, setSaveToast] = useState<string | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);

  const handleFloorImageUpload = (floor: Floor, file?: File) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        updateFloor({ ...floor, floorMapImage: reader.result });
        showToast(`Uploaded floor plan for ${floor.floorName}`);
      }
    };
    reader.readAsDataURL(file);
  };

  const showToast = (msg: string) => {
    setSaveToast(msg);
    setTimeout(() => setSaveToast(null), 2000);
  };

  // Form states
  // 1. Add Building
  const [newBName, setNewBName] = useState('');
  const [newBCode, setNewBCode] = useState('');
  const [newBDesc, setNewBDesc] = useState('');
  const [newBColor, setNewBColor] = useState('#2563eb');

  const handleAddBuilding = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBName || !newBCode) return;
    const bId = `building_${Date.now()}`;
    const fId = `${bId}_f0`;

    const newB: Building = {
      id: bId,
      name: newBName,
      code: newBCode.toUpperCase(),
      description: newBDesc,
      color: newBColor,
      canvasBounds: { x: 400, y: 400, width: 200, height: 140 },
      floorIds: [fId],
      entranceNodeId: `node_${bId}_ent`,
    };

    const groundFloor: Floor = {
      id: fId,
      buildingId: bId,
      floorNumber: 0,
      floorName: 'Ground Floor',
      code: 'G',
    };

    addBuilding(newB);
    addFloor(groundFloor);
    setNewBName('');
    setNewBCode('');
    setNewBDesc('');
    showToast(`Added ${newB.name}`);
  };

  // 2. Add Room
  const [newRoomName, setNewRoomName] = useState('');
  const [newRoomNumber, setNewRoomNumber] = useState('');
  const [newRoomCategory, setNewRoomCategory] = useState<LocationCategory>('classroom');
  const [newRoomBuildingId, setNewRoomBuildingId] = useState(buildings[0]?.id || '');
  const [newRoomFloorId, setNewRoomFloorId] = useState(floors[0]?.id || '');
  const [newRoomStaffName, setNewRoomStaffName] = useState('');
  const [newRoomStaffDept, setNewRoomStaffDept] = useState('');

  const handleAddRoom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRoomName || !newRoomNumber) return;

    const locId = `loc_${Date.now()}`;
    const nodeId = `node_${locId}`;

    const newLoc: CampusLocation = {
      id: locId,
      buildingId: newRoomBuildingId,
      floorId: newRoomFloorId,
      name: newRoomName,
      roomNumber: newRoomNumber,
      category: newRoomCategory,
      description: `Room ${newRoomNumber} in ${buildings.find(b => b.id === newRoomBuildingId)?.name || 'Campus'}`,
      coordinates: { x: 100, y: 80 },
      associatedNodeId: nodeId,
      facultyInfo: newRoomStaffName
        ? {
            name: newRoomStaffName,
            designation: 'Faculty / Staff',
            department: newRoomStaffDept || 'Academic Dept',
            email: `${newRoomStaffName.toLowerCase().replace(/[^a-z]/g, '')}@campus.edu`,
            officeHours: 'Mon-Fri 10:00 AM - 04:00 PM',
          }
        : undefined,
    };

    const roomNode: NavigationNode = {
      id: nodeId,
      buildingId: newRoomBuildingId,
      floorId: newRoomFloorId,
      x: 100,
      y: 80,
      nodeType: 'room_door',
      label: `${newRoomName} Door`,
    };

    addNode(roomNode);
    addLocation(newLoc);
    setNewRoomName('');
    setNewRoomNumber('');
    setNewRoomStaffName('');
    setNewRoomStaffDept('');
    showToast(`Created ${newLoc.name} (${newLoc.roomNumber})`);
  };

  // 3. Add Node & Corridor
  const [newNodeType, setNewNodeType] = useState<NavigationNode['nodeType']>('junction');
  const [newNodeLabel, setNewNodeLabel] = useState('');
  const [newNodeBuildingId, setNewNodeBuildingId] = useState(buildings[0]?.id || 'outdoor');
  const [newNodeFloorId, setNewNodeFloorId] = useState(floors[0]?.id || 'outdoor');
  const [newNodeX, setNewNodeX] = useState(120);
  const [newNodeY, setNewNodeY] = useState(120);

  const handleAddNode = (e: React.FormEvent) => {
    e.preventDefault();
    const nodeId = `node_${Date.now()}`;
    const node: NavigationNode = {
      id: nodeId,
      buildingId: newNodeBuildingId,
      floorId: newNodeFloorId,
      x: Number(newNodeX),
      y: Number(newNodeY),
      nodeType: newNodeType,
      label: newNodeLabel || `${newNodeType} ${nodeId.slice(-4)}`,
    };
    addNode(node);
    setNewNodeLabel('');
    showToast(`Added ${node.label}`);
  };

  // 4. Add Connection
  const [startNodeSelect, setStartNodeSelect] = useState(nodes[0]?.id || '');
  const [endNodeSelect, setEndNodeSelect] = useState(nodes[1]?.id || '');
  const [connType, setConnType] = useState<NavigationConnection['connectionType']>('corridor');
  const [connDist, setConnDist] = useState(10);
  const [connAccessible, setConnAccessible] = useState(true);

  const handleAddConnection = (e: React.FormEvent) => {
    e.preventDefault();
    if (!startNodeSelect || !endNodeSelect || startNodeSelect === endNodeSelect) return;
    const conn: NavigationConnection = {
      id: `conn_${Date.now()}`,
      startNodeId: startNodeSelect,
      endNodeId: endNodeSelect,
      distanceMeters: Number(connDist),
      connectionType: connType,
      accessible: connType === 'staircase' ? false : connAccessible,
    };
    addConnection(conn);
    showToast('Corridor / path connection created');
  };

  // 5. Add QR Checkpoint
  const [newQrCode, setNewQrCode] = useState('');
  const [newQrLabel, setNewQrLabel] = useState('');
  const [newQrBuilding, setNewQrBuilding] = useState(buildings[0]?.id || 'block_a');
  const [newQrFloor, setNewQrFloor] = useState(floors[0]?.id || 'block_a_f0');

  const handleAddQR = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newQrCode || !newQrLabel) return;
    const qr: QRCheckpoint = {
      id: `qr_${Date.now()}`,
      code: newQrCode.toUpperCase(),
      label: newQrLabel,
      buildingId: newQrBuilding,
      floorId: newQrFloor,
      nodeId: nodes[0]?.id || 'node_out_gate',
      description: `Official campus checkpoint for ${newQrLabel}`,
      coordinates: { x: 100, y: 100 },
    };
    addQRCheckpoint(qr);
    setNewQrCode('');
    setNewQrLabel('');
    showToast(`QR Checkpoint ${qr.code} created`);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-4xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-xs">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-bold text-slate-900">
                  Campus Navigation Admin Panel
                </h3>
                <span className="text-[10px] font-bold bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full">
                  Live Sync
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Manage buildings, floors, rooms, corridors, staircases, and QR checkpoints
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white hover:bg-slate-200 text-slate-500 flex items-center justify-center cursor-pointer transition-colors border border-slate-200 shadow-2xs"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Save Toast */}
        {saveToast && (
          <div className="bg-emerald-600 text-white px-4 py-2 text-xs font-bold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" />
            <span>{saveToast} — Immediately reflected in student app!</span>
          </div>
        )}

        {/* Tab navigation bar */}
        <div className="px-5 pt-3 flex items-center gap-3 border-b border-slate-200 overflow-x-auto text-xs font-bold text-slate-600">
          <button
            onClick={() => setActiveTab('buildings')}
            className={`pb-3 border-b-2 flex items-center gap-1.5 transition-colors cursor-pointer ${
              activeTab === 'buildings' ? 'border-blue-600 text-blue-600' : 'border-transparent hover:text-slate-900'
            }`}
          >
            <Building2 className="w-4 h-4" />
            <span>Buildings & Floors ({buildings.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('rooms')}
            className={`pb-3 border-b-2 flex items-center gap-1.5 transition-colors cursor-pointer ${
              activeTab === 'rooms' ? 'border-blue-600 text-blue-600' : 'border-transparent hover:text-slate-900'
            }`}
          >
            <MapPin className="w-4 h-4" />
            <span>Rooms & Faculty ({locations.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('nodes')}
            className={`pb-3 border-b-2 flex items-center gap-1.5 transition-colors cursor-pointer ${
              activeTab === 'nodes' ? 'border-blue-600 text-blue-600' : 'border-transparent hover:text-slate-900'
            }`}
          >
            <GitBranch className="w-4 h-4" />
            <span>Corridors & Graph ({nodes.length} nodes)</span>
          </button>
          <button
            onClick={() => setActiveTab('qr')}
            className={`pb-3 border-b-2 flex items-center gap-1.5 transition-colors cursor-pointer ${
              activeTab === 'qr' ? 'border-blue-600 text-blue-600' : 'border-transparent hover:text-slate-900'
            }`}
          >
            <QrCode className="w-4 h-4" />
            <span>QR Checkpoints ({qrCheckpoints.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            className={`pb-3 border-b-2 flex items-center gap-1.5 transition-colors cursor-pointer ${
              activeTab === 'settings' ? 'border-blue-600 text-blue-600' : 'border-transparent hover:text-slate-900'
            }`}
          >
            <Save className="w-4 h-4" />
            <span>Backup & Reset</span>
          </button>
        </div>

        {/* Tab Content */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-6">
          {/* TAB 1: BUILDINGS & FLOORS */}
          {activeTab === 'buildings' && (
            <div className="space-y-6">
              {/* Add Building Form */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3 flex items-center gap-1.5">
                  <Plus className="w-4 h-4 text-blue-600" />
                  <span>Add New Campus Building / Block</span>
                </h4>
                <form onSubmit={handleAddBuilding} className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
                  <div>
                    <label className="block text-slate-600 font-semibold mb-1">Building Name</label>
                    <input
                      type="text"
                      placeholder="e.g. Research Complex"
                      value={newBName}
                      onChange={e => setNewBName(e.target.value)}
                      className="w-full p-2 rounded-lg border border-slate-300 bg-white"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-slate-600 font-semibold mb-1">Building Code</label>
                    <input
                      type="text"
                      placeholder="e.g. BLK-R"
                      value={newBCode}
                      onChange={e => setNewBCode(e.target.value)}
                      className="w-full p-2 rounded-lg border border-slate-300 bg-white"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-slate-600 font-semibold mb-1">Description</label>
                    <input
                      type="text"
                      placeholder="e.g. Nanotech & Biotech Labs"
                      value={newBDesc}
                      onChange={e => setNewBDesc(e.target.value)}
                      className="w-full p-2 rounded-lg border border-slate-300 bg-white"
                    />
                  </div>
                  <div className="flex items-end">
                    <button
                      type="submit"
                      className="w-full py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold cursor-pointer transition-colors shadow-2xs"
                    >
                      Create Building
                    </button>
                  </div>
                </form>
              </div>

              {/* Current Buildings List */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Current Campus Buildings ({buildings.length})
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {buildings.map(b => {
                    const bFloors = floors.filter(f => f.buildingId === b.id);
                    return (
                      <div key={b.id} className="p-3.5 rounded-2xl bg-white border border-slate-200 shadow-2xs flex flex-col justify-between">
                        <div>
                          <div className="flex items-center justify-between">
                            <span className="font-extrabold text-sm text-slate-900">{b.name}</span>
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold text-white" style={{ backgroundColor: b.color }}>
                              {b.code}
                            </span>
                          </div>
                          <p className="text-xs text-slate-500 mt-1">{b.description}</p>
                          <div className="mt-2.5 space-y-1.5">
                            {bFloors.map(f => (
                              <div
                                key={f.id}
                                className="flex items-center justify-between gap-2 p-1.5 rounded-lg bg-slate-50 border border-slate-200/80"
                              >
                                <div className="flex items-center gap-2 min-w-0">
                                  {f.floorMapImage ? (
                                    <img
                                      src={f.floorMapImage}
                                      alt={f.floorName}
                                      className="w-8 h-6 rounded object-cover border border-slate-200 shrink-0"
                                    />
                                  ) : (
                                    <div className="w-8 h-6 rounded bg-slate-200 text-slate-500 flex items-center justify-center shrink-0">
                                      <ImageIcon className="w-3.5 h-3.5" />
                                    </div>
                                  )}
                                  <div className="min-w-0">
                                    <span className="text-[11px] font-bold text-slate-700 block truncate">
                                      {f.floorName} ({f.code})
                                    </span>
                                    <span className="text-[10px] text-slate-500">
                                      {f.floorMapImage ? 'Blueprint attached' : 'Schematic fallback'}
                                    </span>
                                  </div>
                                </div>

                                <div className="flex items-center gap-1 shrink-0">
                                  <label className="px-2 py-1 rounded bg-white hover:bg-blue-50 text-blue-700 border border-slate-200 text-[10px] font-bold cursor-pointer flex items-center gap-1">
                                    <Upload className="w-3 h-3" />
                                    <span>{f.floorMapImage ? 'Replace' : 'Upload Map'}</span>
                                    <input
                                      type="file"
                                      accept="image/*"
                                      className="hidden"
                                      onChange={e => handleFloorImageUpload(f, e.target.files?.[0])}
                                    />
                                  </label>
                                  {f.floorMapImage && (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        updateFloor({ ...f, floorMapImage: undefined });
                                        showToast(`Removed floor plan from ${f.floorName}`);
                                      }}
                                      className="p-1 text-slate-400 hover:text-rose-600 cursor-pointer"
                                      title="Remove floor map image"
                                    >
                                      <X className="w-3 h-3" />
                                    </button>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>

                        <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-end gap-2">
                          <button
                            onClick={() => {
                              const newFNum = bFloors.length;
                              const newF: Floor = {
                                id: `${b.id}_f${newFNum}`,
                                buildingId: b.id,
                                floorNumber: newFNum,
                                floorName: `Floor ${newFNum}`,
                                code: `${newFNum}`,
                              };
                              addFloor(newF);
                              showToast(`Added Floor ${newFNum} to ${b.name}`);
                            }}
                            className="text-[11px] font-bold text-blue-600 hover:text-blue-800 cursor-pointer"
                          >
                            + Add Floor
                          </button>
                          <button
                            onClick={() => {
                              if (confirm(`Delete ${b.name} and all its floors?`)) {
                                deleteBuilding(b.id);
                                showToast(`Deleted ${b.name}`);
                              }
                            }}
                            className="p-1 text-slate-400 hover:text-rose-600 cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: ROOMS & FACILITIES */}
          {activeTab === 'rooms' && (
            <div className="space-y-6">
              {/* Add Room Form */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3 flex items-center gap-1.5">
                  <Plus className="w-4 h-4 text-blue-600" />
                  <span>Add Room, Staff Room or Facility</span>
                </h4>
                <form onSubmit={handleAddRoom} className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <div>
                    <label className="block text-slate-600 font-semibold mb-1">Room / Facility Name</label>
                    <input
                      type="text"
                      placeholder="e.g. AI Research Center"
                      value={newRoomName}
                      onChange={e => setNewRoomName(e.target.value)}
                      className="w-full p-2 rounded-lg border border-slate-300 bg-white"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-slate-600 font-semibold mb-1">Room Number</label>
                    <input
                      type="text"
                      placeholder="e.g. B-205"
                      value={newRoomNumber}
                      onChange={e => setNewRoomNumber(e.target.value)}
                      className="w-full p-2 rounded-lg border border-slate-300 bg-white"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-slate-600 font-semibold mb-1">Category</label>
                    <select
                      value={newRoomCategory}
                      onChange={e => setNewRoomCategory(e.target.value as LocationCategory)}
                      className="w-full p-2 rounded-lg border border-slate-300 bg-white"
                    >
                      <option value="classroom">Classroom</option>
                      <option value="staff_room">Staff Room</option>
                      <option value="lab">Laboratory</option>
                      <option value="department">Department</option>
                      <option value="office">Administrative Office</option>
                      <option value="library">Library</option>
                      <option value="canteen">Canteen</option>
                      <option value="restroom">Restroom</option>
                      <option value="auditorium">Auditorium</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-slate-600 font-semibold mb-1">Building</label>
                    <select
                      value={newRoomBuildingId}
                      onChange={e => setNewRoomBuildingId(e.target.value)}
                      className="w-full p-2 rounded-lg border border-slate-300 bg-white"
                    >
                      {buildings.map(b => (
                        <option key={b.id} value={b.id}>{b.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-slate-600 font-semibold mb-1">Floor</label>
                    <select
                      value={newRoomFloorId}
                      onChange={e => setNewRoomFloorId(e.target.value)}
                      className="w-full p-2 rounded-lg border border-slate-300 bg-white"
                    >
                      {floors.filter(f => f.buildingId === newRoomBuildingId).map(f => (
                        <option key={f.id} value={f.id}>{f.floorName} ({f.code})</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-slate-600 font-semibold mb-1">Faculty / In-Charge Name (Optional)</label>
                    <input
                      type="text"
                      placeholder="e.g. Dr. Ada Lovelace"
                      value={newRoomStaffName}
                      onChange={e => setNewRoomStaffName(e.target.value)}
                      className="w-full p-2 rounded-lg border border-slate-300 bg-white"
                    />
                  </div>
                  <div className="sm:col-span-3 flex justify-end">
                    <button
                      type="submit"
                      className="px-6 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold cursor-pointer transition-colors shadow-2xs"
                    >
                      Add Room to Map
                    </button>
                  </div>
                </form>
              </div>

              {/* Rooms Table */}
              <div className="border border-slate-200 rounded-2xl overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                    <tr>
                      <th className="p-3">Room</th>
                      <th className="p-3">Building & Floor</th>
                      <th className="p-3">Category</th>
                      <th className="p-3">Faculty / In-Charge</th>
                      <th className="p-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {locations.map(loc => {
                      const b = buildings.find(item => item.id === loc.buildingId);
                      const f = floors.find(item => item.id === loc.floorId);
                      return (
                        <tr key={loc.id} className="hover:bg-slate-50/80">
                          <td className="p-3 font-semibold text-slate-900">
                            {loc.name}{' '}
                            <span className="font-mono text-[10px] text-slate-500 bg-slate-100 px-1 py-0.5 rounded">
                              {loc.roomNumber}
                            </span>
                          </td>
                          <td className="p-3 text-slate-600">{b?.name || 'Campus'} • {f?.floorName || 'Ground'}</td>
                          <td className="p-3">
                            <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 text-[10px] font-bold">
                              {loc.category}
                            </span>
                          </td>
                          <td className="p-3 text-slate-600">{loc.facultyInfo?.name || '—'}</td>
                          <td className="p-3 text-right">
                            <button
                              onClick={() => {
                                deleteLocation(loc.id);
                                showToast(`Deleted ${loc.name}`);
                              }}
                              className="text-slate-400 hover:text-rose-600 cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5 ml-auto" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 3: NODES & GRAPH */}
          {activeTab === 'nodes' && (
            <div className="space-y-6">
              {/* Add Corridor Form */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3 flex items-center gap-1.5">
                  <Plus className="w-4 h-4 text-blue-600" />
                  <span>Connect Two Navigation Nodes (Corridor / Stairs / Elevator)</span>
                </h4>
                <form onSubmit={handleAddConnection} className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
                  <div>
                    <label className="block text-slate-600 font-semibold mb-1">Start Node</label>
                    <select
                      value={startNodeSelect}
                      onChange={e => setStartNodeSelect(e.target.value)}
                      className="w-full p-2 rounded-lg border border-slate-300 bg-white"
                    >
                      {nodes.map(n => (
                        <option key={n.id} value={n.id}>{n.label || n.id} ({n.nodeType})</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-slate-600 font-semibold mb-1">End Node</label>
                    <select
                      value={endNodeSelect}
                      onChange={e => setEndNodeSelect(e.target.value)}
                      className="w-full p-2 rounded-lg border border-slate-300 bg-white"
                    >
                      {nodes.map(n => (
                        <option key={n.id} value={n.id}>{n.label || n.id} ({n.nodeType})</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-slate-600 font-semibold mb-1">Connection Type</label>
                    <select
                      value={connType}
                      onChange={e => setConnType(e.target.value as NavigationConnection['connectionType'])}
                      className="w-full p-2 rounded-lg border border-slate-300 bg-white"
                    >
                      <option value="corridor">Corridor / Hallway</option>
                      <option value="staircase">Staircase (Not Wheelchair Accessible)</option>
                      <option value="elevator">Elevator (Wheelchair Accessible)</option>
                      <option value="outdoor_path">Outdoor Walkway</option>
                      <option value="ramp">Accessible Ramp</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-slate-600 font-semibold mb-1">Distance (Meters)</label>
                    <input
                      type="number"
                      value={connDist}
                      onChange={e => setConnDist(Number(e.target.value))}
                      className="w-full p-2 rounded-lg border border-slate-300 bg-white"
                      min={1}
                    />
                  </div>
                  <div className="sm:col-span-4 flex items-center justify-between">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={connAccessible}
                        onChange={e => setConnAccessible(e.target.checked)}
                        disabled={connType === 'staircase'}
                        className="rounded"
                      />
                      <span className="font-semibold text-slate-700">Wheelchair Accessible</span>
                    </label>

                    <button
                      type="submit"
                      className="px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold cursor-pointer transition-colors shadow-2xs"
                    >
                      Link Corridor
                    </button>
                  </div>
                </form>
              </div>

              {/* Connections List */}
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Active Graph Connections ({connections.length})
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                {connections.map(c => {
                  const s = nodes.find(n => n.id === c.startNodeId);
                  const e = nodes.find(n => n.id === c.endNodeId);
                  return (
                    <div key={c.id} className="p-2.5 rounded-xl bg-white border border-slate-200 flex items-center justify-between shadow-2xs">
                      <div>
                        <span className="font-semibold text-slate-800">{s?.label || c.startNodeId}</span>
                        <span className="text-slate-400 mx-1">↔</span>
                        <span className="font-semibold text-slate-800">{e?.label || c.endNodeId}</span>
                        <div className="text-[10px] text-slate-500 mt-0.5">
                          {c.distanceMeters}m • {c.connectionType} {c.accessible ? '• ♿ Accessible' : '• 🪜 Stairs'}
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          deleteConnection(c.id);
                          showToast('Connection removed');
                        }}
                        className="text-slate-400 hover:text-rose-600 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 4: QR CHECKPOINTS */}
          {activeTab === 'qr' && (
            <div className="space-y-6">
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3 flex items-center gap-1.5">
                  <Plus className="w-4 h-4 text-blue-600" />
                  <span>Register Campus QR Checkpoint</span>
                </h4>
                <form onSubmit={handleAddQR} className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <div>
                    <label className="block text-slate-600 font-semibold mb-1">Checkpoint Label</label>
                    <input
                      type="text"
                      placeholder="e.g. Block C Fluid Lab Door"
                      value={newQrLabel}
                      onChange={e => setNewQrLabel(e.target.value)}
                      className="w-full p-2 rounded-lg border border-slate-300 bg-white"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-slate-600 font-semibold mb-1">Checkpoint QR Code</label>
                    <input
                      type="text"
                      placeholder="e.g. QR-BLK-C-FLUID"
                      value={newQrCode}
                      onChange={e => setNewQrCode(e.target.value)}
                      className="w-full p-2 rounded-lg border border-slate-300 bg-white font-mono"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-slate-600 font-semibold mb-1">Building</label>
                    <select
                      value={newQrBuilding}
                      onChange={e => setNewQrBuilding(e.target.value)}
                      className="w-full p-2 rounded-lg border border-slate-300 bg-white"
                    >
                      {buildings.map(b => (
                        <option key={b.id} value={b.id}>{b.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="sm:col-span-3 flex justify-end">
                    <button
                      type="submit"
                      className="px-6 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold cursor-pointer transition-colors shadow-2xs"
                    >
                      Save Checkpoint
                    </button>
                  </div>
                </form>
              </div>

              <div className="space-y-2">
                {qrCheckpoints.map(cp => (
                  <div key={cp.id} className="p-3 rounded-xl bg-white border border-slate-200 flex items-center justify-between text-xs shadow-2xs">
                    <div>
                      <span className="font-bold text-slate-900">{cp.label}</span>
                      <span className="ml-2 font-mono text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">
                        {cp.code}
                      </span>
                      <p className="text-[11px] text-slate-500 mt-0.5">{cp.description}</p>
                    </div>
                    <button
                      onClick={() => {
                        deleteQRCheckpoint(cp.id);
                        showToast(`Removed QR ${cp.code}`);
                      }}
                      className="text-slate-400 hover:text-rose-600 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 5: BACKUP & RESET */}
          {activeTab === 'settings' && (
            <div className="space-y-6 text-xs">
              <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-3">
                <h4 className="font-bold text-slate-900 text-sm">Download / Export Campus Database</h4>
                <p className="text-slate-500">
                  Export the complete campus graph, buildings, rooms, and QR checkpoints as a single JSON blueprint:
                </p>
                <button
                  onClick={() => {
                    const json = exportDatabaseJson();
                    const blob = new Blob([json], { type: 'application/json' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `campusnav_database_${Date.now()}.json`;
                    a.click();
                    showToast('Database exported');
                  }}
                  className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold flex items-center gap-1.5 cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  <span>Download campus_database.json</span>
                </button>
              </div>

              <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 shadow-2xs space-y-3">
                <h4 className="font-bold text-rose-900 text-sm">Reset to Canara Engineering College Default Blueprints</h4>
                <p className="text-rose-700">
                  Restore Library Block (GF, TF), Class Room Block (GF, FF, SF, TF), Admin Block (GF, SF), and all uploaded floor blueprints and room graphs to factory defaults:
                </p>
                {!confirmReset ? (
                  <button
                    onClick={() => setConfirmReset(true)}
                    className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold flex items-center gap-1.5 cursor-pointer"
                  >
                    <RotateCcw className="w-4 h-4" />
                    <span>Reset Campus Database</span>
                  </button>
                ) : (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        resetToDefaultData();
                        setConfirmReset(false);
                        showToast('Campus reset to default');
                      }}
                      className="px-4 py-2 rounded-xl bg-rose-700 hover:bg-rose-800 text-white font-bold cursor-pointer"
                    >
                      Confirm Reset
                    </button>
                    <button
                      onClick={() => setConfirmReset(false)}
                      className="px-3 py-2 rounded-xl bg-white border border-rose-200 text-rose-800 font-semibold cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
