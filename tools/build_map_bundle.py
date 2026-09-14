"""Build the static map bundles (data/map-<city>.json) so the city centre renders
instantly without waiting for Overpass. Mirrors RouteCore.simplify() in core.js.

Usage:  python tools/build_map_bundle.py [barcelona|milano|roma ...]
"""
import json, math, re, sys, time, urllib.request, urllib.parse, gzip, os

CACHE_VER = 'v4'
CELL = 80            # 1 cell = 80 units = 800 m
CENTER_REACH = 159   # -> cells -2..2 on both axes (25 cells, 4 km square); grid offset by half a cell like the app
SCALE = 0.1
CITIES = {
    'barcelona': (41.3874, 2.1686),
    'milano': (45.4642, 9.1900),
    'roma': (41.9028, 12.4964),
}
MIRRORS = [
    'https://maps.mail.ru/osm/tools/overpass/api/interpreter',
    'https://overpass-api.de/api/interpreter',
    'https://overpass.private.coffee/api/interpreter',
]
FILTERS = [
    'way["building"]', 'way["highway"]["highway"!~"construction|proposed|raceway|bus_guideway|corridor|elevator|platform"]',
    'way["natural"="water"]', 'way["waterway"="riverbank"]', 'way["waterway"~"^(river|canal|stream)$"]',
    'way["leisure"~"^(park|garden|pitch|playground)$"]',
    'way["landuse"~"^(grass|forest|cemetery|recreation_ground|village_green|meadow)$"]', 'way["natural"~"^(wood|scrub|beach|sand)$"]',
    'node["railway"="station"]', 'node["railway"="tram_stop"]',
]
ROAD = {'motorway', 'trunk', 'primary', 'secondary', 'tertiary', 'residential', 'unclassified', 'living_street', 'pedestrian',
        'service', 'footway', 'path', 'cycleway', 'steps', 'track'}
GREEN_RE = re.compile(r'^(park|garden|pitch|playground|grass|forest|cemetery|recreation_ground|village_green|meadow|wood|scrub)$')
SAND_RE = re.compile(r'^(beach|sand)$')
M32 = 0xFFFFFFFF

def mulberry32(a):
    a &= M32
    def imul(x, y): return ((x & M32) * (y & M32)) & M32
    def rnd():
        nonlocal a
        a = (a + 0x6D2B79F5) & M32
        t = imul(a ^ (a >> 15), 1 | a)
        t = ((t + imul(t ^ (t >> 7), 61 | t)) & M32) ^ t
        return ((t ^ (t >> 14)) & M32) / 4294967296
    return rnd

def road_class(h):
    if not h: return None
    k = re.sub(r'_link$', '', h)
    return k if k in ROAD else None

def parse_float(v):
    try: return float(str(v).split()[0].replace(',', '.'))
    except Exception: return float('nan')

def building_height(t, osm_id):
    m = parse_float(t.get('height'))
    if not m > 0:
        lv = parse_float(t.get('building:levels'))
        if lv > 0: m = lv * 3.2 + 1
    if not m > 0: m = 8 + mulberry32(osm_id)() * 8
    return max(0.35, m / 10 * 1.3)

def make_project(clat, clon):
    k = math.cos(clat * math.pi / 180) * 111320 * SCALE
    def project(lat, lon): return (lon - clon) * k, -(lat - clat) * 110574 * SCALE
    return project

def unproject(clat, clon, x, z):
    k = math.cos(clat * math.pi / 180) * 111320 * SCALE
    return clat - z / (SCALE * 110574), clon + x / k

def dp(pts, tol):
    """Douglas–Peucker on [[x,z],...]"""
    if len(pts) < 3: return pts
    ax, az = pts[0]; bx, bz = pts[-1]
    dx, dz = bx - ax, bz - az; L2 = dx * dx + dz * dz
    imax, dmax = 0, -1
    for i in range(1, len(pts) - 1):
        px, pz = pts[i]
        if L2 == 0: d = math.hypot(px - ax, pz - az)
        else:
            t = max(0, min(1, ((px - ax) * dx + (pz - az) * dz) / L2))
            d = math.hypot(px - (ax + t * dx), pz - (az + t * dz))
        if d > dmax: imax, dmax = i, d
    if dmax > tol:
        return dp(pts[:imax + 1], tol)[:-1] + dp(pts[imax:], tol)
    return [pts[0], pts[-1]]

