import {
  NavigationNode,
  NavigationConnection,
  RoutingPreference,
  NavigationInstructionStep,
  Floor,
  Building,
  WrongDirectionStatus,
} from '../types/campus';

export interface GraphEdge {
  targetNodeId: string;
  connectionId: string;
  distanceMeters: number;
  weight: number;
  connectionType: NavigationConnection['connectionType'];
  accessible: boolean;
}

export function buildAdjacencyList(
  nodes: NavigationNode[],
  connections: NavigationConnection[],
  preference: RoutingPreference
): Map<string, GraphEdge[]> {
  const adj = new Map<string, GraphEdge[]>();

  for (const node of nodes) {
    adj.set(node.id, []);
  }

  for (const conn of connections) {
    if (conn.isRestricted) {
      continue;
    }

    // Wheelchair accessibility check
    if (preference === 'wheelchair') {
      if (!conn.accessible || conn.connectionType === 'staircase') {
        continue;
      }
    }

    let weight = conn.distanceMeters;

    // Preference weight modifiers
    if (preference === 'fewer_stairs') {
      if (conn.connectionType === 'staircase') {
        weight = conn.distanceMeters * 3.5;
      } else if (conn.connectionType === 'elevator') {
        // Favor elevators over stairs
        weight = conn.distanceMeters * 0.8;
      }
    } else if (preference === 'shortest') {
      // Standard shortest distance, slight elevator fixed time penalty
      if (conn.connectionType === 'elevator') {
        weight = conn.distanceMeters + 5;
      }
    }

    // Undirected edge (can walk in both directions)
    const edgesFromStart = adj.get(conn.startNodeId);
    if (edgesFromStart) {
      edgesFromStart.push({
        targetNodeId: conn.endNodeId,
        connectionId: conn.id,
        distanceMeters: conn.distanceMeters,
        weight,
        connectionType: conn.connectionType,
        accessible: conn.accessible,
      });
    }

    const edgesFromEnd = adj.get(conn.endNodeId);
    if (edgesFromEnd) {
      edgesFromEnd.push({
        targetNodeId: conn.startNodeId,
        connectionId: conn.id,
        distanceMeters: conn.distanceMeters,
        weight,
        connectionType: conn.connectionType,
        accessible: conn.accessible,
      });
    }
  }

  return adj;
}

export function findOptimalPath(
  startNodeId: string,
  targetNodeId: string,
  nodes: NavigationNode[],
  connections: NavigationConnection[],
  preference: RoutingPreference = 'shortest'
): {
  pathNodeIds: string[];
  totalDistanceMeters: number;
  connectionIds: string[];
} | null {
  if (startNodeId === targetNodeId) {
    return {
      pathNodeIds: [startNodeId],
      totalDistanceMeters: 0,
      connectionIds: [],
    };
  }

  const nodeMap = new Map<string, NavigationNode>();
  for (const n of nodes) {
    nodeMap.set(n.id, n);
  }

  if (!nodeMap.has(startNodeId) || !nodeMap.has(targetNodeId)) {
    return null;
  }

  const adj = buildAdjacencyList(nodes, connections, preference);

  const distances = new Map<string, number>();
  const actualDistances = new Map<string, number>();
  const previous = new Map<string, { nodeId: string; connectionId: string } | null>();
  const unvisited = new Set<string>();

  for (const node of nodes) {
    distances.set(node.id, Infinity);
    actualDistances.set(node.id, Infinity);
    previous.set(node.id, null);
    unvisited.add(node.id);
  }

  distances.set(startNodeId, 0);
  actualDistances.set(startNodeId, 0);

  while (unvisited.size > 0) {
    let closestNodeId: string | null = null;
    let minDistance = Infinity;

    for (const nodeId of unvisited) {
      const dist = distances.get(nodeId)!;
      if (dist < minDistance) {
        minDistance = dist;
        closestNodeId = nodeId;
      }
    }

    if (!closestNodeId || minDistance === Infinity) {
      break;
    }

    if (closestNodeId === targetNodeId) {
      break;
    }

    unvisited.delete(closestNodeId);

    const neighbors = adj.get(closestNodeId) || [];
    for (const edge of neighbors) {
      if (!unvisited.has(edge.targetNodeId)) continue;

      const alt = distances.get(closestNodeId)! + edge.weight;
      if (alt < distances.get(edge.targetNodeId)!) {
        distances.set(edge.targetNodeId, alt);
        actualDistances.set(
          edge.targetNodeId,
          actualDistances.get(closestNodeId)! + edge.distanceMeters
        );
        previous.set(edge.targetNodeId, {
          nodeId: closestNodeId,
          connectionId: edge.connectionId,
        });
      }
    }
  }

  if (distances.get(targetNodeId) === Infinity) {
    return null;
  }

  // Reconstruct path
  const pathNodeIds: string[] = [];
  const connectionIds: string[] = [];
  let curr: string | null = targetNodeId;

  while (curr) {
    pathNodeIds.unshift(curr);
    const prevEntry = previous.get(curr);
    if (prevEntry) {
      connectionIds.unshift(prevEntry.connectionId);
      curr = prevEntry.nodeId;
    } else {
      curr = null;
    }
  }

  return {
    pathNodeIds,
    totalDistanceMeters: Math.round(actualDistances.get(targetNodeId) || 0),
    connectionIds,
  };
}

