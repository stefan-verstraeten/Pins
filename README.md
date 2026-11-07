# Pins

An atlas of experiences: Stefan and Marleen's memories of a lifetime of travel,
organised by the map. A pin is one memory (a visit) at a place; places, trips,
people, collections and time are the ways back in.

**Status:** map prototype with sample data. No storage, capture or imports yet.

## Design

Grand Tour's language, evolved so the map becomes the application.

- **Paper** `#F3EEE3`, **ink** `#42443D`, **olive** `#899581`, **ochre** `#A58B68`,
  **stone** `#D9D8C8`, **sea** `#8FA9A8`.
- **Cormorant Garamond** for places, titles and memories; **Inter** for dates,
  metadata and controls (self-hosted in `vendor/fonts/`, SIL OFL).
- **Hybrid map.** Zoomed out, an engraved atlas drawn from Natural Earth
  (`vendor/land-50m.json`, `countries-50m.json`). From zoom 4–6 it cross-fades into
  precise tiles (Esri Light Gray Canvas), recoloured to paper and sea by an SVG
  duotone filter (`#warm`).
- **Pins, one family with three expressions:** photographic (a thumbnail),
  categorical (a quiet symbol) and typographic (an initial, for memories that are
  mostly words). Zoomed out, they become dots of category colour; clusters show
  density, with a photo once you're close enough.
- **Filters** across five dimensions: category, who was there, recorded by,
  trips/collections and time, plus saved views. Contributor and participants stay
  separate concepts.

## Run locally

```sh
python3 -m http.server 8010   # then open http://localhost:8010
```

## Sample data

`sample/data.js` holds invented memories at real places. Photos in `sample/img/`
come from Wikimedia Commons (`tools/sample_photos.py`, credits in
`sample/credits.json`) and from Grand Tour.
