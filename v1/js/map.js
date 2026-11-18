import { startEarthquakeFeed } from './quakeManager.js';

const map = L.map('map', {
  center: [20, 0],
  zoom: 2,
  minZoom: 2,
  maxZoom: 6
});

// Canonical OSM endpoint. Root CSP img-src must allow this origin or the
// basemap is blank while markers and plate lines still draw.
L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
  maxZoom: 19
}).addTo(map);

fetch('https://raw.githubusercontent.com/fraxen/tectonicplates/master/GeoJSON/PB2002_boundaries.json')
  .then(res => {
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  })
  .then(data => {
    L.geoJSON(data, {
      style: {
        color: '#6e7b8b',
        weight: 2
      }
    }).addTo(map);
  })
  .catch(err => {
    console.error('Failed to load tectonic plates GeoJSON:', err);
  });

const mode = document.body.dataset.mode;
const isAllDay = mode === 'allday';

startEarthquakeFeed(map, {
  feedURL: isAllDay
    ? 'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_day.geojson'
    : 'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_hour.geojson',
  loop: isAllDay,
  loopInterval: 1200,
  maxLoopSize: 100
});
