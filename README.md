# Game Hub

Premium responsive game hub prototype. Working title: Game Hub.

## Run
Node 22.13+ is required. Install with npm install, then npm run dev.
Build with npm run build. Sites helpers provide publication packaging.

## Implemented
- Responsive home, game catalog, store, quests and profile.
- Native accessible dialogs with focus containment, Escape and backdrop dismissal.
- Enter/exit animations, mobile bottom sheets, reduced-motion support.
- Search, category filters, favorites and wishlists.
- Four profile frame previews.
- Daily XP, quest rewards and local profile persistence.
- Playable 20-second Star Catch game with score, XP and personal best.

## Integration boundaries
This is a UI prototype. Telegram authentication, backend persistence, Stars invoices, payment verification, refunds, referral attribution and production game integrations are not connected. Payment buttons are deliberately disabled. XP is not Telegram Stars. All data is stored only in this browser. Upcoming game names and artwork are illustrative concepts.

## Checks
TypeScript noEmit and production build. Browser checks: mobile balance package selection, dialog close, frame preview, daily reward, favorite reward, persistence after reload, game search, one completed Star Catch round; desktop layout and Escape dismissal. No console errors observed during these checks.

## Artwork
Created with the built-in imagegen tool, copied into public/orbital.png and public/worlds.png. No CLI image generation was used.

Prompt 1:
Use case: stylized-concept. Asset type: cinematic background art for a premium dark gaming hub featured game card. Create a stunning wide 16:9 AAA game key art, no text, no logos. A lone tiny astronaut in an ivory and bronze suit stands on a dark volcanic ridge in the RIGHT third, looking toward an immense luminous golden circular portal floating above a surreal rocky alien landscape. Giant faint planet behind the portal, misty purple mountains, small floating fragments, cosmic dust. Sophisticated muted violet, charcoal, champagne gold palette, dramatic volumetric beams, richly detailed cinematic game art, realistic high end 3D render. Left third is mostly dark purple atmospheric mist, low detail negative space where UI text will be overlaid. The circular portal and character remain in the right two thirds. Elegant and mysterious, sense of discovery, no violence, no UI, no lettering.

Prompt 2:
Use case: stylized-concept. Asset type: single wide game-art triptych sheet used as three game cards on a luxury arcade hub. EXACT three equal vertical panels side-by-side, each occupying exactly one third, no margins, no borders, no text. Left panel: cyan and violet neon sports car drifting in a rainy futuristic city at night, low dramatic camera, polished 3D racing game key art. Center panel: cute tiny adventurer with a yellow scarf in a lush magical floating island forest with glowing emerald crystals and waterfalls, premium stylized 3D adventure game art. Right panel: imposing obsidian fantasy knight wearing a crown and dark armor, fiery copper embers, warm amber-lit ruined castle, cinematic dark fantasy game key art. Overall 3:2 landscape image, each individual panel portrait. Premium detailed artwork with coherent moody lighting, bright subjects separated from dark rich backgrounds. No typography, no logos, no UI.
