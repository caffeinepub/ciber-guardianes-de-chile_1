# Ciber-Guardianes de Chile

## Current State
Juego multijugador funcional con sincronización via canister ICP. Problemas pendientes:
- El invitado puede no ver sus cartas correctamente (mano visible face-up)
- El juego se queda pegado después de que se resuelve una defensa
- La barra sticky de acciones desaparece en móvil cuando hay un ataque pendiente o transición de turno
- El atacante no recibe notificación cuando el defensor responde
- El botón Robar Carta / Fin del Turno desaparece en el invitado en móvil/tablet

## Requested Changes (Diff)

### Add
- Toast/notificación en el dispositivo del ATACANTE cuando se resuelve la defensa (defendido o daño aceptado)
- Auto-dismiss de la transición de turno en el dispositivo del invitado después de 2.5s (failsafe para no quedarse pegado)
- Trigger DRAW_PHASE fallback con delay de 3s incluso cuando showTurnTransition es true (failsafe absoluto)

### Modify
- Barra sticky móvil: remover condición `!state.pendingAttack` del wrapper exterior — los botones internos ya tienen guardia de turno, la barra debe permanecer visible siempre que no sea showTurnTransition en turno del invitado
- DefenseTimerOverlay: confirmación que solo se muestra en el dispositivo del DEFENSOR (isMyDefenseTurn)
- Notificación al atacante: usar ActionToast o state change detection para notificar resultado de defensa
- Invitado ve sus cartas: verificar y asegurar que `bottomZonePlayer.hand` esté correctamente accesible con cartas face-up
- Sincronización más rápida: reducir POLL_INTERVAL a 300ms, relay action duration a 8s

### Remove
- Nada

## Implementation Plan
1. GameScreen.tsx: Quitar `!state.pendingAttack` de la condición del wrapper de la barra sticky móvil (línea ~1933)
2. GameScreen.tsx: Agregar auto-dismiss del overlay de transición para el turno del invitado (isPerDevice && !transitionData.isWaitingForOther) con timeout de 2500ms
3. GameScreen.tsx: Agregar DRAW_PHASE fallback trigger que ignora showTurnTransition después de 3s como failsafe absoluto
4. GameScreen.tsx: Detectar cuando pendingAttack pasa de no-null a null via remote action y mostrar toast en el dispositivo del atacante con el resultado
5. useGameSync.ts o el hook: reducir POLL_INTERVAL_MS a 300ms y ACTION_PERSIST_MS a 8000ms
6. Verificar que el DefenseTimerOverlay se renderiza condicionado a `defenderIsCurrentPlayer` (ya existe pero reforzar)
