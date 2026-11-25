import React, { useState, useEffect } from 'react';
import {
  ArrowUp,
  CornerUpRight,
  CornerUpLeft,
  ChevronsUpDown,
  CheckCircle2,
  AlertTriangle,
  Play,
  Pause,
  SkipForward,
  SkipBack,
  Share2,
  Check,
  X,
  Accessibility,
  Footprints,
  Compass,
  LocateFixed,
  Smartphone,
  ListOrdered,
  Vibrate,
} from 'lucide-react';
import { StairsIcon } from './icons/StairsIcon';
import { useCampus } from '../context/CampusContext';
import { soundEffects, HapticEventType } from '../utils/audioAlert';

export const NavigationSheet: React.FC = () => {
  const {
    isNavigating,
    activeRoute,
    currentStepIndex,
    stopNavigation,
    stepForward,
    stepBackward,
    isSimulatingWalk,
    toggleSimulation,
    simulationSpeed,
    setSimulationSpeed,
    simulateWrongTurn,
    recalculateRoute,
    wrongDirectionStatus,
    routingPreference,
    setRoutingPreference,
    userPosition,
    floors,
    getShareableRouteUrl,
    motionTelemetry,
    stepMetersForward,
    requestMotionPermission,
    isFollowUser,
    toggleFollowUser,
    remainingDistanceMeters,
  } = useCampus();

  const [copiedLink, setCopiedLink] = useState(false);
  const [showAllSteps, setShowAllSteps] = useState(false);
  const [hapticPulse, setHapticPulse] = useState<HapticEventType | null>(null);

  useEffect(() => {
    const unsub = soundEffects.onHaptic((eventType) => {
      setHapticPulse(eventType);
      const timer = window.setTimeout(() => {
        setHapticPulse(null);
      }, 360);
      return () => window.clearTimeout(timer);
    });
    return unsub;
  }, []);

  if (!isNavigating || !activeRoute) {
    return null;
  }

  const currentStep = activeRoute.steps[currentStepIndex] || activeRoute.steps[0];
  const nextStep = activeRoute.steps[currentStepIndex + 1];
  const isArrived = currentStep.action === 'arrive';

  const currentFloorObj = floors.find(f => f.id === userPosition.floorId);
  const destFloorObj = floors.find(f => f.id === activeRoute.destinationLocation.floorId);

  const remainingDistance = isArrived
    ? 0
    : remainingDistanceMeters > 0
    ? remainingDistanceMeters
    : activeRoute.steps
        .slice(currentStepIndex)
        .reduce((acc, step) => acc + step.distanceMeters, 0);

  const remainingMinutes = isArrived ? 0 : Math.max(1, Math.ceil(remainingDistance / 50));
  const progressPercent = activeRoute.totalDistanceMeters > 0
    ? Math.min(100, Math.max(4, Math.round(((activeRoute.totalDistanceMeters - remainingDistance) / activeRoute.totalDistanceMeters) * 100)))
    : 100;

  const handleShare = async () => {
    const url = getShareableRouteUrl();
    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(url);
        setCopiedLink(true);
        setTimeout(() => setCopiedLink(false), 2500);
      }
    } catch {
      // fallback
    }
  };

  const getStepIcon = (action: string) => {
    switch (action) {
      case 'turn_left':
        return <CornerUpLeft className="w-6 h-6 text-white" />;
      case 'turn_right':
        return <CornerUpRight className="w-6 h-6 text-white" />;
      case 'staircase_up':
      case 'staircase_down':
        return <StairsIcon className="w-6 h-6 text-white" />;
      case 'elevator_up':
      case 'elevator_down':
        return <ChevronsUpDown className="w-6 h-6 text-white" />;
      case 'arrive':
        return <CheckCircle2 className="w-6 h-6 text-emerald-400" />;
      default:
        return <ArrowUp className="w-6 h-6 text-white" />;
    }
  };

  return (
    <div className="fixed bottom-2 sm:bottom-4 left-1/2 -translate-x-1/2 z-30 w-[calc(100vw-16px)] sm:w-[calc(100vw-24px)] max-w-[500px] pointer-events-auto pb-safe">
      <div
        className={`bg-white/98 backdrop-blur-xl rounded-2xl shadow-2xl ring-1 overflow-hidden divide-y divide-neutral-100 transition-all ${
          hapticPulse === 'wrong_direction'
            ? 'ring-2 ring-rose-500 animate-haptic-bump'
            : hapticPulse === 'arrive'
            ? 'ring-2 ring-emerald-500 animate-haptic-bump'
            : hapticPulse
            ? 'ring-2 ring-blue-500 animate-haptic-bump'
            : 'ring-black/10'
        }`}
      >
        {/* Wrong Direction Alert */}
        {wrongDirectionStatus?.isWrongDirection && (
          <div className="bg-rose-600 text-white px-4 py-2.5 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span className="text-xs font-semibold truncate">{wrongDirectionStatus.message}</span>
            </div>
            <button
              onClick={recalculateRoute}
              className="px-2.5 py-1 rounded-lg bg-white text-rose-700 font-bold text-[11px] shrink-0 cursor-pointer"
            >
              Reroute
            </button>
          </div>
        )}

        {/* HTTP / iOS Permission Prompts */}
        {!motionTelemetry.isSecureContext && (
          <div className="px-3.5 py-2 bg-amber-50 text-amber-950 flex items-center justify-between gap-2 text-xs">
            <span className="truncate">
              <b>Walking sensors need HTTPS</b> on mobile.
            </span>
            <a
              href={`https://${window.location.hostname}:3001${window.location.search}`}
              className="px-2.5 py-1 rounded-lg bg-neutral-900 text-white font-semibold text-[11px] shrink-0"
            >
              Open HTTPS
            </a>
          </div>
        )}

        {motionTelemetry.isSecureContext && motionTelemetry.needsPermissionGesture && !motionTelemetry.isReceivingSensorEvents && (
          <div className="px-3.5 py-2 bg-amber-50 text-amber-950 flex items-center justify-between gap-2 text-xs">
            <span className="font-medium">Unlock phone motion &amp; compass sensors</span>
            <button
              onClick={requestMotionPermission}
              className="px-2.5 py-1 rounded-lg bg-neutral-900 text-white font-semibold text-[11px] shrink-0 cursor-pointer"
            >
              Enable
            </button>
          </div>
        )}

        {/* Turn-by-Turn Dark Sleek Header */}
        <div className={`px-3.5 sm:px-4 py-3 sm:py-3.5 text-white ${isArrived ? 'bg-emerald-700' : 'bg-neutral-950'}`}>
          <div className="flex items-center justify-between gap-2 mb-2.5">
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="text-[11px] font-medium text-neutral-400 truncate">
                {isArrived ? 'Arrived at destination' : `To ${activeRoute.destinationLocationName.split(' (')[0]}`}
              </span>
              {hapticPulse && (
                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-blue-500/25 text-blue-300 text-[10px] font-semibold shrink-0 animate-pulse">
                  <Vibrate className="w-2.5 h-2.5" />
                  <span>Haptic</span>
                </span>
              )}
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                onClick={() => setShowAllSteps(prev => !prev)}
                className={`h-8 px-2.5 rounded-lg text-[11px] font-semibold flex items-center gap-1 transition-colors cursor-pointer active:scale-95 ${
                  showAllSteps ? 'bg-white text-neutral-950' : 'bg-white/10 hover:bg-white/15 text-neutral-200'
                }`}
              >
                <ListOrdered className="w-3.5 h-3.5" />
                <span>{Math.min(currentStepIndex + 1, activeRoute.steps.length)}/{activeRoute.steps.length}</span>
              </button>
              <button
                onClick={handleShare}
                className="h-8 w-8 rounded-lg bg-white/10 hover:bg-white/15 text-neutral-200 text-[11px] font-semibold flex items-center justify-center cursor-pointer active:scale-95"
                aria-label="Share route"
              >
                {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Share2 className="w-3.5 h-3.5" />}
              </button>
              <button
                onClick={stopNavigation}
                className="w-8 h-8 rounded-lg bg-white/10 hover:bg-rose-500 flex items-center justify-center text-white cursor-pointer transition-colors active:scale-95"
                aria-label="Exit navigation"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-white/10 flex items-center justify-center shrink-0">
              {getStepIcon(currentStep.action)}
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="text-[15px] font-bold leading-snug text-white">
                {currentStep.primaryText}
              </h3>
              {currentStep.secondaryText && (
                <p className="text-xs text-neutral-400 mt-0.5 truncate">
                  {currentStep.secondaryText}
                </p>
              )}
            </div>
          </div>

          {/* Slim Progress Track */}
          <div className="mt-3 w-full bg-white/12 h-1 rounded-full overflow-hidden">
            <div
              className="bg-blue-500 h-full rounded-full transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>

          {nextStep && (
            <div className="mt-2 flex items-center gap-1.5 text-[11px] text-neutral-400 truncate">
              <span className="text-neutral-500 font-semibold">Next:</span>
              <span className="truncate">{nextStep.primaryText}</span>
            </div>
          )}
        </div>

        {/* Optional All-Steps Drawer */}
        {showAllSteps && (
          <div className="max-h-40 overflow-y-auto divide-y divide-neutral-100 bg-neutral-50 px-3 py-1.5 text-xs">
            {activeRoute.steps.map((st, idx) => (
              <div
                key={st.id}
                className={`py-1.5 px-2 rounded-lg flex items-center justify-between gap-2 ${
                  idx === currentStepIndex
                    ? 'bg-blue-50 font-semibold text-blue-700'
                    : idx < currentStepIndex
                    ? 'text-neutral-400 line-through'
                    : 'text-neutral-700'
                }`}
              >
                <span className="truncate">{idx + 1}. {st.primaryText}</span>
                {st.distanceMeters > 0 && <span className="font-mono text-[11px] shrink-0">{st.distanceMeters}m</span>}
              </div>
            ))}
          </div>
        )}

        {/* ETA + Live Telemetry Row */}
        <div className="px-4 py-2.5 bg-white flex items-center justify-between gap-2 text-xs">
          <div className="flex items-baseline gap-2">
            <span className="text-base font-bold text-neutral-900">
              {isArrived ? 'Arrived' : `${remainingMinutes} min`}
            </span>
            {!isArrived && (
              <span className="text-neutral-500 font-medium">{remainingDistance} m</span>
            )}
            <span className="text-neutral-300">·</span>
            <span className="font-mono text-[11px] text-neutral-600">
              {currentFloorObj?.code || 'OUT'} → {destFloorObj?.code || 'GF'}
            </span>
          </div>

          <div className="flex items-center gap-2 text-[11px] font-mono text-neutral-500">
            <span className="flex items-center gap-1">
              <Footprints className="w-3 h-3 text-neutral-700" />
              {motionTelemetry.stepCount}
            </span>
            <span className="flex items-center gap-1">
              <Compass className="w-3 h-3 text-blue-600" />
              {userPosition.heading}°
            </span>
            <button
              onClick={() => setRoutingPreference(routingPreference === 'wheelchair' ? 'shortest' : 'wheelchair')}
              className={`px-2 py-0.5 rounded-md font-sans font-semibold cursor-pointer transition-colors ${
                routingPreference === 'wheelchair'
                  ? 'bg-neutral-900 text-white'
                  : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
              }`}
              title="Toggle lift-only mode"
            >
              <Accessibility className="w-3.5 h-3.5 inline" />
            </button>
          </div>
        </div>

        {/* Compact Walk & Simulation Controls (40px+ Mobile Touch Targets) */}
        <div className="px-3 py-2.5 bg-neutral-50 flex flex-wrap items-center justify-between gap-1.5 text-xs">
          <div className="flex items-center gap-1.5">
            <button
              onClick={toggleSimulation}
              className={`h-10 px-3.5 rounded-xl font-semibold flex items-center gap-1.5 cursor-pointer transition-all active:scale-95 ${
                isSimulatingWalk
                  ? 'bg-neutral-900 text-white'
                  : 'bg-white hover:bg-neutral-100 text-neutral-800 ring-1 ring-black/10'
              }`}
            >
              {isSimulatingWalk ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              <span>{isSimulatingWalk ? 'Pause' : 'Walk'}</span>
            </button>

            <button
              onClick={() => stepMetersForward(1.4)}
              className="h-10 px-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold flex items-center gap-1 cursor-pointer transition-all active:scale-95"
            >
              <Footprints className="w-3.5 h-3.5" />
              <span>+1.4m</span>
            </button>

            <div className="flex items-center bg-white rounded-xl ring-1 ring-black/10 p-0.5">
              <button
                onClick={stepBackward}
                disabled={currentStepIndex <= 0}
                className="h-9 w-9 rounded-lg hover:bg-neutral-100 disabled:opacity-30 flex items-center justify-center text-neutral-700 cursor-pointer active:scale-95"
                title="Previous step"
                aria-label="Previous step"
              >
                <SkipBack className="w-4 h-4" />
              </button>
              <button
                onClick={stepForward}
                disabled={currentStepIndex >= activeRoute.steps.length - 1}
                className="h-9 w-9 rounded-lg hover:bg-neutral-100 disabled:opacity-30 flex items-center justify-center text-neutral-700 cursor-pointer active:scale-95"
                title="Next step"
                aria-label="Next step"
              >
                <SkipForward className="w-4 h-4" />
              </button>
            </div>

            <div className="hidden sm:flex items-center bg-white rounded-xl ring-1 ring-black/10 p-0.5">
              {[1, 2, 4].map(spd => (
                <button
                  key={spd}
                  onClick={() => setSimulationSpeed(spd)}
                  className={`h-8 px-2 rounded-lg text-[11px] font-semibold cursor-pointer ${
                    simulationSpeed === spd ? 'bg-neutral-900 text-white' : 'text-neutral-500'
                  }`}
                >
                  {spd}x
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={toggleFollowUser}
              className={`h-10 w-10 rounded-xl flex items-center justify-center cursor-pointer transition-all active:scale-95 ${
                isFollowUser ? 'bg-blue-50 text-blue-600 ring-1 ring-blue-200' : 'bg-white text-neutral-500 ring-1 ring-black/10'
              }`}
              title={isFollowUser ? 'Camera following user' : 'Free camera'}
              aria-label="Toggle follow user"
            >
              <LocateFixed className="w-4 h-4" />
            </button>
            <button
              onClick={requestMotionPermission}
              className="h-10 w-10 rounded-xl bg-white hover:bg-neutral-100 text-neutral-600 ring-1 ring-black/10 flex items-center justify-center cursor-pointer active:scale-95"
              title="Calibrate phone sensors"
              aria-label="Calibrate phone sensors"
            >
              <Smartphone className="w-4 h-4" />
            </button>
            <button
              onClick={simulateWrongTurn}
              className="h-10 px-2.5 rounded-xl bg-white hover:bg-rose-50 text-neutral-600 hover:text-rose-600 ring-1 ring-black/10 text-[11px] font-semibold cursor-pointer active:scale-95"
              title="Simulate wrong turn"
            >
              Off-route
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