export function calculateTurnAngle(
  p1: { x: number; y: number },
  p2: { x: number; y: number },
  p3: { x: number; y: number }
): number {
  // Vector A: p1 -> p2
  const v1x = p2.x - p1.x;
  const v1y = p2.y - p1.y;

  // Vector B: p2 -> p3
  const v2x = p3.x - p2.x;
  const v2y = p3.y - p2.y;

  const cross = v1x * v2y - v1y * v2x;
  const dot = v1x * v2x + v1y * v2y;

  const angleRad = Math.atan2(cross, dot);
  return (angleRad * 180) / Math.PI; // Positive = clockwise (right turn in screen coordinates), Negative = counter-clockwise (left)
}

export function generateNavigationSteps(
  pathNodes: NavigationNode[],
  connections: NavigationConnection[],
  floors: Floor[],
  buildings: Building[],
  destinationTitle = 'Destination'
): NavigationInstructionStep[] {
  if (pathNodes.length === 0) return [];

  const connMap = new Map<string, NavigationConnection>();
  for (const c of connections) {
    connMap.set(`${c.startNodeId}_${c.endNodeId}`, c);
    connMap.set(`${c.endNodeId}_${c.startNodeId}`, c);
  }

  const floorMap = new Map<string, Floor>();
  for (const f of floors) {
    floorMap.set(f.id, f);
  }

  const buildingMap = new Map<string, Building>();
  for (const b of buildings) {
    buildingMap.set(b.id, b);
  }

  const steps: NavigationInstructionStep[] = [];

  if (pathNodes.length === 1) {
    steps.push({
      id: 'step_0',
      action: 'arrive',
      primaryText: `You are at ${destinationTitle}`,
      secondaryText: 'Destination reached',
      distanceMeters: 0,
      estimatedSeconds: 0,
      startNode: pathNodes[0],
      endNode: pathNodes[0],
    });
    return steps;
  }

  for (let i = 0; i < pathNodes.length - 1; i++) {
    const fromNode = pathNodes[i];
    const toNode = pathNodes[i + 1];
    const key = `${fromNode.id}_${toNode.id}`;
    const conn = connMap.get(key);
    const dist = conn ? conn.distanceMeters : Math.round(Math.hypot(toNode.x - fromNode.x, toNode.y - fromNode.y));
    const estimatedSecs = Math.max(3, Math.round(dist / 1.2)); // ~1.2m/s walking speed

    const isFloorChange = fromNode.floorId !== toNode.floorId;
    const isBuildingChange = fromNode.buildingId !== toNode.buildingId;

    const fromFloor = floorMap.get(fromNode.floorId);
    const toFloor = floorMap.get(toNode.floorId);
    const toBuilding = buildingMap.get(toNode.buildingId);

    if (isFloorChange && fromFloor && toFloor) {
      const isUp = toFloor.floorNumber > fromFloor.floorNumber;
      const isStairs = conn?.connectionType === 'staircase' || fromNode.nodeType === 'staircase' || toNode.nodeType === 'staircase';
      const action = isStairs
        ? (isUp ? 'staircase_up' : 'staircase_down')
        : (isUp ? 'elevator_up' : 'elevator_down');

      const viaText = isStairs ? 'Take the stairs' : 'Take the elevator';
      steps.push({
        id: `step_${i}`,
        action,
        primaryText: `${viaText} to ${toFloor.floorName}`,
        secondaryText: `Moving from ${fromFloor.floorName} to ${toFloor.floorName}`,
        distanceMeters: dist,
        estimatedSeconds: estimatedSecs + 20, // floor change wait time
        startNode: fromNode,
        endNode: toNode,
        floorChange: {
          fromFloorId: fromFloor.id,
          toFloorId: toFloor.id,
          fromFloorName: fromFloor.floorName,
          toFloorName: toFloor.floorName,
          via: isStairs ? 'staircase' : 'elevator',
        },
      });
      continue;
    }

    if (isBuildingChange && toBuilding) {
      steps.push({
        id: `step_${i}`,
        action: 'straight',
        primaryText: `Enter ${toBuilding.name}`,
        secondaryText: `Crossing into ${toBuilding.code}`,
        distanceMeters: dist,
        estimatedSeconds: estimatedSecs,
        startNode: fromNode,
        endNode: toNode,
        buildingChange: {
          fromBuildingId: fromNode.buildingId,
          toBuildingId: toNode.buildingId,
        },
      });
      continue;
    }

    // Single floor movement: check turn angle if previous node exists on the same floor
    if (i === 0) {
      steps.push({
        id: `step_${i}`,
        action: 'start',
        primaryText: `Walk straight for ${dist} metres`,
        secondaryText: `Head towards ${toNode.label || 'the corridor'}`,
        distanceMeters: dist,
        estimatedSeconds: estimatedSecs,
        startNode: fromNode,
        endNode: toNode,
      });
    } else {
      const prevNode = pathNodes[i - 1];
      if (prevNode.floorId === fromNode.floorId && fromNode.floorId === toNode.floorId) {
        const angle = calculateTurnAngle(prevNode, fromNode, toNode);
        let action: 'straight' | 'turn_left' | 'turn_right' = 'straight';
        let turnText = `Continue straight for ${dist} metres`;

        if (angle > 40 && angle < 140) {
          action = 'turn_right';
          turnText = `Turn right, walk ${dist} metres`;
        } else if (angle < -40 && angle > -140) {
          action = 'turn_left';
          turnText = `Turn left, walk ${dist} metres`;
        } else if (Math.abs(angle) >= 140) {
          action = 'straight';
          turnText = `Make a sharp turn, walk ${dist} metres`;
        }

        const landmark = toNode.label ? ` towards ${toNode.label}` : '';
        steps.push({
          id: `step_${i}`,
          action,
          primaryText: turnText + landmark,
          secondaryText: i === pathNodes.length - 2 ? `Approaching ${destinationTitle}` : undefined,
          distanceMeters: dist,
          estimatedSeconds: estimatedSecs,
          startNode: fromNode,
          endNode: toNode,
        });
      } else {
        steps.push({
          id: `step_${i}`,
          action: 'straight',
          primaryText: `Walk straight for ${dist} metres`,
          secondaryText: toNode.label ? `Near ${toNode.label}` : undefined,
          distanceMeters: dist,
          estimatedSeconds: estimatedSecs,
          startNode: fromNode,
          endNode: toNode,
        });
      }
    }
  }

  // Arrival step
  const lastNode = pathNodes[pathNodes.length - 1];
  steps.push({
    id: `step_${pathNodes.length}`,
    action: 'arrive',
    primaryText: `Arrive at ${destinationTitle}`,
    secondaryText: lastNode.label ? `Located at ${lastNode.label}` : 'Destination is on your side',
    distanceMeters: 0,
    estimatedSeconds: 0,
    startNode: lastNode,
    endNode: lastNode,
  });

  return steps;
}

