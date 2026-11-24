import test from 'node:test';
import assert from 'node:assert/strict';
import {
  findOptimalPath,
  generateNavigationSteps,
  detectWrongDirection,
  calculateTurnAngle,
  calculateSegmentHeading,
  advanceRouteProgress,
} from './navigationEngine';
import { NavigationNode, NavigationConnection, Floor, Building } from '../types/campus';

const testBuildings: Building[] = [
  {
    id: 'block_a',
    name: 'Block A (Engineering)',
    code: 'BLK-A',
    description: 'Engineering & Computing',
    color: '#2563eb',
    canvasBounds: { x: 50, y: 50, width: 200, height: 150 },
    floorIds: ['block_a_f0', 'block_a_f1'],
    entranceNodeId: 'node_a_entrance',
  },
];

const testFloors: Floor[] = [
  { id: 'block_a_f0', buildingId: 'block_a', floorNumber: 0, floorName: 'Ground Floor', code: 'G' },
  { id: 'block_a_f1', buildingId: 'block_a', floorNumber: 1, floorName: 'First Floor', code: '1' },
];

const testNodes: NavigationNode[] = [
  // Ground floor nodes
  { id: 'node_a_entrance', buildingId: 'block_a', floorId: 'block_a_f0', x: 10, y: 10, nodeType: 'building_entrance', label: 'Main Entrance' },
  { id: 'node_a_junction_1', buildingId: 'block_a', floorId: 'block_a_f0', x: 20, y: 10, nodeType: 'junction', label: 'Central Corridor' },
  { id: 'node_a_stair_f0', buildingId: 'block_a', floorId: 'block_a_f0', x: 30, y: 10, nodeType: 'staircase', label: 'Staircase 1 (Ground)' },
  { id: 'node_a_elevator_f0', buildingId: 'block_a', floorId: 'block_a_f0', x: 20, y: 20, nodeType: 'elevator', label: 'Elevator A (Ground)' },
  { id: 'node_a_room_101', buildingId: 'block_a', floorId: 'block_a_f0', x: 40, y: 10, nodeType: 'room_door', label: 'Room 101' },

  // First floor nodes
  { id: 'node_a_stair_f1', buildingId: 'block_a', floorId: 'block_a_f1', x: 30, y: 10, nodeType: 'staircase', label: 'Staircase 1 (1st Floor)' },
  { id: 'node_a_elevator_f1', buildingId: 'block_a', floorId: 'block_a_f1', x: 20, y: 20, nodeType: 'elevator', label: 'Elevator A (1st Floor)' },
  { id: 'node_a_corridor_f1', buildingId: 'block_a', floorId: 'block_a_f1', x: 30, y: 25, nodeType: 'junction', label: '1st Floor Corridor' },
  { id: 'node_a_room_204', buildingId: 'block_a', floorId: 'block_a_f1', x: 45, y: 25, nodeType: 'room_door', label: 'Room 204 (CSE Staff Room)' },
];

const testConnections: NavigationConnection[] = [
  // Ground floor connections
  { id: 'c1', startNodeId: 'node_a_entrance', endNodeId: 'node_a_junction_1', distanceMeters: 10, connectionType: 'corridor', accessible: true },
  { id: 'c2', startNodeId: 'node_a_junction_1', endNodeId: 'node_a_stair_f0', distanceMeters: 10, connectionType: 'corridor', accessible: true },
  { id: 'c3', startNodeId: 'node_a_junction_1', endNodeId: 'node_a_elevator_f0', distanceMeters: 10, connectionType: 'corridor', accessible: true },
  { id: 'c4', startNodeId: 'node_a_stair_f0', endNodeId: 'node_a_room_101', distanceMeters: 10, connectionType: 'corridor', accessible: true },

  // Vertical connections: Staircase (not wheelchair accessible)
  { id: 'c_stair', startNodeId: 'node_a_stair_f0', endNodeId: 'node_a_stair_f1', distanceMeters: 8, connectionType: 'staircase', accessible: false },

  // Vertical connections: Elevator (wheelchair accessible)
  { id: 'c_elev', startNodeId: 'node_a_elevator_f0', endNodeId: 'node_a_elevator_f1', distanceMeters: 12, connectionType: 'elevator', accessible: true },

  // First floor connections
  { id: 'c5', startNodeId: 'node_a_stair_f1', endNodeId: 'node_a_corridor_f1', distanceMeters: 15, connectionType: 'corridor', accessible: true },
  { id: 'c6', startNodeId: 'node_a_elevator_f1', endNodeId: 'node_a_corridor_f1', distanceMeters: 12, connectionType: 'corridor', accessible: true },
  { id: 'c7', startNodeId: 'node_a_corridor_f1', endNodeId: 'node_a_room_204', distanceMeters: 15, connectionType: 'corridor', accessible: true },
];

