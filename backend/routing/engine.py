"""Deterministic checkpoint risk and route ranking for truck trips."""
from datetime import datetime, timedelta

RISK_SCORE = {"Low": 0, "Moderate": 1, "High": 2, "Severe": 3, "No Travel": 4}

def _band(value, thresholds):
    for upper, label in thresholds:
        if upper is None or value < upper:
            return label
    return "Severe"

def classify_weather(wind_mph, rain_in_hr, snow_in_hr, load_lb):
    """Apply the assessment's exclusive/inclusive limits and load overrides."""
    wind = _band(wind_mph, [(25, "Low"), (35, "Moderate"), (45, "High"), (55, "Severe"), (None, "No Travel")])
    # The brief specifies "above 1.00" and "above 3.0" for No Travel, so
    # those exact upper endpoints remain Severe.
    rain = ("Low" if rain_in_hr < 0.10 else "Moderate" if rain_in_hr < 0.25 else "High" if rain_in_hr < 0.50 else "Severe" if rain_in_hr <= 1.00 else "No Travel")
    snow = ("Low" if snow_in_hr < 0.5 else "Moderate" if snow_in_hr < 1.0 else "High" if snow_in_hr < 2.0 else "Severe" if snow_in_hr <= 3.0 else "No Travel")
    if wind_mph >= 55:
        return "No Travel", {"wind": wind, "rain": rain, "snow": snow}
    if wind_mph >= 45 and load_lb > 30000:
        wind = "No Travel"
    elif wind_mph >= 35 and load_lb > 40000:
        wind = "Severe"
    levels = {"Low": 0, "Moderate": 1, "High": 2, "Severe": 3, "No Travel": 4}
    risk = max((wind, rain, snow), key=lambda x: levels[x])
    return risk, {"wind": wind, "rain": rain, "snow": snow}

def rank_route(route):
    checkpoints = route["checkpoints"]
    # Include No Travel exposure in the top risk tier used for route ranking.
    distance = sum(c["segmentMiles"] for c in checkpoints if c["risk"] in ("Severe", "No Travel"))
    high = sum(c["segmentMiles"] for c in checkpoints if c["risk"] == "High")
    average = sum(RISK_SCORE[c["risk"]] for c in checkpoints) / max(len(checkpoints), 1)
    return (distance, high, average, route["durationSeconds"])

def interpolate(points, fraction):
    """Interpolate along a polyline by cumulative haversine distance."""
    import math
    def distance(a, b):
        lat1, lon1 = map(math.radians, a); lat2, lon2 = map(math.radians, b)
        dlat, dlon = lat2-lat1, lon2-lon1
        h = math.sin(dlat/2)**2 + math.cos(lat1)*math.cos(lat2)*math.sin(dlon/2)**2
        return 3958.8 * 2 * math.asin(math.sqrt(h))
    lengths = [distance(a, b) for a, b in zip(points, points[1:])]
    target = sum(lengths) * fraction
    for i, length in enumerate(lengths):
        if target <= length:
            t = target / length if length else 0
            return [points[i][0] + (points[i+1][0]-points[i][0])*t, points[i][1] + (points[i+1][1]-points[i][1])*t]
        target -= length
    return points[-1]