export function distancePointToSegment(
  p: { x: number; y: number },
  v: { x: number; y: number },
  w: { x: number; y: number }
): { distance: number; projectionFactor: number } {
  const l2 = (w.x - v.x) ** 2 + (w.y - v.y) ** 2;
  if (l2 === 0) {
    return {
      distance: Math.hypot(p.x - v.x, p.y - v.y),
      projectionFactor: 0,
    };
  }

  // Projection factor t
  let t = ((p.x - v.x) * (w.x - v.x) + (p.y - v.y) * (w.y - v.y)) / l2;
  t = Math.max(0, Math.min(1, t));

  const projX = v.x + t * (w.x - v.x);
  const projY = v.y + t * (w.y - v.y);

  return {
    distance: Math.hypot(p.x - projX, p.y - projY),
    projectionFactor: t,
  };
}

export function detectWrongDirection(
  userPos: { x: number; y: number; floorId: string; buildingId: string },
  pathNodes: NavigationNode[],
  currentStepIndex: number,
  deviationThresholdMeters = 20
): WrongDirectionStatus {
  if (pathNodes.length < 2) {
    return {
      isWrongDirection: false,
      deviationMeters: 0,
      message: 'On track',
      shouldRecalculate: false,
    };
  }

  const activeIndex = Math.min(currentStepIndex, pathNodes.length - 2);
  const startNode = pathNodes[activeIndex];
  const endNode = pathNodes[activeIndex + 1];

  // 1. Check floor mismatch
  if (userPos.floorId !== startNode.floorId && userPos.floorId !== endNode.floorId) {
    return {
      isWrongDirection: true,
      deviationMeters: 30,
      message: 'Wrong floor detected! You are on a different floor than the active route.',
      shouldRecalculate: true,
    };
  }

  // 2. Check building mismatch
  if (userPos.buildingId !== startNode.buildingId && userPos.buildingId !== endNode.buildingId) {
    return {
      isWrongDirection: true,
      deviationMeters: 50,
      message: 'Wrong building! You seem to have entered a different building.',
      shouldRecalculate: true,
    };
  }

  // 3. Distance to current active segment
  const { distance } = distancePointToSegment(userPos, startNode, endNode);

  if (distance > deviationThresholdMeters) {
    // Check if user accidentally jumped ahead to another leg
    let foundCloserLeg = false;
    for (let j = 0; j < pathNodes.length - 1; j++) {
      if (pathNodes[j].floorId === userPos.floorId) {
        const check = distancePointToSegment(userPos, pathNodes[j], pathNodes[j + 1]);
        if (check.distance <= deviationThresholdMeters) {
          foundCloserLeg = true;
          break;
        }
      }
    }

    if (!foundCloserLeg) {
      return {
        isWrongDirection: true,
        deviationMeters: Math.round(distance),
        message: `You are going in the wrong direction! (${Math.round(distance)}m off-route)`,
        shouldRecalculate: true,
      };
    }
  }

  return {
    isWrongDirection: false,
    deviationMeters: Math.round(distance),
    message: 'On route',
    shouldRecalculate: false,
  };
}

