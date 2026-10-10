/* =====================================================================
   RESOURCE MAP — Leaflet + OpenStreetMap (free, no Google billing)
   ---------------------------------------------------------------------
   Two layers of pins:
     ★ TRUSTED  – the hand-picked list in data/resources.csv
                  (or a Google Sheet, see SETTINGS below)
     ○ NEARBY   – found automatically in OpenStreetMap around the
                  address you search

   Libraries used (loaded in map.html):
     Leaflet   – draws the map, pins and popups
     PapaParse – reads the CSV spreadsheet file
   ===================================================================== */


/* ---------------------------------------------------------------------
   SETTINGS — the only part most people will ever need to change
   --------------------------------------------------------------------- */
const SETTINGS = {
  // To manage the trusted list in a Google Sheet instead of the CSV file,
  // paste the Sheet's "Publish to web → CSV" link between the quotes.
  // Leave it empty ('') to use data/resources.csv from this website.
  SHEET_CSV_URL: '',

  LOCAL_CSV: 'data/resources.csv',

  // Where the map starts: the whole Greater Toronto Area
  START_CENTER: [43.72, -79.42],
  START_ZOOM: 10,

  // Address search prefers results inside this box (the GTA)
  GTA_BOX: '-80.15,44.25,-78.70,43.30',   // west,north,east,south

  DEFAULT_RADIUS_KM: 2,
};


/* ---------------------------------------------------------------------
   CATEGORIES
   name  – must match the "category" column in the spreadsheet
   icon  – emoji shown on the pin
   color – pin colour
   osm   – what to look for in OpenStreetMap for the NEARBY layer,
           written as OpenStreetMap "tags" (tag=value). Look up tags at
           https://wiki.openstreetmap.org/wiki/Map_features
           Empty [] = trusted pins only (no automatic results).
           Use exact tags only; searching by name is too slow for the
           free servers.
   --------------------------------------------------------------------- */
const CATEGORIES = [
  { name: 'Shelters',                        icon: '🛏️', color: '#6366f1', osm: ['social_facility=shelter'] },
  { name: 'Housing Help',                    icon: '🏠', color: '#3b82f6', osm: [] },
  { name: 'Food Banks',                      icon: '🍎', color: '#ef4444', osm: ['amenity=food_bank', 'social_facility=food_bank'] },
  { name: 'Free Meals',                      icon: '🍽️', color: '#f97316', osm: ['social_facility=soup_kitchen'] },
  { name: 'Health Clinics',                  icon: '🩺', color: '#0ea5e9', osm: ['amenity=clinic', 'healthcare=clinic'] },
  { name: 'Mental Health Services',          icon: '🧠', color: '#8b5cf6', osm: ['healthcare=psychotherapist', 'healthcare=counselling', 'healthcare:speciality=psychiatry', 'social_facility:for=mental_health'] },
  { name: 'Harm Reduction',                  icon: '🩹', color: '#14b8a6', osm: ['healthcare=harm_reduction'] },
  { name: 'Legal Aid',                       icon: '⚖️', color: '#475569', osm: [] },
  { name: 'Immigration & Newcomer Services', icon: '🌍', color: '#0891b2', osm: ['social_facility:for=migrant', 'social_facility:for=refugee'] },
  { name: 'ID & Documents',                  icon: '🪪', color: '#64748b', osm: [] },
  { name: 'Income & Benefits',               icon: '💰', color: '#16a34a', osm: [] },
  { name: 'Employment Centres',              icon: '💼', color: '#d97706', osm: ['office=employment_agency'] },
  { name: 'Education',                       icon: '🎓', color: '#2563eb', osm: ['amenity=library', 'amenity=college'] },
  { name: 'LGBTQ+ Services',                 icon: '🌈', color: '#db2777', osm: ['lgbtq=primary', 'lgbtq=only'] },
  { name: "Women's Support",                 icon: '💜', color: '#a855f7', osm: [] },   // never auto-search: protects confidential shelters
  { name: 'Drop-in Centres',                 icon: '☕', color: '#b45309', osm: ['amenity=community_centre', 'social_facility=outreach'] },
  { name: 'Youth Programs',                  icon: '⭐', color: '#e11d48', osm: ['community_centre=youth_centre', 'amenity=youth_centre', 'social_facility:for=youth', 'social_facility:for=juvenile'] },
];

const OVERPASS_SERVERS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
];


/* ---------------------------------------------------------------------
   STATE — what the map is showing right now
   --------------------------------------------------------------------- */
