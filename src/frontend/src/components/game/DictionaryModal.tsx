// ─── DictionaryModal Component ───────────────────────────────────────────────
// "Regla del Saber" popup: show didactic definition, player confirms aloud.

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { BookOpen, Volume2 } from "lucide-react";
import React from "react";
import type { CardDefinition } from "../../game/gameTypes";

interface DictionaryModalProps {
  card: CardDefinition | null;
  onConfirm: () => void;
  onSkip: () => void;
}

export default function DictionaryModal({
  card,
  onConfirm,
  onSkip,
}: DictionaryModalProps) {
  if (!card) return null;

  return (
    <Dialog open={!!card}>
      <DialogContent
        className="max-w-xs border-primary/40 bg-card"
        onPointerDownOutside={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <div className="flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-primary" />
            <DialogTitle className="text-sm neon-text-green font-display">
              Regla del Saber
            </DialogTitle>
          </div>
        </DialogHeader>

        <div className="space-y-3">
          <div className="rounded-lg bg-background/60 border border-border p-3">
            <p className="text-xs font-bold text-foreground mb-1">
              {card.name}
            </p>
            <p className="text-xs text-foreground/70 leading-relaxed">
              {card.description}
            </p>
          </div>

          {card.didacticText && (
            <div className="rounded-lg bg-primary/10 border border-primary/30 p-3">
              <div className="flex items-center gap-1.5 mb-1.5">
                <Volume2 className="w-3 h-3 text-primary" />
                <span className="text-[10px] text-primary uppercase tracking-wide font-bold">
                  Lee en voz alta:
                </span>
              </div>
              <p className="text-xs text-foreground/90 italic leading-relaxed">
                "{card.didacticText}"
              </p>
            </div>
          )}

          <p className="text-[10px] text-muted-foreground text-center">
            Si lees la definición en voz alta, ¡tu carta gana +1 de poder o
            robas 1 carta extra!
          </p>
        </div>

        <DialogFooter className="flex gap-2 sm:flex-row">
          <Button
            variant="outline"
            size="sm"
            onClick={onSkip}
            className="flex-1 text-xs border-border"
            data-ocid="game.cancel_saber_button"
          >
            Saltar
          </Button>
          <Button
            size="sm"
            onClick={onConfirm}
            className="flex-1 text-xs bg-primary text-primary-foreground"
            data-ocid="game.confirm_saber_button"
          >
            ✅ Lo leí en voz alta
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
