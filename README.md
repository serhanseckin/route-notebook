# Route Notebook

A personal travel planner for Barcelona, Milan and Rome. It renders a real low-poly 3D map
of the city from OpenStreetMap data, lets you drop the places you want to visit, and turns
them into a day-by-day walking plan with street-level routes, opening hours and live
location while you walk.

Everything runs in the browser. No accounts, no backend, no paid services.

Live: https://serhanseckin.github.io/route-notebook/

## Features

**The map**
- Real low-poly city: buildings, streets, water, parks and beaches from OpenStreetMap.
  The city centres ship as static bundles (`data/map-*.json`) and render instantly; areas
  around your places are fetched from the Overpass API in 800 m cells and cached on the device.
- Hand-made landmarks (Sagrada Família, Duomo di Milano, the Colosseum), a drawn sea for
  Barcelona, rivers and canals, time-of-day lighting from dawn to night, paper grain and
  handwritten labels.
- A little figure can walk the whole route at 20× speed, pausing at every stop with your note.

**Places**
- Add by tapping the ground, by name or address (Photon + Nominatim), by pasting text such as
  an Instagram caption, or in bulk from a table. Results far from the city are flagged.
- Types with their own pin heads (café cup, restaurant cloche, cocktail glass, temple,
  obelisk, shopping bag, tree, star), detected from OSM tags.
- Note, photo (resized, stored on the device), priority 1–10, time to spend, opening hours
  (filled from OSM when known), day of the trip.

**Planning**
- Days: each place belongs to a day; every day has its own route from the hotel.
- Order = nearest-neighbour + 2-opt on a priority-weighted cost, with a penalty for arriving
  when a place is closed, so lunch spots and museums land in their opening windows.
- Timeline per stop (arrival, departure, waits, "closed at this time"), day end time, and a
  one-line reason for every position in the order.
- Real pedestrian legs from FOSSGIS Valhalla with distance, time and turn-by-turn directions;
  legs over 1.8 km show the nearest metro/tram stations and a transit link.

**On the road**
- Live location on the 3D map; the route restarts from where you are and the clock is "now".
- Stops are marked visited by hand or automatically after five minutes nearby; the route
  recomputes over what is left.
- Notifications when the next stop is close and when a place closes within 30 minutes.
- Offline pack: downloads the map cells and street routes for every day of a city.

**Sharing**
- Share link: the whole city plan compressed into a URL, importable on any device.
- Export everything as JSON, or today's route as GPX (waypoints + track).

**Transit panels** for airports, match-day stadiums and city tickets.

## Run it

Open `index.html` in a browser, or serve the folder from any static host (see
[SETUP.md](SETUP.md) for GitHub Pages and phone installation). Open `tests.html` to run the
unit tests for the routing, scheduling and parsing code in `core.js`.

To rebuild the static map bundles: `python tools/build_map_bundle.py`.

## Data sources

- Map data © OpenStreetMap contributors, via the Overpass API and its public mirrors.
- Geocoding: Photon (komoot) and Nominatim.
- Walking routes: Valhalla, hosted by FOSSGIS.
- Prices and durations in the transit panels were compiled in early 2026; check the latest
  before you travel.
