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
- **A landscape of peaks.** Every memory is a needle-thin spire at its place (concave flanks flaring to a narrow base, casting a long soft shadow to the right). Colour is
  time, on a continuous ramp from the oldest memory in the atlas to the newest (five
  ramps to choose from in Filter, `js/ramps.js`). Height is weight: richness (words,
  photos) times density (memories within ~100 km). Long trips rise as mountain
  ranges, short ones as hills.
- **Pins up close.** From street level (zoom 12) the bars give way to pins in three
  expressions: photographic, categorical (a symbol) and typographic (an initial).
- **Countries.** Tap the country count for a world map with every visited country
  coloured by the time of its first memory. Countries can also be marked visited by
  hand, by tapping the map or typing a name (any common name works: Holland, Burma,
  Holy See; see `js/country-names.js`), and sync with your memories. England, Scotland, Wales and Northern Ireland
  count separately, as do France's overseas departments, Svalbard, Jan Mayen and the
  Caribbean Netherlands (`vendor/subunits-50m.json`, cut from Natural Earth map units
  by `tools/subunits.py`).
- **Filters** across five dimensions: category, who was there, recorded by,
  trips/collections and time, plus saved views. Contributor and participants stay
  separate concepts.

- **Quick capture.** The + button adds a memory: photos first (date and place are read
  from each photo's EXIF), then title and text, the place (search, your location, or
  the map under a cross; names come from OpenStreetMap's Nominatim), category, who was
  there, who recorded it and the trip. One paragraph is a note (or a quote, if it starts
  with “); more paragraphs or photos make a story. Your own memories can be edited and
  deleted.

## Your memories

Kept on the phone first (IndexedDB), so capture works offline, then synced to Dropbox:

```
/Pins/pins.json                 places, trips, people, memories, marked countries
/Pins/photos/<year>/<id>.jpg    photo masters, 3,200 px on the long side
```

Every record carries `updatedAt`; deletions leave a tombstone. Two phones syncing at once
are merged record by record (newer wins), using Dropbox revisions to detect the race.
Photos upload before the memory that uses them. The examples in `sample/` are never
written to Dropbox, and the Library sheet (cloud button) can hide them.

**Setting up Dropbox (once):** create an app at dropbox.com/developers/apps with
*Scoped access* and *Full Dropbox*; give it the permissions `files.content.read` and
`files.content.write`; add the redirect URIs `https://stefan-verstraeten.github.io/Pins/`
and `http://localhost:8010/`; put its App key in `js/config.js`. Share the `/Pins`
folder with the second Dropbox account so both phones use the same atlas.

The app shell is cached by a service worker (`sw.js`, network first), so Pins opens
without a connection.

## Run locally

```sh
python3 -m http.server 8010   # then open http://localhost:8010
```

## Sample data

`sample/data.js` holds invented memories at real places. Photos in `sample/img/`
come from Wikimedia Commons (`tools/sample_photos.py`, credits in
`sample/credits.json`) and from Grand Tour.
