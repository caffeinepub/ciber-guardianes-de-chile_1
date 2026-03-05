# Ciber-Guardianes de Chile

## Current State
Full card game with 60 cards (14 villains, 12 defenses, 10 actions, 4 heroes, 20 servers), 2-4 player support, game levels (20/35/50 rounds), hero ultimates, server rack visuals with LED animations, turn transition overlay, combat log, Regla del Saber popup, surrender button, and dark cyberpunk design.

## Requested Changes (Diff)

### Add
- **Multiplayer QR Room**: Button "Sala Multijugador" in the lobby (StartScreen play tab) that opens a modal with: simulated QR code (SVG grid pattern), random room code (e.g. X7KP2M), and a list of simulated connected players with online status indicators.
- **Defense Timer Overlay**: When a pending attack exists, show a circular countdown timer (10 seconds) that changes color green→orange→red. If timer expires, auto-apply damage with server explosion animation. Replaces the simple "ATAQUE PENDIENTE" indicator.
- **Enhanced Hero Animations**: 
  - Each hero has its own aura color (Pudú=green, Zorro=golden, Lechuza=blue, Gato=purple)
  - Attack animation: `hero-activate` (flash + scale) 
  - Receive damage: `hero-hit` (shake + color glitch per hero color)
  - Defend success: `hero-defend` (bright glow)
  - Floating badges above hero with contextual messages ("¡Ataque Bloqueado! 🛡️", "¡Daño Recibido! 💀", "¡Definitiva Activada! ⚡")
- **Card Blur Detail**: When any card is tapped/clicked, a full backdrop blur overlay appears showing the card enlarged with name, type, full effect, and didactic info in a highlighted panel. Triggered from both PlayerZone hand cards and GameCard clicks.
- **Ultimate Ability Overlay**: When the "DEFINITIVA" button is pressed, a full-screen overlay appears with: hero entrance animation, hero image large, ability name, and effect text. Auto-closes after ~2.5s. Button labeled "DEFINITIVA" (not just "Habilidad").
- **New CSS keyframes**: `hero-hit` (shake + color shift), `hero-defend` (radial glow pulse), `timer-pulse` (pulsing glow for urgent timer), `ultimate-entrance` (hero slides in from bottom), `sweep-digital` (horizontal sweep for turn transition), `card-blur-in` (zoom in for card detail).

### Modify
- **TurnTransitionOverlay**: Add "PASA EL DISPOSITIVO" text below player name. Add horizontal sweep/wipe digital effect. Make it more dramatic with bigger hero image.
- **HeroToken**: Add `isHit` and `isDefending` props for new animation states. Improve floating badge to show contextual messages based on event type. Aura ring always visible (dim when not active, bright on events).
- **PlayerZone**: Wire `isHit` state when player receives damage, `isDefending` state on defense. Pass new states to HeroToken.
- **GameScreen**: Replace "ATAQUE PENDIENTE" section with the defense timer overlay. Track which player just received damage for `hero-hit` animation. Track which player just defended for `hero-defend`. Connect card click → card blur modal. Change ultimate button label to "DEFINITIVA".
- **StartScreen**: Add "Sala Multijugador" button in the play tab above the player count selector.

### Remove
- Simple "ATAQUE PENDIENTE" text + "Sin Defensa →" button from center area (replaced by defense timer overlay).

## Implementation Plan
1. Add new CSS keyframes and utility classes to index.css
2. Create `MultiplayerRoomModal.tsx` component with QR simulation, room code, player list
3. Create `DefenseTimerOverlay.tsx` with circular SVG countdown, color transitions, auto-resolve
4. Create `CardDetailOverlay.tsx` with backdrop blur and card expansion
5. Create `UltimateOverlay.tsx` with hero entrance animation and effect display
6. Update `HeroToken.tsx` with isHit/isDefending props, better badge messages, aura ring
7. Update `PlayerZone.tsx` to pass new animation states
8. Update `TurnTransitionOverlay` in GameScreen.tsx with "PASA EL DISPOSITIVO", sweep effect
9. Update `GameScreen.tsx`: defense timer, card blur trigger, ultimate overlay trigger, button labels
10. Update `StartScreen.tsx`: add Sala Multijugador button and modal
