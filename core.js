/* Route Notebook — core (pure functions, no DOM, no Three.js)
   Loaded as a classic script so it works from file:// too. Exposes window.RouteCore.
   tools/build_map_bundle.py mirrors simplify() — keep the two in sync. */
(function (root) {
  'use strict';

  // ---------- Deterministic PRNG ----------
  function mulberry32(a) {
    return function () {
      a |= 0; a = a + 0x6D2B79F5 | 0;
      let t = Math.imul(a ^ a >>> 15, 1 | a);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }

  // ---------- Distance / walking model (as specified) ----------
  function haversine(a, b) {
    const R = 6371000, toR = d => d * Math.PI / 180;
    const dLat = toR(b.lat - a.lat), dLon = toR(b.lon - a.lon);
    const s = Math.sin(dLat / 2) ** 2 + Math.cos(toR(a.lat)) * Math.cos(toR(b.lat)) * Math.sin(dLon / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(s));
  }
  function walkEstimate(distM) {
    const routedDist = distM * 1.3;   // detour factor
    const timeMin = routedDist / 80;  // ~4.8 km/h walking speed
    return { distM: routedDist, timeMin };
  }
  function priorityFactor(score = 5) { return 0.5 + score / 10; }
  function routingCost(i, j) { return walkEstimate(haversine(i, j)).distM / priorityFactor(j.priority ?? 5); }

  // ---------- Route: nearest neighbour + 2-opt (open route, fixed start) ----------
  // opts.legOf(a, b) may return { distM, timeMin, shape, ... } for a real street leg.
  function computeRoute(c, opts = {}) {
    const legOf = opts.legOf || (() => null);
    const warnM = opts.warnM ?? 1800;
    const places = c.places || [];
    const end = opts.end || null;
    if (!places.length && !c.hotel && !end) return null;
    const nodes = (c.hotel ? [{ ...c.hotel, isHotel: true }, ...places] : [...places]).concat(end ? [end] : []);
    const n = nodes.length;
    if (n === 1) return finish(nodes, [0]);
    const lastFixed = end ? n - 1 : -1;

    const cost = nodes.map((a, i) => nodes.map((b, j) => (i === j ? 0 : routingCost(a, b))));
    const sched = opts.schedule || null;
    const wt = sched ? nodes.map((a, i) => nodes.map((b, j) => (i === j ? 0 : walkEstimate(haversine(a, b)).timeMin))) : null;
    // Schedule penalty (metres-equivalent): waiting for a place to open costs like walking 80 m/min,
    // arriving when it is closed for the day costs a flat 4 km.
    const penalty = o => {
      if (!sched) return 0;
      let clock = sched.startMin ?? 570, pen = 0;
      for (let i = 0; i < o.length; i++) {
        const node = nodes[o[i]];
        const arrive = i === 0 ? clock : clock + wt[o[i - 1]][o[i]];
        let t = arrive;
        const oh = node.isHotel ? null : (sched.hoursOf ? sched.hoursOf(node) : null);
        if (oh && !oh.always) {
          const dow = ((sched.dow ?? 0) + Math.floor(arrive / 1440)) % 7, m = arrive % 1440;
          if (!isOpenAt(oh, dow, m)) {
            const nx = nextOpenAt(oh, dow, m);
            if (nx != null && nx - m <= (sched.maxWait ?? 180)) { pen += (nx - m) * 80; t = arrive + (nx - m); }
            else pen += 4000;
          }
        }
        clock = t + (node.isHotel ? 0 : (sched.stayOf ? sched.stayOf(node) : 45));
      }
      return pen;
    };
    const total = o => { let s = 0; for (let i = 0; i < o.length - 1; i++) s += cost[o[i]][o[i + 1]]; return s + penalty(o); };

    const visited = new Array(n).fill(false);
    let order = [0]; visited[0] = true;
    if (lastFixed >= 0) visited[lastFixed] = true;
    for (let k = 1; k < n - (lastFixed >= 0 ? 1 : 0); k++) {
      const last = order[order.length - 1];
      let best = -1, bc = Infinity;
      for (let j = 0; j < n; j++) if (!visited[j] && cost[last][j] < bc) { bc = cost[last][j]; best = j; }
      order.push(best); visited[best] = true;
    }
    if (lastFixed >= 0) order.push(lastFixed);
    const jMax = lastFixed >= 0 ? n - 2 : n - 1;
    let best = total(order), improved = true, guard = 0;
    while (improved && guard++ < 200) {
      improved = false;
      for (let i = 1; i < jMax; i++) {
        for (let j = i + 1; j <= jMax; j++) {
          const cand = order.slice(0, i).concat(order.slice(i, j + 1).reverse(), order.slice(j + 1));
          const t = total(cand);
          if (t < best - 1e-9) { best = t; order = cand; improved = true; }
        }
      }
    }
    return finish(nodes, order);

    function finish(nodes, order) {
      const seq = order.map(i => nodes[i]);
      const steps = seq.map((node, k) => {
        if (k === 0) return { node, distM: 0, timeMin: 0, warn: false, leg: null };
        const leg = legOf(seq[k - 1], node);
        if (leg && leg.shape) return { node, distM: leg.distM, timeMin: leg.timeMin, warn: leg.distM > warnM, leg };
        const w = walkEstimate(haversine(seq[k - 1], node));
        return { node, distM: w.distM, timeMin: w.timeMin, warn: w.distM > warnM, leg: null };
      });
      const totalDist = steps.reduce((s, x) => s + x.distM, 0);
      const totalTime = steps.reduce((s, x) => s + x.timeMin, 0);
      return { steps, totalDist, totalTime, startIsHotel: !!c.hotel };
    }
  }

  // ---------- Place categories from OSM tags ----------
  function catFromOsm(key, value) {
    key = key || ''; value = value || '';
    if (key === 'amenity') {
      if (/^(restaurant|fast_food|food_court|bistro)$/.test(value)) return 'restaurant';
      if (/^(cafe|ice_cream|bubble_tea)$/.test(value)) return 'cafe';
      if (/^(bar|pub|nightclub|biergarten|wine_bar)$/.test(value)) return 'bar';
      if (/^(marketplace)$/.test(value)) return 'shop';
      if (/^(place_of_worship|theatre|arts_centre|fountain|townhall)$/.test(value)) return 'sight';
      return 'other';
    }
    if (key === 'tourism') return /^(museum|gallery)$/.test(value) ? 'museum' : 'sight';
    if (key === 'shop') return /^(bakery|pastry|confectionery|coffee|tea|deli)$/.test(value) ? 'cafe' : 'shop';
    if (key === 'leisure') return /^(park|garden|nature_reserve)$/.test(value) ? 'park' : 'sight';
    if (key === 'historic' || key === 'building' || key === 'place' || key === 'natural') return 'sight';
    return 'sight';
  }

  // ---------- Map simplification (OSM → compact scene elements) ----------
  const ROAD = { // class → [width (units), height]
    motorway: [2.4, 0.20], trunk: [2.2, 0.20], primary: [1.9, 0.18], secondary: [1.6, 0.16], tertiary: [1.3, 0.14],
    residential: [1.0, 0.12], unclassified: [1.0, 0.12], living_street: [0.9, 0.12], pedestrian: [1.1, 0.12],
    service: [0.55, 0.10], footway: [0.35, 0.08], path: [0.3, 0.08], cycleway: [0.4, 0.08], steps: [0.35, 0.08], track: [0.4, 0.08],
  };
  const roadClass = h => { if (!h) return null; const k = h.replace(/_link$/, ''); return ROAD[k] ? k : null; };
  const GREEN_RE = /^(park|garden|pitch|playground|grass|forest|cemetery|recreation_ground|village_green|meadow|wood|scrub)$/;
  const SAND_RE = /^(beach|sand)$/;

  function buildingHeight(t, id) {
    let m = parseFloat(t.height);
    if (!(m > 0)) { const lv = parseFloat(t['building:levels']); if (lv > 0) m = lv * 3.2 + 1; }
    if (!(m > 0)) m = 8 + (mulberry32(id)() * 8);
    return Math.max(0.35, m / 10 * 1.3);
  }
  // elements: Overpass JSON elements (ways with geometry, nodes with lat/lon). project(lat, lon) → {x, z}
  function simplify(elements, project) {
    const out = [];
    const r2 = v => Math.round(v * 100) / 100;
    for (const el of elements) {
      const t = el.tags || {};
      if (el.type === 'node') {
        if (el.lat == null) continue;
        let st = null;
        if (t.railway === 'station' && t.station === 'subway') st = 'subway';
        else if (t.railway === 'tram_stop') st = 'tram';
        else if (t.railway === 'station') st = 'rail';
        if (!st) continue;
        const q = project(el.lat, el.lon);
        out.push({ id: el.id, k: 'st', t: st, n: t.name || '', p: [r2(q.x), r2(q.z)], ll: [el.lat, el.lon] });
        continue;
      }
      if (el.type !== 'way' || !el.geometry || el.geometry.length < 2) continue;
      const g = el.geometry;
      const closed = g.length > 3 && g[0].lat === g[g.length - 1].lat && g[0].lon === g[g.length - 1].lon;
      const pts = g.map(n => { const q = project(n.lat, n.lon); return [r2(q.x), r2(q.z)]; });
      if (t.building && t.building !== 'no' && closed) out.push({ id: el.id, k: 'b', h: buildingHeight(t, el.id), p: pts.slice(0, -1) });
      else if (t.highway) { const c = roadClass(t.highway); if (c && !(t.tunnel === 'yes')) out.push({ id: el.id, k: 'r', c, p: pts }); }
      else if (closed && (t.natural === 'water' || t.waterway === 'riverbank')) out.push({ id: el.id, k: 'w', p: pts.slice(0, -1) });
      else if (/^(river|canal|stream)$/.test(t.waterway || '')) { let w = parseFloat(t.width) / 10; if (!(w > 0)) w = t.waterway === 'river' ? 7 : t.waterway === 'canal' ? 2.2 : 0.7; out.push({ id: el.id, k: 'wl', w, p: pts }); }
      else if (closed && SAND_RE.test(t.natural || '')) out.push({ id: el.id, k: 's', p: pts.slice(0, -1) });
      else if (closed && (GREEN_RE.test(t.leisure || '') || GREEN_RE.test(t.landuse || '') || GREEN_RE.test(t.natural || ''))) out.push({ id: el.id, k: 'g', p: pts.slice(0, -1) });
    }
    return out;
  }
  const OVERPASS_FILTERS = [
    'way["building"]', 'way["highway"]["highway"!~"construction|proposed|raceway|bus_guideway|corridor|elevator|platform"]',
    'way["natural"="water"]', 'way["waterway"="riverbank"]', 'way["waterway"~"^(river|canal|stream)$"]',
    'way["leisure"~"^(park|garden|pitch|playground)$"]',
    'way["landuse"~"^(grass|forest|cemetery|recreation_ground|village_green|meadow)$"]', 'way["natural"~"^(wood|scrub|beach|sand)$"]',
    'node["railway"="station"]', 'node["railway"="tram_stop"]',
  ];
  function overpassQuery(bboxes) {
    const body = bboxes.map(b => OVERPASS_FILTERS.map(f => `${f}(${b.S},${b.W},${b.N},${b.E});`).join('')).join('');
    return `[out:json][timeout:90];(${body});out geom qt;`;
  }

  // ---------- Encoded polylines (Valhalla uses 1e6 precision) ----------
  function decodePolyline(str, prec = 1e6) {
    let i = 0, lat = 0, lon = 0; const out = [];
    while (i < str.length) {
      let b, sh = 0, r = 0;
      do { b = str.charCodeAt(i++) - 63; r |= (b & 0x1f) << sh; sh += 5; } while (b >= 0x20);
      lat += (r & 1) ? ~(r >> 1) : (r >> 1);
      sh = 0; r = 0;
      do { b = str.charCodeAt(i++) - 63; r |= (b & 0x1f) << sh; sh += 5; } while (b >= 0x20);
      lon += (r & 1) ? ~(r >> 1) : (r >> 1);
      out.push([lat / prec, lon / prec]);
    }
    return out;
  }

  // ---------- Address/place-like lines from pasted text (e.g. an Instagram caption) ----------
  function extractCandidates(text) {
    const parts = text.split(/\n|•|\||·|\s{2,}|(?<=[.!?])\s+/).map(l => l.trim()).filter(Boolean);
    const cands = [];
    for (const l of parts) {
      let t = l.replace(/https?:\/\/\S+/g, '').replace(/[#@]\S+/g, '').replace(/[📍🗺️➡️👉✨🔥❤️🍴🍽️☕🍸\-–—*:>]+/g, ' ').replace(/\s+/g, ' ').trim();
      t = t.replace(/^(adres|address|dirección|indirizzo|where|nerede)\s*[:\-]?\s*/i, '');
      if (t.length < 3 || t.length > 90) continue;
      let score = 0;
      if (/📍/.test(l)) score += 3;
      if (/\b(carrer|calle|via|viale|piazza|plaça|plaza|passeig|avinguda|avenida|corso|largo|vicolo|rambla|ronda|travessera|street|road|c\/)\b/i.test(t)) score += 2;
      if (/\b\d{5}\b/.test(t)) score += 1;
      if (/\b(restaurant|ristorante|restaurante|bar|caf[eèé]|trattoria|osteria|pizzeria|gelateria|tapas|bistro|bakery|forn|pastisseria|pasticceria|bodega|taverna|cantina|enoteca)\b/i.test(t)) score += 1;
      if (/\b(barcelona|milano|milan|roma|rome)\b/i.test(t)) score += 1;
      cands.push({ t, score });
    }
    const scored = cands.filter(c => c.score > 0).sort((a, b) => b.score - a.score).slice(0, 4);
    const plain = cands.filter(c => c.score === 0).slice(0, 2);
    const seen = new Set();
    return [...scored, ...plain].map(c => c.t).filter(t => { const k = t.toLowerCase(); if (seen.has(k)) return false; seen.add(k); return true; });
  }


  // ---------- Opening hours: a practical subset of the OSM opening_hours syntax ----------
  // Supports "24/7", day lists/ranges (Mo-Fr, Sa,Su), several time ranges, "off"/"closed", overnight ranges.
  // Holiday rules (PH/SH) are ignored. Returns null when nothing could be parsed.
  const DAYS = ['mo', 'tu', 'we', 'th', 'fr', 'sa', 'su'];
  function parseOpeningHours(str) {
    if (!str || typeof str !== 'string') return null;
    const s = str.trim().toLowerCase();
    if (s === '24/7') return { always: true, intervals: () => [[0, 1440]], raw: str };
    const week = Array.from({ length: 7 }, () => null);
    let any = false;
    for (let rule of s.split(';')) {
      rule = rule.trim(); if (!rule) continue;
      if (/^(ph|sh)\b/.test(rule)) continue;
      let days = [0, 1, 2, 3, 4, 5, 6], rest = rule;
      const m = rule.match(/^((?:(?:mo|tu|we|th|fr|sa|su)(?:\s*-\s*(?:mo|tu|we|th|fr|sa|su))?\s*,?\s*)+)(.*)$/);
      if (m && m[1].trim()) {
        days = [];
        for (const part of m[1].split(',')) {
          const q = part.trim(); if (!q) continue;
          const r = q.split(/\s*-\s*/);
          const a = DAYS.indexOf(r[0]), b = DAYS.indexOf(r[1] ?? r[0]);
          if (a < 0 || b < 0) continue;
          for (let d = a; ; d = (d + 1) % 7) { days.push(d); if (d === b) break; }
        }
        rest = m[2].trim();
      }
      if (/^(off|closed)/.test(rest)) { for (const d of days) week[d] = []; any = true; continue; }
      const ivs = [];
      for (const tr of rest.split(',')) {
        const t = tr.trim().match(/^(\d{1,2})[:.](\d{2})\s*-\s*(\d{1,2})[:.](\d{2})\+?$/);
        if (!t) continue;
        let a = +t[1] * 60 + +t[2], b = +t[3] * 60 + +t[4];
        if (b <= a) b += 1440;
        ivs.push([a, b]);
      }
      if (!ivs.length) continue;
      any = true;
      for (const d of days) week[d] = ivs.slice();
    }
    if (!any) return null;
    return { always: false, intervals: dow => week[dow] || [], raw: str };
  }
  function ohIntervals(oh, dow) { // intervals for the day, including spill-over from the previous night
    const prev = (dow + 6) % 7;
    const spill = oh.intervals(prev).filter(([, b]) => b > 1440).map(([, b]) => [0, b - 1440]);
    return spill.concat(oh.intervals(dow));
  }
  function isOpenAt(oh, dow, t) { return oh.always || ohIntervals(oh, dow).some(([a, b]) => t >= a && t < b); }
  function nextOpenAt(oh, dow, t) { const l = ohIntervals(oh, dow).map(([a]) => a).filter(a => a > t).sort((x, y) => x - y); return l.length ? l[0] : null; }
  function closesAt(oh, dow, t) { if (oh.always) return null; const iv = ohIntervals(oh, dow).find(([a, b]) => t >= a && t < b); return iv ? iv[1] : null; }
  const hhmm = m => { m = Math.round(m); const d = Math.floor(m / 1440); m -= d * 1440; return String(Math.floor(m / 60)).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0') + (d > 0 ? '+' + d : ''); };


  // ---------- Anchored days: meals (or any fixed-time stop) split the day into segments ----------
  // Places with slotMin (minutes of day) are visited at that time, in time order. Free places are
  // assigned to the segment where they cause the least detour (with a soft time budget), then each
  // segment is ordered with computeRoute() from the previous anchor to the next.
  function computeRouteAnchored(c, opts = {}) {
    const all = c.places || [];
    const anchors = all.filter(p => p.slotMin != null).sort((a, b) => a.slotMin - b.slotMin);
    if (!anchors.length) return computeRoute(c, opts);
    const free = all.filter(p => p.slotMin == null);
    const stayOf = (opts.schedule && opts.schedule.stayOf) || (() => 45);
    const start = c.hotel ? { ...c.hotel, isHotel: true } : null;
    const segs = anchors.map((a, i) => ({ from: i === 0 ? start : anchors[i - 1], to: a, places: [] }));
    segs.push({ from: anchors[anchors.length - 1], to: null, places: [] });
    for (const p of free) {
      let best = 0, bc = Infinity;
      segs.forEach((sg, i) => {
        const a = sg.from, b = sg.to; let d;
        if (!a && !b) d = 0; else if (!a) d = haversine(p, b); else if (!b) d = haversine(a, p); else d = haversine(a, p) + haversine(p, b) - haversine(a, b);
        // time budget of the segment: over budget costs 80 m per minute, free time earns a bonus so mornings get used
        let budget = null;
        if (a && b && a.slotMin != null) budget = b.slotMin - a.slotMin - stayOf(a);
        else if (b) budget = b.slotMin - ((opts.schedule && opts.schedule.startMin) ?? 570) - (a && !a.slotMin ? 0 : 0);
        if (budget != null) {
          const load = sg.places.reduce((t, q) => t + stayOf(q) + 15, 0) + stayOf(p) + 15;
          if (load > budget) d += (load - budget) * 80; else d -= Math.min(budget - load, 180) * 15;
        }
        if (d < bc) { bc = d; best = i; }
      });
      segs[best].places.push(p);
    }
    const steps = [];
    segs.forEach((sg, i) => {
      const sub = { hotel: sg.from, places: sg.places };
      const r = computeRoute(sub, { ...opts, end: sg.to, schedule: opts.schedule });
      if (!r) return;
      r.steps.forEach((st, k) => { if (k === 0 && steps.length) return; steps.push(st); });
    });
    const totalDist = steps.reduce((t, x) => t + x.distM, 0), totalTime = steps.reduce((t, x) => t + x.timeMin, 0);
    return { steps, totalDist, totalTime, startIsHotel: !!c.hotel, anchored: true };
  }

  // ---------- Day schedule: arrival / departure per step ----------
  // opts: { startMin, dow (0 = Monday), stayOf(node) → minutes, hoursOf(node) → parsed hours | null, maxWait }
  function scheduleSteps(steps, opts = {}) {
    const stayOf = opts.stayOf || (() => 45), hoursOf = opts.hoursOf || (() => null), maxWait = opts.maxWait ?? 180;
    let clock = opts.startMin ?? 570, totalWait = 0, closedCount = 0;
    const items = steps.map((st, k) => {
      const arriveRaw = k === 0 ? clock : clock + st.timeMin;
      let arrive = arriveRaw, wait = 0, closed = false, opensAt = null, closes = null;
      const oh = st.node.isHotel ? null : hoursOf(st.node);
      if (oh) {
        const dayOff = Math.floor(arriveRaw / 1440), dow = ((opts.dow ?? 0) + dayOff) % 7, m = arriveRaw % 1440;
        if (!isOpenAt(oh, dow, m)) {
          const nx = nextOpenAt(oh, dow, m);
          if (nx != null && nx - m <= maxWait) { wait = nx - m; arrive = arriveRaw + wait; opensAt = arrive; }
          else closed = true;
        }
        if (!closed) { const c = closesAt(oh, dow, arrive % 1440); if (c != null) closes = dayOff * 1440 + c; }
      }
      let slotWait = 0, late = 0;
      if (st.node.slotMin != null) {
        if (arrive < st.node.slotMin) { slotWait = st.node.slotMin - arrive; arrive = st.node.slotMin; }
        else if (arrive > st.node.slotMin + 15) late = arrive - st.node.slotMin;
      }
      const stay = st.node.isHotel ? 0 : stayOf(st.node);
      const depart = arrive + stay;
      const afterEnd = opts.endMin != null && arrive > opts.endMin;
      totalWait += wait; if (closed) closedCount++;
      clock = depart;
      return { arrive, depart, wait, closed, opensAt, closes, stay, hasHours: !!oh, slotWait, late, afterEnd };
    });
    return { items, endMin: clock, totalWait, closedCount, overrun: opts.endMin != null && clock > opts.endMin };
  }

  // ---------- "Why this order?" ----------
  function explainStep(steps, k, item) {
    const n = steps[k].node;
    if (k === 0) return n.isHotel ? 'Start: your hotel' : 'Start: the first place you added (no hotel yet)';
    if (n.slotMin != null) return `${n.slot ? n.slot[0].toUpperCase() + n.slot.slice(1) : 'Fixed'} at ${hhmm(n.slotMin)}${item && item.late ? ` — running ${Math.round(item.late)} min late` : ''}`;
    if (item && item.wait > 0) return `Timed after it opens at ${hhmm(item.opensAt)}`;
    if (item && item.closed) return 'Closed at this time — move it to another day or slot';
    const pr = n.priority ?? 5;
    if (pr >= 8) return `Priority ${pr}: pulled earlier in the day`;
    if (pr <= 3) return `Priority ${pr}: left for later`;
    return `Nearest next stop after ${steps[k - 1].node.name}`;
  }

  root.RouteCore = {
    mulberry32, haversine, walkEstimate, priorityFactor, routingCost, computeRoute,
    catFromOsm, ROAD, roadClass, buildingHeight, simplify, overpassQuery, OVERPASS_FILTERS,
    decodePolyline, extractCandidates,
    parseOpeningHours, isOpenAt, nextOpenAt, closesAt, hhmm, scheduleSteps, explainStep, computeRouteAnchored,
  };
})(typeof window !== 'undefined' ? window : globalThis);
