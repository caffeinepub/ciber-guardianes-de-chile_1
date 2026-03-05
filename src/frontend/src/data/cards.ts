// ─── Card Definitions ────────────────────────────────────────────────────────
// The complete deck of 36 cards: 14 Villanos + 12 Defensas + 10 Acciones.
// To add/edit a card, just modify this array — gameEngine handles the rest.

import type { CardDefinition } from "../game/gameTypes";

// ── Villain Cards (14) ────────────────────────────────────────────────────
export const VILLAIN_CARDS: CardDefinition[] = [
  {
    id: "v01",
    name: "El Phisher Pillo",
    type: "villain",
    power: 1,
    description:
      "Obliga al oponente a descartar 1 carta de Defensa. Si no tiene, pierde 1 Servidor.",
    didacticText:
      "Phishing: Mensaje mentiroso que busca robarte tus claves fingiendo ser alguien confiable.",
    image: "/assets/generated/card-v01-phisher.dim_400x560.png",
    effectTag: "phisher",
  },
  {
    id: "v02",
    name: "El Malware Malvado",
    type: "villain",
    power: 2,
    description:
      "Causa 1 punto de daño directo: el oponente pierde 1 Servidor.",
    didacticText:
      "Malware: Cualquier programa malvado hecho para dañar, espiar o romper tus dispositivos.",
    image: "/assets/generated/card-v02-malware.dim_400x560.png",
    effectTag: "malware",
  },
  {
    id: "v03",
    name: "El Desconocido Peligroso",
    type: "villain",
    power: 1,
    description:
      "Si impacta, el jugador atacado debe saltarse su siguiente Fase de Ejecución (no puede jugar cartas).",
    didacticText:
      "Grooming: Cuando un adulto se hace pasar por niño en internet para ganarse tu confianza. ¡Pide ayuda!",
    image: "/assets/generated/card-v03-grooming.dim_400x560.png",
    effectTag: "grooming",
  },
  {
    id: "v04",
    name: "El Ciber-Bully",
    type: "villain",
    power: 1,
    description:
      "El jugador atacado debe mostrar su mano a todos. Si no tiene defensa, pierde 1 Servidor.",
    didacticText:
      "Ciberacoso: Hostigamiento repetido en plataformas digitales. ¡Bloquea, reporta y cuéntale a un adulto!",
    image: "/assets/generated/card-v04-bully.dim_400x560.png",
    effectTag: "bully",
  },
  {
    id: "v05",
    name: "Ataque de Ransomware",
    type: "villain",
    power: 2,
    description:
      "Bloquea las cartas del objetivo por 2 turnos (no puede jugar nada) a menos que tenga un Backup.",
    didacticText:
      "Ransomware: Virus secuestrador que bloquea tus archivos y pide dinero para devolverlos.",
    image: "/assets/generated/card-v05-ransomware.dim_400x560.png",
    effectTag: "ransomware",
  },
  {
    id: "v06",
    name: "El Troyano Camuflado",
    type: "villain",
    power: 1,
    description:
      "Mira la mano del oponente y roba su mejor carta de Defensa. Si no tiene defensas, pierde 1 Servidor.",
    didacticText:
      "Troyano: Programa malicioso disfrazado de software legítimo que se instala sin que lo notes.",
    image: "/assets/generated/card-v06-trojan.dim_400x560.png",
    effectTag: "trojan",
  },
  {
    id: "v07",
    name: "El Troll de las Cavernas",
    type: "villain",
    power: 2,
    description: "El oponente descarta 2 cartas al azar de su mano.",
    didacticText:
      "Troll: Persona que provoca conflictos online con comentarios agresivos o falsos para molestar.",
    image: "/assets/generated/card-v07-troll.dim_400x560.png",
    effectTag: "troll",
  },
  {
    id: "v08",
    name: "Phishing con Patas",
    type: "villain",
    power: 1,
    description:
      "Intenta robar 1 carta de Defensa del rival. Si el rival no tiene defensas, pierdes 1 Servidor tú mismo.",
    didacticText:
      "Phishing: Correo o mensaje falso que simula ser tu banco, colegio u otro sitio de confianza.",
    image: "/assets/generated/card-v08-phishing-patas.dim_400x560.png",
    effectTag: "phishing_patas",
  },
  {
    id: "v09",
    name: "Botnet de Juguete",
    type: "villain",
    power: 3,
    description:
      "Si el oponente no tiene defensa, le quita 2 Servidores de una vez.",
    didacticText:
      "Botnet: Red de dispositivos infectados controlados por un hacker para lanzar ataques masivos.",
    image: "/assets/generated/card-v09-botnet.dim_400x560.png",
    effectTag: "botnet",
  },
  {
    id: "v10",
    name: "Spam-Bot",
    type: "villain",
    power: 1,
    description:
      "El rival no puede jugar cartas de Acción en su próximo turno (su mano se 'llena de basura').",
    didacticText:
      "Spam: Mensajes no solicitados enviados masivamente para publicitar o propagar malware.",
    image: "/assets/generated/card-v10-spambot.dim_400x560.png",
    effectTag: "spam",
  },
  {
    id: "v11",
    name: "El Hacker Adivino",
    type: "villain",
    power: 1,
    description:
      "Ataque de Fuerza Bruta: Solo funciona si el oponente no tiene una Contraseña Robusta activa. Causa 1 daño.",
    didacticText:
      "Fuerza Bruta: Método de hackeo que prueba millones de contraseñas hasta encontrar la correcta.",
    image: "/assets/generated/card-v11-hacker.dim_400x560.png",
    effectTag: "brute_force",
  },
  {
    id: "v12",
    name: "Spyware",
    type: "villain",
    power: 1,
    description:
      "El atacante mira la mano del defensor. Si el defensor usa una defensa, el ataque rebota.",
    didacticText:
      "Spyware: Software espía que monitorea tu actividad sin permiso y envía datos al atacante.",
    image: "/assets/generated/card-v12-spyware.dim_400x560.png",
    effectTag: "spyware",
  },
  {
    id: "v13",
    name: "Ataque DDoS",
    type: "villain",
    power: 4,
    description:
      "Jugado solo causa 1 daño. Si 2 jugadores lo juegan en el mismo turno: 2 daños y elimina una Acción del objetivo.",
    didacticText:
      "DDoS: Ataque que inunda un servidor con tráfico falso hasta que colapsa y deja de funcionar.",
    image: "/assets/generated/card-v13-ddos.dim_400x560.png",
    effectTag: "ddos",
  },
  {
    id: "v14",
    name: "Virus Desconocido",
    type: "villain",
    power: 1,
    description:
      "Fuerza al oponente a descartar Defensas una por una hasta que el ataque se detenga o se quede sin defensas.",
    didacticText:
      "Virus: Código malicioso que se replica y destruye archivos, ralentiza o deshabilita el sistema.",
    image: "/assets/generated/card-v14-virus.dim_400x560.png",
    effectTag: "virus",
  },
];

