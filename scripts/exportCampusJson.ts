import fs from 'fs';
import path from 'path';
import {
  INITIAL_BUILDINGS,
  INITIAL_FLOORS,
  INITIAL_LOCATIONS,
  INITIAL_NODES,
  INITIAL_CONNECTIONS,
} from '../src/data/initialCampusData';

// Map raw floor IDs to 4 clean primary floors: ground, first, second, third
function normalizeFloorId(rawFloorId: string): string {
  if (rawFloorId.includes('gf') || rawFloorId === 'outdoor') return 'ground';
  if (rawFloorId.includes('ff')) return 'first';
  if (rawFloorId.includes('sf')) return 'second';
  if (rawFloorId.includes('tf')) return 'third';
  return 'ground';
}

function normalizeNodeType(rawType: string, label: string): string {
  const l = (label + ' ' + rawType).toLowerCase();
  if (l.includes('stair')) return 'stairs';
  if (l.includes('lift') || l.includes('elevator')) return 'lift';
  if (l.includes('toilet') || l.includes('washroom') || l.includes('restroom')) return 'washroom';
  if (l.includes('gate') || l.includes('entrance') || l.includes('entry') || l.includes('foyer')) return 'entrance';
  if (l.includes('canteen') || l.includes('kitchen') || l.includes('cafeteria') || l.includes('stationary') || l.includes('store')) return 'canteen';
  if (l.includes('lab')) return 'lab';
  if (l.includes('hod') || l.includes('staff') || l.includes('office') || l.includes('cubicle') || l.includes('admin')) return 'office';
  if (l.includes('corridor') || l.includes('junction') || l.includes('walkway') || l.includes('lobby')) return 'corridor junction';
  return 'room';
}

function normalizeCategory(cat: string, name: string): string {
  const n = (name + ' ' + cat).toLowerCase();
  if (n.includes('toilet') || n.includes('washroom') || n.includes('restroom')) return 'washroom';
  if (n.includes('canteen') || n.includes('cafeteria') || n.includes('store') || n.includes('kitchenette')) return 'canteen';
  if (n.includes('lab') || n.includes('ups')) return 'lab';
  if (n.includes('hod') || n.includes('staff') || n.includes('office') || n.includes('cubicle') || n.includes('admin')) return 'office';
  if (n.includes('gate') || n.includes('entrance') || n.includes('exit')) return 'entrance';
  return 'classroom';
}

function inferDepartment(loc: any): string {
  const text = (loc.name + ' ' + loc.description + ' ' + (loc.tags || []).join(' ')).toLowerCase();
  if (text.includes('computer') || text.includes('cs') || text.includes('pc-') || text.includes('programming')) return 'Computer Science & Engineering';
  if (text.includes('electronics') || text.includes('ec')) return 'Electronics & Communication';
  if (text.includes('mech')) return 'Mechanical Engineering';
  if (text.includes('information') || text.includes('is')) return 'Information Science & Engineering';
  if (text.includes('physics') || text.includes('chem') || text.includes('math') || text.includes('basic')) return 'Basic Science & Humanities';
  if (text.includes('admin') || text.includes('reception') || text.includes('principal') || text.includes('office') || text.includes('store')) return 'College Administration';
  if (text.includes('library')) return 'Central Library';
  return 'Academic Department';
}

function generateLocationHint(loc: any, floorName: string): string {
  const desc = loc.description || '';
  if (desc.length > 5 && desc.length < 90) return `${floorName}: ${desc}`;
  return `${floorName}, Class Room Block`;
}

// 1. Defined 4 Main Floors
const floors = [
  {
    id: 'ground',
    name: 'Ground Floor',
    shortName: 'Ground',
    floorNumber: 0,
    image: '/assets/aistudio/1000073941_367166a1.jpg',
    scale: 1.0,
    description: 'Main Entry Lobby, Classrooms 01–09, HOD Offices, Staff Rooms 01–03 & Lift-02',
  },
  {
    id: 'first',
    name: '1st Floor',
    shortName: '1st',
    floorNumber: 1,
    image: '/assets/aistudio/1000073949_21a5a4cc.jpg',
    scale: 1.0,
    description: 'Classrooms 01–09, HOD Suites, Staff Rooms 01–03, Central Staircase & Lift-02',
  },
  {
    id: 'second',
    name: '2nd Floor',
    shortName: '2nd',
    floorNumber: 2,
    image: '/assets/aistudio/1000073957_ddb04104.jpg',
    scale: 1.0,
    description: 'Classrooms 01–08, Staff Rooms 01–03, Central Lobby & Lift-02',
  },
  {
    id: 'third',
    name: '3rd Floor',
    shortName: '3rd',
    floorNumber: 3,
    image: '/assets/aistudio/1000073959_ac649ee1.jpg',
    scale: 1.0,
    description: 'Classrooms 01–07, Staffroom, Ladies & Gents Toilets, Maintenance & Lift-03',
  },
];

