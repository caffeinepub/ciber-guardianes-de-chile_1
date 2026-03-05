# Ciber-Guardianes de Chile

## Current State
- Full card game with 60-card deck, 4 heroes, 2-4 players shared screen mode, AI mode
- Multiplayer room system with canister backend (createRoom, joinRoom, startRoom, getRoomState)
- The room creation fails silently - users cannot create a room because `actor` may not be initialized when the button is pressed, and there is no error feedback
- StartScreen has a text-based logo with Zap icons; no hero visuals on the homepage
- GameCard `isFaceDown` shows a plain dark card with hex pattern and a Cpu icon - not visually impressive
- GameScreen uses `battle-background.dim_1920x1080.jpg` at 12% opacity - subtle
- Game layout: opponents on top, deck/discard in center row, current player at bottom, combat log on the right side panel

## Requested Changes (Diff)

### Add
- Hero banner image on the StartScreen homepage: use newly generated `/assets/generated/hero-banner-home.dim_1200x600.jpg` as a full-width visual above the logo text
- New card back image: use `/assets/generated/card-back-design.dim_400x560.png` as the face-down card image in GameCard (replacing current SVG hex pattern + CPU icon)
- New battle arena background: use `/assets/generated/battle-arena-bg.dim_1920x1080.jpg` in GameScreen at higher opacity (0.22-0.28) for a more dramatic battle feel
- Error feedback in MultiplayerRoomModal when room creation fails: show a red error message if `createRoom` returns null

### Modify
- **StartScreen logo area**: Replace the current plain text title with a full visual section. Show the hero banner image prominently. Keep the text "CIBER-GUARDIANES / DE CHILE" but make it overlay the image or appear below it elegantly
- **GameCard face-down back**: Replace the inline SVG hex + Cpu icon with an `<img>` tag pointing to `/assets/generated/card-back-design.dim_400x560.png`. The image should fill the card dimensions exactly with `object-fit: cover`
- **GameScreen background**: Swap `battle-background.dim_1920x1080.jpg` for `battle-arena-bg.dim_1920x1080.jpg` and raise opacity to 0.22
- **GameScreen battle layout**: Improve distribution so it feels less cramped:
  - Opponents section: use a card/panel background for each opponent with slightly more padding and visual separation
  - Center deck/discard row: make it taller and more prominent (add labels, visual borders)
  - Current player zone: ensure cards have enough space and don't overflow
  - On desktop (md+), add a visual divider line between opponent area and player area
  - Make the layout feel like a real TCG table: green-tinted "board" surface behind opponent cards, slightly different tint behind player cards
- **Multiplayer room creation fix**: In `useMultiplayerRoom.ts` the `createRoom` function returns `null` when `!actor`. The modal must handle this gracefully: wait for actor (show spinner), and if it fails after retry show a clear error "No se pudo conectar. Intenta de nuevo."
  - Also add a retry mechanism: if `actor` is null when clicking "Crear Sala", wait up to 3 seconds polling for actor before giving up
  - In `MultiplayerRoomModal`, detect when `actor` from `useMultiplayerRoom` is null and show an "Conectando..." state on the Create Room button
- **Multiplayer room waiting view**: The waiting view (guest) polls every 1.5s already. Ensure the `room.status === "starting"` detection properly fires `onStartMultiplayerGame` on guest devices. The current useEffect in MultiplayerRoomModal watches `room` changes - verify this is triggered correctly when status flips to "starting"

### Remove
- Nothing removed

## Implementation Plan
1. Update `GameCard.tsx`: Replace the face-down card's inline SVG/icon rendering with an `<img>` referencing `/assets/generated/card-back-design.dim_400x560.png`
2. Update `StartScreen.tsx`: Add hero banner image above the logo text section. The banner image should be shown as a rounded image block at the top of the page with an overlay gradient at the bottom, and the title text overlaid or positioned directly below
3. Update `GameScreen.tsx`: 
   - Swap battle background image to `battle-arena-bg.dim_1920x1080.jpg` with opacity 0.22
   - Add a subtle "TCG table" surface: two-tone background zones (opponent area vs player area) using pseudo-divs with gradient overlays in red/enemy tone for opponents and green/friendly tone for player
4. Update `useMultiplayerRoom.ts`: Make `createRoom` retry when actor is null (poll up to 3 seconds). Add actor readiness check.
5. Update `MultiplayerRoomModal.tsx`: Show "Conectando..." on the Create Room button when actor is not yet available, show error message if creation fails
6. Verify multiplayer room polling and game start detection works on both host and guest views
