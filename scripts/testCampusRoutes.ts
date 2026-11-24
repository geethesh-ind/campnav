import fs from 'fs';
import path from 'path';

interface CampusData {
  floors: Array<{ id: string; name: string; floorNumber: number }>;
  nodes: Array<{ id: string; floor: string; x: number; y: number; type: string; name: string }>;
  edges: Array<{ id: string; source: string; target: string; distance: number; type: string; accessible: boolean }>;
  rooms: Array<{ id: string; number: string; name: string; floor: string; nodeId: string; hint: string }>;
}

const campusData: CampusData = JSON.parse(
  fs.readFileSync(path.resolve(process.cwd(), 'public/data/campus.json'), 'utf8')
);

const { nodes, edges, rooms, floors } = campusData;
const nodeMap = new Map(nodes.map((n) => [n.id, n]));
const roomMap = new Map(rooms.map((r) => [r.id, r]));

interface RouteEdge {
  target: string;
  distance: number;
  type: string;
  accessible: boolean;
}

function getAdjacency(accessibleOnly = false) {
  const adj = new Map<string, RouteEdge[]>();
  for (const n of nodes) adj.set(n.id, []);

  for (const e of edges) {
    if (accessibleOnly && (!e.accessible || e.type === 'stairs')) continue;

    const list1 = adj.get(e.source);
    if (list1) list1.push({ target: e.target, distance: e.distance, type: e.type, accessible: e.accessible });

    const list2 = adj.get(e.target);
    if (list2) list2.push({ target: e.source, distance: e.distance, type: e.type, accessible: e.accessible });
  }
  return adj;
}

function findRoute(startNodeId: string, targetNodeId: string, accessibleOnly = false) {
  const adj = getAdjacency(accessibleOnly);
  const distances = new Map<string, number>();
  const previous = new Map<string, { node: string; type: string } | null>();
  const unvisited = new Set<string>();

  for (const n of nodes) {
    distances.set(n.id, Infinity);
    previous.set(n.id, null);
    unvisited.add(n.id);
  }

  distances.set(startNodeId, 0);

  while (unvisited.size > 0) {
    let closest: string | null = null;
    let minDist = Infinity;
    for (const id of unvisited) {
      const d = distances.get(id)!;
      if (d < minDist) {
        minDist = d;
        closest = id;
      }
    }

    if (!closest || minDist === Infinity) break;
    if (closest === targetNodeId) break;

    unvisited.delete(closest);

    const neighbors = adj.get(closest) || [];
    for (const edge of neighbors) {
      if (!unvisited.has(edge.target)) continue;
      const alt = distances.get(closest)! + edge.distance;
      if (alt < distances.get(edge.target)!) {
        distances.set(edge.target, alt);
        previous.set(edge.target, { node: closest, type: edge.type });
      }
    }
  }

  if (distances.get(targetNodeId) === Infinity) return null;

  const pathNodes: string[] = [];
  const edgeTypes: string[] = [];
  let cur: string | null = targetNodeId;
  while (cur) {
    pathNodes.unshift(cur);
    const prev = previous.get(cur);
    if (prev) {
      edgeTypes.unshift(prev.type);
      cur = prev.node;
    } else {
      cur = null;
    }
  }

  return {
    pathNodes,
    edgeTypes,
    totalDistance: distances.get(targetNodeId)!,
  };
}

const testCases = [
  {
    name: '1. Single Floor: Main Gate to CR-001 (Ground Floor)',
    fromNode: 'node_out_gate',
    toNode: 'node_crb_gf_cr01',
    accessible: false,
  },
  {
    name: '2. Ground Floor: CR-001 to CR-006 (Across corridor)',
    fromNode: 'node_crb_gf_cr01',
    toNode: 'node_crb_gf_cr06',
    accessible: false,
  },
  {
    name: '3. Cross-Floor (GF to 1F): Main Entrance to Class Room 04 (1st Floor)',
    fromNode: 'node_crb_ent',
    toNode: 'node_crb_ff_cr04',
    accessible: false,
  },
  {
    name: '4. Cross-Floor (GF to 2F): Ground Floor CR-002 to 2nd Floor CR-005',
    fromNode: 'node_crb_gf_cr02',
    toNode: 'node_crb_sf_cr05',
    accessible: false,
  },
  {
    name: '5. Cross-Floor (GF to 3F): Main Entrance to 3rd Floor Ladies Toilet',
    fromNode: 'node_crb_ent',
    toNode: 'node_crb_tf_ladies_toilet',
    accessible: false,
  },
  {
    name: '6. Accessible Lift-Only (GF to 3F): GF Lobby to 3rd Floor CR-005',
    fromNode: 'node_crb_gf_lobby',
    toNode: 'node_crb_tf_cr05',
    accessible: true, // Accessibility enabled
  },
  {
    name: '7. Cross-Floor (1F to 3F): 1st Floor HOD Office to 3rd Floor Staffroom',
    fromNode: 'node_crb_ff_hod',
    toNode: 'node_crb_tf_staff',
    accessible: false,
  },
  {
    name: '8. Inter-Block Cross-Floor: Class Room Block 1F (CR-001) to Library Block TF (Lab 01)',
    fromNode: 'node_crb_ff_cr01',
    toNode: 'node_lib_tf_lab01',
    accessible: false,
  },
  {
    name: '9. Inter-Block Cross-Floor: Class Room Block GF to Admin Block 2F (Computer Lab 02)',
    fromNode: 'node_crb_gf_cr01',
    toNode: 'node_adm_sf_cl2',
    accessible: false,
  },
  {
    name: '10. Reverse Route (3F to GF): 3rd Floor Gents Toilet to Main Campus Gate',
    fromNode: 'node_crb_tf_gents_toilet',
    toNode: 'node_out_gate',
    accessible: false,
  },
];

console.log('--- EXECUTING 10 SAMPLE ROUTING TESTS ---');
let allPassed = true;

const results = testCases.map((tc, idx) => {
  const result = findRoute(tc.fromNode, tc.toNode, tc.accessible);
  if (!result) {
    allPassed = false;
    return { id: idx + 1, name: tc.name, status: 'FAILED', distance: 'N/A', hops: 0, via: 'N/A' };
  }

  const floorSet = new Set(result.pathNodes.map((id) => nodeMap.get(id)?.floor).filter(Boolean));
  const hasStairs = result.edgeTypes.includes('stairs');
  const hasLift = result.edgeTypes.includes('lift');
  const via = hasLift ? 'Lift' : hasStairs ? 'Stairs' : 'Same Level';

  if (tc.accessible && hasStairs) {
    allPassed = false;
    return { id: idx + 1, name: tc.name, status: 'FAILED (Used Stairs in Accessible Mode)', distance: `${result.totalDistance}m`, hops: result.pathNodes.length, via };
  }

  return {
    id: idx + 1,
    name: tc.name,
    status: 'PASSED',
    distance: `${result.totalDistance}m`,
    hops: result.pathNodes.length,
    floors: Array.from(floorSet).join(' → '),
    via,
  };
});

console.table(results);
console.log(allPassed ? 'ALL 10 SAMPLE ROUTES PASSED VERIFICATION!' : 'SOME ROUTES FAILED!');
