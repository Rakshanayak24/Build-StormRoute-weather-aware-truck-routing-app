# StormRoute

Weather aware route planning for commercial truck trips. StormRoute compares up to three drivable routes, samples forecast conditions at the selected interval, applies load specific risk rules, and explains the safest recommendation.

## Requirements

- Node.js 20 or newer
- Python 3.10 or newer
- Internet access for OpenStreetMap routing/geocoding and Open-Meteo forecasts

## Run locally

Open two terminals from the repository root.

**Backend** (Windows PowerShell):

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
python manage.py runserver 8000
```

**Frontend:**

```powershell
npm install
npm run dev
```

Open http://localhost:5173. The React app sends requests to `http://localhost:8000/api`. Set `VITE_API_URL` to change the API base URL.

## Route and forecast providers

- Geocoding: Open-Meteo Geocoding API
- Routing: OSRM public demo server (three route alternatives when available)
- Forecast: Open-Meteo Forecast API
- Basemap: CARTO dark tiles with OpenStreetMap attribution

No API key is needed for the public endpoints used here. Public demo services have rate limits and availability limits; production use should configure managed provider accounts and review their usage terms. A failed forecast request is marked in the checkpoint source and uses a neutral estimate, so treat the route as incomplete until a real forecast is available.

## Risk model

Weather thresholds follow the assessment brief. Rain and snowfall rates from Open-Meteo are converted to inches per hour, and wind is requested in mph. The load overrides apply to wind risk: 45–54 mph with a load above 30,000 lb becomes No Travel; 35–44 mph with a load above 40,000 lb becomes Severe; 55 mph or more is No Travel for all loads. A checkpoint takes the most severe of wind, rain, and snow. Routes are ordered by Severe/No Travel segment miles, High segment miles, mean checkpoint risk score, then drive duration.

## Deploy

`render.yaml` describes a Django API and a static Vite frontend for Render. Review and replace the public provider endpoints with production accounts before operating a real fleet. `VITE_API_URL` is set to the Render API service URL in the blueprint.

The assessment also asks for a 5–10 minute Loom walkthrough. `WALKTHROUGH.md` contains a six minute recording outline; recording and publishing it requires access to your Loom account.

## Repository contents

- `backend/`: Django JSON API and route/risk engine
- `src/`: React trip planner, interactive Leaflet map, route cards, checkpoint table
- `render.yaml`: Render deployment blueprint
