# Hub 3D case scene

Source of the bundled same-origin scene in `public/cases/three`.

Rebuild from this directory: `npm ci`, `node build.mjs`, `node check-three.mjs`,
then `node publish-assets.mjs`. Commit both source and generated public assets.
The hub build consumes the already-generated bundle; no CDN is required.

The React wrapper mounts the scene only in the cases section. Frame unloading
disposes the renderer and timeline. Model, material and animation checks run
without WebGL; browser QA remains unverified due to unavailable CUA.

Messages use exact origin and window checks: child sends gacha-ready/gacha-error;
parent may request gacha-open with an integer index 0–2. No money, inventory,
identity or payment data crosses this bridge. This is a demo, not prize issuance.
