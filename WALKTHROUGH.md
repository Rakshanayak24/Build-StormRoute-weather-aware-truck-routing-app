# StormRoute Loom walkthrough script (about 7 minutes)

Record your screen with microphone audio. Keep the deployed app open before starting, and use a browser window large enough to show the map and route cards together. Suggested trip: Denver, Colorado → Salt Lake City, Utah; 42,000 lb; 25 mile checkpoints. Set a departure time within Open-Meteo's forecast window. Test the trip once before recording so the app and providers are ready. The free API may take about a minute to wake after being idle.

Don't claim a fallback estimate is live forecast data. If the app shows the forecast warning, explain it honestly, or record again when live forecast data is available.

## 0:00–0:40 — Introduce the project

**Show:** Open `https://stormroute.onrender.com`. Keep the empty trip form and map in view.

**Say:** “Hi, this is StormRoute, a weather-aware truck route planner. It compares drivable route options using forecast conditions at estimated checkpoint arrival times, then adjusts the risk for the truck's load. I'll show the trip setup, map, checkpoints, and how the recommendation is ranked.”

## 0:40–1:25 — Enter a trip

**Show:** Fill in Denver, Colorado and Salt Lake City, Utah. Choose a departure time in the next day, set load to 42,000 pounds, and leave checkpoint spacing at 25 miles.

**Say:** “The driver enters the origin and destination, departure time, cargo weight, and checkpoint interval. The interval can be 10, 25, or 50 miles. I’m using 25 miles here to give a useful level of detail without flooding the map.”

## 1:25–2:05 — Generate and frame the recommendation

**Show:** Click **Find safest routes**. Wait for results. Point out the endpoint names, selected load, departure time, and recommended card.

**Say:** “StormRoute geocodes the cities, requests driving routes, estimates an ETA at each checkpoint, and gets hourly weather for that time. The routing service returns up to three alternatives when available. The recommendation is ranked by severe exposure first, then high-risk exposure, average risk, and drive time.”

## 2:05–3:00 — Show the map and forecast window

**Show:** Point at the highlighted recommendation, dashed alternatives, colored checkpoint markers, and soft risk corridor. Drag the forecast slider from 48 hours down to 12, then back to 48. Toggle the weather layer off and on.

**Say:** “The highlighted line is the selected route; the other lines are alternatives. Checkpoint colors represent the computed risk, and the surrounding corridor makes higher-risk stretches easier to spot. The slider filters checkpoints by time after departure, so I can focus on the part of the trip within the first 12 hours or show the full 48-hour window.”

## 3:00–3:50 — Compare route options

**Show:** Select each available route card. Point at distance, duration, number of checkpoints, and colored risk strip. Return to the recommended route.

**Say:** “Each card summarizes distance, estimated drive time, checkpoint count, and the risk profile along the route. The strip is a quick overview: each segment is colored by its checkpoint risk. I can select a different route to inspect it on the map. The safest choice balances risk using the assessment's priority order, rather than choosing only the shortest drive.”

## 3:50–4:50 — Inspect checkpoint conditions

**Show:** Open the **Checkpoints** tab. Point at a row's mile, ETA, wind, rain, and risk. Click a map marker and show its popup and forecast source.

**Say:** “Each checkpoint uses the truck's estimated arrival time, not just the weather at departure. Here we can inspect wind in miles per hour and precipitation rates, along with the assigned risk band and forecast source. This makes it possible to understand what conditions drove a route's risk.”

## 4:50–5:50 — Explain the load-aware rules

**Show:** Open the GitHub repository in a second tab, then open `backend/routing/engine.py`. Point to `classify_weather` and `rank_route`.

**Say:** “The risk engine applies the assessment thresholds to wind, rain, and snow, then uses the most severe condition at each checkpoint. Load changes the wind rules: at 55 miles per hour, any load is No Travel; at 45 to 54, loads over 30,000 pounds are No Travel; and at 35 to 44, loads over 40,000 pounds are Severe. The route ranking then compares the exposure miles, average checkpoint risk, and drive time.”

## 5:50–6:35 — Brief implementation and reliability notes

**Show:** In GitHub, point out `src/` for the React interface, `backend/` for Django and risk logic, and `render.yaml` for deployment. Return to the app and point out the provider labels or forecast warning, if one is shown.

**Say:** “The frontend is React with a Leaflet map, and the backend is a Django JSON API. Routing uses OSRM; geocoding and forecasts use Open-Meteo. If a forecast is unavailable or outside its forecast window, the app labels that checkpoint and warns that it is using a neutral estimate. That should be verified before making a real dispatch decision.”

## 6:35–7:00 — Close

**Show:** Return to the live app with the recommended route visible, then end the recording.

**Say:** “That’s StormRoute: weather-aware route comparison with load-specific risk and checkpoint-level explanations. The live app and source repository are available at the links in my submission. Thank you.”

## Before you record

- Test the trip once; check that route results load and checkpoint data is visible.
- Confirm the forecast source says Open-Meteo for a live-data demo. If it shows neutral fallback estimates, don't describe those as live weather.
- Keep the browser zoom at a readable level and close unrelated tabs or notifications.
- If routing returns fewer than three options, say “up to three alternatives are available from the routing provider for this trip.”
- Submit the Loom share URL alongside the GitHub and live app URLs.
