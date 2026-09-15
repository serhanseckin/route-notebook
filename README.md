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
  A 4 km square around each city centre ships as a static bundle (`data/map-*.json`) and
  renders instantly; the areas around your places, and wherever you pan the camera, are
  fetched from the Overpass API in 800 m cells and cached on the device.
- The scene follows the real clock: sun, sky and shadows change through the day, and street
  lamps switch on at dusk. Scrub the time slider to preview any hour; "now" returns to the clock.
- Hand-made landmarks (Sagrada Família, Duomo di Milano, the Colosseum), a drawn sea for
  Barcelona, rivers and canals, paper grain and handwritten labels.
- A little figure can walk the whole route at 20× speed, pausing at every stop with your note.
- Map-style controls: drag to move, pinch or scroll to zoom towards the cursor, two fingers or
  right-drag to rotate, double-tap the ground to add a place.

**Getting started**
- A four-step wizard: your name, city and dates (plus hotel) → fixed events such as a match or
  a concert → your bucket list, straight from your head with a 1–10 "want" score and a picture
  that reminds you why, looked up on the map → breakfast, lunch and dinner for every day, with a
  capacity check ("fits / tight") and an auto-fill by priority. It opens on first launch and is
  always one tap away ("Plan wizard").
- Fixed events are anchors: the hotel is the start, the event happens at its time and place
  (venue presets such as Camp Nou and San Siro), and everything in between is arranged by the
  algorithm. Meal times that overlap an event are flagged.
- Weather for your dates from Open-Meteo: an icon on each day tab and a hint that suggests
  moving indoor places to rainy days and parks to sunny ones.

**Places**
- Add by double-tapping the ground, by name or address (Photon + Nominatim), by pasting text
  such as an Instagram caption, or in bulk from a table. Results far from the city are flagged.
- Types with their own pin heads (café cup, restaurant cloche, cocktail glass, temple,
  obelisk, shopping bag, tree, star), detected from OSM tags.
- Note, photo (resized, stored on the device), priority 1–10, time to spend, opening hours
  (filled from OSM when known), day of the trip.

**Planning**
- Your stay: arrival and departure date-times set the number of days; day 1 starts when you
  arrive and the last day is cut off when you leave.
- Meals: pick a breakfast, lunch and dinner place per day (from your list, sorted by priority);
  they are fixed at their times and the rest of the day is arranged around them.
- Days: each place belongs to a day; every day has its own route from the hotel.
- Order = nearest-neighbour + 2-opt on a priority-weighted cost, with a penalty for arriving
  when a place is closed, so lunch spots and museums land in their opening windows.
- Timeline per stop (arrival, departure, waits, "closed at this time"), day end time, and a
  one-line reason for every position in the order.
- Real pedestrian legs from FOSSGIS Valhalla with distance, time and turn-by-turn directions;
  legs over 1.8 km show the nearest metro/tram stations and a transit link.

**Journal (a game, really)**
- XP and levels (Tourist → Wanderer → Explorer → Local → Legend → Myth) from visits, pages,
  photos, quests, badges and trophies.
- Three quests every morning: two city-themed photo challenges (a Gothic Quarter door older than
  your grandparents, a yellow tram in a shop window, a nasone you actually drink from…) and one
  automatic challenge (walk 5 km, reach three places, beat the crowds).
- Passport stamps per city with day-by-day completion, walking stats from your live location
  (km, steps, kcal, longest walk) and a shareable stats card.
- Landmark trophies: reach the Sagrada Família, the Duomo or the Colosseum and its model turns
  to gold, with a line of commentary you did not ask for.
- Tap any pin for a card with the photo, note, hours and scheduled time.
- Reaching a place (by location, or ticking ✓) unlocks its journal page: a photo of what you had
  and a few words. The Journal tab collects the pages by city and day, with badges such as
  First stop, Foodie, Storyteller, Full day and Three cities.
- The little walker carries your name; set it by tapping the name next to the title.
- Visited pins show the photo you took as a small polaroid on the 3D map.
- Memory book: one printable HTML page with every journal entry, photo and badge.

**On the road**
- Live location on the 3D map; the route restarts from where you are and the clock is "now".
- Stops are marked visited by hand or automatically after five minutes nearby; the route
  recomputes over what is left.
- Notifications when the next stop is close and when a place closes within 30 minutes.
- Offline pack: downloads the map cells and street routes for every day of a city.

**Sharing**
- Share link: the whole city plan compressed into a URL; on import you can merge it into your
  own list (matching places are de-duplicated) or replace it.
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
