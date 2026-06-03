# 🌍 QuakeSound

**QuakeSound** is a generative soundscape web application that transforms real-time earthquake data into an ambient, musical soundscape.

Each earthquake triggers a layered tone:
- 🎵 Pitch = Magnitude (snapped to an A-minor pentatonic scale so overlapping quakes stay harmonious)
- ⏱️ Note length = Depth (shallower = longer resonance)
- 🔊 Larger quakes get longer sustain, slower fades, and higher gain — so big events feel significant

---

## 🌐 Live Demo

👉 [https://quakesound.com](https://quakesound.com)

---

## 🕹️ Available Views

- [`/`](https://quakesound.com) — **Real-time** view using the **past hour** feed; sound triggers as quakes arrive
- [`/allday`](https://quakesound.com/allday/) — **Soundscape** mode using the **past 24 hours**, looping continuously for an ambient effect
- [`/v1`](https://quakesound.com/v1/) — Archived **v1** (original light-map, single-oscillator version)

---

## ✨ v2 Highlights

**Audio**
- Single shared `AudioContext` with a master gain + compressor bus
- Layered oscillators per quake (triangle fundamental + sine octave + fifth)
- Pentatonic frequency quantization for musical coherence
- Magnitude-dependent attack / sustain / decay envelopes
- Shaped exponential-decay reverb with a warm, low-passed tail
- Dynamic gain scaling to prevent clipping during dense playback

**Visual**
- Dark CartoDB Dark Matter basemap
- Magnitude color gradient (green → yellow → orange → red) with exponential radius scaling
- Expanding ripple animation on each sound trigger
- Glowing tectonic plate boundaries
- Live stats panel (total quakes loaded, max magnitude, latest location, activity indicator)
- Mobile-friendly collapsible legend and mode switch

---

## 🛠 Technologies

- Leaflet.js
- CartoDB Dark Matter basemap (OpenStreetMap data)
- Web Audio API
- USGS GeoJSON Feed

---

## 🧾 License

This project is licensed under [GPL-3.0](LICENSE). You are welcome to remix, fork, share, and even monetize — but **attribution is required**. Please retain a link back to the original project or creator.

---

## 🤝 Attribution

Created by [AlexAmorBot](https://github.com/AlexAmorBot), combining a love of building things with an interest in turning raw data into something unexpectedly fun.

---

## 💬 Feedback & Forks

Use GitHub Issues or Discussions. Forking encouraged — credit appreciated.
