// ─── ServerTokens Component ──────────────────────────────────────────────────
// Displays the 5 server (life) tokens as illustrated server images.

import type React from "react";
import { useEffect, useState } from "react";
import type { ServerToken } from "../../game/gameTypes";

interface ServerTokensProps {
  servers: ServerToken[];
  size?: "sm" | "md" | "opponent";
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
          <ServerBlock
            key={server.index}
            server={server}
            size={size as "sm" | "md" | "opponent"}
          />
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
  size: "sm" | "md" | "opponent";
}) {
  const [exploding, setExploding] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [prevStatus, setPrevStatus] = useState(server.status);

  useEffect(() => {
    if (prevStatus === "healthy" && server.status === "damaged") {
      setExploding(true);
      const timer = setTimeout(() => setExploding(false), 700);
      setPrevStatus(server.status);
      return () => clearTimeout(timer);
    }
    if (prevStatus === "damaged" && server.status === "healthy") {
      setRestoring(true);
      const timer = setTimeout(() => setRestoring(false), 600);
      setPrevStatus(server.status);
      return () => clearTimeout(timer);
    }
    if (prevStatus !== server.status) {
      setPrevStatus(server.status);
    }
  }, [server.status, prevStatus]);

  // Dimensions
  const w = size === "sm" ? 28 : size === "opponent" ? 34 : 40;
  const h = size === "sm" ? 38 : size === "opponent" ? 48 : 54;
  const labelText = `SRV-${server.index + 1}`;
  const labelStyle: React.CSSProperties = {
    fontSize: size === "sm" ? 6 : size === "opponent" ? 6.5 : 7,
    letterSpacing: "0.05em",
    fontFamily: "monospace",
  };

  // Image source and glow based on status
  let imgSrc = "/assets/generated/server-healthy.dim_120x160.png";
  let glowColor = "oklch(0.75 0.25 145 / 0.5)";
  let statusColor = "oklch(0.55 0.08 145)";
  let extraClass = "";

  if (server.status === "damaged") {
    imgSrc = "/assets/generated/server-damaged.dim_120x160.png";
    glowColor = "oklch(0.65 0.28 20 / 0.7)";
    statusColor = "oklch(0.65 0.28 20)";
    extraClass = exploding ? "server-explode" : "server-sparking";
  } else if (server.status === "lost") {
    imgSrc = "/assets/generated/server-destroyed.dim_120x160.png";
    glowColor = "transparent";
    statusColor = "oklch(0.3 0.02 240)";
    extraClass = "";
  } else {
    // healthy
    extraClass = restoring ? "server-restoring" : "";
  }

  return (
    <div
      className="flex flex-col items-center gap-0.5"
      style={{ opacity: server.status === "lost" ? 0.35 : 1 }}
    >
      <div
        title={`${labelText} — ${server.status === "healthy" ? "Activo" : server.status === "damaged" ? "Dañado" : "Destruido"}`}
        className={`relative rounded overflow-hidden flex-shrink-0 ${extraClass}`}
        style={{
          width: w,
          height: h,
          boxShadow:
            server.status !== "lost"
              ? `0 0 8px ${glowColor}, 0 0 3px ${glowColor}`
              : undefined,
          border:
            server.status === "healthy"
              ? "1.5px solid oklch(0.55 0.15 145 / 0.7)"
              : server.status === "damaged"
                ? "1.5px solid oklch(0.55 0.25 20 / 0.8)"
                : "1.5px solid oklch(0.2 0.02 240 / 0.5)",
          transition: "box-shadow 0.3s",
        }}
      >
        <img
          src={imgSrc}
          alt={labelText}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            objectPosition: "center",
            display: "block",
          }}
          loading="lazy"
        />

        {/* Sparks overlay for damaged state */}
        {server.status === "damaged" && !exploding && (
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background:
                "radial-gradient(circle at 30% 60%, oklch(0.85 0.28 65 / 0.2) 0%, transparent 40%), radial-gradient(circle at 70% 30%, oklch(0.65 0.28 20 / 0.25) 0%, transparent 35%)",
              animation: "server-spark 2s ease-in-out infinite",
            }}
          />
        )}

        {/* Restore flash overlay */}
        {restoring && (
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background: "oklch(0.75 0.25 145 / 0.35)",
              animation: "server-restore-flash 0.6s ease-out forwards",
            }}
          />
        )}
      </div>
      <span style={{ ...labelStyle, color: statusColor }}>{labelText}</span>
    </div>
  );
}
