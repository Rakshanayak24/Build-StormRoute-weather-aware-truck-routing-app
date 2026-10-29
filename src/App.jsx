import { useEffect, useMemo, useState } from 'react';
import { MapContainer, TileLayer, Polyline, Circle, CircleMarker, Popup, useMap } from 'react-leaflet';
import { ArrowDownUp, ArrowRight, CalendarDays, ChevronDown, Clock3, Cloud, CloudRain, Compass, Crosshair, Fuel, Gauge, Layers3, MapPin, Navigation, Package, Route, ShieldAlert, ShieldCheck, SlidersHorizontal, Wind, X } from 'lucide-react';

const API = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';
const riskColor = { Low: '#53c991', Moderate: '#f2c867', High: '#f29b50', Severe: '#ed6d61', 'No Travel': '#bf6682' };
const fmtTime = s => new Date(s).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
const duration = s => { const h = Math.floor(s / 3600), m = Math.round(s % 3600 / 60); return `${h}h ${m}m`; };

function FitBounds({ routes }) {
  const map = useMap();
  useEffect(() => { const coords = routes.flatMap(r => r.geometry); if (coords.length) map.fitBounds(coords, { padding: [45, 45] }); }, [routes, map]);
  return null;
}

function WeatherMap({ routes, activeId, onRoute, hourOffset, departure, weatherLayer }) {
  const active = routes.find(r => r.id === activeId) || routes[0];
  const allPoints = active?.checkpoints || [];
  const planStart = new Date(departure).getTime();
  const visible = allPoints.filter(c => (new Date(c.eta).getTime() - planStart) / 3600000 <= hourOffset || hourOffset === 48);
  return <MapContainer center={[39.5, -98.35]} zoom={4} zoomControl={false} className="map" scrollWheelZoom>
    <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" />
    <FitBounds routes={routes}/>
    {routes.map(route => <Polyline key={route.id} positions={route.geometry} pathOptions={{ color: route.id === activeId ? '#e5bd73' : '#70807a', weight: route.id === activeId ? 5 : 3, opacity: route.id === activeId ? .95 : .48, dashArray: route.id === activeId ? null : '8 10' }} eventHandlers={{ click: () => onRoute(route.id) }} />)}
    {weatherLayer && visible.map(c => <Circle key={`heat-${c.id}`} center={[c.lat,c.lon]} radius={24000} pathOptions={{ color: riskColor[c.risk], weight: 0, fillColor: riskColor[c.risk], fillOpacity: .16, interactive: false }} />)}
    {weatherLayer && visible.map(c => <CircleMarker key={c.id} center={[c.lat,c.lon]} radius={8} pathOptions={{ color: '#151d1b', weight: 3, fillColor: riskColor[c.risk], fillOpacity: .95 }}><Popup><div className="popup"><strong>{c.risk} risk · mile {c.miles}</strong><span>ETA {fmtTime(c.eta)}</span><span>{Math.round(c.windMph)} mph wind · {c.rainInHr.toFixed(2)} in/hr rain</span><span>{c.source}</span></div></Popup></CircleMarker>)}
  </MapContainer>;
}

