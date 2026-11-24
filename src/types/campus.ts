export type NodeType = 
  | 'room_door' 
  | 'junction' 
  | 'staircase' 
  | 'elevator' 
  | 'building_entrance' 
  | 'outdoor_walkway'
  | 'parking';

export type ConnectionType = 
  | 'corridor' 
  | 'staircase' 
  | 'elevator' 
  | 'outdoor_path' 
  | 'ramp';

export type LocationCategory = 
  | 'department' 
  | 'lab' 
  | 'staff_room' 
  | 'classroom' 
  | 'library' 
  | 'canteen' 
  | 'office' 
  | 'restroom' 
  | 'emergency' 
  | 'parking' 
  | 'auditorium' 
  | 'seminar';

export type RoutingPreference = 'shortest' | 'fewer_stairs' | 'wheelchair';

export type PositioningMethod = 'gps' | 'ble' | 'qr' | 'manual' | 'simulated';

export interface FacultyInfo {
  name: string;
  designation: string;
  department: string;
  email: string;
  officeHours: string;
  phone?: string;
  coursesTaught?: string[];
}

export interface CampusLocation {
  id: string;
  buildingId: string;
  floorId: string;
  name: string;
  roomNumber: string;
  category: LocationCategory;
  description: string;
  coordinates: { x: number; y: number };
  associatedNodeId: string;
  facultyInfo?: FacultyInfo;
  isPopular?: boolean;
  tags?: string[];
}

export interface Floor {
  id: string;
  buildingId: string;
  floorNumber: number; // -1 for Basement, 0 for Ground, 1 for 1st, 2 for 2nd, etc.
  floorName: string;
  code: string; // 'B', 'G', '1', '2', '3', '4'
  description?: string;
  floorMapImage?: string;
}

export interface Building {
  id: string;
  name: string;
  code: string;
  description: string;
  color: string;
  canvasBounds: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  floorIds: string[];
  entranceNodeId: string;
}

export interface NavigationNode {
  id: string;
  buildingId: string; // 'outdoor' for campus grounds
  floorId: string;    // 'outdoor' for campus grounds
  x: number;          // relative to floor or campus map
  y: number;
  nodeType: NodeType;
  label?: string;
}

export interface NavigationConnection {
  id: string;
  startNodeId: string;
  endNodeId: string;
  distanceMeters: number;
  connectionType: ConnectionType;
  accessible: boolean; // true for ramps, elevators, corridors; false for stairs
  isRestricted?: boolean;
}

export interface QRCheckpoint {
  id: string;
  code: string;
  label: string;
  buildingId: string;
  floorId: string;
  nodeId: string;
  description: string;
  coordinates: { x: number; y: number };
}

export interface BLEBeacon {
  id: string;
  uuid: string;
  major: number;
  minor: number;
  buildingId: string;
  floorId: string;
  nodeId: string;
  label: string;
  txPower: number;
  rangeMeters: number;
}

export interface UserPosition {
  x: number;
  y: number;
  buildingId: string;
  floorId: string;
  heading: number; // 0 to 360 degrees
  method: PositioningMethod;
  accuracyMeters: number;
  lastUpdated: number;
  confirmedLocationName?: string;
}

export interface NavigationInstructionStep {
  id: string;
  action: 'start' | 'straight' | 'turn_left' | 'turn_right' | 'staircase_up' | 'staircase_down' | 'elevator_up' | 'elevator_down' | 'arrive';
  primaryText: string;
  secondaryText?: string;
  distanceMeters: number;
  estimatedSeconds: number;
  startNode: NavigationNode;
  endNode: NavigationNode;
  floorChange?: {
    fromFloorId: string;
    toFloorId: string;
    fromFloorName: string;
    toFloorName: string;
    via: 'staircase' | 'elevator';
  };
  buildingChange?: {
    fromBuildingId: string;
    toBuildingId: string;
  };
}

export interface CalculatedRoute {
  id: string;
  totalDistanceMeters: number;
  estimatedTimeMinutes: number;
  steps: NavigationInstructionStep[];
  nodePath: NavigationNode[];
  connectionIds: string[];
  preference: RoutingPreference;
  startLocationName: string;
  destinationLocationName: string;
  destinationLocation: CampusLocation;
  startNodeId: string;
  destinationNodeId: string;
}

export interface WrongDirectionStatus {
  isWrongDirection: boolean;
  deviationMeters: number;
  message: string;
  shouldRecalculate: boolean;
}
