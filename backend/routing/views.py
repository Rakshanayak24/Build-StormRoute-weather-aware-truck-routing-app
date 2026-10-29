import json
import math
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timedelta, timezone
from django.http import JsonResponse
from django.views.decorators.http import require_GET, require_POST
from django.views.decorators.csrf import csrf_exempt
import requests
from .engine import classify_weather, rank_route, interpolate

@require_GET
def health(request):
    return JsonResponse({"status": "ok", "service": "StormRoute API"})

def geocode(place):
    r = requests.get("https://geocoding-api.open-meteo.com/v1/search", params={"name": place, "count": 1, "language": "en", "format": "json"}, timeout=12)
    r.raise_for_status()
    results = r.json().get("results", [])
    if not results:
        raise ValueError(f"Could not find {place}. Try a city and state, such as Denver, Colorado.")
    item = results[0]
    return {"name": ", ".join(filter(None, [item.get("name"), item.get("admin1"), item.get("country")])), "lat": item["latitude"], "lon": item["longitude"]}

def routes_for(origin, destination):
    coords = f'{origin["lon"]},{origin["lat"]};{destination["lon"]},{destination["lat"]}'
    r = requests.get(f"https://router.project-osrm.org/route/v1/driving/{coords}", params={"overview": "full", "geometries": "geojson", "alternatives": "3", "steps": "false"}, timeout=25)
    r.raise_for_status()
    data = r.json()
    if data.get("code") != "Ok" or not data.get("routes"):
        raise ValueError("The routing service could not find a drivable route between these places.")
    return data["routes"][:3]

def weather_batch(checkpoints):
    """Fetch up to 20 checkpoint forecasts in one Open-Meteo request."""
    try:
        params = {"latitude": ",".join(f'{c["lat"]:.5f}' for c in checkpoints),
                  "longitude": ",".join(f'{c["lon"]:.5f}' for c in checkpoints),
                  "hourly": "temperature_2m,precipitation,rain,snowfall,wind_speed_10m",
                  "wind_speed_unit": "mph", "precipitation_unit": "inch",
                  "timezone": "UTC", "forecast_days": 7}
        response = requests.get("https://api.open-meteo.com/v1/forecast", params=params, timeout=25)
        response.raise_for_status()
        payload = response.json()
        locations = payload if isinstance(payload, list) else [payload]
        forecasts = []
        for checkpoint, location in zip(checkpoints, locations):
            hourly = location["hourly"]; stamps = hourly["time"]
            requested = datetime.fromisoformat(checkpoint["eta"]).astimezone(timezone.utc).replace(minute=0, second=0, microsecond=0)
            available_start = datetime.fromisoformat(stamps[0]).replace(tzinfo=timezone.utc)
            available_end = datetime.fromisoformat(stamps[-1]).replace(tzinfo=timezone.utc)
            if requested < available_start or requested > available_end:
                forecasts.append({"windMph": 0, "rainInHr": 0, "snowInHr": 0, "tempC": None, "forecastTime": checkpoint["eta"], "source": "Outside forecast horizon; neutral estimate"})
                continue
            idx = min(range(len(stamps)), key=lambda i: abs(datetime.fromisoformat(stamps[i]).replace(tzinfo=timezone.utc) - requested))
            forecasts.append({"windMph": hourly["wind_speed_10m"][idx] or 0,
                "rainInHr": hourly["rain"][idx] or 0,
                "snowInHr": (hourly["snowfall"][idx] or 0) / 2.54,
                "tempC": hourly["temperature_2m"][idx], "forecastTime": stamps[idx], "source": "Open-Meteo"})
        if len(forecasts) != len(checkpoints):
            raise ValueError("Weather provider returned an incomplete location set")
        return forecasts
    except Exception:
        return [{"windMph": 0, "rainInHr": 0, "snowInHr": 0, "tempC": None,
                 "forecastTime": checkpoint["eta"], "source": "Forecast unavailable; neutral estimate"}
                for checkpoint in checkpoints]

@csrf_exempt
@require_POST
def plan_route(request):
    try:
        body = json.loads(request.body)
        origin_text = str(body["origin"]).strip(); destination_text = str(body["destination"]).strip()
        load = float(body["loadLb"]); spacing = int(body.get("spacingMiles", 25))
        depart = datetime.fromisoformat(body["departure"].replace("Z", "+00:00"))
        if not origin_text or not destination_text: raise ValueError("Enter an origin and destination.")
        if not math.isfinite(load) or load < 0 or load > 200000: raise ValueError("Load must be between 0 and 200,000 lb.")
        if spacing not in (10, 25, 50): raise ValueError("Checkpoint spacing must be 10, 25, or 50 miles.")
        if depart.tzinfo is None: depart = depart.replace(tzinfo=timezone.utc)
        origin, destination = geocode(origin_text), geocode(destination_text)
        raw_routes = routes_for(origin, destination)
        output = []
        for idx, raw in enumerate(raw_routes):
            coords = [[lat, lon] for lon, lat in raw["geometry"]["coordinates"]]
            miles = raw["distance"] / 1609.344; duration = raw["duration"]
            count = max(1, math.ceil(miles / spacing))
            checkpoints = []
            for n in range(1, count + 1):
                traveled = min(n * spacing, miles)
                fraction = traveled / miles if miles else 1
                lat, lon = interpolate(coords, fraction)
                eta = depart + timedelta(seconds=duration*fraction)
                checkpoints.append({"id": f"{idx}-{n}", "lat": lat, "lon": lon, "miles": round(traveled, 1), "segmentMiles": round(min(spacing, miles-(n-1)*spacing), 1), "eta": eta.isoformat()})
            # Open-Meteo accepts multiple coordinate pairs per request. Batching
            # controls request volume for long trips while preserving checkpoint ETAs.
            batches = [checkpoints[i:i+20] for i in range(0, len(checkpoints), 20)]
            with ThreadPoolExecutor(max_workers=8) as pool:
                forecast_batches = list(pool.map(weather_batch, batches))
            forecasts = [forecast for batch in forecast_batches for forecast in batch]
            for checkpoint, wx in zip(checkpoints, forecasts):
                risk, factors = classify_weather(wx["windMph"], wx["rainInHr"], wx["snowInHr"], load)
                checkpoint.update({"risk": risk, "factors": factors, **wx})
            output.append({"id": idx, "name": ["Fastest", "Alternative 1", "Alternative 2"][idx], "distanceMiles": round(miles, 1), "durationSeconds": duration, "geometry": coords, "checkpoints": checkpoints})
        ordered = sorted(output, key=rank_route); ordered[0]["recommended"] = True
        return JsonResponse({"origin": origin, "destination": destination, "departure": depart.isoformat(), "loadLb": load, "spacingMiles": spacing, "routes": output, "recommendationId": ordered[0]["id"], "provider": {"routing": "OSRM", "weather": "Open-Meteo"}})
    except (ValueError, KeyError, TypeError, json.JSONDecodeError) as e:
        return JsonResponse({"error": str(e)}, status=400)
    except requests.RequestException as e:
        return JsonResponse({"error": f"A routing or geocoding provider could not be reached: {e}"}, status=502)
