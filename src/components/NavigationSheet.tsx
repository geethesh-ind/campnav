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
  Share2,
  Check,
  X,
  Accessibility,
  Zap,
  Footprints,
  Compass,
  LocateFixed,
  Smartphone,
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
    toggleLiveTracking,
    motionTelemetry,
    stepMetersForward,
    requestMotionPermission,
    isFollowUser,
    toggleFollowUser,
    remainingDistanceMeters,
  } = useCampus();

  const [copiedLink, setCopiedLink] = useState(false);

  if (!isNavigating || !activeRoute) {
    return null;
  }

  const currentStep = activeRoute.steps[currentStepIndex] || activeRoute.steps[0];
  const nextStep = activeRoute.steps[currentStepIndex + 1];

  const currentFloorObj = floors.find(f => f.id === userPosition.floorId);
  const destFloorObj = floors.find(f => f.id === activeRoute.destinationLocation.floorId);

  // Dynamic real-time remaining distance (smoothly updates with footsteps)
  const remainingDistance = remainingDistanceMeters > 0
    ? remainingDistanceMeters
    : activeRoute.steps
        .slice(currentStepIndex)
        .reduce((acc, step) => acc + step.distanceMeters, 0);

  const remainingMinutes = Math.max(1, Math.ceil(remainingDistance / 50));

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
        return <CheckCircle2 className="w-7 h-7 text-white" />;
      default:
        return <ArrowUp className="w-7 h-7 text-white" />;
    }
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 z-30 pointer-events-none">
      <div className="max-w-xl mx-auto p-2.5 sm:p-3 pointer-events-auto">
        <div className="bg-white rounded-2xl shadow-xl border border-slate-300 overflow-hidden divide-y divide-slate-200 transition-all">
          {/* 1. WRONG DIRECTION ALERT */}
          {wrongDirectionStatus?.isWrongDirection && (
            <div className="bg-amber-700 text-white p-3 px-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-300" />
                <div>
                  <h4 className="text-xs font-bold">Wrong Direction Detected</h4>
                  <p className="text-[11px] text-amber-100">{wrongDirectionStatus.message}</p>
                </div>
              </div>
              <button
                onClick={recalculateRoute}
                className="min-h-[36px] px-3 py-1 rounded bg-white text-amber-900 font-bold text-xs shadow-xs hover:bg-amber-50 cursor-pointer"
              >
                Reroute
              </button>
            </div>
          )}

          {/* 2. MAIN TURN-BY-TURN GUIDANCE BANNER */}
          <div className="bg-[#0f3b7a] text-white p-3.5 sm:p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5 text-xs text-blue-200 font-bold uppercase tracking-wider">
                <Navigation className="w-3.5 h-3.5 text-amber-400" />
                <span className="truncate max-w-[240px]">
                  To: {activeRoute.destinationLocationName}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                {/* Share Link Button */}
                <button
                  onClick={handleShare}
                  className="min-h-[36px] px-2.5 rounded bg-white/10 hover:bg-white/20 text-white text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer border border-white/15"
                  title="Copy shareable link for this route"
                >
                  {copiedLink ? <Check className="w-3.5 h-3.5 text-amber-300" /> : <Share2 className="w-3.5 h-3.5" />}
                  <span className="text-[11px]">{copiedLink ? 'Copied' : 'Share'}</span>
                </button>

                {/* Close Navigation */}
                <button
                  onClick={stopNavigation}
                  className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center text-white text-xs cursor-pointer transition-colors"
                  title="Exit navigation"
                  aria-label="Exit navigation"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Instruction and Landmark Description */}
            <div className="flex items-start gap-3 my-1">
              <div className="w-12 h-12 rounded-xl bg-white/10 border border-white/15 flex items-center justify-center shrink-0">
                {getStepIcon(currentStep.action)}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-base sm:text-lg font-bold leading-snug text-white">
                  {currentStep.primaryText}
                </h3>
                {currentStep.secondaryText && (
                  <p className="text-xs text-blue-200 font-medium mt-0.5">
                    {currentStep.secondaryText}
                  </p>
                )}
              </div>
            </div>

            {/* Floor transition hint */}
            {currentStep.floorChange && (
              <div className="mt-2.5 pt-2 border-t border-white/15 flex items-center gap-2 text-xs text-amber-300 font-semibold">
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
              <div className="mt-2.5 pt-2 border-t border-white/15 flex items-center gap-2 text-xs text-blue-200">
                <span className="font-bold uppercase tracking-wider text-[10px] bg-white/15 px-1.5 py-0.5 rounded">
                  Next
                </span>
                <span className="truncate">{nextStep.primaryText}</span>
              </div>
            )}
          </div>

          {/* 3. METRIC STATS & FLOORS */}
          <div className="p-3 bg-slate-50 flex items-center justify-between text-xs">
            <div className="flex items-baseline gap-2">
              <span className="text-lg font-bold text-slate-900">
                {remainingMinutes} <span className="text-xs font-semibold text-slate-500">min walk</span>
              </span>
              <span className="text-slate-400">•</span>
              <span className="font-semibold text-slate-700">{remainingDistance} metres</span>
            </div>

            {/* Location Indicators */}
            <div className="flex items-center gap-1.5 text-xs font-semibold">
              <span className="px-2 py-0.5 rounded bg-white border border-slate-200 text-slate-700 font-mono">
                {currentFloorObj?.code || 'GF'}
              </span>
              <span className="text-slate-400">→</span>
              <span className="px-2 py-0.5 rounded bg-amber-50 border border-amber-200 text-amber-800 font-mono font-bold">
                {destFloorObj?.code || 'GF'}
              </span>
            </div>
          </div>

          {/* 4. ROUTE PREFERENCE PICKER (ACCESSIBILITY) */}
          <div className="px-3 py-2 flex items-center justify-between gap-2 overflow-x-auto text-xs">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Routing:
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setRoutingPreference('shortest')}
                className={`min-h-[36px] px-3 py-1 rounded-lg font-semibold transition-colors cursor-pointer flex items-center gap-1 border ${
                  routingPreference === 'shortest'
                    ? 'bg-[#0f3b7a] text-white border-[#0f3b7a]'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'
                }`}
              >
                <Zap className="w-3.5 h-3.5" />
                <span>Shortest</span>
              </button>
              <button
                onClick={() => setRoutingPreference('wheelchair')}
                className={`min-h-[36px] px-3 py-1 rounded-lg font-semibold transition-colors cursor-pointer flex items-center gap-1 border ${
                  routingPreference === 'wheelchair'
                    ? 'bg-amber-500 text-slate-950 font-bold border-amber-400'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'
                }`}
                title="Avoid stairs completely, use elevators only"
              >
                <Accessibility className="w-3.5 h-3.5" />
                <span>Lift Only (Accessible)</span>
              </button>
            </div>
          </div>

          {/* 5. LIVE HARDWARE SENSOR & TELEMETRY STATUS BAR */}
          <div className="px-3 py-2 bg-slate-900 text-white flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono">
            <div className="flex items-center gap-2">
              <span className="flex items-center gap-1.5 text-emerald-400 font-bold">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                {isLiveTracking ? 'LIVE SENSORS ON' : 'SENSORS PAUSED'}
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
              {motionTelemetry.currentSpeedMps > 0 && (
                <>
                  <span className="text-slate-600">|</span>
                  <span className="text-amber-300 font-bold">
                    {motionTelemetry.currentSpeedMps} m/s
                  </span>
                </>
              )}
            </div>

            <div className="flex items-center gap-1.5">
              <button
                onClick={toggleFollowUser}
                className={`px-2 py-0.5 rounded text-[10px] font-bold cursor-pointer transition-colors flex items-center gap-1 ${
                  isFollowUser ? 'bg-amber-500 text-slate-950 font-black' : 'bg-slate-800 text-slate-300'
                }`}
                title="Toggle automatic camera centering on user"
              >
                <LocateFixed className="w-3 h-3" />
                <span>{isFollowUser ? 'Auto-Centering' : 'Free Camera'}</span>
              </button>

              <button
                onClick={requestMotionPermission}
                className="px-2 py-0.5 rounded text-[10px] bg-slate-800 hover:bg-slate-700 text-slate-300 cursor-pointer flex items-center gap-1"
                title="Request mobile sensor permission (iOS/Android)"
              >
                <Smartphone className="w-3 h-3 text-emerald-400" />
                <span>Calibrate</span>
              </button>
            </div>
          </div>

          {/* 6. WALKING SIMULATION & STEPPING TOOLBAR */}
          <div className="p-2.5 bg-white flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-1.5">
              {/* Live Smooth Simulation */}
              <button
                onClick={toggleSimulation}
                className={`min-h-[40px] flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition-colors cursor-pointer border ${
                  isSimulatingWalk
                    ? 'bg-amber-500 text-slate-950 border-amber-400'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'
                }`}
                title="Simulate continuous walking along corridor at 20fps"
              >
                {isSimulatingWalk ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                <span>{isSimulatingWalk ? 'Pause Walk' : 'Auto Walk'}</span>
              </button>

              {/* Walk +1m Manual Step Trigger */}
              <button
                onClick={() => stepMetersForward(1.4)}
                className="min-h-[40px] flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#0f3b7a] hover:bg-[#0c2f62] text-white font-bold transition-colors cursor-pointer shadow-xs"
                title="Advance user position by 2 footsteps (~1.4 meters) along corridor"
              >
                <Footprints className="w-3.5 h-3.5 text-amber-300" />
                <span>Step +1.4m</span>
              </button>

              {/* Jump to Next Turn */}
              <button
                onClick={stepForward}
                disabled={currentStepIndex >= activeRoute.steps.length - 1}
                className="min-h-[40px] px-2.5 rounded-lg bg-slate-100 hover:bg-slate-200 disabled:opacity-40 text-slate-700 border border-slate-200 cursor-pointer"
                title="Jump directly to next corridor turn / landmark"
                aria-label="Next landmark"
              >
                <SkipForward className="w-4 h-4" />
              </button>

              <div className="flex items-center bg-slate-100 rounded-lg p-0.5 border border-slate-200">
                {[1, 2, 4].map(spd => (
                  <button
                    key={spd}
                    onClick={() => setSimulationSpeed(spd)}
                    className={`min-h-[32px] px-2 py-0.5 rounded text-[11px] font-bold cursor-pointer ${
                      simulationSpeed === spd ? 'bg-white text-[#0f3b7a] shadow-xs' : 'text-slate-500'
                    }`}
                  >
                    {spd}x
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={simulateWrongTurn}
              className="min-h-[40px] flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-50 hover:bg-rose-50 text-slate-700 hover:text-rose-700 font-semibold border border-slate-200 transition-colors cursor-pointer text-xs"
              title="Test off-route detection & recalculation"
            >
              <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
              <span>Simulate Wrong Turn</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
