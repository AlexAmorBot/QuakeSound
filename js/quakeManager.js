import { playQuakeSound } from './soundEngine.js';

let displayedQuakes = new Set();
let quakeLoop = [];
let currentIndex = 0;
let looping = false;

export function startEarthquakeFeed(map, options = {}) {
  const {
    feedURL = 'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_hour.geojson',
    loop = false,
    loopInterval = 1200,
    maxLoopSize = 100
  } = options;

  fetchAndRender(map, feedURL, loop, maxLoopSize);
  setInterval(() => fetchAndRender(map, feedURL, loop, maxLoopSize), 60000);

  if (loop) startSequentialLoop(loopInterval);
}

function startSequentialLoop(interval) {
  if (looping) return;
  looping = true;

  const loop = () => {
    if (quakeLoop.length > 0) {
      const quake = quakeLoop[currentIndex % quakeLoop.length];
      playQuakeSound(quake.mag, quake.depth);

      if (quake.marker) {
        quake.marker.setStyle({ fillOpacity: 1, color: '#ff0' });
        setTimeout(() => {
          quake.marker.setStyle({ fillOpacity: 0.8, color: 'red' });
        }, 500);
      }

      currentIndex++;
    }

    setTimeout(loop, interval);
  };

  loop();
}

async function fetchAndRender(map, feedURL, loop, maxLoopSize) {
  try {
    const res = await fetch(feedURL);
    const data = await res.json();

    const newQuakes = data.features.filter(f => !displayedQuakes.has(f.id));
    newQuakes.sort((a, b) => a.properties.time - b.properties.time);

    const baseTime = newQuakes.length ? newQuakes[0].properties.time : Date.now();
    const totalWindow = 50000;

    newQuakes.forEach(feature => {
      const id = feature.id;
      const coords = feature.geometry.coordinates;
      const magnitude = feature.properties.mag;
      const place = feature.properties.place;
      const depth = coords[2];
      const quakeTime = feature.properties.time;

      displayedQuakes.add(id);

      const lat = coords[1];
      const lon = coords[0];

      let delay = 0;
      if (newQuakes.length > 1) {
        const timeSpan = newQuakes[newQuakes.length - 1].properties.time - baseTime;
        const normalized = timeSpan > 0 ? (quakeTime - baseTime) / timeSpan : 0;
        delay = normalized * totalWindow;
      }

      setTimeout(() => {
        const quakeMarker = L.circleMarker([lat, lon], {
          radius: magnitude * 2,
          color: 'red',
          fillColor: 'red',
          fillOpacity: 0.8
        }).addTo(map);

        const popupHtml = `
          <div class="quake-popup">
            <div class="magnitude">M${magnitude}</div>
            <div class="place">${place}</div>
            <div class="depth">Depth: ${depth.toFixed(1)} km</div>
          </div>
        `;

        quakeMarker.bindPopup(popupHtml);

        quakeMarker.on('mouseover', () => {
          quakeMarker.openPopup();
        });
        quakeMarker.on('mouseout', () => {
          quakeMarker.closePopup();
        });

        quakeMarker.setStyle({ fillOpacity: 1 });
        setTimeout(() => quakeMarker.setStyle({ fillOpacity: 0.4 }), 300);
        setTimeout(() => quakeMarker.setStyle({ fillOpacity: 0.8 }), 600);

        setTimeout(() => map.removeLayer(quakeMarker), 59 * 60 * 1000);

        if (loop) {
          quakeLoop.push({ mag: magnitude, depth, marker: quakeMarker, timestamp: quakeTime });
          if (quakeLoop.length > maxLoopSize) {
            quakeLoop.shift();
          }
        } else {
          playQuakeSound(magnitude, depth);
          quakeMarker.openPopup(); 
        }
      }, delay);
    });

  } catch (err) {
    console.error('Error fetching earthquake data:', err);
  }
}

function _quakesound_identity_hash() {
  return "QUAKESOUND-PROOF-[2025-07]-AA";
}