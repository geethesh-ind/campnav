/**
 * Real-Time Motion, Sensor & Pedestrian Dead Reckoning (PDR) Engine
 * for Canara Engineering College CampusNav
 *
 * Captures live smartphone hardware sensors:
 * 1. Accelerometer (devicemotion) step detection (PDR)
 * 2. Magnetometer / Gyroscope (deviceorientation) compass heading
 * 3. High-accuracy GPS (watchPosition) outdoor displacement
 * 4. iOS 13+ permission handshakes
 */

export interface MotionTelemetry {
  stepCount: number;
  totalDistanceMeters: number;
  currentSpeedMps: number;
  headingDegrees: number;
  isMoving: boolean;
  lastStepTimestamp: number;
  sensorSource: 'hardware' | 'simulated' | 'gps' | 'idle';
  hasHardwareSensors: boolean;
  gpsAccuracyMeters?: number;
}

export type StepCallback = (stepDistanceMeters: number, telemetry: MotionTelemetry) => void;
export type HeadingCallback = (headingDegrees: number) => void;
export type TelemetryCallback = (telemetry: MotionTelemetry) => void;

class RealtimeMotionEngine {
  private stepCount = 0;
  private totalDistanceMeters = 0;
  private currentSpeedMps = 0;
  private headingDegrees = 0;
  private isMoving = false;
  private lastStepTimestamp = 0;
  private isListening = false;
  private hasHardwareSensors = false;
  private sensorSource: 'hardware' | 'simulated' | 'gps' | 'idle' = 'idle';

  // Accelerometer low-pass / high-pass filtering state
  private gravX = 0;
  private gravY = 0;
  private gravZ = 9.81;
  private lastPeakTime = 0;
  private recentStepTimes: number[] = [];
  private stepThreshold = 1.35; // m/s^2 above baseline
  private minStepIntervalMs = 320; // max ~3 steps per second
  private stepLengthMeters = 0.72; // average human stride

  // Heading smoothing
  private smoothedHeading = 0;

  // GPS Watcher
  private geoWatchId: number | null = null;
  private lastGeoCoords: { lat: number; lng: number; time: number } | null = null;
  private gpsAccuracyMeters = 10;

  // Subscriptions
  private stepListeners = new Set<StepCallback>();
  private headingListeners = new Set<HeadingCallback>();
  private telemetryListeners = new Set<TelemetryCallback>();

  // Motion event handler references (for cleanup)
  private boundHandleMotion = this.handleDeviceMotion.bind(this);
  private boundHandleOrientation = this.handleDeviceOrientation.bind(this);

  constructor() {
    if (typeof window !== 'undefined') {
      this.hasHardwareSensors = 'DeviceMotionEvent' in window || 'DeviceOrientationEvent' in window;
    }
  }

  /**
   * Request permissions (required on iOS 13+ Safari/Chrome)
   */
  async requestSensorPermission(): Promise<{ granted: boolean; error?: string }> {
    if (typeof window === 'undefined') {
      return { granted: false, error: 'Window not defined' };
    }

    try {
      // iOS 13+ DeviceMotionEvent permission check
      const DeviceMotionAny = window.DeviceMotionEvent as unknown as {
        requestPermission?: () => Promise<'granted' | 'denied'>;
      };

      if (typeof DeviceMotionAny?.requestPermission === 'function') {
        const res = await DeviceMotionAny.requestPermission();
        if (res !== 'granted') {
          return { granted: false, error: 'Motion sensor permission was denied.' };
        }
      }

      // iOS 13+ DeviceOrientationEvent permission check
      const DeviceOrientationAny = window.DeviceOrientationEvent as unknown as {
        requestPermission?: () => Promise<'granted' | 'denied'>;
      };

      if (typeof DeviceOrientationAny?.requestPermission === 'function') {
        const res = await DeviceOrientationAny.requestPermission();
        if (res !== 'granted') {
          return { granted: false, error: 'Orientation sensor permission was denied.' };
        }
      }

      this.startListening();
      return { granted: true };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return { granted: false, error: msg };
    }
  }

  /**
   * Start listening to all available hardware sensors
   */
  startListening(): void {
    if (this.isListening || typeof window === 'undefined') return;

    this.isListening = true;

    // 1. Device Motion (accelerometer step detection)
    try {
      window.addEventListener('devicemotion', this.boundHandleMotion, { passive: true });
    } catch {
      // Ignored
    }

    // 2. Device Orientation (compass heading)
    try {
      window.addEventListener('deviceorientation', this.boundHandleOrientation, { passive: true });
      window.addEventListener('deviceorientationabsolute', this.boundHandleOrientation, { passive: true });
    } catch {
      // Ignored
    }

    // 3. Geolocation Watcher
    if (navigator.geolocation) {
      try {
        this.geoWatchId = navigator.geolocation.watchPosition(
          this.handleGeoPosition.bind(this),
          () => {
            // Location access not available or indoors
          },
          { enableHighAccuracy: true, maximumAge: 1000, timeout: 10000 }
        );
      } catch {
        // Ignored
      }
    }

    // Start movement decay timer (if no steps for 2.5s, isMoving = false)
    this.startDecayInterval();
  }

