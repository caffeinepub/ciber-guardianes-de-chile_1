// ─── CombatLog Component ─────────────────────────────────────────────────────
// Scrollable log of game events, color-coded by type.

import { ScrollArea } from "@/components/ui/scroll-area";
import React, { useEffect, useRef } from "react";
import type { GameLogEntry } from "../../game/gameTypes";

interface CombatLogProps {
  entries: GameLogEntry[];
}

const TYPE_COLORS: Record<GameLogEntry["type"], string> = {
  attack: "text-red-400",
  defense: "text-blue-400",
  action: "text-yellow-400",
  heal: "text-primary",
  system: "text-muted-foreground",
  eliminate: "text-orange-400 font-bold",
};

export default function CombatLog({ entries }: CombatLogProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  // biome-ignore lint/correctness/useExhaustiveDependencies: scroll on new entry count
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [entries.length]);

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-1.5 px-2 py-1 border-b border-border">
        <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
        <span className="text-[9px] text-muted-foreground uppercase tracking-widest">
          Log de Combate
        </span>
      </div>
      <ScrollArea className="flex-1">
        <div className="flex flex-col-reverse px-2 py-1 gap-0.5">
          {entries.map((entry) => (
            <div key={entry.id} className="animate-float-in">
              <p
                className={`text-[9px] leading-tight ${TYPE_COLORS[entry.type]}`}
              >
                {entry.message}
              </p>
            </div>
          ))}
          <div ref={bottomRef} />
        </div>
      </ScrollArea>
    </div>
  );
}