def simplify(elements, project, in_bbox):
    out = []
    r1 = lambda v: round(v, 1)
    for el in elements:
        t = el.get('tags', {})
        if el.get('type') == 'node':
            if el.get('lat') is None or not in_bbox(el['lat'], el['lon']): continue
            st = None
            if t.get('railway') == 'station' and t.get('station') == 'subway': st = 'subway'
            elif t.get('railway') == 'tram_stop': st = 'tram'
            elif t.get('railway') == 'station': st = 'rail'
            if not st: continue
            x, z = project(el['lat'], el['lon'])
            out.append({'id': el['id'], 'k': 'st', 't': st, 'n': t.get('name', ''), 'p': [r1(x), r1(z)], 'll': [round(el['lat'], 6), round(el['lon'], 6)]})
            continue
        if el.get('type') != 'way' or not el.get('geometry') or len(el['geometry']) < 2: continue
        g = el['geometry']
        if not any(in_bbox(n['lat'], n['lon']) for n in g): continue
        closed = len(g) > 3 and g[0]['lat'] == g[-1]['lat'] and g[0]['lon'] == g[-1]['lon']
        pts = [[r1(x), r1(z)] for x, z in (project(n['lat'], n['lon']) for n in g)]
        if t.get('building') and t.get('building') != 'no' and closed:
            out.append({'id': el['id'], 'k': 'b', 'h': round(building_height(t, el['id']), 2), 'p': pts[:-1]})
        elif t.get('highway'):
            c = road_class(t['highway'])
            if c and t.get('tunnel') != 'yes': out.append({'id': el['id'], 'k': 'r', 'c': c, 'p': dp(pts, 0.25)})
        elif closed and (t.get('natural') == 'water' or t.get('waterway') == 'riverbank'):
            out.append({'id': el['id'], 'k': 'w', 'p': pts[:-1]})
        elif re.match(r'^(river|canal|stream)$', t.get('waterway', '')):
            w = parse_float(t.get('width')) / 10
            if not w > 0: w = 7 if t['waterway'] == 'river' else 2.2 if t['waterway'] == 'canal' else 0.7
            out.append({'id': el['id'], 'k': 'wl', 'w': round(w, 2), 'p': dp(pts, 0.25)})
        elif closed and SAND_RE.match(t.get('natural', '')):
            out.append({'id': el['id'], 'k': 's', 'p': pts[:-1]})
        elif closed and (GREEN_RE.match(t.get('leisure', '')) or GREEN_RE.match(t.get('landuse', '')) or GREEN_RE.match(t.get('natural', ''))):
            out.append({'id': el['id'], 'k': 'g', 'p': pts[:-1]})
    return out

def overpass(query):
    last = None
    for ep in MIRRORS * 4:
        try:
            req = urllib.request.Request(ep, data=('data=' + urllib.parse.quote(query)).encode(),
                                         headers={'Content-Type': 'application/x-www-form-urlencoded', 'Accept-Encoding': 'gzip', 'User-Agent': 'route-notebook-bundle-builder'})
            r = urllib.request.urlopen(req, timeout=120)
            raw = r.read()
            if r.headers.get('Content-Encoding') == 'gzip': raw = gzip.decompress(raw)
            return json.loads(raw)['elements']
        except Exception as e:
            last = e; print('  mirror failed:', ep.split('/')[2], e, flush=True); time.sleep(8)
    raise last

def build(city):
    clat, clon = CITIES[city]
    project = make_project(clat, clon)
    n = math.floor((CENTER_REACH + CELL / 2) / CELL)
    cells = [(cx, cz) for cx in range(-n, n + 1) for cz in range(-n, n + 1)]
    result = {}
    for i in range(0, len(cells), 3):
        batch = cells[i:i + 3]
        bboxes = []
        for cx, cz in batch:
            x0, z0 = cx * CELL - CELL / 2, cz * CELL - CELL / 2
            S, W = unproject(clat, clon, x0, z0 + CELL)
            N, E = unproject(clat, clon, x0 + CELL, z0)
            bboxes.append((cx, cz, S, W, N, E))
        body = ''.join(f'{f}({S},{W},{N},{E});' for (_, _, S, W, N, E) in bboxes for f in FILTERS)
        print(f'{city}: fetching cells {[(c[0], c[1]) for c in bboxes]}', flush=True)
        els = overpass(f'[out:json][timeout:90];({body});out geom qt;')
        for cx, cz, S, W, N, E in bboxes:
            in_bbox = lambda lat, lon, S=S, W=W, N=N, E=E: S <= lat <= N and W <= lon <= E
            result[f'{cx}:{cz}'] = simplify(els, project, in_bbox)
        time.sleep(1)
    os.makedirs('data', exist_ok=True)
    path = f'data/map-{city}.json'
    with open(path, 'w', encoding='utf-8') as f:
        json.dump({'ver': CACHE_VER, 'city': city, 'cells': result}, f, separators=(',', ':'), ensure_ascii=False)
    kinds = {}
    for els in result.values():
        for e in els: kinds[e['k']] = kinds.get(e['k'], 0) + 1
    print(f'{city}: wrote {path} ({os.path.getsize(path) // 1024} KB) {kinds}')

if __name__ == '__main__':
    os.chdir(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))
    for city in (sys.argv[1:] or CITIES):
        build(city)