  /**
   * Stop listening to hardware sensors
   */
  stopListening(): void {
    if (!this.isListening || typeof window === 'undefined') return;

    this.isListening = false;
    window.removeEventListener('devicemotion', this.boundHandleMotion);
    window.removeEventListener('deviceorientation', this.boundHandleOrientation);
    window.removeEventListener('deviceorientationabsolute', this.boundHandleOrientation);

    if (this.geoWatchId !== null && navigator.geolocation) {
      navigator.geolocation.clearWatch(this.geoWatchId);
      this.geoWatchId = null;
    }
  }

  /**
   * Handle Accelerometer events for Step Detection (Pedestrian Dead Reckoning)
   */
  private handleDeviceMotion(event: DeviceMotionEvent): void {
    const acc = event.accelerationIncludingGravity || event.acceleration;
    if (!acc || acc.x === null || acc.y === null || acc.z === null) return;

    this.hasHardwareSensors = true;

    // Apply low-pass filter to isolate gravity component
    const alpha = 0.85;
    this.gravX = alpha * this.gravX + (1 - alpha) * (acc.x || 0);
    this.gravY = alpha * this.gravY + (1 - alpha) * (acc.y || 0);
    this.gravZ = alpha * this.gravZ + (1 - alpha) * (acc.z || 9.81);

    // Isolate dynamic linear acceleration (motion without gravity)
    const dynX = (acc.x || 0) - this.gravX;
    const dynY = (acc.y || 0) - this.gravY;
    const dynZ = (acc.z || 0) - this.gravZ;

    const dynamicMagnitude = Math.sqrt(dynX * dynX + dynY * dynY + dynZ * dynZ);

    const now = Date.now();

    // Peak detection with refractory period
    if (dynamicMagnitude > this.stepThreshold && now - this.lastPeakTime > this.minStepIntervalMs) {
      this.lastPeakTime = now;
      this.registerStep(this.stepLengthMeters, 'hardware');
    }
  }

  /**
   * Handle Magnetometer / Gyroscope events for Compass Heading
   */
  private handleDeviceOrientation(event: DeviceOrientationEvent): void {
    let heading = 0;

    // iOS provides direct webkitCompassHeading (0 to 360, where 0 is true North)
    const evtAny = event as unknown as { webkitCompassHeading?: number };
    if (typeof evtAny.webkitCompassHeading === 'number' && !isNaN(evtAny.webkitCompassHeading)) {
      heading = evtAny.webkitCompassHeading;
    } else if (event.alpha !== null && !isNaN(event.alpha)) {
      // Standard Android: alpha is compass bearing (counter-clockwise)
      heading = (360 - event.alpha) % 360;
    } else {
      return;
    }

    this.hasHardwareSensors = true;

    // Circular exponential smoothing to prevent jitter and 360°/0° flipping
    const diff = (heading - this.smoothedHeading + 540) % 360 - 180;
    this.smoothedHeading = (this.smoothedHeading + diff * 0.25 + 360) % 360;
    this.headingDegrees = Math.round(this.smoothedHeading);

    this.headingListeners.forEach(listener => listener(this.headingDegrees));
    this.emitTelemetry();
  }

  /**
   * Handle continuous GPS positions
   */
  private handleGeoPosition(pos: GeolocationPosition): void {
    const coords = pos.coords;
    const now = Date.now();
    this.gpsAccuracyMeters = Math.round(coords.accuracy || 10);

    if (coords.heading !== null && !isNaN(coords.heading) && coords.speed && coords.speed > 0.5) {
      this.headingDegrees = Math.round(coords.heading);
      this.headingListeners.forEach(listener => listener(this.headingDegrees));
    }

    if (coords.speed !== null && !isNaN(coords.speed) && coords.speed > 0.3) {
      this.currentSpeedMps = Math.min(3.5, coords.speed);
      this.isMoving = true;
    }

    // Calculate distance moved from last GPS fix
    if (this.lastGeoCoords) {
      const dist = this.haversineDistance(
        this.lastGeoCoords.lat,
        this.lastGeoCoords.lng,
        coords.latitude,
        coords.longitude
      );
      const timeDeltaSec = (now - this.lastGeoCoords.time) / 1000;

      // If user moved between 1m and 50m (realistic walking speed between fixes)
      if (dist >= 1.0 && dist <= 40 && timeDeltaSec > 0.5) {
        // Register GPS movement
        this.registerDisplacement(dist, 'gps');
      }
    }

    this.lastGeoCoords = {
      lat: coords.latitude,
      lng: coords.longitude,
      time: now,
    };

    this.emitTelemetry();
  }

