import { startEarthquakeFeed } from './quakeManager.js';
import { initAudio } from './soundEngine.js';

const map = L.map('map', {
  center: [20, 0],
  zoom: 2,
  minZoom: 2,
  maxZoom: 6
});

L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
  attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/">CARTO</a>',
  subdomains: 'abcd',
  maxZoom: 19
}).addTo(map);

// Initialize audio on first user interaction
function handleInitialInteraction() {
  initAudio();
  document.removeEventListener('click', handleInitialInteraction);
  document.removeEventListener('touchstart', handleInitialInteraction);
}

document.addEventListener('click', handleInitialInteraction);
document.addEventListener('touchstart', handleInitialInteraction);

// Create a custom pane for tectonic plates to sit beneath markers (default marker pane zIndex is 600)
map.createPane('plates');
map.getPane('plates').style.zIndex = 350;

// Add tectonic plate boundaries
fetch('https://raw.githubusercontent.com/fraxen/tectonicplates/master/GeoJSON/PB2002_boundaries.json')
  .then(res => {
    if (!res.ok) {
      throw new Error(`HTTP error! status: ${res.status}`);
    }
    return res.json();
  })
  .then(data => {
    // Glow underlay: thick, low-opacity stroke
    L.geoJSON(data, {
      pane: 'plates',
      style: { color: '#54627b', weight: 6, opacity: 0.15 }
    }).addTo(map);

    // Main line: thin, brighter stroke
    L.geoJSON(data, {
      pane: 'plates',
      style: { color: '#54627b', weight: 1.5, opacity: 0.8 }
    }).addTo(map);
  })
  .catch(err => {
    console.error('Failed to load tectonic plates GeoJSON:', err);
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

// Mobile key box collapse
(function setupKeyBoxToggle() {
  const keyBox = document.getElementById('key-box');
  if (!keyBox) return;

  const toggle = document.createElement('button');
  toggle.id = 'key-box-toggle';
  toggle.type = 'button';
  toggle.setAttribute('aria-label', 'Toggle legend');
  toggle.textContent = '🎵';
  document.body.appendChild(toggle);

  // Start collapsed on small screens.
  if (window.innerWidth <= 600) {
    keyBox.classList.add('collapsed');
  }

  toggle.addEventListener('click', (e) => {
    e.stopPropagation();
    keyBox.classList.toggle('collapsed');
  });

  // Tap elsewhere collapses (mobile only).
  document.addEventListener('click', (e) => {
    if (window.innerWidth <= 600 && !keyBox.contains(e.target) && e.target !== toggle) {
      keyBox.classList.add('collapsed');
    }
  });
})();
