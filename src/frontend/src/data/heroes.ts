// ─── Hero Definitions ────────────────────────────────────────────────────────
// Add or edit heroes here. Each hero has a passive ability used by gameEngine.ts

import type { HeroDefinition } from "../game/gameTypes";

export const HEROES: HeroDefinition[] = [
  {
    id: "pudu",
    name: 'Pudú "Escudo"',
    title: "El Tanque",
    role: "Defensa",
    passiveDescription:
      "Ignora el primer ataque de cada ronda automáticamente.",
    ultimateDescription:
      "Cifrado Total: Una vez por partida, ningún ataque puede dañarte por 2 rondas.",
    image: "/assets/generated/card-hero-pudu.dim_400x560.png",
    color: "green",
  },
  {
    id: "zorro",
    name: 'Zorro Chilla "Sabio"',
    title: "El Estratega",
    role: "Utilidad",
    passiveDescription: "Roba 2 cartas en la Fase de Conexión en lugar de 1.",
    ultimateDescription:
      "Denuncia Ciudadana: Obliga a un oponente a mostrar su mano y descartar todos sus Villanos.",
    image: "/assets/generated/card-hero-zorro.dim_400x560.png",
    color: "yellow",
  },
  {
    id: "lechuza",
    name: 'Lechuza "Vigilante"',
    title: "La Analista",
    role: "Soporte",
    passiveDescription:
      "Si alguien intenta ver tu mano, ese jugador debe mostrar la suya como castigo.",
    ultimateDescription:
      "Backup Nocturno: Si estás a punto de perder tu último Servidor, recuperas 2 Servidores perdidos.",
    image: "/assets/generated/card-hero-lechuza.dim_400x560.png",
    color: "blue",
  },
  {
    id: "gato",
    name: 'Gato Colocolo "Admin"',
    title: "El Reparador",
    role: "Soporte/Recuperación",
    passiveDescription:
      'Al perder un Servidor, lanza un "dado": si sale par (50% de probabilidad), ¡lo recuperas inmediatamente!',
    ultimateDescription:
      "Reinicio del Sistema: Descarta tu mano entera y roba 5 cartas nuevas.",
    image: "/assets/generated/card-hero-gato.dim_400x560.png",
    color: "purple",
  },
];

export function getHeroById(id: string): HeroDefinition | undefined {
  return HEROES.find((h) => h.id === id);
}
