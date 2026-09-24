# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Trace Overlay — a phone/tablet app that overlays a semi-transparent reference image on the live camera feed, so a person can trace it onto physical paper underneath (a digital lightbox / camera lucida). Built for people learning to draw and parents/caregivers wanting quick, casual drawing sessions with kids — not a professional reference tool.

React Native + Expo, TypeScript. The app assumes a fixed phone on a stand, not handheld — this is a deliberate scope decision (see "Alignment architecture" below) that avoids needing gyroscope-based auto-stabilization.

## Commands

- `npm run start` (or `npx expo start`) — start the Expo dev server; scan the QR code with **Expo Go** on your phone for live-reload testing, no build step needed for day-to-day iteration
- `npm run android` / `npm run ios` / `npm run web` — start the dev server targeting a specific platform directly
- `npx tsc --noEmit` — typecheck
- `npx expo install <package>` — always use this (not plain `npm install`) for Expo/RN native modules, so the version resolved matches the installed Expo SDK (currently ~57)
- No lint or test scripts are configured yet.
- Release builds (TestFlight / Play Internal Testing) go through **EAS Build** — not needed for local dev.
- `npx expo export --platform web` — builds the web target to `dist/`, deployed via [vercel.json](vercel.json) for quick browser-based testing on a phone without Expo Go. This is a convenience path only — `expo-camera`'s web fallback (`getUserMedia` in-browser) doesn't fully represent native behavior, and later features (Skia perspective warp) may not behave the same on web. Expo Go remains the primary dev workflow.

Expo SDK 57 is new enough that training-data knowledge of its APIs may be stale — check `node_modules/<package>/build/*.d.ts` (or https://docs.expo.dev/versions/v57.0.0/) rather than assuming an API shape.

## Alignment architecture

Two separate transform layers — **do not collapse into one**:

1. **Paper-space mapping (corner-pin).** Four independently-draggable handles on the reference image are dragged onto the paper's corners as seen through the camera. This defines a *perspective* transform (not a simple translate/scale/rotate) that warps the image to fit the paper even if the phone isn't perfectly parallel to it. "Realign" after a bump = re-entering this mode and nudging the corners that drifted.
2. **Camera viewport (zoom/pan).** Pinch-zoom and drag-pan move the *view into* paper-space, layered on top of the corner-pin mapping, not baked into it. Because the camera crop and the overlay read from the same underlying coordinate system, zooming in for detail work keeps the overlay synced automatically.

True independent 4-corner dragging needs real perspective distortion. `@shopify/react-native-skia` is the planned library for this (matrix/perspective transform support) — the same math behind corner-pin tools in compositing software like Nuke or After Effects. Not installed yet; it lands with step 3 (see build order).

## Architecture

- [App.tsx](App.tsx) — root component. Currently: camera permission handling via `useCameraPermissions`, a fullscreen `CameraView` (`expo-camera`, `facing="back"`), and a static placeholder reference image absolutely positioned on top at fixed opacity.
- [app.json](app.json) — Expo config; holds the `expo-camera` plugin block (camera usage-description strings for iOS/Android). Edit this instead of native project files — there are no `/ios` or `/android` folders (not prebuilt/ejected).
- [assets/reference-placeholder.jpg](assets/reference-placeholder.jpg) — line-art overlay image, standing in for the bundled template library / camera-roll import (step 5).
- [tsconfig.json](tsconfig.json) extends `expo/tsconfig.base` with `strict: true`.

## Build order

Features land one at a time, in this order: 1) camera feed + static overlay (current state) 2) opacity slider 3) corner-pin alignment (perspective transform, four draggable handles) 4) zoom/pan viewport layer, synced to the corner-pin mapping 5) image import from camera roll + bundled template library 6) grid overlay, edge-detection/line-art conversion, and other extras. Don't jump ahead to a later step before the current one is working and tested.

## Deliberately not doing

- **Gyroscope/AR auto-stabilization** — the app assumes a fixed phone on a stand; corner-pin realignment handles drift without continuous tracking, which keeps the build simpler and framework-independent.
- **AI colorization / stylization** — every reference image already has its color information available (designer-made colored template, or the user's own original photo before line-art conversion), so there's nothing for an AI step to add except cost, latency, and an unwanted backend dependency.

## Constraints to keep in mind

- Sessions run 20+ minutes — stability and comfort matter as much as the core feature.
- Don't gate basic controls (e.g. the opacity slider) behind monetization — flagged explicitly in the project brief as a competitor misstep to avoid.
- The overlay needs to stay usable under real lighting: camera feeds wash out under overhead light, and low screen brightness is hard to see outdoors.
- The bundled template library needs a metadata manifest (name, category, tags) alongside the artwork for search/filtering to work — this is separate from the artwork itself and still needs to be built once artwork is provided.