// ── Defense Cards (12) ────────────────────────────────────────────────────
export const DEFENSE_CARDS: CardDefinition[] = [
  {
    id: "d01",
    name: "Doble Factor (2FA)",
    type: "defense",
    description: "Anula cualquier ataque de robo de identidad o claves.",
    didacticText:
      "2FA: Como tener dos llaves para una puerta; si te roban una, la otra te protege.",
    image: "/assets/generated/card-d01-2fa.dim_400x560.png",
    effectTag: "twofa",
  },
  {
    id: "d02",
    name: "Antivirus Pro",
    type: "defense",
    description:
      "Destruye cualquier carta de Malware o Virus (effectTag: malware, virus).",
    didacticText:
      "Antivirus: Programa que detecta y elimina software malicioso de tu dispositivo.",
    image: "/assets/generated/card-d02-antivirus.dim_400x560.png",
    effectTag: "antivirus",
  },
  {
    id: "d03",
    name: "Muro de Fuego (Firewall)",
    type: "defense",
    description: "Anula cualquier ataque de tipo Malware.",
    didacticText:
      "Firewall: El portero de tu computador que decide quién entra a tu red.",
    image: "/assets/generated/card-d03-firewall.dim_400x560.png",
    effectTag: "firewall",
  },
  {
    id: "d04",
    name: "Contraseña de 20 Caracteres",
    type: "defense",
    description:
      "El atacante debe descartar 3 cartas de su mano para completar el ataque (o el ataque falla si no tiene 3).",
    didacticText:
      "Contraseña larga: Combina letras, números y símbolos. ¡Más de 12 caracteres!",
    image: "/assets/generated/card-d04-password.dim_400x560.png",
    effectTag: "strong_password",
  },
  {
    id: "d05",
    name: "VPN Invisible",
    type: "defense",
    description: "El ataque falla y el Villano regresa a la mano del atacante.",
    didacticText:
      "VPN: Red privada virtual que oculta tu identidad y encripta tu conexión.",
    image: "/assets/generated/card-d05-vpn.dim_400x560.png",
    effectTag: "vpn",
  },
  {
    id: "d06",
    name: "Preguntar a un Adulto",
    type: "defense",
    description: "Anula el ataque y roba 1 carta extra.",
    didacticText:
      "Si un mensaje te asusta o promete un premio increíble, ¡pausa y llama a un adulto!",
    image: "/assets/generated/card-d06-adulto.dim_400x560.png",
    effectTag: "ask_adult",
  },
  {
    id: "d07",
    name: "Bloquear y Reportar",
    type: "defense",
    description: "Anula el ataque y el atacante debe descartar 2 cartas.",
    didacticText:
      "Nunca ignores comportamientos sospechosos: bloquea la cuenta y reporta la conducta.",
    image: "/assets/generated/card-d07-block-report.dim_400x560.png",
    effectTag: "block_report",
  },
  {
    id: "d08",
    name: "Sentido Común",
    type: "defense",
    description: "Anula cualquier ataque que prometa premios o dinero fácil.",
    didacticText:
      "Pensamiento crítico: Si algo parece demasiado bueno para ser verdad, probablemente es falso.",
    image: "/assets/generated/card-d08-common-sense.dim_400x560.png",
    effectTag: "common_sense",
  },
  {
    id: "d09",
    name: "Cámara Tapada",
    type: "defense",
    description: "Rebota ataques de Spyware. Sinergia con Lechuza.",
    didacticText:
      "Tapa la cámara de tu dispositivo cuando no la uses para proteger tu privacidad.",
    image: "/assets/generated/card-d09-camera.dim_400x560.png",
    effectTag: "camera_cover",
  },
  {
    id: "d10",
    name: "Contraseña Robusta",
    type: "defense",
    description:
      "Bloquea ataques de Fuerza Bruta (brute_force). Sinergia con Pudú.",
    didacticText:
      "Contraseña Robusta: Usa símbolos, números, mayúsculas y minúsculas. ¡Mínimo 12 caracteres!",
    image: "/assets/generated/card-d10-robust-pass.dim_400x560.png",
    effectTag: "robust_password",
  },
  {
    id: "d11",
    name: "Detección de Phishing",
    type: "defense",
    description:
      "Anula el ataque y lo devuelve al mazo del atacante. Sinergia con Zorro.",
    didacticText:
      "Detecta Phishing: Verifica el remitente, busca errores ortográficos y nunca hagas click en links sospechosos.",
    image: "/assets/generated/card-d11-phishing-detect.dim_400x560.png",
    effectTag: "phishing_detect",
  },
  {
    id: "d12",
    name: "Huella de Barro",
    type: "defense",
    description:
      "Anula el ataque, pero el jugador debe descartar 1 carta de Acción de su mano como costo.",
    didacticText:
      "Huella Digital: Todo lo que subes a internet se queda ahí para siempre.",
    image: "/assets/generated/card-d12-mud-footprint.dim_400x560.png",
    effectTag: "mud_footprint",
  },
];

