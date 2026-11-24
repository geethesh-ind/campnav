import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, Plugin} from 'vite';

// In-memory real-time device location store for CampusNav backend
interface DeviceLocationState {
  deviceId: string;
  x: number;
  y: number;
  buildingId: string;
  floorId: string;
  heading: number;
  speed: number;
  stepCount: number;
  status: 'walking' | 'stationary' | 'arrived';
  destination?: string;
  updatedAt: number;
}

let latestLiveLocation: DeviceLocationState = {
  deviceId: 'default_device',
  x: 500,
  y: 560,
  buildingId: 'outdoor',
  floorId: 'outdoor',
  heading: 0,
  speed: 0,
  stepCount: 0,
  status: 'stationary',
  updatedAt: Date.now(),
};

function liveLocationBackendPlugin(): Plugin {
  return {
    name: 'live-location-backend',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const url = req.url || '';

        // GET /api/health
        if (url === '/api/health' && req.method === 'GET') {
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({
            status: 'online',
            service: 'Canara CampusNav Realtime Navigation Backend',
            timestamp: Date.now(),
          }));
          return;
        }

        // GET /api/live-location
        if (url === '/api/live-location' && req.method === 'GET') {
          res.setHeader('Content-Type', 'application/json');
          res.setHeader('Access-Control-Allow-Origin', '*');
          res.end(JSON.stringify({
            success: true,
            telemetry: latestLiveLocation,
            isFresh: Date.now() - latestLiveLocation.updatedAt < 5000,
          }));
          return;
        }

        // POST /api/live-location
        if (url === '/api/live-location' && req.method === 'POST') {
          let body = '';
          req.on('data', chunk => {
            body += chunk;
          });
          req.on('end', () => {
            try {
              const data = JSON.parse(body);
              latestLiveLocation = {
                deviceId: data.deviceId || 'mobile_user',
                x: Number(data.x) || latestLiveLocation.x,
                y: Number(data.y) || latestLiveLocation.y,
                buildingId: data.buildingId || latestLiveLocation.buildingId,
                floorId: data.floorId || latestLiveLocation.floorId,
                heading: Number(data.heading) || latestLiveLocation.heading,
                speed: Number(data.speed) || 0,
                stepCount: Number(data.stepCount) || latestLiveLocation.stepCount,
                status: data.status || (Number(data.speed) > 0 ? 'walking' : 'stationary'),
                destination: data.destination || latestLiveLocation.destination,
                updatedAt: Date.now(),
              };

              res.setHeader('Content-Type', 'application/json');
              res.setHeader('Access-Control-Allow-Origin', '*');
              res.end(JSON.stringify({ success: true, telemetry: latestLiveLocation }));
            } catch (err) {
              res.statusCode = 400;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ success: false, error: 'Invalid JSON payload' }));
            }
          });
          return;
        }

        next();
      });
    },
  };
}

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss(), liveLocationBackendPlugin()],
    resolve: {
      alias: {
        '@': path.resolve(import.meta.dirname, '.'),
      },
    },
    server: {
      host: '0.0.0.0',
      port: 3000,
      allowedHosts: true as const,
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
