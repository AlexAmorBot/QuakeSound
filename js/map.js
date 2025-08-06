import { startEarthquakeFeed } from './quakeManager.js';

const map = L.map('map', {
  center: [20, 0],
  zoom: 2,
  minZoom: 2,
  maxZoom: 6
});

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '&copy; OpenStreetMap contributors'
}).addTo(map);

// Add tectonic plate boundaries
fetch('https://raw.githubusercontent.com/fraxen/tectonicplates/master/GeoJSON/PB2002_boundaries.json')
  .then(res => res.json())
  .then(data => {
    L.geoJSON(data, {
      style: {
        color: '#6e7b8b',
        weight: 2
      }
    }).addTo(map);
  });

// Read data-mode from <body>
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