let activeCat = null;      // null = all categories
let home = null;           // the searched address {lat, lng, label}
let trusted = [];          // trusted places with a location
let online = [];           // trusted resources with no address (phone/web)
let nearby = [];           // places found in OpenStreetMap

const $ = sel => document.querySelector(sel);
const catByName = Object.fromEntries(CATEGORIES.map(c => [c.name.toLowerCase(), c]));


/* ---------------------------------------------------------------------
   MAP SETUP
   --------------------------------------------------------------------- */
const map = L.map('map', { zoomControl: false }).setView(SETTINGS.START_CENTER, SETTINGS.START_ZOOM);
L.control.zoom({ position: 'bottomright' }).addTo(map);

// Map pictures ("tiles") from OpenStreetMap. Free, no account; the credit line is required.
L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
  maxZoom: 19,
}).addTo(map);

const trustedLayer = L.layerGroup().addTo(map);
const nearbyLayer  = L.layerGroup().addTo(map);
const homeLayer    = L.layerGroup().addTo(map);


/* ---------------------------------------------------------------------
   HELPERS
   --------------------------------------------------------------------- */
// Make text safe to put inside HTML (stops odd characters breaking the page)
function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
}

// "Food Banks; Free Meals" → [Food Banks category, Free Meals category]
function parseCats(text) {
  return String(text || '').split(/[;,]/).map(s => catByName[s.trim().toLowerCase()]).filter(Boolean);
}

