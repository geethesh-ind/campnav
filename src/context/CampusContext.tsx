import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import {
  Building,
  Floor,
  CampusLocation,
  NavigationNode,
  NavigationConnection,
  QRCheckpoint,
  BLEBeacon,
  UserPosition,
  CalculatedRoute,
  RoutingPreference,
  WrongDirectionStatus,
  PositioningMethod,
} from '../types/campus';
import {
  CampusDatabase,
  getDefaultCampusData,
} from '../data/initialCampusData';
import {
  findOptimalPath,
  generateNavigationSteps,
  detectWrongDirection,
  advanceRouteProgress,
  calculateSegmentHeading,
} from '../utils/navigationEngine';
import { soundEffects } from '../utils/audioAlert';
import { realtimeMotion, MotionTelemetry } from '../utils/realtimeMotion';

const STORAGE_KEY = 'campusnav_db_v4_cec';

interface CampusContextType {
  // Database
  buildings: Building[];
  floors: Floor[];
  locations: CampusLocation[];
  nodes: NavigationNode[];
  connections: NavigationConnection[];
  qrCheckpoints: QRCheckpoint[];
  beacons: BLEBeacon[];

  // View state
  activeBuildingId: string | null;
  activeFloorId: string | null;
  selectedDestination: CampusLocation | null;
  startLocation: CampusLocation | null;
  routingPreference: RoutingPreference;
  searchQuery: string;

  // Navigation state
  isNavigating: boolean;
  activeRoute: CalculatedRoute | null;
  currentStepIndex: number;
  userPosition: UserPosition;
  wrongDirectionStatus: WrongDirectionStatus | null;
  isSimulatingWalk: boolean;
  simulationSpeed: number;

  // Positioning details
  positioningMethod: PositioningMethod;

  // Real-time Motion & Sensor Live Tracking
  isLiveTracking: boolean;
  toggleLiveTracking: () => void;
  motionTelemetry: MotionTelemetry;
  stepMetersForward: (meters?: number) => void;
  requestMotionPermission: () => Promise<boolean>;
  isFollowUser: boolean;
  toggleFollowUser: () => void;
  remainingDistanceMeters: number;

  // Actions
  setActiveBuildingId: (id: string | null) => void;
  setActiveFloorId: (id: string | null) => void;
  setSelectedDestination: (loc: CampusLocation | null) => void;
  setStartLocation: (loc: CampusLocation | null) => void;
  setRoutingPreference: (pref: RoutingPreference) => void;
  setSearchQuery: (query: string) => void;

  startNavigation: (destination?: CampusLocation, startLoc?: CampusLocation) => void;
  stopNavigation: () => void;
  recalculateRoute: () => void;
  stepForward: () => void;
  stepBackward: () => void;
  toggleSimulation: () => void;
  setSimulationSpeed: (speed: number) => void;
  simulateWrongTurn: () => void;
  setUserPositionManual: (pos: Partial<UserPosition>) => void;
  confirmLocationByQR: (qrCode: string) => { success: boolean; message: string; checkpoint?: QRCheckpoint };
  simulateBLEScan: () => void;
  requestRealGPS: () => Promise<boolean>;

  // Admin mutation actions
  addBuilding: (b: Building) => void;
  updateBuilding: (b: Building) => void;
  deleteBuilding: (id: string) => void;
  addFloor: (f: Floor) => void;
  updateFloor: (f: Floor) => void;
  deleteFloor: (id: string) => void;
  addLocation: (loc: CampusLocation) => void;
  updateLocation: (loc: CampusLocation) => void;
  deleteLocation: (id: string) => void;
  addNode: (node: NavigationNode) => void;
  updateNode: (node: NavigationNode) => void;
  deleteNode: (id: string) => void;
  addConnection: (conn: NavigationConnection) => void;
  deleteConnection: (id: string) => void;
  addQRCheckpoint: (qr: QRCheckpoint) => void;
  deleteQRCheckpoint: (id: string) => void;
  resetToDefaultData: () => void;
  importDatabaseJson: (json: string) => boolean;
  exportDatabaseJson: () => string;

  // Dev-only Edit Mode
  isEditMode: boolean;
  setIsEditMode: (val: boolean) => void;
  editTool: 'add' | 'move' | 'connect' | 'delete';
  setEditTool: (tool: 'add' | 'move' | 'connect' | 'delete') => void;
  selectedEditNodeId: string | null;
  setSelectedEditNodeId: (id: string | null) => void;
  addNodeAtCoords: (x: number, y: number, floorId: string, nodeType?: any, label?: string) => void;
  moveNodeToCoords: (nodeId: string, x: number, y: number) => void;
  connectNodesDev: (startId: string, endId: string) => void;
  exportCampusJsonFile: () => void;
  getShareableRouteUrl: () => string;
}

const CampusContext = createContext<CampusContextType | undefined>(undefined);