export interface RouteProgressState {
  segmentIndex: number;
  segmentProgressMeters: number;
  x: number;
  y: number;
  floorId: string;
  buildingId: string;
  heading: number;
  stepIndex: number;
  remainingMeters: number;
  hasArrived: boolean;
  floorChanged?: {
    fromFloorId: string;
    toFloorId: string;
    via: 'staircase' | 'elevator';
  };
}

/**
 * Calculates corridor heading angle in degrees (0 - 360, where 0 is North/Up)
 */
export function calculateSegmentHeading(
  p1: { x: number; y: number },
  p2: { x: number; y: number }
): number {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  // In screen coordinates: positive Y is down.
  // Standard math angle from positive X axis is atan2(dy, dx)
  // Compass angle (0° = -Y, 90° = +X, 180° = +Y, 270° = -X):
  const angleRad = Math.atan2(dx, -dy);
  let deg = (angleRad * 180) / Math.PI;
  if (deg < 0) deg += 360;
  return Math.round(deg);
}

/**
 * Advances the user's physical progress along the calculated route in real-time
 * based on physical movement (footsteps from accelerometer, GPS delta, or smooth simulator).
 */
export function advanceRouteProgress(
  pathNodes: NavigationNode[],
  connections: NavigationConnection[],
  steps: NavigationInstructionStep[],
  currentState: { segmentIndex: number; segmentProgressMeters: number },
  distanceMetersMoved: number
): RouteProgressState {
  if (pathNodes.length === 0) {
    return {
      segmentIndex: 0,
      segmentProgressMeters: 0,
      x: 0,
      y: 0,
      floorId: 'outdoor',
      buildingId: 'outdoor',
      heading: 0,
      stepIndex: 0,
      remainingMeters: 0,
      hasArrived: true,
    };
  }

  if (pathNodes.length === 1) {
    const single = pathNodes[0];
    return {
      segmentIndex: 0,
      segmentProgressMeters: 0,
      x: single.x,
      y: single.y,
      floorId: single.floorId,
      buildingId: single.buildingId,
      heading: 0,
      stepIndex: 0,
      remainingMeters: 0,
      hasArrived: true,
    };
  }

  // Pre-calculate segment lengths
  const connMap = new Map<string, NavigationConnection>();
  for (const c of connections) {
    connMap.set(`${c.startNodeId}_${c.endNodeId}`, c);
    connMap.set(`${c.endNodeId}_${c.startNodeId}`, c);
  }

  const getSegmentLength = (idx: number): number => {
    if (idx < 0 || idx >= pathNodes.length - 1) return 1;
    const n1 = pathNodes[idx];
    const n2 = pathNodes[idx + 1];
    const c = connMap.get(`${n1.id}_${n2.id}`);
    if (c) return c.distanceMeters;
    return Math.max(1, Math.round(Math.hypot(n2.x - n1.x, n2.y - n1.y)));
  };

  let segIdx = Math.max(0, Math.min(currentState.segmentIndex, pathNodes.length - 2));
  let progMeters = currentState.segmentProgressMeters + distanceMetersMoved;
  let floorChanged: RouteProgressState['floorChanged'] | undefined;

  // Move forward through segments if progress exceeds current segment length
  while (segIdx < pathNodes.length - 2) {
    const segLen = getSegmentLength(segIdx);
    if (progMeters >= segLen) {
      progMeters -= segLen;
      const prevNode = pathNodes[segIdx];
      segIdx += 1;
      const currNode = pathNodes[segIdx];

      // Check if this segment was a floor change
      if (prevNode.floorId !== currNode.floorId) {
        const isStairs = prevNode.nodeType === 'staircase' || currNode.nodeType === 'staircase';
        floorChanged = {
          fromFloorId: prevNode.floorId,
          toFloorId: currNode.floorId,
          via: isStairs ? 'staircase' : 'elevator',
        };
      }
    } else {
      break;
    }
  }

  const lastSegLen = getSegmentLength(segIdx);
  const isAtFinalSegment = segIdx === pathNodes.length - 2;

  let hasArrived = false;
  if (isAtFinalSegment && progMeters >= lastSegLen - 0.5) {
    hasArrived = true;
    progMeters = lastSegLen;
  }

  // Interpolate coordinates along the active segment
  const nStart = pathNodes[segIdx];
  const nEnd = pathNodes[segIdx + 1];
  const t = Math.min(1, Math.max(0, lastSegLen > 0 ? progMeters / lastSegLen : 1));

  const interpX = Math.round(nStart.x + t * (nEnd.x - nStart.x));
  const interpY = Math.round(nStart.y + t * (nEnd.y - nStart.y));
  const heading = calculateSegmentHeading(nStart, nEnd);

  // Map to instruction step
  let stepIndex = Math.min(segIdx, steps.length - 1);
  if (hasArrived) {
    stepIndex = steps.length - 1;
  } else if (lastSegLen - progMeters <= 2.5 && stepIndex < steps.length - 2) {
    // Within 2.5m of the turn node: lookahead to next instruction
    stepIndex = Math.min(stepIndex + 1, steps.length - 1);
  }

  // Calculate total remaining meters
  let remainingMeters = Math.max(0, lastSegLen - progMeters);
  for (let k = segIdx + 1; k < pathNodes.length - 1; k++) {
    remainingMeters += getSegmentLength(k);
  }
  remainingMeters = Math.round(remainingMeters);

  return {
    segmentIndex: segIdx,
    segmentProgressMeters: progMeters,
    x: interpX,
    y: interpY,
    floorId: t > 0.5 ? nEnd.floorId : nStart.floorId,
    buildingId: t > 0.5 ? nEnd.buildingId : nStart.buildingId,
    heading,
    stepIndex,
    remainingMeters,
    hasArrived,
    floorChanged,
  };
}