test('finds direct shortest path on single floor', () => {
  const result = findOptimalPath('node_a_entrance', 'node_a_room_101', testNodes, testConnections, 'shortest');
  assert.ok(result);
  assert.deepEqual(result.pathNodeIds, ['node_a_entrance', 'node_a_junction_1', 'node_a_stair_f0', 'node_a_room_101']);
  assert.equal(result.totalDistanceMeters, 30);
});

test('multi-floor shortest path chooses staircase when faster', () => {
  const result = findOptimalPath('node_a_entrance', 'node_a_room_204', testNodes, testConnections, 'shortest');
  assert.ok(result);
  // Shortest route includes staircase
  assert.ok(result.pathNodeIds.includes('node_a_stair_f0'));
  assert.ok(result.pathNodeIds.includes('node_a_stair_f1'));
  assert.equal(result.pathNodeIds[result.pathNodeIds.length - 1], 'node_a_room_204');
});

test('wheelchair accessible preference strictly avoids stairs and uses elevator', () => {
  const result = findOptimalPath('node_a_entrance', 'node_a_room_204', testNodes, testConnections, 'wheelchair');
  assert.ok(result);
  // Must use elevator, not staircase
  assert.ok(result.pathNodeIds.includes('node_a_elevator_f0'));
  assert.ok(result.pathNodeIds.includes('node_a_elevator_f1'));
  assert.ok(!result.pathNodeIds.includes('node_a_stair_f0'));
  assert.ok(!result.pathNodeIds.includes('node_a_stair_f1'));
});

test('calculates turn angles correctly (left vs right)', () => {
  const p1 = { x: 0, y: 0 };
  const p2 = { x: 10, y: 0 };
  const p3Right = { x: 10, y: 10 }; // moving in +x then +y is right turn in screen coords
  const p3Left = { x: 10, y: -10 }; // moving in +x then -y is left turn in screen coords

  const rightAngle = calculateTurnAngle(p1, p2, p3Right);
  const leftAngle = calculateTurnAngle(p1, p2, p3Left);

  assert.ok(rightAngle > 0, 'Should be positive angle for right turn');
  assert.ok(leftAngle < 0, 'Should be negative angle for left turn');
});

test('generates turn-by-turn steps with floor change transition', () => {
  const result = findOptimalPath('node_a_entrance', 'node_a_room_204', testNodes, testConnections, 'shortest');
  assert.ok(result);
  const pathNodes = result.pathNodeIds.map(id => testNodes.find(n => n.id === id)!);
  const steps = generateNavigationSteps(pathNodes, testConnections, testFloors, testBuildings, 'Room 204 (CSE Staff Room)');

  assert.ok(steps.length >= 3);
  const floorStep = steps.find(s => s.floorChange !== undefined);
  assert.ok(floorStep, 'Must include a floor change step');
  assert.equal(floorStep.floorChange?.fromFloorName, 'Ground Floor');
  assert.equal(floorStep.floorChange?.toFloorName, 'First Floor');
  assert.equal(steps[steps.length - 1].action, 'arrive');
});

test('wrong-direction detection triggers when user is off-route or on wrong floor', () => {
  const pathNodes = [testNodes[0], testNodes[1], testNodes[2]]; // Entrance -> Junction 1 -> Stair

  // 1. On track position (near (15, 10))
  const onTrack = detectWrongDirection(
    { x: 15, y: 10, floorId: 'block_a_f0', buildingId: 'block_a' },
    pathNodes,
    0,
    10
  );
  assert.equal(onTrack.isWrongDirection, false);

  // 2. Off track position far away (x: 15, y: 90)
  const offTrack = detectWrongDirection(
    { x: 15, y: 90, floorId: 'block_a_f0', buildingId: 'block_a' },
    pathNodes,
    0,
    10
  );
  assert.equal(offTrack.isWrongDirection, true);
  assert.equal(offTrack.shouldRecalculate, true);

  // 3. Wrong floor detection
  const wrongFloor = detectWrongDirection(
    { x: 15, y: 10, floorId: 'block_a_f1', buildingId: 'block_a' },
    pathNodes,
    0,
    10
  );
  assert.equal(wrongFloor.isWrongDirection, true);
  assert.equal(wrongFloor.shouldRecalculate, true);
});

import { INITIAL_NODES, INITIAL_CONNECTIONS, INITIAL_FLOORS, INITIAL_BUILDINGS } from '../data/initialCampusData';