  /**
   * Record a single step taken
   */
  registerStep(distanceMeters = this.stepLengthMeters, source: 'hardware' | 'simulated' | 'gps' = 'hardware'): void {
    const now = Date.now();
    this.stepCount += 1;
    this.totalDistanceMeters += distanceMeters;
    this.lastStepTimestamp = now;
    this.isMoving = true;
    this.sensorSource = source;

    // Track rolling speed
    this.recentStepTimes.push(now);
    if (this.recentStepTimes.length > 5) {
      this.recentStepTimes.shift();
    }

    if (this.recentStepTimes.length >= 2) {
      const dt = (now - this.recentStepTimes[0]) / 1000;
      if (dt > 0.1) {
        const stepsInWindow = this.recentStepTimes.length - 1;
        this.currentSpeedMps = parseFloat(((stepsInWindow * distanceMeters) / dt).toFixed(2));
      }
    } else {
      this.currentSpeedMps = 1.2; // default average walking speed ~1.2 m/s
    }

    const telemetry = this.getTelemetry();
    this.stepListeners.forEach(listener => listener(distanceMeters, telemetry));
    this.emitTelemetry();
  }

  /**
   * Record arbitrary displacement (e.g. from GPS or simulation)
   */
  registerDisplacement(distanceMeters: number, source: 'hardware' | 'simulated' | 'gps'): void {
    const equivalentSteps = Math.max(1, Math.round(distanceMeters / this.stepLengthMeters));
    this.stepCount += equivalentSteps;
    this.totalDistanceMeters += distanceMeters;
    this.lastStepTimestamp = Date.now();
    this.isMoving = true;
    this.sensorSource = source;

    const telemetry = this.getTelemetry();
    this.stepListeners.forEach(listener => listener(distanceMeters, telemetry));
    this.emitTelemetry();
  }

  /**
   * Set simulated / manual heading (e.g. for testing)
   */
  setHeading(deg: number): void {
    this.headingDegrees = ((deg % 360) + 360) % 360;
    this.headingListeners.forEach(listener => listener(this.headingDegrees));
    this.emitTelemetry();
  }

  /**
   * Reset stats
   */
  reset(): void {
    this.stepCount = 0;
    this.totalDistanceMeters = 0;
    this.currentSpeedMps = 0;
    this.isMoving = false;
    this.recentStepTimes = [];
    this.emitTelemetry();
  }

  /**
   * Get current telemetry snapshot
   */
  getTelemetry(): MotionTelemetry {
    return {
      stepCount: this.stepCount,
      totalDistanceMeters: Math.round(this.totalDistanceMeters * 10) / 10,
      currentSpeedMps: this.isMoving ? this.currentSpeedMps : 0,
      headingDegrees: this.headingDegrees,
      isMoving: this.isMoving,
      lastStepTimestamp: this.lastStepTimestamp,
      sensorSource: this.sensorSource,
      hasHardwareSensors: this.hasHardwareSensors,
      gpsAccuracyMeters: this.gpsAccuracyMeters,
    };
  }

  // Subscribe to steps
  onStep(callback: StepCallback): () => void {
    this.stepListeners.add(callback);
    return () => this.stepListeners.delete(callback);
  }

  // Subscribe to heading updates
  onHeading(callback: HeadingCallback): () => void {
    this.headingListeners.add(callback);
    return () => this.headingListeners.delete(callback);
  }

  // Subscribe to telemetry updates
  onTelemetry(callback: TelemetryCallback): () => void {
    this.telemetryListeners.add(callback);
    return () => this.telemetryListeners.delete(callback);
  }

  private emitTelemetry(): void {
    const t = this.getTelemetry();
    this.telemetryListeners.forEach(listener => listener(t));
  }

  private startDecayInterval(): void {
    if (typeof window === 'undefined') return;

    window.setInterval(() => {
      const now = Date.now();
      if (this.isMoving && now - this.lastStepTimestamp > 2200) {
        this.isMoving = false;
        this.currentSpeedMps = 0;
        this.emitTelemetry();
      }
    }, 1000);
  }

  /**
   * Calculate distance between two lat/lng coordinates in meters
   */
  private haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371000; // Earth radius in meters
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }
}

// Export singleton instance
export const realtimeMotion = new RealtimeMotionEngine();