export const CampusProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // 1. Initial State from localStorage or default
  const [database, setDatabase] = useState<CampusDatabase>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.buildings && parsed.locations && parsed.nodes) {
          return parsed;
        }
      }
    } catch {
      // Fallback
    }
    return getDefaultCampusData();
  });

  // Save to localStorage when database changes
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(database));
    } catch {
      // Storage quota or disabled
    }
  }, [database]);

  // View state
  const [activeBuildingId, setActiveBuildingIdState] = useState<string | null>(null);
  const [activeFloorId, setActiveFloorIdState] = useState<string | null>(null);
  const [selectedDestination, setSelectedDestination] = useState<CampusLocation | null>(null);
  const [startLocation, setStartLocation] = useState<CampusLocation | null>(null);
  const [routingPreference, setRoutingPreference] = useState<RoutingPreference>('shortest');
  const [searchQuery, setSearchQuery] = useState('');

  // Initial user position: Main Campus Entrance Gate (Outdoor)
  const [userPosition, setUserPosition] = useState<UserPosition>({
    x: 500,
    y: 560,
    buildingId: 'outdoor',
    floorId: 'outdoor',
    heading: 0,
    method: 'gps',
    accuracyMeters: 8,
    lastUpdated: Date.now(),
    confirmedLocationName: 'Canara Engineering College Main Gate',
  });

  // Navigation State
  const [isNavigating, setIsNavigating] = useState(false);
  const [activeRoute, setActiveRoute] = useState<CalculatedRoute | null>(null);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [wrongDirectionStatus, setWrongDirectionStatus] = useState<WrongDirectionStatus | null>(null);
  const [isSimulatingWalk, setIsSimulatingWalk] = useState(false);
  const [simulationSpeed, setSimulationSpeed] = useState(1);

  // Real-Time Motion Tracking State
  const [isLiveTracking, setIsLiveTracking] = useState(true);
  const [motionTelemetry, setMotionTelemetry] = useState<MotionTelemetry>(() => realtimeMotion.getTelemetry());
  const [isFollowUser, setIsFollowUser] = useState(true);
  const [remainingDistanceMeters, setRemainingDistanceMeters] = useState(0);

  // Dev-only Edit Mode State
  const [isEditMode, setIsEditMode] = useState(false);
  const [editTool, setEditTool] = useState<'add' | 'move' | 'connect' | 'delete'>('add');
  const [selectedEditNodeId, setSelectedEditNodeId] = useState<string | null>(null);

  const simulationTimerRef = useRef<number | null>(null);

  // References to avoid stale closures in sensor callbacks
  const activeRouteRef = useRef<CalculatedRoute | null>(null);
  activeRouteRef.current = activeRoute;

  const isNavigatingRef = useRef(false);
  isNavigatingRef.current = isNavigating;

  const userPositionRef = useRef<UserPosition>(userPosition);
  userPositionRef.current = userPosition;

  const startLocationRef = useRef<CampusLocation | null>(startLocation);
  startLocationRef.current = startLocation;

  const selectedDestinationRef = useRef<CampusLocation | null>(selectedDestination);
  selectedDestinationRef.current = selectedDestination;

  const routingPreferenceRef = useRef<RoutingPreference>(routingPreference);
  routingPreferenceRef.current = routingPreference;

  const routeProgressRef = useRef<{ segmentIndex: number; segmentProgressMeters: number }>({
    segmentIndex: 0,
    segmentProgressMeters: 0,
  });

  const currentStepIndexRef = useRef<number>(0);
  currentStepIndexRef.current = currentStepIndex;

  const hasArrivedAlertedRef = useRef<boolean>(false);
  const wakeLockRef = useRef<{ release: () => Promise<void> } | null>(null);

  // Keep mobile screen awake during active turn-by-turn navigation (Screen Wake Lock API)
  useEffect(() => {
    const requestWakeLock = async () => {
      try {
        const navAny = navigator as unknown as {
          wakeLock?: { request: (type: 'screen') => Promise<{ release: () => Promise<void> }> };
        };
        if (isNavigating && navAny.wakeLock) {
          wakeLockRef.current = await navAny.wakeLock.request('screen');
        } else if (!isNavigating && wakeLockRef.current) {
          await wakeLockRef.current.release();
          wakeLockRef.current = null;
        }
      } catch {
        // WakeLock may be disallowed in background tab or low battery mode
      }
    };
    requestWakeLock();
    return () => {
      if (wakeLockRef.current) {
        wakeLockRef.current.release().catch(() => {});
        wakeLockRef.current = null;
      }
    };
  }, [isNavigating]);

  // Helper to switch active building & floor seamlessly
  const setActiveBuildingId = useCallback((bId: string | null) => {
    setActiveBuildingIdState(bId);
    if (!bId || bId === 'outdoor') {
      setActiveFloorIdState('outdoor');
    } else {
      const b = database.buildings.find(item => item.id === bId);
      if (b && b.floorIds.length > 0) {
        // default to Ground Floor if available, otherwise first floor
        const ground = database.floors.find(f => f.buildingId === bId && f.floorNumber === 0);
        setActiveFloorIdState(ground ? ground.id : b.floorIds[0]);
      }
    }
  }, [database.buildings, database.floors]);

  const setActiveFloorId = useCallback((fId: string | null) => {
    setActiveFloorIdState(fId);
    if (fId && fId !== 'outdoor') {
      const floor = database.floors.find(f => f.id === fId);
      if (floor) {
        setActiveBuildingIdState(floor.buildingId);
      }
    }
  }, [database.floors]);

  // Post updated telemetry to backend endpoint
  const syncWithBackend = useCallback((data: {
    x: number;
    y: number;
    floorId: string;
    buildingId: string;
    heading: number;
    status: 'walking' | 'stationary' | 'arrived';
    destination?: string;
  }) => {
    try {
      fetch('/api/live-location', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...data,
          stepCount: realtimeMotion.getTelemetry().stepCount,
          speed: realtimeMotion.getTelemetry().currentSpeedMps,
        }),
      }).catch(() => {});
    } catch {
      // Backend offline or non-blocking
    }
  }, []);

  // Find nearest node to a user position
  const getNearestNodeId = useCallback((pos: { x: number; y: number; buildingId: string; floorId: string }): string => {
    let closestNode = database.nodes[0];
    let minDistance = Infinity;

    // First try matching floor and building
    const sameFloorNodes = database.nodes.filter(
      n => n.floorId === pos.floorId && n.buildingId === pos.buildingId
    );

    const candidates = sameFloorNodes.length > 0 ? sameFloorNodes : database.nodes;

    for (const node of candidates) {
      const d = Math.hypot(node.x - pos.x, node.y - pos.y);
      if (d < minDistance) {
        minDistance = d;
        closestNode = node;
      }
    }

    return closestNode.id;
  }, [database.nodes]);

  // Core movement progression engine (called on steps, GPS deltas, simulation, or manual walk)
  const processPhysicalMovement = useCallback((distanceMetersMoved: number) => {
    if (!activeRouteRef.current || !isNavigatingRef.current) {
      // Free-roaming dead reckoning based on heading
      setUserPosition(prev => {
        const headingRad = ((prev.heading - 90) * Math.PI) / 180;
        const scale = prev.floorId === 'outdoor' ? 2.5 : 4.5;
        const dx = Math.cos(headingRad) * distanceMetersMoved * scale;
        const dy = Math.sin(headingRad) * distanceMetersMoved * scale;
        const nextX = Math.max(30, Math.min(970, Math.round(prev.x + dx)));
        const nextY = Math.max(30, Math.min(620, Math.round(prev.y + dy)));

        syncWithBackend({
          x: nextX,
          y: nextY,
          floorId: prev.floorId,
          buildingId: prev.buildingId,
          heading: prev.heading,
          status: 'walking',
        });

        return {
          ...prev,
          x: nextX,
          y: nextY,
          lastUpdated: Date.now(),
        };
      });
      return;
    }

    const route = activeRouteRef.current;
    const progressResult = advanceRouteProgress(
      route.nodePath,
      database.connections,
      route.steps,
      routeProgressRef.current,
      distanceMetersMoved
    );

    routeProgressRef.current = {
      segmentIndex: progressResult.segmentIndex,
      segmentProgressMeters: progressResult.segmentProgressMeters,
    };

    const prevStepIdx = currentStepIndexRef.current;
    setRemainingDistanceMeters(progressResult.remainingMeters);
    setCurrentStepIndex(progressResult.stepIndex);
    currentStepIndexRef.current = progressResult.stepIndex;

    // Building or Floor transition
    if (progressResult.floorChanged) {
      setActiveBuildingIdState(progressResult.buildingId === 'outdoor' ? null : progressResult.buildingId);
      setActiveFloorIdState(progressResult.floorChanged.toFloorId);
      soundEffects.playRecalculatingChime();
      const activeStep = route.steps[progressResult.stepIndex];
      if (activeStep) {
        soundEffects.vibrateStepTransition(activeStep.action);
      }
    } else {
      setActiveBuildingIdState(progressResult.buildingId === 'outdoor' ? null : progressResult.buildingId);
      setActiveFloorIdState(progressResult.floorId);

      // Trigger turn/waypoint vibration & chime when advancing to a new instruction step
      if (progressResult.stepIndex !== prevStepIdx && !progressResult.hasArrived) {
        const nextInstruction = route.steps[progressResult.stepIndex];
        if (nextInstruction) {
          if (
            nextInstruction.action === 'turn_left' ||
            nextInstruction.action === 'turn_right' ||
            nextInstruction.action === 'straight'
          ) {
            soundEffects.playTurnChime(nextInstruction.action);
          } else {
            soundEffects.vibrateStepTransition(nextInstruction.action);
          }
        }
      }
    }

    // Arrival — keep navigation sheet open showing "Arrive at destination" so user can see arrival state
    // Guard with hasArrivedAlertedRef so arrival vibration & chime fire once per arrival
    if (progressResult.hasArrived && !hasArrivedAlertedRef.current) {
      hasArrivedAlertedRef.current = true;
      soundEffects.playArrivalChime();
      setIsSimulatingWalk(false);
    }

    // Update user position
    setUserPosition(prev => ({
      ...prev,
      x: progressResult.x,
      y: progressResult.y,
      floorId: progressResult.floorId,
      buildingId: progressResult.buildingId,
      heading: progressResult.heading,
      lastUpdated: Date.now(),
      confirmedLocationName: route.nodePath[progressResult.segmentIndex]?.label || prev.confirmedLocationName,
    }));

    syncWithBackend({
      x: progressResult.x,
      y: progressResult.y,
      floorId: progressResult.floorId,
      buildingId: progressResult.buildingId,
      heading: progressResult.heading,
      status: progressResult.hasArrived ? 'arrived' : 'walking',
      destination: route.destinationLocationName,
    });
  }, [database.connections, syncWithBackend]);

  // Wire up physical smartphone hardware sensors (devicemotion, deviceorientation, GPS)
  useEffect(() => {
    if (isLiveTracking) {
      realtimeMotion.startListening();
    } else {
      realtimeMotion.stopListening();
    }

    const unsubStep = realtimeMotion.onStep(meters => {
      processPhysicalMovement(meters);
    });

    const unsubHeading = realtimeMotion.onHeading(deg => {
      setUserPosition(p => ({ ...p, heading: deg, lastUpdated: Date.now() }));
    });

    const unsubTelemetry = realtimeMotion.onTelemetry(t => {
      setMotionTelemetry(t);
    });

    return () => {
      unsubStep();
      unsubHeading();
      unsubTelemetry();
    };
  }, [isLiveTracking, processPhysicalMovement]);

  // Toggle live sensor tracking
  const toggleLiveTracking = useCallback(() => {
    setIsLiveTracking(prev => !prev);
  }, []);

  // Toggle camera follow user
  const toggleFollowUser = useCallback(() => {
    setIsFollowUser(prev => !prev);
  }, []);

  // Manual step forward (e.g. for testing)
  const stepMetersForward = useCallback((meters = 1.4) => {
    soundEffects.vibrateFootstep();
    // realtimeMotion.registerStep triggers onStep listener -> processPhysicalMovement(meters)
    realtimeMotion.registerStep(meters, 'simulated');
  }, []);

  // Request permissions for iOS 13+ devices
  const requestMotionPermission = useCallback(async (): Promise<boolean> => {
    const res = await realtimeMotion.requestSensorPermission();
    if (res.granted) {
      setIsLiveTracking(true);
      return true;
    }
    if (res.error) {
      alert(res.error);
    }
    return false;
  }, []);

  // Calculate Route function
  const computeRoute = useCallback((
    destination: CampusLocation,
    startLoc: CampusLocation | null,
    pos: UserPosition,
    pref: RoutingPreference
  ): CalculatedRoute | null => {
    const startNodeId = startLoc ? startLoc.associatedNodeId : getNearestNodeId(pos);
    const destNodeId = destination.associatedNodeId;

    const pathResult = findOptimalPath(
      startNodeId,
      destNodeId,
      database.nodes,
      database.connections,
      pref
    );

    if (!pathResult) return null;

    const pathNodes = pathResult.pathNodeIds.map(id => database.nodes.find(n => n.id === id)!);
    const steps = generateNavigationSteps(
      pathNodes,
      database.connections,
      database.floors,
      database.buildings,
      destination.name
    );

    const estMinutes = Math.max(1, Math.round(pathResult.totalDistanceMeters / 60));

    return {
      id: `route_${Date.now()}`,
      totalDistanceMeters: pathResult.totalDistanceMeters,
      estimatedTimeMinutes: estMinutes,
      steps,
      nodePath: pathNodes,
      connectionIds: pathResult.connectionIds,
      preference: pref,
      startLocationName: startLoc ? startLoc.name : pos.confirmedLocationName || 'Current Location',
      destinationLocationName: destination.name,
      destinationLocation: destination,
      startNodeId,
      destinationNodeId: destNodeId,
    };
  }, [database.connections, database.floors, database.buildings, database.nodes, getNearestNodeId]);

  // Start Navigation
  const startNavigation = useCallback((
    dest?: CampusLocation,
    start?: CampusLocation
  ) => {
    const targetDest = dest || selectedDestinationRef.current;
    if (!targetDest) return;

    // Attempt to unlock mobile motion sensors, audio & haptics on user's Start Navigation tap gesture
    soundEffects.unlockMobileAudioAndHaptics();
    realtimeMotion.requestSensorPermission().catch(() => {});

    const explicitStart = start !== undefined ? start : startLocationRef.current;
    const currentPos = userPositionRef.current;
    const currentPref = routingPreferenceRef.current;
    const route = computeRoute(targetDest, explicitStart, currentPos, currentPref);
    if (!route) {
      alert('Could not find a walkable path with the selected preferences.');
      return;
    }

    activeRouteRef.current = route;
    isNavigatingRef.current = true;
    hasArrivedAlertedRef.current = false;
    currentStepIndexRef.current = 0;
    setActiveRoute(route);
    setCurrentStepIndex(0);
    setRemainingDistanceMeters(route.totalDistanceMeters);
    setIsNavigating(true);
    setWrongDirectionStatus(null);
    setSelectedDestination(targetDest);
    soundEffects.vibrateNavigationStart();

    // Reset progress tracking to start
    routeProgressRef.current = { segmentIndex: 0, segmentProgressMeters: 0 };

    // Auto switch map view to current route start floor/building
    if (route.nodePath.length > 0) {
      const first = route.nodePath[0];
      const second = route.nodePath[1];
      const initialHeading = second ? calculateSegmentHeading(first, second) : 0;

      setUserPosition(prev => ({
        ...prev,
        x: first.x,
        y: first.y,
        buildingId: first.buildingId,
        floorId: first.floorId,
        heading: initialHeading,
        method: explicitStart ? 'manual' : prev.method,
        accuracyMeters: 1,
        lastUpdated: Date.now(),
        confirmedLocationName: explicitStart ? explicitStart.name : (first.label || prev.confirmedLocationName),
      }));

      setActiveBuildingIdState(first.buildingId === 'outdoor' ? null : first.buildingId);
      setActiveFloorIdState(first.floorId);
    }
  }, [computeRoute]);

  // Automatically recalculate active route if user changes routing preference (Shortest / Fewer Stairs / Wheelchair)
  useEffect(() => {
    if (!isNavigating || !activeRoute) return;
    if (activeRoute.preference === routingPreference) return;
    const updated = computeRoute(
      activeRoute.destinationLocation,
      null,
      userPosition,
      routingPreference
    );
    if (updated) {
      hasArrivedAlertedRef.current = false;
      currentStepIndexRef.current = 0;
      setActiveRoute(updated);
      setCurrentStepIndex(0);
      setRemainingDistanceMeters(updated.totalDistanceMeters);
      setWrongDirectionStatus(null);
      routeProgressRef.current = { segmentIndex: 0, segmentProgressMeters: 0 };
    }
  }, [routingPreference, isNavigating, activeRoute, computeRoute, userPosition]);

  // Stop Navigation
  const stopNavigation = useCallback(() => {
    soundEffects.stopVibration();
    hasArrivedAlertedRef.current = false;
    currentStepIndexRef.current = 0;
    setIsNavigating(false);
    setActiveRoute(null);
    setCurrentStepIndex(0);
    setWrongDirectionStatus(null);
    setIsSimulatingWalk(false);
    routeProgressRef.current = { segmentIndex: 0, segmentProgressMeters: 0 };
    if (simulationTimerRef.current) {
      clearInterval(simulationTimerRef.current);
      simulationTimerRef.current = null;
    }
  }, []);

  // Recalculate Route (used after wrong turn or manual request)
  const recalculateRoute = useCallback(() => {
    if (!activeRoute || !activeRoute.destinationLocation) return;
    soundEffects.playRecalculatingChime();

    const newRoute = computeRoute(
      activeRoute.destinationLocation,
      null, // from current user position
      userPosition,
      routingPreference
    );

    if (newRoute) {
      hasArrivedAlertedRef.current = false;
      currentStepIndexRef.current = 0;
      setActiveRoute(newRoute);
      setCurrentStepIndex(0);
      setRemainingDistanceMeters(newRoute.totalDistanceMeters);
      setWrongDirectionStatus(null);
      routeProgressRef.current = { segmentIndex: 0, segmentProgressMeters: 0 };
      // Align view to user's updated position
      setActiveBuildingIdState(userPosition.buildingId === 'outdoor' ? null : userPosition.buildingId);
      setActiveFloorIdState(userPosition.floorId);
    }
  }, [activeRoute, computeRoute, userPosition, routingPreference]);

  // Step Forward in Navigation (Manual jump to next landmark)
  const stepForward = useCallback(() => {
    const route = activeRouteRef.current;
    if (!route) return;

    if (currentStepIndex >= route.steps.length - 1) {
      // Arrived!
      if (!hasArrivedAlertedRef.current) {
        hasArrivedAlertedRef.current = true;
        soundEffects.playArrivalChime();
      }
      setIsSimulatingWalk(false);
      return;
    }

    const nextIndex = currentStepIndex + 1;
    setCurrentStepIndex(nextIndex);
    currentStepIndexRef.current = nextIndex;

    // Move user position to the startNode of the next step (or endNode if arrive step)
    const nextStep = route.steps[nextIndex];
    const nextNode = nextStep ? nextStep.startNode : route.nodePath[Math.min(nextIndex, route.nodePath.length - 1)];
    if (nextNode) {
      const nodeIdxInPath = Math.max(0, route.nodePath.findIndex(n => n.id === nextNode.id));
      routeProgressRef.current = {
        segmentIndex: Math.min(nodeIdxInPath, Math.max(0, route.nodePath.length - 2)),
        segmentProgressMeters: 0,
      };

      const nextNextNode = route.nodePath[Math.min(nodeIdxInPath + 1, route.nodePath.length - 1)];
      const heading = nextNextNode && nextNextNode.id !== nextNode.id
        ? calculateSegmentHeading(nextNode, nextNextNode)
        : userPositionRef.current.heading;

      const remaining = route.steps
        .slice(nextIndex)
        .reduce((acc, s) => acc + s.distanceMeters, 0);
      setRemainingDistanceMeters(remaining);

      setUserPosition(prev => ({
        ...prev,
        x: nextNode.x,
        y: nextNode.y,
        buildingId: nextNode.buildingId,
        floorId: nextNode.floorId,
        heading,
        lastUpdated: Date.now(),
        confirmedLocationName: nextNode.label || prev.confirmedLocationName,
      }));

      // Auto update active view if floor changed
      setActiveBuildingIdState(nextNode.buildingId === 'outdoor' ? null : nextNode.buildingId);
      setActiveFloorIdState(nextNode.floorId);

      if (nextStep?.action === 'arrive') {
        hasArrivedAlertedRef.current = true;
        soundEffects.playArrivalChime();
        setIsSimulatingWalk(false);
      } else if (nextStep) {
        if (
          nextStep.action === 'turn_left' ||
          nextStep.action === 'turn_right' ||
          nextStep.action === 'straight'
        ) {
          soundEffects.playTurnChime(nextStep.action);
        } else {
          soundEffects.vibrateStepTransition(nextStep.action);
        }
      }
    }

    setWrongDirectionStatus(null);
  }, [currentStepIndex]);

  // Step Backward
  const stepBackward = useCallback(() => {
    if (!activeRoute || currentStepIndex <= 0) return;
    hasArrivedAlertedRef.current = false;
    const prevIndex = currentStepIndex - 1;
    setCurrentStepIndex(prevIndex);
    currentStepIndexRef.current = prevIndex;
    const prevStep = activeRoute.steps[prevIndex];
    const prevNode = prevStep ? prevStep.startNode : activeRoute.nodePath[prevIndex];
    if (prevNode) {
      const nodeIdxInPath = Math.max(0, activeRoute.nodePath.findIndex(n => n.id === prevNode.id));
      routeProgressRef.current = { segmentIndex: nodeIdxInPath, segmentProgressMeters: 0 };
      const remaining = activeRoute.steps
        .slice(prevIndex)
        .reduce((acc, s) => acc + s.distanceMeters, 0);
      setRemainingDistanceMeters(remaining);
      setUserPosition(prev => ({
        ...prev,
        x: prevNode.x,
        y: prevNode.y,
        buildingId: prevNode.buildingId,
        floorId: prevNode.floorId,
        lastUpdated: Date.now(),
      }));
      setActiveBuildingIdState(prevNode.buildingId === 'outdoor' ? null : prevNode.buildingId);
      setActiveFloorIdState(prevNode.floorId);
      if (prevStep) {
        soundEffects.vibrateStepTransition(prevStep.action);
      }
    }
  }, [activeRoute, currentStepIndex]);

  // Simulate Wrong Turn to demonstrate Wrong-Direction Detection
  const simulateWrongTurn = useCallback(() => {
    if (!isNavigating || !activeRoute) return;

    // Displace user significantly from current path node
    setUserPosition(prev => {
      const wrongPos: UserPosition = {
        ...prev,
        x: prev.x + 85, // 85 pixels / meters off corridor
        y: prev.y + 70,
        lastUpdated: Date.now(),
        confirmedLocationName: 'Off Route Corridor',
      };

      const check = detectWrongDirection(
        wrongPos,
        activeRoute.nodePath,
        currentStepIndex,
        15
      );

      if (check.isWrongDirection) {
        soundEffects.playWrongDirectionAlert();
        setWrongDirectionStatus(check);

        // Auto-recalculate after 2.5 seconds like real Google Maps
        setTimeout(() => {
          recalculateRoute();
        }, 2200);
      }

      return wrongPos;
    });
  }, [isNavigating, activeRoute, currentStepIndex, recalculateRoute]);

  // Continuous Smooth Walk Simulation (Virtual Live Walk at 20fps)
  const toggleSimulation = useCallback(() => {
    setIsSimulatingWalk(prev => !prev);
  }, []);

  useEffect(() => {
    if (isSimulatingWalk && isNavigating && activeRoute) {
      const intervalMs = 50; // 20 frames per second smooth gliding
      const metersPerTick = (1.25 * simulationSpeed * intervalMs) / 1000;
      let tickCount = 0;

      simulationTimerRef.current = window.setInterval(() => {
        tickCount += 1;
        // Periodically register simulated step for step counter telemetry without double-advancing distance
        if (tickCount % 12 === 0) {
          realtimeMotion.registerStep(metersPerTick, 'simulated');
        } else {
          processPhysicalMovement(metersPerTick);
        }
      }, intervalMs);
    } else {
      if (simulationTimerRef.current) {
        clearInterval(simulationTimerRef.current);
        simulationTimerRef.current = null;
      }
    }

    return () => {
      if (simulationTimerRef.current) {
        clearInterval(simulationTimerRef.current);
        simulationTimerRef.current = null;
      }
    };
  }, [isSimulatingWalk, isNavigating, activeRoute, simulationSpeed, processPhysicalMovement]);

  // Set User Position Manually (e.g. clicking on map)
  const setUserPositionManual = useCallback((pos: Partial<UserPosition>) => {
    setUserPosition(prev => {
      const updated = {
        ...prev,
        ...pos,
        lastUpdated: Date.now(),
      };

      if (isNavigating && activeRoute) {
        const check = detectWrongDirection(
          { x: updated.x, y: updated.y, floorId: updated.floorId, buildingId: updated.buildingId },
          activeRoute.nodePath,
          currentStepIndex
        );
        if (check.isWrongDirection) {
          soundEffects.playWrongDirectionAlert();
          setWrongDirectionStatus(check);
        } else {
          setWrongDirectionStatus(null);
        }
      }

      return updated;
    });
  }, [isNavigating, activeRoute, currentStepIndex]);

  // QR-Based Exact Checkpoint Location Confirmation
  const confirmLocationByQR = useCallback((qrCode: string): { success: boolean; message: string; checkpoint?: QRCheckpoint } => {
    const checkpoint = database.qrCheckpoints.find(q => q.code === qrCode);
    if (!checkpoint) {
      return { success: false, message: 'Invalid or unknown QR code. Please scan an authorized CampusNav checkpoint.' };
    }

    setUserPosition({
      x: checkpoint.coordinates.x,
      y: checkpoint.coordinates.y,
      buildingId: checkpoint.buildingId,
      floorId: checkpoint.floorId,
      heading: 0,
      method: 'qr',
      accuracyMeters: 0.5, // 100% precise
      lastUpdated: Date.now(),
      confirmedLocationName: checkpoint.label,
    });

    setActiveBuildingIdState(checkpoint.buildingId === 'outdoor' ? null : checkpoint.buildingId);
    setActiveFloorIdState(checkpoint.floorId);
    soundEffects.vibrateQRConfirmed();

    // If currently navigating, check if route matches or recalculate
    if (isNavigating && activeRoute) {
      const check = detectWrongDirection(
        { x: checkpoint.coordinates.x, y: checkpoint.coordinates.y, floorId: checkpoint.floorId, buildingId: checkpoint.buildingId },
        activeRoute.nodePath,
        currentStepIndex
      );

      if (check.isWrongDirection) {
        soundEffects.playWrongDirectionAlert();
        setWrongDirectionStatus(check);
        setTimeout(() => recalculateRoute(), 1200);
      } else {
        setWrongDirectionStatus(null);
      }
    }

    return {
      success: true,
      message: `Verified Location: ${checkpoint.label}`,
      checkpoint,
    };
  }, [database.qrCheckpoints, isNavigating, activeRoute, currentStepIndex, recalculateRoute]);

  // Simulate BLE Beacon Proximity Detection
  const simulateBLEScan = useCallback(() => {
    if (database.beacons.length === 0) return;
    // Pick nearest beacon to active building or first beacon
    const targetBeacon = database.beacons.find(b => b.buildingId === activeBuildingId) || database.beacons[0];
    const node = database.nodes.find(n => n.id === targetBeacon.nodeId);
    if (!node) return;

    setUserPosition({
      x: node.x,
      y: node.y,
      buildingId: targetBeacon.buildingId,
      floorId: targetBeacon.floorId,
      heading: 90,
      method: 'ble',
      accuracyMeters: 2.5,
      lastUpdated: Date.now(),
      confirmedLocationName: `BLE: ${targetBeacon.label}`,
    });

    setActiveBuildingIdState(targetBeacon.buildingId === 'outdoor' ? null : targetBeacon.buildingId);
    setActiveFloorIdState(targetBeacon.floorId);
  }, [database.beacons, database.nodes, activeBuildingId]);

  // Outdoor Real GPS integration
  const requestRealGPS = useCallback(async (): Promise<boolean> => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser.');
      return false;
    }

    return new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          // In real campus, lat/long is converted via affine transformation to campus coordinates.
          // For demo, we snap to campus outdoor walkway with high accuracy GPS metadata
          setUserPosition(prev => ({
            ...prev,
            method: 'gps',
            accuracyMeters: Math.round(pos.coords.accuracy || 10),
            lastUpdated: Date.now(),
            confirmedLocationName: `GPS Fix (±${Math.round(pos.coords.accuracy || 10)}m outdoor accuracy)`,
          }));
          resolve(true);
        },
        () => {
          alert('GPS permission was denied or signal is unavailable indoors. Switching to QR / BLE indoor positioning.');
          resolve(false);
        },
        { enableHighAccuracy: true, timeout: 8000 }
      );
    });
  }, []);

  // Admin database mutation functions
  const addBuilding = useCallback((b: Building) => {
    setDatabase(prev => ({ ...prev, buildings: [...prev.buildings, b] }));
  }, []);

  const updateBuilding = useCallback((b: Building) => {
    setDatabase(prev => ({
      ...prev,
      buildings: prev.buildings.map(item => (item.id === b.id ? b : item)),
    }));
  }, []);

  const deleteBuilding = useCallback((id: string) => {
    setDatabase(prev => ({
      ...prev,
      buildings: prev.buildings.filter(b => b.id !== id),
      floors: prev.floors.filter(f => f.buildingId !== id),
      locations: prev.locations.filter(l => l.buildingId !== id),
      nodes: prev.nodes.filter(n => n.buildingId !== id),
    }));
  }, []);

  const addFloor = useCallback((f: Floor) => {
    setDatabase(prev => ({
      ...prev,
      floors: [...prev.floors, f],
      buildings: prev.buildings.map(b => (b.id === f.buildingId ? { ...b, floorIds: [...b.floorIds, f.id] } : b)),
    }));
  }, []);

  const updateFloor = useCallback((f: Floor) => {
    setDatabase(prev => ({
      ...prev,
      floors: prev.floors.map(item => (item.id === f.id ? f : item)),
    }));
  }, []);

  const deleteFloor = useCallback((id: string) => {
    setDatabase(prev => ({
      ...prev,
      floors: prev.floors.filter(f => f.id !== id),
      locations: prev.locations.filter(l => l.floorId !== id),
      nodes: prev.nodes.filter(n => n.floorId !== id),
    }));
  }, []);

  const addLocation = useCallback((loc: CampusLocation) => {
    setDatabase(prev => ({ ...prev, locations: [...prev.locations, loc] }));
  }, []);

  const updateLocation = useCallback((loc: CampusLocation) => {
    setDatabase(prev => ({
      ...prev,
      locations: prev.locations.map(item => (item.id === loc.id ? loc : item)),
    }));
  }, []);

  const deleteLocation = useCallback((id: string) => {
    setDatabase(prev => ({
      ...prev,
      locations: prev.locations.filter(item => item.id !== id),
    }));
  }, []);

  const addNode = useCallback((node: NavigationNode) => {
    setDatabase(prev => ({ ...prev, nodes: [...prev.nodes, node] }));
  }, []);

  const updateNode = useCallback((node: NavigationNode) => {
    setDatabase(prev => ({
      ...prev,
      nodes: prev.nodes.map(n => (n.id === node.id ? node : n)),
    }));
  }, []);

  const deleteNode = useCallback((id: string) => {
    setDatabase(prev => ({
      ...prev,
      nodes: prev.nodes.filter(n => n.id !== id),
      connections: prev.connections.filter(c => c.startNodeId !== id && c.endNodeId !== id),
    }));
  }, []);

  const addConnection = useCallback((conn: NavigationConnection) => {
    setDatabase(prev => ({ ...prev, connections: [...prev.connections, conn] }));
  }, []);

  const deleteConnection = useCallback((id: string) => {
    setDatabase(prev => ({
      ...prev,
      connections: prev.connections.filter(c => c.id !== id),
    }));
  }, []);

  const addQRCheckpoint = useCallback((qr: QRCheckpoint) => {
    setDatabase(prev => ({ ...prev, qrCheckpoints: [...prev.qrCheckpoints, qr] }));
  }, []);

  const deleteQRCheckpoint = useCallback((id: string) => {
    setDatabase(prev => ({
      ...prev,
      qrCheckpoints: prev.qrCheckpoints.filter(q => q.id !== id),
    }));
  }, []);

  const resetToDefaultData = useCallback(() => {
    const defaultData = getDefaultCampusData();
    setDatabase(defaultData);
    localStorage.removeItem(STORAGE_KEY);
    stopNavigation();
  }, [stopNavigation]);

  const importDatabaseJson = useCallback((json: string): boolean => {
    try {
      const data = JSON.parse(json);
      if (data.buildings && data.locations && data.nodes && data.connections) {
        setDatabase(data);
        return true;
      }
    } catch {
      // Invalid
    }
    return false;
  }, []);

  const exportDatabaseJson = useCallback((): string => {
    return JSON.stringify(database, null, 2);
  }, [database]);

  // Dev-only node & edge edit helpers
  const addNodeAtCoords = useCallback((x: number, y: number, floorId: string, nodeType: any = 'junction', label = '') => {
    const floor = database.floors.find(f => f.id === floorId);
    const bId = floor ? floor.buildingId : 'block_classroom';
    const newNode: NavigationNode = {
      id: `node_custom_${Date.now()}`,
      buildingId: bId,
      floorId,
      x: Math.round(x),
      y: Math.round(y),
      nodeType,
      label: label || `Node (${Math.round(x)}, ${Math.round(y)})`,
    };
    setDatabase(prev => ({ ...prev, nodes: [...prev.nodes, newNode] }));
    setSelectedEditNodeId(newNode.id);
  }, [database.floors]);

  const moveNodeToCoords = useCallback((nodeId: string, x: number, y: number) => {
    setDatabase(prev => ({
      ...prev,
      nodes: prev.nodes.map(n => (n.id === nodeId ? { ...n, x: Math.round(x), y: Math.round(y) } : n)),
    }));
  }, []);

  const connectNodesDev = useCallback((startId: string, endId: string) => {
    if (startId === endId) return;
    const n1 = database.nodes.find(n => n.id === startId);
    const n2 = database.nodes.find(n => n.id === endId);
    if (!n1 || !n2) return;

    const dist = Math.max(3, Math.round(Math.hypot(n1.x - n2.x, n1.y - n2.y) / 10));
    const isStairs = n1.nodeType === 'staircase' && n2.nodeType === 'staircase';
    const isElevator = n1.nodeType === 'elevator' && n2.nodeType === 'elevator';

    const newConn: NavigationConnection = {
      id: `conn_dev_${Date.now()}`,
      startNodeId: startId,
      endNodeId: endId,
      distanceMeters: dist,
      connectionType: isStairs ? 'staircase' : isElevator ? 'elevator' : 'corridor',
      accessible: !isStairs,
    };
    setDatabase(prev => ({ ...prev, connections: [...prev.connections, newConn] }));
  }, [database.nodes]);

  const exportCampusJsonFile = useCallback(() => {
    const campusData = {
      collegeName: 'Canara Engineering College',
      campusLocation: 'Sudhindra Nagar, Benjanapadavu, Bantwal Taluk, Karnataka 574219',
      version: '2.0.0',
      lastUpdated: new Date().toISOString(),
      floors: [
        { id: 'ground', name: 'Ground Floor', shortName: 'GF', floorNumber: 0, image: '/assets/aistudio/1000073941_367166a1.jpg', scale: 1.0 },
        { id: 'first', name: '1st Floor', shortName: '1F', floorNumber: 1, image: '/assets/aistudio/1000073949_21a5a4cc.jpg', scale: 1.0 },
        { id: 'second', name: '2nd Floor', shortName: '2F', floorNumber: 2, image: '/assets/aistudio/1000073957_ddb04104.jpg', scale: 1.0 },
        { id: 'third', name: '3rd Floor', shortName: '3F', floorNumber: 3, image: '/assets/aistudio/1000073959_ac649ee1.jpg', scale: 1.0 },
      ],
      nodes: database.nodes.map(n => ({
        id: n.id,
        floor: n.floorId,
        x: Math.round(n.x),
        y: Math.round(n.y),
        type: n.nodeType,
        name: n.label || n.id,
        building: n.buildingId,
      })),
      edges: database.connections.map(c => ({
        id: c.id,
        source: c.startNodeId,
        target: c.endNodeId,
        distance: Math.round(c.distanceMeters),
        type: c.connectionType,
        accessible: c.accessible,
      })),
      rooms: database.locations.map(loc => ({
        id: loc.id,
        number: loc.roomNumber,
        name: loc.name,
        department: loc.facultyInfo?.department || 'Academic Department',
        floor: loc.floorId,
        nodeId: loc.associatedNodeId,
        category: loc.category,
        keywords: loc.tags || [],
        description: loc.description,
        hint: `${loc.name} on ${loc.floorId}`,
      })),
    };

    const blob = new Blob([JSON.stringify(campusData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'campus.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [database]);

  const getShareableRouteUrl = useCallback((): string => {
    const url = new URL(window.location.href);
    url.search = '';
    if (selectedDestination) {
      url.searchParams.set('to', selectedDestination.roomNumber || selectedDestination.id);
    }
    if (startLocation) {
      url.searchParams.set('from', startLocation.roomNumber || startLocation.id);
    } else if (userPosition.confirmedLocationName) {
      url.searchParams.set('at', userPosition.confirmedLocationName);
    }
    if (routingPreference === 'wheelchair') {
      url.searchParams.set('pref', 'wheelchair');
    }
    if (activeFloorId) {
      url.searchParams.set('floor', activeFloorId);
    }
    return url.toString();
  }, [selectedDestination, startLocation, userPosition, routingPreference, activeFloorId]);

  // Read URL parameters on mount
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const atParam = params.get('at');
      const fromParam = params.get('from');
      const toParam = params.get('to');
      const prefParam = params.get('pref') as RoutingPreference | null;
      const floorParam = params.get('floor');

      if (prefParam && (prefParam === 'shortest' || prefParam === 'wheelchair' || prefParam === 'fewer_stairs')) {
        setRoutingPreference(prefParam);
      }

      if (floorParam) {
        setActiveFloorId(floorParam);
      }

      if (atParam) {
        const clean = atParam.toLowerCase().trim();
        const foundLoc = database.locations.find(
          l => l.id.toLowerCase() === clean ||
               l.roomNumber.toLowerCase().replace(/[^a-z0-9]/g, '') === clean.replace(/[^a-z0-9]/g, '') ||
               l.name.toLowerCase().includes(clean)
        );
        if (foundLoc) {
          const associatedNode = database.nodes.find(n => n.id === foundLoc.associatedNodeId);
          setUserPosition({
            x: associatedNode ? associatedNode.x : foundLoc.coordinates.x,
            y: associatedNode ? associatedNode.y : foundLoc.coordinates.y,
            buildingId: foundLoc.buildingId,
            floorId: foundLoc.floorId,
            heading: 0,
            method: 'qr',
            accuracyMeters: 1,
            lastUpdated: Date.now(),
            confirmedLocationName: `${foundLoc.name} (${foundLoc.roomNumber})`,
          });
          setActiveBuildingId(foundLoc.buildingId === 'outdoor' ? null : foundLoc.buildingId);
          setActiveFloorId(foundLoc.floorId);
          setStartLocation(foundLoc);
        }
      }

      if (fromParam || toParam) {
        let fromLoc: CampusLocation | null = null;
        let toLoc: CampusLocation | null = null;

        if (fromParam) {
          const cleanFrom = fromParam.toLowerCase().trim();
          fromLoc = database.locations.find(
            l => l.id.toLowerCase() === cleanFrom ||
                 l.roomNumber.toLowerCase().replace(/[^a-z0-9]/g, '') === cleanFrom.replace(/[^a-z0-9]/g, '') ||
                 l.name.toLowerCase().includes(cleanFrom)
          ) || null;
        }

        if (toParam) {
          const cleanTo = toParam.toLowerCase().trim();
          toLoc = database.locations.find(
            l => l.id.toLowerCase() === cleanTo ||
                 l.roomNumber.toLowerCase().replace(/[^a-z0-9]/g, '') === cleanTo.replace(/[^a-z0-9]/g, '') ||
                 l.name.toLowerCase().includes(cleanTo)
          ) || null;
        }

        if (fromLoc) setStartLocation(fromLoc);
        if (toLoc) {
          setSelectedDestination(toLoc);
          setActiveBuildingId(toLoc.buildingId === 'outdoor' ? null : toLoc.buildingId);
          setActiveFloorId(toLoc.floorId);
          startNavigation(toLoc, fromLoc || undefined);
        }
      }
    } catch (e) {
      console.warn('URL param parse error:', e);
    }
  }, []);

  return (
    <CampusContext.Provider
      value={{
        buildings: database.buildings,
        floors: database.floors,
        locations: database.locations,
        nodes: database.nodes,
        connections: database.connections,
        qrCheckpoints: database.qrCheckpoints,
        beacons: database.beacons,

        activeBuildingId,
        activeFloorId,
        selectedDestination,
        startLocation,
        routingPreference,
        searchQuery,

        isNavigating,
        activeRoute,
        currentStepIndex,
        userPosition,
        wrongDirectionStatus,
        isSimulatingWalk,
        simulationSpeed,

        positioningMethod: userPosition.method,

        setActiveBuildingId,
        setActiveFloorId,
        setSelectedDestination,
        setStartLocation,
        setRoutingPreference,
        setSearchQuery,

        // Real-Time Motion Tracking
        isLiveTracking,
        toggleLiveTracking,
        motionTelemetry,
        stepMetersForward,
        requestMotionPermission,
        isFollowUser,
        toggleFollowUser,
        remainingDistanceMeters,

        startNavigation,
        stopNavigation,
        recalculateRoute,
        stepForward,
        stepBackward,
        toggleSimulation,
        setSimulationSpeed,
        simulateWrongTurn,
        setUserPositionManual,
        confirmLocationByQR,
        simulateBLEScan,
        requestRealGPS,

        addBuilding,
        updateBuilding,
        deleteBuilding,
        addFloor,
        updateFloor,
        deleteFloor,
        addLocation,
        updateLocation,
        deleteLocation,
        addNode,
        updateNode,
        deleteNode,
        addConnection,
        deleteConnection,
        addQRCheckpoint,
        deleteQRCheckpoint,
        resetToDefaultData,
        importDatabaseJson,
        exportDatabaseJson,

        // Dev-only Edit Mode
        isEditMode,
        setIsEditMode,
        editTool,
        setEditTool,
        selectedEditNodeId,
        setSelectedEditNodeId,
        addNodeAtCoords,
        moveNodeToCoords,
        connectNodesDev,
        exportCampusJsonFile,
        getShareableRouteUrl,
      }}
    >
      {children}
    </CampusContext.Provider>
  );
};

export const useCampus = (): CampusContextType => {
  const context = useContext(CampusContext);
  if (!context) {
    throw new Error('useCampus must be used within a CampusProvider');
  }
  return context;
};