function App() {
  const [form, setForm] = useState({ origin: 'Denver, Colorado', destination: 'Salt Lake City, Utah', loadLb: 42000, spacingMiles: 25, departure: new Date(Date.now() + 3600000).toISOString().slice(0,16) });
  const [plan, setPlan] = useState(null), [activeId, setActiveId] = useState(null), [loading, setLoading] = useState(false), [error, setError] = useState(''), [hourOffset, setHourOffset] = useState(48), [tab, setTab] = useState('routes'), [weatherLayer, setWeatherLayer] = useState(true);
  const update = (k,v) => setForm(f => ({...f, [k]:v}));
  const submit = async e => { e?.preventDefault(); setLoading(true); setError(''); try { const res = await fetch(`${API}/route-plan/`, { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({...form, loadLb:Number(form.loadLb), spacingMiles:Number(form.spacingMiles), departure:new Date(form.departure).toISOString()}) }); const data=await res.json(); if(!res.ok) throw new Error(data.error || 'Unable to plan this route.'); setPlan(data); setActiveId(data.recommendationId); } catch(err) { setError(err.message || 'Could not connect to the StormRoute service.'); } finally { setLoading(false); } };
  const route = plan?.routes.find(r=>r.id===activeId), recommendation=plan?.routes.find(r=>r.id===plan.recommendationId);
  const severeMiles = route?.checkpoints.filter(c=>c.risk==='Severe'||c.risk==='No Travel').reduce((n,c)=>n+c.segmentMiles,0)||0;
  const riskMiles = route?.checkpoints.reduce((n,c)=>n+(['High','Severe','No Travel'].includes(c.risk)?c.segmentMiles:0),0)||0;
  const avgRisk = route?.checkpoints.length ? (route.checkpoints.reduce((n,c)=>n+({Low:0,Moderate:1,High:2,Severe:3,'No Travel':4}[c.risk]),0)/route.checkpoints.length).toFixed(1) : '—';
  const shownCheckpoints = useMemo(()=>route?.checkpoints.filter(c=>hourOffset===48 || (new Date(c.eta).getTime()-new Date(plan.departure).getTime())/3600000<=hourOffset)||[],[route,hourOffset,plan]);
  const forecastDegraded = plan?.routes.some(r=>r.checkpoints.some(c=>c.source!=='Open-Meteo'));

  return <main className="app-shell">
    <header className="topbar"><a className="brand" href="#"><span className="brand-mark"><Navigation size={18}/></span><span>storm<span className="brand-light">route</span></span></a><div className="top-center"><span className="live-dot"/> WEATHER INTELLIGENCE <span className="top-divider">/</span> FLEET SAFETY</div><div className="top-actions"><span className="api-state"><span className="status-dot"/> SYSTEM READY</span><button className="avatar">JD</button></div></header>
    <section className="title-row"><div><div className="eyebrow">OPERATIONS <span>/</span> ROUTE PLANNER</div><h1>Safer miles <em>ahead.</em></h1><p className="subtitle">Plan around the weather. Protect your people and your cargo.</p></div><div className="date-badge"><CalendarDays size={15}/><span>{new Date().toLocaleDateString([], {weekday:'short',month:'short',day:'numeric',year:'numeric'})}</span></div></section>
    <section className="workspace">
      <aside className="sidebar">
        <div className="section-head"><div><span className="section-kicker">NEW JOURNEY</span><h2>Trip details</h2></div><span className="step-badge">01 <span>/ 01</span></span></div>
        <form onSubmit={submit} className="trip-form">
          <label className="field-label">ORIGIN</label><div className="input-wrap"><MapPin size={16}/><input value={form.origin} onChange={e=>update('origin',e.target.value)} placeholder="City, state" required/><button type="button" className="icon-button" title="Use my location"><Crosshair size={15}/></button></div>
          <div className="swap-line"><span/><button type="button" className="swap-button" title="Swap origin and destination" onClick={()=>setForm(f=>({...f,origin:f.destination,destination:f.origin}))}><ArrowDownUp size={14}/></button></div>
          <label className="field-label">DESTINATION</label><div className="input-wrap"><MapPin size={16}/><input value={form.destination} onChange={e=>update('destination',e.target.value)} placeholder="City, state" required/></div>
          <div className="form-grid"><div><label className="field-label">DEPARTURE</label><div className="input-wrap compact"><CalendarDays size={15}/><input type="datetime-local" value={form.departure} onChange={e=>update('departure',e.target.value)} required/></div></div><div><label className="field-label">LOAD WEIGHT</label><div className="input-wrap compact"><Package size={15}/><input type="number" min="0" max="200000" value={form.loadLb} onChange={e=>update('loadLb',e.target.value)} required/><span className="unit">LB</span></div></div></div>
          <div className="sampling-row"><div><label className="field-label">CHECKPOINT INTERVAL</label><div className="select-wrap"><SlidersHorizontal size={15}/><select value={form.spacingMiles} onChange={e=>update('spacingMiles',e.target.value)}><option value="10">Every 10 miles</option><option value="25">Every 25 miles</option><option value="50">Every 50 miles</option></select><ChevronDown size={14}/></div></div></div>
          <button type="submit" className="plan-button" disabled={loading}>{loading?<><span className="spinner"/> ANALYZING WEATHER & ROUTES</>:<><Compass size={16}/> FIND SAFEST ROUTES <ArrowRight size={16}/></>}</button>
          {error && <div className="error-box"><ShieldAlert size={16}/><span>{error}</span></div>}
        </form>
        <div className="rule-card"><div className="rule-icon"><ShieldCheck size={17}/></div><div><strong>Load-aware risk scoring</strong><span>Weather risk is adjusted to your cargo weight.</span></div><ChevronDown size={14}/></div>
        <div className="legend"><span className="field-label">RISK LEGEND</span><div className="legend-items">{Object.entries(riskColor).map(([label,color])=><span key={label}><i style={{background:color}}/>{label}</span>)}</div></div>
        <div className="sidebar-foot"><span>ROUTING <b>OSRM</b></span><span>FORECAST <b>OPEN-METEO</b></span></div>
      </aside>
      <section className="main-panel">
        {plan ? <><div className="summary-bar"><div className="route-endpoints"><span className="endpoint-dot start"/><div><b>{plan.origin.name.split(',')[0]}</b><small>{plan.origin.name.split(',').slice(1).join(',').trim()}</small></div><span className="route-dash"/><ArrowRight size={14} className="muted-icon"/><span className="endpoint-dot end"/><div><b>{plan.destination.name.split(',')[0]}</b><small>{plan.destination.name.split(',').slice(1).join(',').trim()}</small></div></div><div className="summary-meta"><span><Package size={14}/>{Number(plan.loadLb).toLocaleString()} lb</span><span><Clock3 size={14}/>{new Date(plan.departure).toLocaleTimeString([], {hour:'numeric',minute:'2-digit'})} depart</span></div></div>
          {forecastDegraded&&<div className="forecast-warning"><ShieldAlert size={13}/> Some checkpoint forecasts were unavailable. Neutral estimates are shown for those points; verify conditions before departure.</div>}
          <div className="map-wrap"><WeatherMap routes={plan.routes} activeId={activeId} onRoute={setActiveId} hourOffset={hourOffset} departure={plan.departure} weatherLayer={weatherLayer}/><div className="map-label"><Layers3 size={14}/> ROUTE WEATHER LAYER</div><div className="map-controls"><button title="Select recommended route" onClick={()=>setActiveId(plan.recommendationId)}><Crosshair size={15}/></button><button title={weatherLayer?'Hide weather layer':'Show weather layer'} className={weatherLayer?'layer-on':''} onClick={()=>setWeatherLayer(x=>!x)}><Cloud size={15}/></button></div><div className="map-legend"><span><i className="route-swatch recommended"/> RECOMMENDED</span><span><i className="route-swatch alternative"/> ALTERNATIVES</span></div></div>
          <div className="forecast-bar"><div className="forecast-title"><CloudRain size={15}/><b>FORECAST WINDOW</b><span>·</span><small>Checkpoints within {hourOffset} hours</small></div><div className="range-wrap"><span>0h</span><input type="range" min="0" max="48" step="6" value={hourOffset} onChange={e=>setHourOffset(Number(e.target.value))}/><span>48h</span><b>{hourOffset}h</b></div></div>
          <div className="results-head"><div className="tabs"><button className={tab==='routes'?'selected':''} onClick={()=>setTab('routes')}>Route options <span>{plan.routes.length}</span></button><button className={tab==='checkpoints'?'selected':''} onClick={()=>setTab('checkpoints')}>Checkpoints <span>{shownCheckpoints.length}</span></button></div><span className="rank-note"><ShieldCheck size={14}/> RANKED BY WEATHER SAFETY</span></div>
          {tab==='routes' ? <div className="route-cards">{plan.routes.map(r=><button className={`route-card ${r.id===activeId?'active':''}`} key={r.id} onClick={()=>setActiveId(r.id)}><div className="route-card-top"><span className={`route-icon ${r.id===plan.recommendationId?'best':''}`}><Route size={16}/></span><div className="route-name"><b>{r.id===plan.recommendationId?'Safest choice':r.name}</b>{r.id===plan.recommendationId&&<span className="recommended-tag">RECOMMENDED</span>}</div><span className="card-distance">{r.distanceMiles.toLocaleString()} <small>mi</small></span></div><div className="route-stats"><span><Clock3 size={14}/>{duration(r.durationSeconds)}</span><span><Gauge size={14}/>{r.checkpoints.length} checkpoints</span><span className="risk-stat" style={{color: r.id===plan.recommendationId?'#64d4a0':undefined}}><ShieldCheck size={14}/>{r.id===plan.recommendationId?'Lowest route risk':'View risk profile'}</span></div><div className="risk-strip">{r.checkpoints.map(c=><i key={c.id} style={{background:riskColor[c.risk],flexGrow:c.segmentMiles}} title={`${c.risk} · mile ${c.miles}`}/>)}</div></button>)}</div> : <div className="checkpoint-table"><div className="table-head"><span>MILE</span><span>ETA</span><span>CONDITIONS</span><span>RISK</span></div>{shownCheckpoints.map(c=><div className="table-row" key={c.id}><b>{c.miles}</b><span>{fmtTime(c.eta)}</span><span><Wind size={13}/> {Math.round(c.windMph)} mph <CloudRain size={13}/> {c.rainInHr.toFixed(2)} in/h</span><span className="risk-pill" style={{color:riskColor[c.risk]}}><i style={{background:riskColor[c.risk]}}/>{c.risk}</span></div>)}</div>}
        </> : <div className="empty-state"><div className="empty-orbit"><div className="orbit-ring"/><span className="empty-pin"><Navigation size={22}/></span><span className="orbit-dot d1"/><span className="orbit-dot d2"/><span className="orbit-dot d3"/></div><div className="empty-eyebrow"><span/> WEATHER-AWARE ROUTING</div><h2>Your next journey,<br/><em>planned with care.</em></h2><p>Enter your trip details to compare routes against forecast weather, load-specific risk, and drive time.</p><div className="empty-features"><span><ShieldCheck size={16}/> Load-aware safety</span><span><CloudRain size={16}/> On-route forecasts</span><span><Route size={16}/> Three route options</span></div><div className="empty-hint">YOUR ROUTE MAP WILL APPEAR HERE</div></div>}
      </section>
    </section>
    {plan && route && <footer className="bottom-insight"><span className="insight-icon"><ShieldCheck size={15}/></span><span><b>{route.id===plan.recommendationId?'Safest route selected':'Route selected'}:</b> {route.distanceMiles.toLocaleString()} miles · {duration(route.durationSeconds)}</span><span className="insight-divider"/><span><b>{severeMiles.toFixed(0)} mi</b> severe exposure</span><span><b>{riskMiles.toFixed(0)} mi</b> elevated risk</span><span><b>{avgRisk}</b> avg risk score</span><button onClick={()=>{setPlan(null);setError('')}}><X size={14}/> Clear plan</button></footer>}
    <footer className="page-foot"><span>© 2025 STORMROUTE <i/> BUILT FOR THE LONG HAUL</span><span>FORECASTS ARE ESTIMATES · ALWAYS FOLLOW LOCAL ROAD ADVISORIES</span></footer>
  </main>;
}

export default App;