// 2. Map Nodes
const nodeMap = new Map<string, any>();
INITIAL_NODES.forEach((n) => {
  const normFloor = normalizeFloorId(n.floorId);
  const normType = normalizeNodeType(n.nodeType, n.label || '');
  nodeMap.set(n.id, {
    id: n.id,
    floor: normFloor,
    x: Math.round(n.x),
    y: Math.round(n.y),
    type: normType,
    name: n.label || n.id,
    building: n.buildingId,
  });
});

const nodes = Array.from(nodeMap.values());

// 3. Map Edges
const edges = INITIAL_CONNECTIONS.map((c) => {
  const sourceNode = nodeMap.get(c.startNodeId);
  const targetNode = nodeMap.get(c.endNodeId);
  
  let edgeType = 'corridor';
  if (c.connectionType === 'staircase') edgeType = 'stairs';
  else if (c.connectionType === 'elevator') edgeType = 'lift';
  else if (c.connectionType === 'outdoor_path') edgeType = 'outdoor';

  return {
    id: c.id,
    source: c.startNodeId,
    target: c.endNodeId,
    distance: Math.round(c.distanceMeters),
    type: edgeType,
    accessible: c.accessible !== false && edgeType !== 'stairs',
  };
}).filter((e) => nodeMap.has(e.source) && nodeMap.has(e.target));

// 4. Map Rooms
const rooms = INITIAL_LOCATIONS.map((loc) => {
  const normFloor = normalizeFloorId(loc.floorId);
  const floorObj = floors.find((f) => f.id === normFloor);
  const floorName = floorObj ? floorObj.name : 'Ground Floor';
  const category = normalizeCategory(loc.category, loc.name);
  const dept = inferDepartment(loc);

  // Extract keywords & aliases
  const rawTags = loc.tags || [];
  const numClean = loc.roomNumber ? loc.roomNumber.toLowerCase().replace(/[^a-z0-9]/g, '') : '';
  const keywordsSet = new Set<string>([
    loc.roomNumber.toLowerCase(),
    numClean,
    loc.name.toLowerCase(),
    category,
    normFloor,
    dept.toLowerCase(),
    ...rawTags.map((t: string) => t.toLowerCase()),
  ]);

  if (loc.roomNumber.includes('CRB-')) {
    const shortCode = loc.roomNumber.replace('CRB-', '');
    keywordsSet.add(shortCode.toLowerCase());
    keywordsSet.add(`room ${shortCode.toLowerCase()}`);
    keywordsSet.add(`cr ${shortCode.toLowerCase()}`);
  }

  return {
    id: loc.id,
    number: loc.roomNumber,
    name: loc.name,
    department: dept,
    floor: normFloor,
    nodeId: loc.associatedNodeId,
    category,
    keywords: Array.from(keywordsSet),
    description: loc.description || '',
    hint: generateLocationHint(loc, floorName),
  };
});

const campusData = {
  collegeName: 'Canara Engineering College',
  campusLocation: 'Sudhindra Nagar, Benjanapadavu, Bantwal Taluk, Karnataka 574219',
  version: '2.0.0',
  lastUpdated: new Date().toISOString(),
  floors,
  nodes,
  edges,
  rooms,
};

fs.writeFileSync(
  path.resolve(process.cwd(), 'public/data/campus.json'),
  JSON.stringify(campusData, null, 2),
  'utf8'
);

console.log(
  `Generated public/data/campus.json successfully! Floors: ${floors.length}, Nodes: ${nodes.length}, Edges: ${edges.length}, Rooms: ${rooms.length}`
);