// Straight-line distance in km between two points
function km(a, b) {
  const R = 6371, rad = x => x * Math.PI / 180;
  const dLat = rad(b.lat - a.lat), dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

function setStatus(text, isError) {
  const el = $('#status');
  el.textContent = text || '';
  el.classList.toggle('err', !!isError);
}

function pinIcon(cat, isTrusted) {
  return L.divIcon({
    className: '',
    html: `<span class="pin ${isTrusted ? 'pin-trusted' : 'pin-nearby'}" style="--c:${cat.color}">${cat.icon}</span>`,
    iconSize: isTrusted ? [38, 38] : [30, 30],
    iconAnchor: isTrusted ? [19, 19] : [15, 15],
    popupAnchor: [0, -16],
  });
}

function popupHtml(p) {
  const cats = p.cats.map(c => `<span class="tag" style="--c:${c.color}">${c.icon} ${esc(c.name)}</span>`).join('');
  const dist = home ? `<div class="pop-dist">${km(home, p).toFixed(1)} km from searched address</div>` : '';
  return `
    <div class="pop">
      <div class="pop-src">${p.trusted ? '★ Trusted resource' : 'Nearby · from OpenStreetMap'}</div>
      <h4>${esc(p.name)}</h4>
      <div class="pop-tags">${cats}</div>
      ${p.address ? `<div>📍 ${esc(p.address)}</div>` : ''}
      ${p.phone ? `<div>📞 <a href="tel:${esc(p.phone.replace(/[^\d+]/g, ''))}">${esc(p.phone)}</a></div>` : ''}
      ${p.notes ? `<div class="pop-notes">${esc(p.notes)}</div>` : ''}
      ${dist}
      <div class="pop-links">
        ${p.website ? `<a href="${esc(p.website)}" target="_blank" rel="noopener">Website ↗</a>` : ''}
        <a href="https://www.google.com/maps/dir/?api=1&destination=${p.lat},${p.lng}" target="_blank" rel="noopener">Directions ↗</a>
      </div>
    </div>`;
}


/* ---------------------------------------------------------------------
   1) LOAD THE TRUSTED LIST (Google Sheet or CSV file)
   --------------------------------------------------------------------- */
async function loadTrusted() {
  setStatus('Loading resources…');
  let text;
  try {
    const url = SETTINGS.SHEET_CSV_URL || SETTINGS.LOCAL_CSV;
    const res = await fetch(url, { cache: 'no-cache' });
    if (!res.ok) throw new Error(res.status);
    text = await res.text();
  } catch (e) {
    // If the Google Sheet can't be reached, fall back to the file in the website
    if (SETTINGS.SHEET_CSV_URL) {
      text = await (await fetch(SETTINGS.LOCAL_CSV)).text();
    } else {
      setStatus('Could not load the resource list.', true);
      return;
    }
  }

  const rows = Papa.parse(text, { header: true, skipEmptyLines: true, transformHeader: h => h.trim().toLowerCase() }).data;
  const needLookup = [];

  rows.forEach(r => {
    const cats = parseCats(r.category);
    if (!r.name || !cats.length) return;    // skip blank rows or unknown categories
    const place = {
      name: r.name.trim(), cats, address: (r.address || '').trim(), phone: (r.phone || '').trim(),
      website: (r.website || '').trim(), notes: (r.notes || '').trim(), trusted: true,
      lat: parseFloat(r.lat), lng: parseFloat(r.lng),
    };
    if (!isNaN(place.lat) && !isNaN(place.lng)) trusted.push(place);
    else if (place.address) needLookup.push(place);
    else online.push(place);
  });

  render();
  setStatus('');
  // Rows that have an address but no lat/lng: look them up (slowly, 1 per second, as OpenStreetMap asks)
  if (needLookup.length) lookUpMissing(needLookup);
}

async function lookUpMissing(list) {
  for (const place of list) {
    const key = 'geo:' + place.address.toLowerCase();
    let hit = null;
    try { hit = JSON.parse(localStorage.getItem(key)); } catch (e) {}
    if (!hit) {
      hit = await geocode(place.address);
      if (hit) { try { localStorage.setItem(key, JSON.stringify(hit)); } catch (e) {} }
      await new Promise(r => setTimeout(r, 1100));
    }
    if (hit) { place.lat = hit.lat; place.lng = hit.lng; trusted.push(place); }
    else online.push(place);
    render();
  }
}


/* ---------------------------------------------------------------------
   2) ADDRESS SEARCH (OpenStreetMap "Nominatim" service)
   --------------------------------------------------------------------- */
async function geocode(q) {
  const url = 'https://nominatim.openstreetmap.org/search?' + new URLSearchParams({
    q, format: 'jsonv2', limit: 1, countrycodes: 'ca', viewbox: SETTINGS.GTA_BOX,
  });
  try {
    const data = await (await fetch(url, { headers: { 'Accept-Language': 'en' } })).json();
    if (!data.length) return null;
    return { lat: +data[0].lat, lng: +data[0].lon, label: data[0].display_name };
  } catch (e) { return null; }
}

// Intersections like "Queen St and Main St, Brampton" or "Yonge & Bloor".
// Finds both streets near that city in OpenStreetMap, then the point where they meet.
async function geocodeIntersection(q) {
  const m = q.replace(/,\s*(ontario|on|canada)\s*$/i, '')
             .match(/^(.+?)\s+(?:and|&|@|at)\s+([^,]+?)(?:,\s*(.+))?$/i);
  if (!m) return null;
  // "Main St W" → "Main"   (drop street-type words at the end only, so "St Clair" survives)
  const base = s => {
    const words = s.trim().split(/\s+/);
    const suffix = /^(street|st|avenue|ave|road|rd|boulevard|blvd|drive|dr|crescent|cres|court|ct|lane|ln|way|parkway|pkwy|trail|line|east|west|north|south|e|w|n|s)\.?$/i;
    while (words.length > 1 && suffix.test(words[words.length - 1])) words.pop();
    return words.join(' ').replace(/[^\w\s'.-]/g, '').replace(/\./g, '\\.');
  };
  const a = base(m[1]), b = base(m[2]), city = (m[3] || 'Toronto').trim();
  const c = await geocode(city + ', Ontario');
  if (!c || !a || !b) return null;
  const near = `(around:15000,${c.lat},${c.lng})`;
  const query = `[out:json][timeout:20];
    way["highway"]["name"~"^${a}( |$)",i]${near}->.a;
    way["highway"]["name"~"^${b}( |$)",i]${near}->.b;
    node(w.a)(w.b);out;`;
  for (const server of OVERPASS_SERVERS) {
    try {
      const res = await fetch(server, { method: 'POST', body: new URLSearchParams({ data: query }) });
      if (!res.ok) continue;
      const nodes = (await res.json()).elements;
      if (!nodes.length) return null;
      // If the streets cross more than once, use the crossing closest to the city centre
      nodes.sort((x, y) => km(c, { lat: x.lat, lng: x.lon }) - km(c, { lat: y.lat, lng: y.lon }));
      return { lat: nodes[0].lat, lng: nodes[0].lon, label: q };
    } catch (e) { /* try next server */ }
  }
  return null;
}

$('#search-form').addEventListener('submit', async e => {
  e.preventDefault();
  const q = $('#address').value.trim();
  if (!q) return;
  setStatus('Finding address…');
  // Try it as an intersection first, then as a normal address.
  // Add "Ontario" so short searches like "Yonge and Bloor" stay local.
  const hit = await geocodeIntersection(q) || await geocode(/ontario|\bon\b/i.test(q) ? q : q + ', Ontario');
  if (!hit) {
    setStatus(/\s(and|&|@|at)\s/i.test(q)
      ? 'Couldn’t find that intersection. Check the spelling and add the city (e.g. "Queen St & Main St, Brampton"), or try again in a minute.'
      : 'Address not found. Try adding the city, or use a nearby intersection.', true);
    return;
  }
  setHome(hit);
});

function setHome(hit) {
  home = hit;
  const radius = +$('#radius').value * 1000;
  homeLayer.clearLayers();
  L.circle([hit.lat, hit.lng], { radius, color: '#5b5bf7', weight: 1.5, fillOpacity: 0.06, dashArray: '6 6' }).addTo(homeLayer);
  L.marker([hit.lat, hit.lng], {
    icon: L.divIcon({ className: '', html: '<span class="home-dot"></span>', iconSize: [22, 22], iconAnchor: [11, 11] }),
    zIndexOffset: 1000,
  }).bindPopup('<b>Searched address</b>').addTo(homeLayer);
  map.fitBounds(L.latLng(hit.lat, hit.lng).toBounds(radius * 2.2));
  $('#clear-home').hidden = false;
  render();
  findNearby(hit, radius);
}

$('#clear-home').addEventListener('click', () => {
  home = null; nearby = [];
  homeLayer.clearLayers(); nearbyLayer.clearLayers();
  $('#address').value = '';
  $('#clear-home').hidden = true;
  map.setView(SETTINGS.START_CENTER, SETTINGS.START_ZOOM);
  render(); setStatus('');
});

$('#radius').addEventListener('change', () => { if (home) setHome(home); });


/* ---------------------------------------------------------------------
   3) NEARBY RESULTS (OpenStreetMap "Overpass" service)
   --------------------------------------------------------------------- */
async function findNearby(center, radius) {
  if (!$('#show-nearby').checked) { nearby = []; render(); return; }
  setStatus('Searching OpenStreetMap for nearby places…');

  // Build one query that asks for every category's tags at once
  const parts = [];
  CATEGORIES.forEach(c => c.osm.forEach(rule => {
    const [k, v] = rule.split('=');
    parts.push(`nwr["${k}"="${v}"](around:${radius},${center.lat},${center.lng});`);
  }));
  if (!parts.length) return;
  const query = `[out:json][timeout:25];(${parts.join('')});out center tags 500;`;

  // Ask each free server in turn; if all are busy, wait 4 seconds and try once more
  let data = null;
  for (let attempt = 0; attempt < 2 && !data; attempt++) {
    if (attempt) await new Promise(r => setTimeout(r, 4000));
    for (const server of OVERPASS_SERVERS) {
      try {
        const res = await fetch(server, { method: 'POST', body: new URLSearchParams({ data: query }) });
        if (res.ok) { data = await res.json(); break; }
      } catch (e) { /* try the next server */ }
    }
  }
  if (!data) { setStatus('Nearby search is busy right now. Trusted pins still work. Try again in a minute.', true); return; }

  nearby = [];
  data.elements.forEach(el => {
    const t = el.tags || {};
    if (!t.name) return;                                   // skip unnamed places
    const lat = el.lat ?? el.center?.lat, lng = el.lon ?? el.center?.lon;
    if (lat == null) return;
    // Which categories does this place belong to?
    const cats = CATEGORIES.filter(c => c.osm.some(rule => {
      const [k, v] = rule.split('=');
      return (t[k] || '').split(';').map(s => s.trim()).includes(v);
    }));
    if (!cats.length) return;
    // Skip if it's basically the same spot as a trusted pin
    if (trusted.some(p => km(p, { lat, lng }) < 0.05)) return;
    const addr = [t['addr:housenumber'], t['addr:street'], t['addr:city']].filter(Boolean).join(' ');
    const note = t.opening_hours ? 'Hours: ' + t.opening_hours : '';
    nearby.push({
      name: t.name, cats, address: addr, phone: t.phone || t['contact:phone'] || '',
      website: t.website || t['contact:website'] || '', notes: note, lat, lng, trusted: false,
    });
  });
  setStatus(nearby.length ? `Found ${nearby.length} nearby places. Pick a category to see them.` : 'No extra places found nearby in OpenStreetMap. Trusted pins are still shown.');
  render();
}

$('#show-nearby').addEventListener('change', () => {
  if (home) findNearby(home, +$('#radius').value * 1000);
  else render();
});

// "Search this area" button: look for nearby places around the middle of the map
$('#search-area').addEventListener('click', () => {
  if (map.getZoom() < 13) { setStatus('Zoom in closer first, then search this area.', true); return; }
  const c = map.getCenter();
  $('#show-nearby').checked = true;
  findNearby({ lat: c.lat, lng: c.lng }, +$('#radius').value * 1000);
});


/* ---------------------------------------------------------------------
   4) DRAW EVERYTHING (pins, category list, results list)
   --------------------------------------------------------------------- */
const inCat = p => !activeCat || p.cats.includes(activeCat);

function render() {
  // Pins
  trustedLayer.clearLayers(); nearbyLayer.clearLayers();
  const markers = new Map();
  const add = (p, layer) => {
    const cat = activeCat || p.cats[0];
    const m = L.marker([p.lat, p.lng], { icon: pinIcon(cat, p.trusted), zIndexOffset: p.trusted ? 500 : 0 })
      .bindPopup(popupHtml(p), { maxWidth: 280 }).addTo(layer);
    markers.set(p, m);
  };
  trusted.filter(inCat).forEach(p => add(p, trustedLayer));
  // Nearby places only appear once a category is picked (keeps the map readable)
  const showNearby = $('#show-nearby').checked && activeCat;
  if (showNearby) nearby.filter(inCat).forEach(p => add(p, nearbyLayer));

  // Category list with counts
  const counts = c => trusted.filter(p => p.cats.includes(c)).length + online.filter(p => p.cats.includes(c)).length
                    + nearby.filter(p => p.cats.includes(c)).length;
  $('#cats').innerHTML =
    `<button class="cat ${!activeCat ? 'on' : ''}" data-cat="">
       <span class="cat-ic" style="--c:#0b1026">🗺️</span><span class="cat-name">All categories</span>
     </button>` +
    CATEGORIES.map(c => `
      <button class="cat ${activeCat === c ? 'on' : ''}" data-cat="${esc(c.name)}" style="--c:${c.color}">
        <span class="cat-ic">${c.icon}</span><span class="cat-name">${esc(c.name)}</span><span class="cat-n">${counts(c)}</span>
      </button>`).join('');

  // Results list: closest first (to the searched address, or the map centre)
  const from = home || map.getCenter();
  const places = [...trusted, ...(showNearby ? nearby : [])].filter(inCat)
    .map(p => ({ p, d: km(from, p) })).sort((a, b) => a.d - b.d).slice(0, 60);
  const phoneWeb = online.filter(inCat);

  $('#list-title').textContent = activeCat ? activeCat.name : (home ? 'Closest to the address' : 'All places');
  $('#list').innerHTML =
    places.map(({ p, d }, i) => `
      <li><button class="place" data-i="${i}">
        <span class="pl-ic" style="--c:${(activeCat || p.cats[0]).color}">${(activeCat || p.cats[0]).icon}</span>
        <span class="pl-body">
          <span class="pl-name">${p.trusted ? '<b class="star">★</b> ' : ''}${esc(p.name)}</span>
          <span class="pl-sub">${esc(p.address || p.cats.map(c => c.name).join(', '))}</span>
        </span>
        ${home ? `<span class="pl-d">${d.toFixed(1)} km</span>` : ''}
      </button></li>`).join('') ||
    `<li class="empty">No places on the map for this category${home ? ' near this address' : ''}.</li>`;

  $('#online').hidden = !phoneWeb.length;
  $('#online-list').innerHTML = phoneWeb.map(p => `
    <li>
      <a href="${esc(p.website)}" target="_blank" rel="noopener">${esc(p.name)} ↗</a>
      ${p.phone ? `<a class="ph" href="tel:${esc(p.phone.replace(/[^\d+]/g, ''))}">📞 ${esc(p.phone)}</a>` : ''}
      ${p.notes ? `<span class="pl-sub">${esc(p.notes)}</span>` : ''}
    </li>`).join('');

  // Clicking a place in the list opens its pin on the map
  $('#list').querySelectorAll('.place').forEach(btn => btn.addEventListener('click', () => {
    const { p } = places[+btn.dataset.i];
    map.flyTo([p.lat, p.lng], Math.max(map.getZoom(), 15), { duration: 0.6 });
    setTimeout(() => markers.get(p)?.openPopup(), 650);
    if (window.innerWidth < 900) $('#map').scrollIntoView({ behavior: 'smooth', block: 'center' });
  }));
}

// Click a category to filter (click it again to show all)
$('#cats').addEventListener('click', e => {
  const btn = e.target.closest('.cat');
  if (!btn) return;
  const cat = catByName[btn.dataset.cat.toLowerCase()] || null;
  activeCat = activeCat === cat ? null : cat;
  if (activeCat && /Pick a category/.test($('#status').textContent)) setStatus('');
  render();
});

loadTrusted();