// ── Action Cards (10) ─────────────────────────────────────────────────────
export const ACTION_CARDS: CardDefinition[] = [
  {
    id: "a01",
    name: "Actualización de Sistema",
    type: "action",
    description: "Todos los jugadores pasan su mano al jugador de la DERECHA.",
    didacticText:
      "Actualiza tu software regularmente para cerrar vulnerabilidades de seguridad.",
    image: "/assets/generated/card-a01-update.dim_400x560.png",
    effectTag: "update_system",
  },
  {
    id: "a02",
    name: "Modo Incógnito",
    type: "action",
    description:
      "Eres inmune a todos los ataques durante 1 ronda completa, pero tampoco puedes atacar.",
    didacticText:
      "El Modo Incógnito no te hace invisible; solo evita que el historial se guarde localmente.",
    image: "/assets/generated/card-a02-incognito.dim_400x560.png",
    effectTag: "incognito",
  },
  {
    id: "a03",
    name: "Copia de Seguridad (Backup)",
    type: "action",
    description: "Recuperas 1 Servidor perdido (lo volteas de dañado a sano).",
    didacticText:
      "Backup: Copia de tus archivos guardada en otro lugar seguro para recuperarlos si los pierdes.",
    image: "/assets/generated/card-a03-backup.dim_400x560.png",
    effectTag: "backup",
  },
  {
    id: "a04",
    name: "Actualización Forzosa",
    type: "action",
    description:
      "Todos los jugadores cambian sus manos al jugador de la IZQUIERDA.",
    didacticText:
      "A veces los cambios son necesarios aunque sean incómodos. ¡Adaptarse es sobrevivir!",
    image: "/assets/generated/card-a04-force-update.dim_400x560.png",
    effectTag: "force_update",
  },
  {
    id: "a05",
    name: "Reportar Usuario",
    type: "action",
    description:
      "Elige un Villano del descarte o en juego y elimínalo del juego permanentemente.",
    didacticText:
      "Reportar: Usa las herramientas de las plataformas para reportar contenido dañino o usuarios abusivos.",
    image: "/assets/generated/card-a05-report.dim_400x560.png",
    effectTag: "report_user",
  },
  {
    id: "a06",
    name: "Llamada al Admin",
    type: "action",
    description:
      "Obliga a un oponente a descartar 1 carta a tu elección (si conoces su mano) o al azar.",
    didacticText:
      "Administrador: Persona con máximos privilegios que puede resolver problemas críticos del sistema.",
    image: "/assets/generated/card-a06-admin.dim_400x560.png",
    effectTag: "call_admin",
  },
  {
    id: "a07",
    name: "Análisis de Vulnerabilidades",
    type: "action",
    description: "Mira las 3 primeras cartas del mazo y decide su nuevo orden.",
    didacticText:
      "Análisis de Vulnerabilidades: Proceso de identificar debilidades en un sistema antes de que las exploten.",
    image: "/assets/generated/card-a07-analysis.dim_400x560.png",
    effectTag: "vulnerability_analysis",
  },
  {
    id: "a08",
    name: "Amigo de Confianza",
    type: "action",
    description:
      "Roba 2 cartas extra, pero debes mostrar tu mano a todos los jugadores.",
    didacticText:
      "Comparte información solo con personas de confianza verificada, no con desconocidos de internet.",
    image: "/assets/generated/card-a08-trusted-friend.dim_400x560.png",
    effectTag: "trusted_friend",
  },
  {
    id: "a09",
    name: "Firewall de Agua",
    type: "action",
    description:
      "Durante tu próximo turno, si eres atacado, el atacante pierde 1 carta de su mano.",
    didacticText:
      "Defensa en capas: combinar múltiples medidas de seguridad es más efectivo que una sola.",
    image: "/assets/generated/card-a09-water-firewall.dim_400x560.png",
    effectTag: "water_firewall",
  },
  {
    id: "a10",
    name: "Monitoreo de Privacidad",
    type: "action",
    description:
      "El siguiente ataque recibido tiene su poder reducido a la mitad (redondeando hacia abajo).",
    didacticText:
      "Monitoreo continuo: revisa regularmente la configuración de privacidad de tus cuentas.",
    image: "/assets/generated/card-a10-privacy-monitor.dim_400x560.png",
    effectTag: "privacy_monitor",
  },
];

// ── Full deck (36 cards) ───────────────────────────────────────────────────
export const ALL_CARDS: CardDefinition[] = [
  ...VILLAIN_CARDS,
  ...DEFENSE_CARDS,
  ...ACTION_CARDS,
];

export function getCardById(id: string): CardDefinition | undefined {
  return ALL_CARDS.find((c) => c.id === id);
}
