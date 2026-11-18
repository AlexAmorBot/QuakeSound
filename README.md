# QuakeSound

Generative soundscape that turns live USGS earthquakes into musical tones.

- Pitch follows magnitude, snapped to an A minor pentatonic so overlaps stay consonant.
- Note length follows depth. Shallower events ring longer.
- Larger magnitudes get more sustain, a slower fade, and more gain.

Live: [quakesound.com](https://quakesound.com)

## Views

- [/](https://quakesound.com/) — past hour. Notes fire as events arrive.
- [/allday/](https://quakesound.com/allday/) — past day, looped.
- [/about.html](https://quakesound.com/about.html) — short note on the project.
- [/v1/](https://quakesound.com/v1/) — archived v1. Light OpenStreetMap basemap, single oscillator. Not indexed.

## Run locally

Static site. No build step.

```bash
cp js/config.example.js js/config.js
python3 -m http.server 8080
```

Paste a CARTO basemap key into `js/config.js`. Request one at [carto.com/basemaps/apikey](https://carto.com/basemaps/apikey/). The browser sends that key with tile requests, so it is not a server secret — it still does not belong in git.

`scripts/check.sh` confirms the key is not in the tree and that the v1 tile origin is allowed.

v1 does not use the key. It loads `https://tile.openstreetmap.org`. The site CSP in `.htaccess` has to allow that origin, or the v1 basemap is blank while markers still draw.

## v2, briefly

Shared `AudioContext`, layered oscillators, pentatonic snap, magnitude envelopes, shaped reverb, and gain riding when many notes overlap.

Dark CARTO basemap, magnitude color and radius, a ripple on each note, plate boundaries, a small live readout, and a collapsible legend on small screens.

## Stack

Leaflet, CARTO Dark Matter, the Web Audio API, and the USGS GeoJSON feed.

## License

GPL-3.0. Copyright (C) 2025 AlexAmorBot. Attribution required — see [LICENSE](LICENSE).

Alex Amor — [AlexAmorBot/QuakeSound](https://github.com/AlexAmorBot/QuakeSound)

Issues and discussions are open. Forks are welcome; keep the credit.
