# Ciber-Guardianes de Chile

## Current State
Juego de cartas digital completo con:
- 4 héroes (Pudú, Zorro Chilla, Lechuza, Gato Colocolo) con habilidades pasivas y definitivas
- 36 cartas jugables (14 villanos + 12 defensas + 10 acciones) con efectos completos
- Sistema de combate con defensa activa fuera de turno
- Timer de defensa circular con cuenta regresiva de 10 segundos
- Sistema de servidores/vidas visibles
- Overlay de transición de turno épico con "PASA EL DISPOSITIVO"
- Overlay de habilidad definitiva full-screen
- Regla del Saber (popup didáctico con bonus)
- Niveles por rondas (20/35/50)
- Botón de rendirse con confirmación
- Menú principal con tabs: Jugar, Mercado, Mis Cartas, Logros
- Modal de sala multijugador QR (simulado)
- Tab Manual del Juego (brochure)
- Modo de un solo dispositivo (se pasa el teléfono)
- Fondo de batalla
- Log de combate

## Requested Changes (Diff)

### Add
- Tab "Manual" / instrucciones del juego como brochure digital completo en el StartScreen (pantalla de inicio), con todas las reglas, fases del turno, tipos de cartas, héroes, diccionario de términos y Reglas de Oro
- El tab de instrucciones debe estar visible y accesible desde el inicio sin necesidad de iniciar una partida
- Modo de juego: solo (1 jugador vs IA) — con IA oponente básica que elige cartas aleatorias con lógica de prioridad
- Botón "1 Jugador (vs IA)" en el tab Jugar del StartScreen

### Modify
- StartScreen: agregar tab "📖 Manual" junto a los tabs existentes (Jugar, Mercado, Mis Cartas, Logros)
- StartScreen tab Jugar: agregar opción de 1 jugador vs IA además de las opciones 2/3/4 jugadores
- GameScreen: cuando playerCount === 1 (modo IA), el jugador de IA actúa automáticamente en su turno con lógica básica
- HeroSelectScreen: cuando es modo 1 jugador, solo el jugador 1 elige héroe; la IA recibe un héroe aleatorio
- Preservar todas las funcionalidades existentes sin romper nada

### Remove
- Nada se elimina

## Implementation Plan
1. Agregar tab "Manual" al StartScreen con contenido completo del reglamento (preparación, fases, combate, héroes, tipos de cartas, diccionario, Reglas de Oro)
2. Agregar opción de 1 jugador (modo IA) al tab Jugar del StartScreen
3. Actualizar HeroSelectScreen para manejar mode=ai (playerCount=1, IA recibe héroe aleatorio)
4. Agregar lógica de IA al GameScreen/gameEngine: cuando es el turno de un jugador IA, ejecuta automáticamente sus acciones con delay
5. Actualizar App.tsx para manejar playerCount=1 y pasar modo IA al GameScreen
6. Validar que build/typecheck pasa sin errores
