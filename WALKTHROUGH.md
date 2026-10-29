# StormRoute walkthrough outline (about 6 minutes)

Use this outline to record the required Loom walkthrough after deploying the app. Show a real run with working routing and forecast services; do not present neutral fallback estimates as live weather.

1. **0:00–0:40 — The problem and workflow.** Introduce the truck trip planner and show the origin, destination, departure time, load weight, and checkpoint interval inputs.
2. **0:40–1:30 — Plan a trip.** Enter a representative trip and submit it. Point out the three route alternatives (or explain if the routing service returns fewer alternatives for that trip).
3. **1:30–2:30 — Read the map.** Show the route geometry, checkpoint markers, risk corridor colors, the weather layer toggle, and the 0–48 hour forecast window.
4. **2:30–3:30 — Compare options.** Select each route card and show distance, drive time, checkpoint count, and the risk strip. Identify which route the engine recommends and why.
5. **3:30–4:30 — Inspect checkpoint conditions.** Open the checkpoint table and a map popup. Explain wind, rain, snow, estimated arrival time, risk band, and the weather source.
6. **4:30–5:30 — Explain the scoring rules.** Demonstrate how the load affects wind risk and summarize route ordering: Severe/No Travel exposure, High exposure, mean risk, then duration.
7. **5:30–6:00 — Close.** Show the repository and README setup/deployment notes, then mention provider limits and how to interpret unavailable forecast warnings.

Suggested test drive: Denver, Colorado to Salt Lake City, Utah; 42,000 lb; 25 mile checkpoint spacing. Adjust the departure time so the forecast falls within the provider's available forecast horizon.
