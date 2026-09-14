# Route Notebook

A personal, single-file travel planner for Barcelona, Milan and Rome. It renders a real
low-poly 3D map of the city from OpenStreetMap data, lets you drop the places you want to
visit (restaurants, cafés, bars, museums, sights…), and computes a sensible walking order
starting from your hotel, with street-level routes and live location while you walk.

Everything runs in the browser. No accounts, no backend, no paid services.

## Features

- **Three cities** with separate place lists, hotels and map centres.
- **Real low-poly map**: buildings, streets, water and parks pulled from OpenStreetMap
  (Overpass API) in 800 m cells and cached in the browser (IndexedDB).
- **Add places** by tapping the ground, by searching a name or address (Photon + Nominatim),
  by pasting text such as an Instagram caption, or in bulk from a table.
- **Place types** with their own low-poly pin heads: cup for cafés, cloche for restaurants,
  cocktail glass for bars, columned temple for museums, obelisk for sights, bag for shops,
  tree for parks, star for anything else. The type is detected from OpenStreetMap tags.
- **Priority 1–10** per place; the route favours high-priority places.
- **Route** = nearest-neighbour + 2-opt on a priority-weighted cost, then real pedestrian
  legs from FOSSGIS Valhalla with distance, time and turn-by-turn directions. Legs over
  1.8 km get a public-transport hint.
- **Live location**: your position on the 3D map, the next stop with distance, and a
  one-tap Google Maps walking link.
- **Transit and ticket panels** for airports, match-day stadiums and city tickets.
- **PWA**: installable on a phone, app shell works offline.

## Run it

Open `index.html` in a browser (it needs internet for the map, geocoding and routing
services), or serve the folder from any static host. See [SETUP.md](SETUP.md) for GitHub
Pages deployment and phone installation.

## Data sources

- Map data © OpenStreetMap contributors, via the Overpass API and its public mirrors.
- Geocoding: Photon (komoot) and Nominatim.
- Walking routes: Valhalla, hosted by FOSSGIS.
- Prices and durations in the transit panels were compiled in early 2026; check the latest
  before you travel.
