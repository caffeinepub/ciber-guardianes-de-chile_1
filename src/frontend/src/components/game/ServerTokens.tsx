// ─── ServerTokens Component ──────────────────────────────────────────────────
// Displays the 5 server (life) tokens as mini rack server blocks.

import type React from "react";
import { useEffect, useState } from "react";
import type { ServerToken } from "../../game/gameTypes";

interface ServerTokensProps {
  servers: ServerToken[];
  size?: "sm" | "md";
  label?: boolean;
}

export default function ServerTokens({
  servers,
  size = "md",
  label = false,
}: ServerTokensProps) {
  return (
    <div className="flex flex-col items-center gap-1">
      {label && (
        <span className="text-[9px] text-muted-foreground uppercase tracking-widest">
          Servidores
        </span>
      )}
      <div className="flex gap-1 items-end">
        {servers.map((server) => (
          <ServerBlock key={server.index} server={server} size={size} />
        ))}
      </div>
    </div>
  );
}

function ServerBlock({
  server,
  size,
}: {
  server: ServerToken;
  size: "sm" | "md";
}) {
  const [exploding, setExploding] = useState(false);
  const [prevStatus, setPrevStatus] = useState(server.status);

  useEffect(() => {
    if (prevStatus === "healthy" && server.status === "damaged") {
      setExploding(true);
      const timer = setTimeout(() => setExploding(false), 700);
      setPrevStatus(server.status);
      return () => clearTimeout(timer);
    }
    if (prevStatus !== server.status) {
      setPrevStatus(server.status);
    }
  }, [server.status, prevStatus]);

  const w = size === "sm" ? 24 : 32;
  const h = size === "sm" ? 14 : 20;
  const label = `SRV-${server.index + 1}`;
  const labelStyle: React.CSSProperties = {
    fontSize: size === "sm" ? 6 : 7,
    letterSpacing: "0.05em",
    fontFamily: "monospace",
  };

  if (server.status === "healthy") {
    return (
      <div className="flex flex-col items-center gap-0.5">
        <div
          title={`${label} — Activo`}
          style={{ width: w, height: h }}
          className={`relative rounded-sm overflow-hidden${exploding ? " server-explode" : ""}`}
        >
          {/* Body gradient */}
          <div
            className="absolute inset-0 rounded-sm"
            style={{
              background:
                "linear-gradient(180deg, oklch(0.18 0.04 240) 0%, oklch(0.12 0.03 240) 100%)",
              boxShadow:
                "0 0 6px oklch(0.75 0.25 145 / 0.4), inset 0 1px 0 oklch(0.3 0.05 240)",
            }}
          />
          {/* Green LED strip */}
          <div
            className="absolute top-0 left-0 right-0"
            style={{
              height: 3,
              background: "oklch(0.75 0.25 145)",
              boxShadow:
                "0 0 6px oklch(0.75 0.25 145), 0 0 12px oklch(0.75 0.25 145 / 0.5)",
            }}
          />
          {/* Blinking green dot */}
          <div
            className="absolute"
            style={{
              width: 3,
              height: 3,
              right: 3,
              top: "50%",
              transform: "translateY(-50%)",
              borderRadius: "50%",
              background: "oklch(0.75 0.25 145)",
              animation: "server-led-blink 1.4s ease-in-out infinite",
              boxShadow: "0 0 4px oklch(0.75 0.25 145)",
            }}
          />
          {/* Vent lines */}
          {[0.5, 0.72].map((y) => (
            <div
              key={y}
              className="absolute left-1 right-3"
              style={{
                height: 1,
                top: `${y * 100}%`,
                background: "oklch(0.3 0.04 240 / 0.6)",
              }}
            />
          ))}
        </div>
        <span style={{ ...labelStyle, color: "oklch(0.55 0.08 145)" }}>
          {label}
        </span>
      </div>
    );
  }

  if (server.status === "damaged") {
    return (
      <div className="flex flex-col items-center gap-0.5">
        <div
          title={`${label} — Dañado`}
          style={{ width: w, height: h }}
          className={`relative rounded-sm overflow-hidden${exploding ? " server-explode" : ""}`}
        >
          {/* Red body */}
          <div
            className="absolute inset-0 rounded-sm"
            style={{
              background:
                "linear-gradient(180deg, oklch(0.15 0.06 20) 0%, oklch(0.1 0.04 20) 100%)",
              boxShadow:
                "0 0 8px oklch(0.65 0.28 20 / 0.5), inset 0 1px 0 oklch(0.25 0.08 20)",
            }}
          />
          {/* Red LED strip */}
          <div
            className="absolute top-0 left-0 right-0"
            style={{
              height: 3,
              background: "oklch(0.65 0.28 20)",
              boxShadow:
                "0 0 6px oklch(0.65 0.28 20), 0 0 14px oklch(0.65 0.28 20 / 0.7)",
            }}
          />
          {/* Flickering red dot */}
          <div
            className="absolute"
            style={{
              width: 3,
              height: 3,
              right: 3,
              top: "50%",
              transform: "translateY(-50%)",
              borderRadius: "50%",
              background: "oklch(0.7 0.28 20)",
              animation: "server-led-blink 0.3s ease-in-out infinite",
              boxShadow: "0 0 5px oklch(0.7 0.28 20)",
            }}
          />
          {/* Crack pattern */}
          <div
            className="absolute inset-0"
            style={{
              background:
                "repeating-linear-gradient(-45deg, transparent, transparent 2px, oklch(0.65 0.28 20 / 0.08) 2px, oklch(0.65 0.28 20 / 0.08) 3px)",
            }}
          />
        </div>
        <span style={{ ...labelStyle, color: "oklch(0.65 0.28 20)" }}>
          {label}
        </span>
      </div>
    );
  }

  // Lost (destroyed)
  return (
    <div className="flex flex-col items-center gap-0.5 opacity-25">
      <div
        title={`${label} — Destruido`}
        style={{ width: w, height: h }}
        className="relative rounded-sm overflow-hidden"
      >
        <div
          className="absolute inset-0 rounded-sm"
          style={{
            background:
              "linear-gradient(180deg, oklch(0.1 0.01 240) 0%, oklch(0.07 0.01 240) 100%)",
          }}
        />
        <div
          className="absolute top-0 left-0 right-0"
          style={{ height: 3, background: "oklch(0.15 0.01 240)" }}
        />
      </div>
      <span style={{ ...labelStyle, color: "oklch(0.3 0.02 240)" }}>
        {label}
      </span>
    </div>
  );
}
