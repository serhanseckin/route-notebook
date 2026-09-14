# Route Notebook — install on your phone (PWA)

The app is a static folder: `index.html`, `manifest.webmanifest`, `sw.js` and the icons.
To add it to a phone as an app, and for the location permission to work, it must be served
over **https**. GitHub Pages is the easiest free option.

## 1) Publish with GitHub Pages

The repository is `https://github.com/serhanseckin/route-notebook` and Pages is enabled on
the `main` branch. The app lives at:

`https://serhanseckin.github.io/route-notebook/`

To publish a change:

```bash
git add -A && git commit -m "update" && git push
```

The phone picks up the new version the next time the app is opened.

## 2) Add to the home screen

- **Android / Chrome:** open the address → top-right ⋮ → **Add to Home screen** (or "Install app").
- **iPhone / Safari:** open the address → Share icon → **Add to Home Screen**.

Opened from the home screen it runs full-screen, without the browser bar.

## 3) Location and walking routes

- The **Locate** button asks for permission on first use; a "You are here" marker appears on
  the map and the bottom strip shows the next stop, estimated distance and a **Directions**
  button (Google Maps, walking mode).
- Street routes come from the FOSSGIS Valhalla service (free, no key). If a leg cannot be
  fetched, the list says "straight-line estimate" and that leg is drawn as a straight line
  above the buildings.

## 4) Offline

The app shell and Three.js are cached; map cells and routes already loaded stay on the device.
New searches, new map cells and new street routes need an internet connection.

## Alternative hosting

Dragging the folder into Netlify Drop (app.netlify.com/drop) or Cloudflare Pages also works;
both need a free account.
