import React, { useState } from 'react';
import {
  Navigation,
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
  Zap,
  Footprints,
  Compass,
  LocateFixed,
  Smartphone,
  ListOrdered,
} from 'lucide-react';
import { StairsIcon } from './icons/StairsIcon';
import { useCampus } from '../context/CampusContext';

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
    isLiveTracking,
    motionTelemetry,
    stepMetersForward,
    requestMotionPermission,
    isFollowUser,
    toggleFollowUser,
    remainingDistanceMeters,
  } = useCampus();

  const [copiedLink, setCopiedLink] = useState(false);
  const [showAllSteps, setShowAllSteps] = useState(false);

  if (!isNavigating || !activeRoute) {
    return null;
  }

  const currentStep = activeRoute.steps[currentStepIndex] || activeRoute.steps[0];
  const nextStep = activeRoute.steps[currentStepIndex + 1];
  const isArrived = currentStep.action === 'arrive';

  const currentFloorObj = floors.find(f => f.id === userPosition.floorId);
  const destFloorObj = floors.find(f => f.id === activeRoute.destinationLocation.floorId);

  // Dynamic real-time remaining distance (smoothly updates with footsteps)
  const remainingDistance = isArrived
    ? 0
    : remainingDistanceMeters > 0
    ? remainingDistanceMeters
    : activeRoute.steps
        .slice(currentStepIndex)
        .reduce((acc, step) => acc + step.distanceMeters, 0);

  const remainingMinutes = isArrived ? 0 : Math.max(1, Math.ceil(remainingDistance / 50));
  const progressPercent = activeRoute.totalDistanceMeters > 0
    ? Math.min(100, Math.max(5, Math.round(((activeRoute.totalDistanceMeters - remainingDistance) / activeRoute.totalDistanceMeters) * 100)))
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
        return <CornerUpLeft className="w-7 h-7 text-white" />;
      case 'turn_right':
        return <CornerUpRight className="w-7 h-7 text-white" />;
      case 'staircase_up':
      case 'staircase_down':
        return <StairsIcon className="w-7 h-7 text-white" />;
      case 'elevator_up':
      case 'elevator_down':
        return <ChevronsUpDown className="w-7 h-7 text-white" />;
      case 'arrive':
        return <CheckCircle2 className="w-7 h-7 text-emerald-300" />;
      default:
        return <ArrowUp className="w-7 h-7 text-white" />;
    }
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 z-30 pointer-events-none">
      <div className="max-w-xl mx-auto p-2.5 sm:p-3 pointer-events-auto">
        <div className="bg-white/98 backdrop-blur-xl rounded-2xl shadow-2xl border border-slate-300/90 overflow-hidden divide-y divide-slate-200/80 transition-all">
          {/* 1. WRONG DIRECTION ALERT */}
          {wrongDirectionStatus?.isWrongDirection && (
            <div className="bg-gradient-to-r from-amber-700 to-rose-700 text-white p-3 px-4 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <AlertTriangle className="w-5 h-5 text-amber-300 shrink-0" />
                <div>
                  <h4 className="text-xs font-extrabold">Off-Route Detected</h4>
                  <p className="text-[11px] text-amber-100">{wrongDirectionStatus.message}</p>
                </div>
              </div>
              <button
                onClick={recalculateRoute}
                className="min-h-[34px] px-3 py-1 rounded-lg bg-white text-rose-900 font-extrabold text-xs shadow-xs hover:bg-amber-50 cursor-pointer shrink-0"
              >
                Recalculate
              </button>
            </div>
          )}

          {/* 2. MAIN TURN-BY-TURN GUIDANCE BANNER */}
          <div
            className={`text-white p-3.5 sm:p-4 transition-colors ${
              isArrived
                ? 'bg-gradient-to-r from-emerald-800 via-emerald-700 to-teal-700'
                : 'bg-gradient-to-r from-[#0a2550] via-[#0f3b7a] to-[#154b96]'
            }`}
          >
            <div className="flex items-center justify-between gap-2 mb-2">
              <div className="flex items-center gap-1.5 text-xs text-blue-200 font-extrabold uppercase tracking-wider min-w-0">
                <Navigation className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span className="truncate">
                  {isArrived ? 'Arrived:' : 'Navigating to:'} {activeRoute.destinationLocationName}
                </span>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  onClick={() => setShowAllSteps(prev => !prev)}
                  className={`min-h-[32px] px-2.5 rounded-lg text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer border ${
                    showAllSteps
                      ? 'bg-amber-400 text-slate-950 border-amber-300'
                      : 'bg-white/10 hover:bg-white/20 text-white border-white/15'
                  }`}
                  title="Toggle full turn-by-turn steps list"
                >
                  <ListOrdered className="w-3.5 h-3.5" />
                  <span className="text-[11px]">
                    Step {Math.min(currentStepIndex + 1, activeRoute.steps.length)}/{activeRoute.steps.length}
                  </span>
                </button>

                {/* Share Link Button */}
                <button
                  onClick={handleShare}
                  className="min-h-[32px] px-2.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer border border-white/15"
                  title="Copy shareable link for this route"
                >
                  {copiedLink ? <Check className="w-3.5 h-3.5 text-amber-300" /> : <Share2 className="w-3.5 h-3.5" />}
                  <span className="text-[11px] hidden xs:inline">{copiedLink ? 'Copied' : 'Share'}</span>
                </button>

                {/* Close Navigation */}
                <button
                  onClick={stopNavigation}
                  className="w-8 h-8 rounded-lg bg-white/10 hover:bg-rose-500/80 flex items-center justify-center text-white text-xs cursor-pointer transition-colors"
                  title="Exit navigation"
                  aria-label="Exit navigation"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Instruction and Landmark Description */}
            <div className="flex items-center gap-3 my-1">
              <div className="w-12 h-12 rounded-2xl bg-white/12 border border-white/20 flex items-center justify-center shrink-0 shadow-inner">
                {getStepIcon(currentStep.action)}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-base sm:text-lg font-extrabold leading-snug text-white">
                  {currentStep.primaryText}
                </h3>
                {currentStep.secondaryText && (
                  <p className="text-xs text-blue-100/90 font-medium mt-0.5">
                    {currentStep.secondaryText}
                  </p>
                )}
              </div>
            </div>

            {/* Route Progress Bar */}
            <div className="mt-3 w-full bg-white/15 h-1.5 rounded-full overflow-hidden">
              <div
                className="bg-amber-400 h-full rounded-full transition-all duration-300"
                style={{ width: `${progressPercent}%` }}
              />
            </div>

            {/* Floor transition hint */}
            {currentStep.floorChange && (
              <div className="mt-2.5 pt-2 border-t border-white/15 flex items-center gap-2 text-xs text-amber-300 font-bold">
                <span className="bg-amber-400 text-slate-950 px-1.5 py-0.5 rounded text-[10px] font-black uppercase">
                  Floor Change
                </span>
                <span>
                  Take {currentStep.floorChange.via === 'elevator' ? 'Lift-02/03' : 'Central Stairs'} from{' '}
                  {currentStep.floorChange.fromFloorName} to {currentStep.floorChange.toFloorName}
                </span>
              </div>
            )}

            {/* Next step preview */}
            {nextStep && !currentStep.floorChange && (
              <div className="mt-2 pt-2 border-t border-white/15 flex items-center gap-2 text-xs text-blue-100">
                <span className="font-extrabold uppercase tracking-wider text-[10px] bg-white/15 px-1.5 py-0.5 rounded">
                  Then
                </span>
                <span className="truncate font-medium">{nextStep.primaryText}</span>
              </div>
            )}
          </div>

          {/* EXPANDABLE FULL STEP-BY-STEP DRAWER */}
          {showAllSteps && (
            <div className="max-h-44 overflow-y-auto divide-y divide-slate-100 bg-slate-50/90 px-3 py-2 text-xs">
              {activeRoute.steps.map((st, idx) => {
                const isCurrent = idx === currentStepIndex;
                const isCompleted = idx < currentStepIndex;
                return (
                  <div
                    key={st.id}
                    className={`py-2 px-2 rounded-lg flex items-center justify-between gap-2 ${
                      isCurrent ? 'bg-blue-50 font-bold text-[#0f3b7a]' : isCompleted ? 'text-slate-400 line-through' : 'text-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="w-5 h-5 rounded-full bg-white border border-slate-200 text-[10px] font-mono font-extrabold flex items-center justify-center shrink-0">
                        {idx + 1}
                      </span>
                      <span className="truncate">{st.primaryText}</span>
                    </div>
                    {st.distanceMeters > 0 && (
                      <span className="font-mono text-[11px] shrink-0">{st.distanceMeters}m</span>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* 3. METRIC STATS, FLOORS & ROUTING PREFERENCE */}
          <div className="px-3.5 py-2.5 bg-slate-50 flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex items-baseline gap-2">
              <span className="text-base sm:text-lg font-extrabold text-slate-900">
                {isArrived ? 'Destination Reached' : `${remainingMinutes} min`}
              </span>
              {!isArrived && (
                <>
                  <span className="text-slate-300">•</span>
                  <span className="font-extrabold text-[#0f3b7a] font-mono">{remainingDistance}m left</span>
                </>
              )}
            </div>

            {/* Floor & Mode Pills */}
            <div className="flex items-center gap-1.5 text-xs font-bold">
              <span className="px-2 py-0.5 rounded-md bg-white border border-slate-200 text-slate-700 font-mono text-[11px]">
                {currentFloorObj?.code || 'OUT'} → {destFloorObj?.code || 'GF'}
              </span>

              <button
                onClick={() => setRoutingPreference(routingPreference === 'wheelchair' ? 'shortest' : 'wheelchair')}
                className={`min-h-[28px] px-2.5 py-0.5 rounded-md font-bold transition-all cursor-pointer flex items-center gap-1 border text-[11px] ${
                  routingPreference === 'wheelchair'
                    ? 'bg-amber-400 text-slate-950 border-amber-400'
                    : 'bg-white hover:bg-slate-100 text-slate-600 border-slate-200'
                }`}
                title="Switch between Shortest (stairs allowed) and Lift-Only (accessible) path"
              >
                {routingPreference === 'wheelchair' ? (
                  <>
                    <Accessibility className="w-3 h-3" />
                    <span>Lift Only</span>
                  </>
                ) : (
                  <>
                    <Zap className="w-3 h-3 text-[#0f3b7a]" />
                    <span>Shortest</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* 4. LIVE HARDWARE SENSOR & TELEMETRY STATUS BAR */}
          {!motionTelemetry.isSecureContext && (
            <div className="px-3 py-2 bg-rose-950 text-rose-100 border-b border-rose-800 flex items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                <span>
                  <b>HTTP Mode:</b> Open the <b>https://</b> port 3001 URL on your phone to unlock live walking sensors!
                </span>
              </div>
              <a
                href={`https://${window.location.hostname}:3001${window.location.search}`}
                className="px-2.5 py-1 rounded-lg bg-amber-400 text-slate-950 font-black text-[11px] shrink-0"
              >
                Open HTTPS
              </a>
            </div>
          )}

          {motionTelemetry.isSecureContext && motionTelemetry.needsPermissionGesture && !motionTelemetry.isReceivingSensorEvents && (
            <div className="px-3 py-2 bg-amber-500 text-slate-950 flex items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-2 font-bold">
                <Smartphone className="w-4 h-4 shrink-0" />
                <span>Tap once to unlock your phone&apos;s walking &amp; compass sensors</span>
              </div>
              <button
                onClick={requestMotionPermission}
                className="px-3 py-1 rounded-lg bg-slate-950 text-white font-bold text-xs shrink-0 cursor-pointer"
              >
                Enable Sensors
              </button>
            </div>
          )}

          <div className="px-3.5 py-2 bg-slate-900 text-white flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono">
            <div className="flex items-center gap-2">
              <span className="flex items-center gap-1.5 text-emerald-400 font-bold">
                <span className={`w-2 h-2 rounded-full ${motionTelemetry.isReceivingSensorEvents ? 'bg-emerald-400 animate-ping' : 'bg-amber-400 animate-pulse'}`} />
                {motionTelemetry.isReceivingSensorEvents
                  ? 'WALK SENSORS ACTIVE'
                  : isLiveTracking
                  ? 'SENSORS READY'
                  : 'SENSORS PAUSED'}
              </span>
              <span className="text-slate-600">|</span>
              <span className="flex items-center gap-1 text-slate-300">
                <Footprints className="w-3.5 h-3.5 text-amber-400" />
                {motionTelemetry.stepCount} steps
              </span>
              <span className="text-slate-600">|</span>
              <span className="flex items-center gap-1 text-slate-300">
                <Compass className="w-3.5 h-3.5 text-blue-400" />
                {userPosition.heading}°
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                onClick={toggleFollowUser}
                className={`px-2 py-0.5 rounded text-[10px] font-bold cursor-pointer transition-colors flex items-center gap-1 ${
                  isFollowUser ? 'bg-amber-400 text-slate-950 font-black' : 'bg-slate-800 text-slate-300'
                }`}
                title="Toggle automatic camera centering on user"
              >
                <LocateFixed className="w-3 h-3" />
                <span>{isFollowUser ? 'Follow On' : 'Free Map'}</span>
              </button>

              <button
                onClick={requestMotionPermission}
                className="px-2 py-0.5 rounded text-[10px] bg-slate-800 hover:bg-slate-700 text-slate-300 cursor-pointer flex items-center gap-1"
                title="Calibrate mobile sensor permission (iOS/Android)"
              >
                <Smartphone className="w-3 h-3 text-emerald-400" />
                <span>Calibrate</span>
              </button>
            </div>
          </div>

          {/* 5. WALKING SIMULATION & STEPPING TOOLBAR */}
          <div className="p-2.5 bg-white flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-1.5 flex-wrap">
              {/* Live Smooth Simulation */}
              <button
                onClick={toggleSimulation}
                className={`min-h-[38px] flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-extrabold transition-all cursor-pointer border ${
                  isSimulatingWalk
                    ? 'bg-amber-400 text-slate-950 border-amber-400 shadow-xs'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-800 border-slate-200'
                }`}
                title="Simulate continuous walking along corridor at 20fps"
              >
                {isSimulatingWalk ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                <span>{isSimulatingWalk ? 'Pause' : 'Auto Walk'}</span>
              </button>

              {/* Walk +1.4m Manual Step Trigger */}
              <button
                onClick={() => stepMetersForward(1.4)}
                className="min-h-[38px] flex items-center gap-1 px-3 py-1.5 rounded-xl bg-[#0f3b7a] hover:bg-[#0c2f62] text-white font-extrabold transition-colors cursor-pointer shadow-xs"
                title="Advance user position by 2 footsteps (~1.4 meters) along corridor"
              >
                <Footprints className="w-3.5 h-3.5 text-amber-300" />
                <span>Step +1.4m</span>
              </button>

              {/* Prev / Next Turn Landmark Buttons */}
              <div className="flex items-center bg-slate-100 rounded-xl p-0.5 border border-slate-200">
                <button
                  onClick={stepBackward}
                  disabled={currentStepIndex <= 0}
                  className="min-h-[32px] px-2 rounded-lg hover:bg-white disabled:opacity-35 text-slate-700 cursor-pointer transition-colors"
                  title="Previous turn / landmark"
                  aria-label="Previous landmark"
                >
                  <SkipBack className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={stepForward}
                  disabled={currentStepIndex >= activeRoute.steps.length - 1}
                  className="min-h-[32px] px-2 rounded-lg hover:bg-white disabled:opacity-35 text-slate-700 cursor-pointer transition-colors"
                  title="Next turn / landmark"
                  aria-label="Next landmark"
                >
                  <SkipForward className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Simulation Speed Multiplier */}
              <div className="flex items-center bg-slate-100 rounded-xl p-0.5 border border-slate-200">
                {[1, 2, 4].map(spd => (
                  <button
                    key={spd}
                    onClick={() => setSimulationSpeed(spd)}
                    className={`min-h-[30px] px-2 py-0.5 rounded-lg text-[11px] font-extrabold cursor-pointer transition-colors ${
                      simulationSpeed === spd ? 'bg-white text-[#0f3b7a] shadow-2xs' : 'text-slate-500'
                    }`}
                  >
                    {spd}x
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={simulateWrongTurn}
              className="min-h-[38px] flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-50 hover:bg-rose-50 text-slate-600 hover:text-rose-700 font-bold border border-slate-200 transition-colors cursor-pointer text-[11px]"
              title="Test off-route detection & recalculation"
            >
              <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
              <span className="hidden sm:inline">Test Off-Route</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
