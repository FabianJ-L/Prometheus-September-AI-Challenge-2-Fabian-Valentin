"use client";

import { useState } from "react";
import { Check, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { STARTER_PREDICTION_PROMPT, extractStarterActual } from "@/mock/starter-project";
import { evaluatePrediction } from "@/lib/prediction";
import { cn } from "@/lib/utils";
import { useWorkspace } from "@/lib/workspace";
import { getWorkspaceService } from "@/lib/workspace-service";

/**
 * The commitment step, compressed into one strip above the run bar. A
 * student cannot run until they have written down what they believe will
 * happen — that written belief is what `## Student's prediction` in the AI
 * context block and the compare row below are built on.
 *
 * Three states, driven entirely by `state.prediction` / `state.lastTrace`:
 * not yet predicted, predicted-but-not-run, and predicted-and-compared.
 */
export function PredictionBar() {
  const { state, dispatch } = useWorkspace();
  const { prediction, lastTrace } = state;
  const [draft, setDraft] = useState("");

  const actualValue = lastTrace ? extractStarterActual(lastTrace) : null;
  const comparison = evaluatePrediction(prediction, actualValue);

  const askWhy = () => {
    getWorkspaceService().ask("Meine Vorhersage war falsch — warum?", null, state);
  };

  if (prediction === null) {
    return (
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (draft.trim()) {
            dispatch({ type: "SUBMIT_PREDICTION", value: draft });
            setDraft("");
          }
        }}
        className="flex h-full items-center gap-2 px-3"
      >
        <span className="shrink-0 text-[12px] text-fg-muted">{STARTER_PREDICTION_PROMPT}</span>
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          aria-label="Vorhergesagte Ausgabe"
          placeholder="?"
          className="h-7 min-w-0 flex-1 rounded border border-line bg-bg px-2 font-mono text-[12.5px] text-fg outline-none focus:border-accent"
        />
        <Button type="submit" size="sm" variant="primary" disabled={!draft.trim()}>
          Vorhersage abschicken
        </Button>
      </form>
    );
  }

  if (comparison === null) {
    return (
      <div className="flex h-full items-center gap-3 px-3">
        <span className="text-[12px] text-fg-muted">
          {prediction.target}: <span className="font-mono text-fg">{prediction.value}</span>
        </span>
        <span className="text-2xs text-fg-subtle">Vorhersage vorgemerkt — jetzt Run drücken.</span>
        <Button
          size="sm"
          variant="ghost"
          className="ml-auto"
          onClick={() => dispatch({ type: "RESET_PREDICTION" })}
        >
          Ändern
        </Button>
      </div>
    );
  }

  const { matches, predicted, actual } = comparison;

  return (
    <div className="flex h-full items-center gap-3 px-3">
      <span
        className={cn(
          "flex h-5 w-5 shrink-0 items-center justify-center rounded-full",
          matches ? "bg-success/15 text-success" : "bg-danger/15 text-danger",
        )}
      >
        {matches ? <Check size={12} aria-hidden /> : <X size={12} aria-hidden />}
      </span>
      <span className="text-[12px] text-fg-muted">
        Deine Vorhersage: <span className="font-mono text-fg">{predicted}</span>
      </span>
      <span className="text-[12px] text-fg-muted">
        Tatsächlich: <span className="font-mono text-fg">{actual}</span>
      </span>
      <span className={cn("text-2xs font-medium", matches ? "text-success" : "text-danger")}>
        {matches ? "Modell bestätigt" : "Mentales Modell weicht ab"}
      </span>
      <div className="ml-auto flex items-center gap-1.5">
        {!matches && (
          <Button size="sm" variant="secondary" onClick={askWhy}>
            Frag NOESIS warum
          </Button>
        )}
        <Button size="sm" variant="ghost" onClick={() => dispatch({ type: "RESET_PREDICTION" })}>
          Neue Vorhersage
        </Button>
      </div>
    </div>
  );
}
