# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Trace Overlay — a mobile web app that overlays a semi-transparent reference image on the live camera feed, so a person can trace it onto paper underneath (a digital lightbox / camera lucida), or align it onto a digital canvas in another app.

Plain HTML/CSS/JS, no build step, no framework — this is deliberate for Phase 1: fastest way to get something testable on a phone browser with no install. A React Native + Expo rewrite is a possible Phase 2 if native camera/gyroscope performance or App Store distribution becomes a priority later — not started yet.

## Commands

No build step or package manager. Serve the directory statically and open it in a browser:

- `npx serve .` (or any static file server), then visit the printed URL

Camera access (`getUserMedia`) requires a secure context: plain `http://localhost` works for desktop testing, but a phone browser needs HTTPS. To test on an actual device, deploy to Vercel/Netlify or tunnel with something like `ngrok http <port>`.

## Architecture

- [index.html](index.html) — single page: a fullscreen `<video>` for the live camera feed with an `<img>` overlay positioned on top via CSS.
- [script.js](script.js) — requests `getUserMedia` with `facingMode: environment` (rear camera) and attaches the stream to `<video>`; reports errors into the `#status` bar.
- [style.css](style.css) — layout only. `#camera` uses `object-fit: cover` to fill the viewport; `#overlay` is centered and non-interactive (`pointer-events: none`) until positioning controls are built.
- [assets/reference-placeholder.svg](assets/reference-placeholder.svg) — hardcoded placeholder reference image for the overlay, used to validate the camera + overlay compositing before image import is built.

## Build order

Features land one at a time, in this order (see build order in project brief): 1) camera feed + static overlay (current state) 2) opacity slider 3) pinch-to-zoom / drag / rotate on the overlay 4) lock/freeze mode 5) image import from camera roll 6) auto-stabilization and other extras. Don't jump ahead to a later step before the current one is working and tested.

## Constraints to keep in mind

- Sessions run 20+ minutes — stability and comfort matter as much as the core feature; avoid anything that would force a re-position (e.g. layout shifts, accidental page zoom/scroll — hence `user-scalable=no` in the viewport meta).
- The overlay needs to stay usable under real lighting: camera feeds wash out under overhead light, and low screen brightness is hard to see outdoors.