test('real campus: finds route from Main Gate to Library Block TF Lab-01 (outdoor + indoor 3rd floor)', () => {
  const result = findOptimalPath('node_out_gate', 'node_lib_tf_lab01', INITIAL_NODES, INITIAL_CONNECTIONS, 'shortest');
  assert.ok(result, 'Should find path to Lab-01 on Library TF');
  assert.ok(result.pathNodeIds.includes('node_out_gate'));
  assert.ok(result.pathNodeIds.includes('node_lib_ent'));
  assert.ok(result.pathNodeIds.includes('node_lib_tf_lab01'));
  assert.ok(result.totalDistanceMeters > 50);

  const pathNodes = result.pathNodeIds.map(id => INITIAL_NODES.find(n => n.id === id)!);
  const steps = generateNavigationSteps(pathNodes, INITIAL_CONNECTIONS, INITIAL_FLOORS, INITIAL_BUILDINGS, 'Lab-01 (Library TF East Wing)');
  assert.ok(steps.length > 3);
  const floorStep = steps.find(s => s.floorChange !== undefined);
  assert.ok(floorStep, 'Must include a floor change step from Ground Floor to Third Floor');
});

test('real campus: wheelchair routing in Class Room Block from GF Lobby to TF Class Room 05 uses Lift not stairs', () => {
  const result = findOptimalPath('node_crb_gf_lobby', 'node_crb_tf_cr05', INITIAL_NODES, INITIAL_CONNECTIONS, 'wheelchair');
  assert.ok(result, 'Should find wheelchair accessible path to Class Room 05 on TF');
  assert.ok(result.pathNodeIds.includes('node_crb_gf_lift'));
  assert.ok(result.pathNodeIds.includes('node_crb_ff_lift'));
  assert.ok(result.pathNodeIds.includes('node_crb_sf_lift'));
  assert.ok(result.pathNodeIds.includes('node_crb_tf_lift'));
  assert.ok(!result.pathNodeIds.includes('node_crb_gf_stair'));
  assert.ok(!result.pathNodeIds.includes('node_crb_tf_stair'));
});

test('calculateSegmentHeading calculates cardinal headings accurately', () => {
  // North: p1=(10, 20) -> p2=(10, 10) (dx=0, dy=-10 => North = 0)
  assert.equal(calculateSegmentHeading({ x: 10, y: 20 }, { x: 10, y: 10 }), 0);
  // East: p1=(10, 10) -> p2=(20, 10) (dx=10, dy=0 => East = 90)
  assert.equal(calculateSegmentHeading({ x: 10, y: 10 }, { x: 20, y: 10 }), 90);
  // South: p1=(10, 10) -> p2=(10, 20) (dx=0, dy=10 => South = 180)
  assert.equal(calculateSegmentHeading({ x: 10, y: 10 }, { x: 10, y: 20 }), 180);
  // West: p1=(20, 10) -> p2=(10, 10) (dx=-10, dy=0 => West = 270)
  assert.equal(calculateSegmentHeading({ x: 20, y: 10 }, { x: 10, y: 10 }), 270);
});

test('advanceRouteProgress interpolates coordinates, transitions floors and detects arrival', () => {
  const pathNodes = [testNodes[0], testNodes[1], testNodes[2]]; // entrance(10,10) -> junction(20,10) -> stair_f0(30,10)
  const steps = generateNavigationSteps(pathNodes, testConnections, testFloors, testBuildings, 'Test Target');

  // Step 1: Move 5 meters along 10m segment
  const prog1 = advanceRouteProgress(
    pathNodes,
    testConnections,
    steps,
    { segmentIndex: 0, segmentProgressMeters: 0 },
    5
  );
  assert.equal(prog1.segmentIndex, 0);
  assert.equal(prog1.segmentProgressMeters, 5);
  assert.equal(prog1.x, 15); // midpoint of 10 and 20
  assert.equal(prog1.y, 10);
  assert.equal(prog1.heading, 90); // moving East
  assert.equal(prog1.hasArrived, false);

  // Step 2: Move another 7 meters (total 12m, transitions to segment 1, prog 2m)
  const prog2 = advanceRouteProgress(
    pathNodes,
    testConnections,
    steps,
    { segmentIndex: prog1.segmentIndex, segmentProgressMeters: prog1.segmentProgressMeters },
    7
  );
  assert.equal(prog2.segmentIndex, 1);
  assert.equal(prog2.segmentProgressMeters, 2);
  assert.equal(prog2.x, 22); // 20 + 0.2*(30-20)
  assert.equal(prog2.y, 10);
  assert.equal(prog2.hasArrived, false);

  // Step 3: Move remaining distance (8m) to arrive
  const prog3 = advanceRouteProgress(
    pathNodes,
    testConnections,
    steps,
    { segmentIndex: prog2.segmentIndex, segmentProgressMeters: prog2.segmentProgressMeters },
    8
  );
  assert.equal(prog3.hasArrived, true);
  assert.equal(prog3.x, 30);
});



