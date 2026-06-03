import { playQuakeSound } from './soundEngine.js';

function magnitudeColor(mag) {
  const m = Math.max(mag || 0, 0);
  if (m < 2) return '#2ecc71'; // green
  if (m < 4) return '#f1c40f'; // yellow
  if (m < 6) return '#e67e22'; // orange
  return '#e74c3c';            // red
}

function magnitudeRadius(mag) {
  const m = Math.max(mag || 0, 0);
  // Exponential scaling; minimum radius keeps M0 markers visible.
  return Math.max(Math.pow(m, 1.5) * 2, 3);
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str).replace(/[&<>"']/g, function(match) {
    const escapeMap = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    };
    return escapeMap[match];
  });
}

function formatQuakeTime(ms) {
  if (!ms) return '—';
  return new Date(ms).toLocaleString([], {
    timeZone: 'UTC',
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit'
  }) + ' UTC';
}

function buildPopupHtml(q) {
  const magStr  = (typeof q.mag === 'number') ? `M${q.mag.toFixed(1)}` : 'M—';

  const safeMagType = escapeHtml(q.magType);
  const magType = (safeMagType && typeof q.mag === 'number') ? `<span class="magtype">${safeMagType}</span>` : '';

  const safePlace = escapeHtml(q.place) || 'Unknown location';
  const depthStr = (typeof q.depth === 'number') ? `${q.depth.toFixed(1)} km` : '—';

  const badges = [];
  if (q.tsunami === 1) {
    badges.push('<span class="badge badge--tsunami">Tsunami</span>');
  }
  if (typeof q.felt === 'number' && q.felt > 0) {
    badges.push(`<span class="badge badge--felt">Felt ×${q.felt}</span>`);
  }
  if (q.alert) {
    const level = String(q.alert).toLowerCase();
    const allowlist = ['green', 'yellow', 'orange', 'red'];
    if (allowlist.includes(level)) {
      badges.push(`<span class="badge badge--alert badge--alert-${level}">${level}</span>`);
    }
  }
  const badgesHtml = badges.length
    ? `<div class="quake-badges">${badges.join('')}</div>`
    : '';

  let linkHtml = '';
  if (q.url && typeof q.url === 'string' && /^https?:\/\//i.test(q.url)) {
    const safeUrl = escapeHtml(q.url);
    linkHtml = `<a class="quake-link" href="${safeUrl}" target="_blank" rel="noopener">USGS details ↗</a>`;
  }

  return `
    <div class="quake-popup">
      <div class="magnitude">${magStr}${magType}</div>
      <div class="place">${safePlace}</div>
      <div class="quake-rows">
        <div class="quake-row"><span class="quake-k">Depth</span><span class="quake-v">${depthStr}</span></div>
        <div class="quake-row"><span class="quake-k">Time</span><span class="quake-v">${formatQuakeTime(q.time)}</span></div>
      </div>
      ${badgesHtml}
      ${linkHtml}
    </div>
  `;
}

function triggerRipple(map, latlng, color = '#fff') {
  const ripple = L.circleMarker(latlng, {
    radius: 4,
    color: color,
    weight: 2,
    fill: false,
    opacity: 0.9,
    interactive: false
  }).addTo(map);

  const start = performance.now();
  const duration = 1000;
  const maxRadius = 40;

  function animate(now) {
    const t = Math.min((now - start) / duration, 1);
    ripple.setRadius(4 + t * maxRadius);
    ripple.setStyle({ opacity: 0.9 * (1 - t) });
    if (t < 1) {
      requestAnimationFrame(animate);
    } else {
      map.removeLayer(ripple);
    }
  }
  requestAnimationFrame(animate);
}

let displayedQuakes = new Set();
let quakeLoop = [];
let currentIndex = 0;
let looping = false;

let statTotal = 0;
let statMaxMag = -Infinity;
let statLastPlace = '—';
let _activityEl = null;

function updateStatsDisplay() {
  const totalEl = document.getElementById('stat-total');
  const maxEl = document.getElementById('stat-maxmag');
  const placeEl = document.getElementById('stat-lastplace');
  if (totalEl) totalEl.textContent = statTotal;
  if (maxEl) maxEl.textContent = statMaxMag === -Infinity ? '—' : statMaxMag.toFixed(1);
  if (placeEl) placeEl.textContent = statLastPlace;
}

function pulseActivity() {
  if (!_activityEl) _activityEl = document.getElementById('quake-activity');
  if (!_activityEl) return;
  _activityEl.classList.remove('pulse');
  void _activityEl.offsetWidth; // force reflow so the animation can re-trigger
  _activityEl.classList.add('pulse');
}

export function startEarthquakeFeed(map, options = {}) {
  const {
    feedURL = 'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_hour.geojson',
    loop = false,
    loopInterval = 1200,
    maxLoopSize = 100
  } = options;

  fetchAndRender(map, feedURL, loop, maxLoopSize);
  setInterval(() => fetchAndRender(map, feedURL, loop, maxLoopSize), 60000);

  if (loop) startSequentialLoop(map, loopInterval);
}

function startSequentialLoop(map, interval) {
  if (looping) return;
  looping = true;

  const loop = () => {
    if (quakeLoop.length > 0) {
      const quake = quakeLoop[currentIndex % quakeLoop.length];
      playQuakeSound(quake.mag, quake.depth);
      triggerRipple(map, quake.marker.getLatLng(), quake.color || '#fff');

      statLastPlace = quake.place || '—';
      updateStatsDisplay();
      pulseActivity();

      if (quake.marker) {
        quake.marker.setStyle({ fillOpacity: 1, color: '#ff0' });
        setTimeout(() => {
          quake.marker.setStyle({ fillOpacity: 0.8, color: quake.color });
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
      const magType = feature.properties.magType;
      const url     = feature.properties.url;
      const felt    = feature.properties.felt;
      const alert   = feature.properties.alert;
      const tsunami = feature.properties.tsunami;

      displayedQuakes.add(id);

      statTotal++;
      if (typeof magnitude === 'number' && magnitude > statMaxMag) {
        statMaxMag = magnitude;
      }
      updateStatsDisplay();

      const lat = coords[1];
      const lon = coords[0];

      let delay = 0;
      if (newQuakes.length > 1) {
        const timeSpan = newQuakes[newQuakes.length - 1].properties.time - baseTime;
        const normalized = timeSpan > 0 ? (quakeTime - baseTime) / timeSpan : 0;
        delay = normalized * totalWindow;
      }

      setTimeout(() => {
        const color = magnitudeColor(magnitude);
        const quakeMarker = L.circleMarker([lat, lon], {
          radius: magnitudeRadius(magnitude),
          color: color,
          fillColor: color,
          fillOpacity: 0.8,
          weight: 1
        }).addTo(map);

        const popupHtml = buildPopupHtml({
          mag: magnitude,
          magType,
          place,
          depth,
          time: quakeTime,
          url,
          felt,
          alert,
          tsunami
        });

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
          quakeLoop.push({ mag: magnitude, depth, place, marker: quakeMarker, color, timestamp: quakeTime });
          if (quakeLoop.length > maxLoopSize) {
            quakeLoop.shift();
          }
        } else {
          statLastPlace = place;
          updateStatsDisplay();
          playQuakeSound(magnitude, depth);
          pulseActivity();
          triggerRipple(map, [lat, lon], magnitudeColor(magnitude));
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