"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { STARTER_PREDICTION_PROMPT } from "@/mock/starter-project";
import { evaluatePrediction } from "@/lib/prediction";
import { useWorkspace } from "@/lib/workspace";
import { getWorkspaceService } from "@/lib/workspace-service";

/**
 * The commitment step, compressed into one strip above the run bar. A
 * student cannot run until they have written down what they believe will
 * happen — that written belief is what `## Student's prediction` in the AI
 * context block is built on.
 *
 * Three states, driven entirely by `state.prediction` / `state.lastTrace`:
 * not yet predicted, predicted-but-not-run, and predicted-and-run. The third
 * state shows the two raw facts side by side and nothing more — whether they
 * "match" is a judgment call left to NOESIS, not decided here (see
 * `lib/prediction.ts`).
 */
export function PredictionBar() {
  const { state, dispatch } = useWorkspace();
  const { prediction, lastTrace } = state;
  const [draft, setDraft] = useState("");

  const comparison = evaluatePrediction(prediction, lastTrace?.stdout ?? null);

  const askNoesis = () => {
    getWorkspaceService().ask("Hat meine Vorhersage gepasst? Und falls nicht, warum?", null, state);
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
          aria-label="Vorhergesagter Wert"
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

  const { predicted, actual } = comparison;

  return (
    <div className="flex h-full items-center gap-3 px-3">
      <span className="min-w-0 truncate text-[12px] text-fg-muted" title={predicted}>
        Deine Vorhersage: <span className="font-mono text-fg">{predicted}</span>
      </span>
      <span className="min-w-0 truncate text-[12px] text-fg-muted" title={actual || "(keine Ausgabe)"}>
        Tatsächlich: <span className="font-mono text-fg">{actual || "(keine Ausgabe)"}</span>
      </span>
      <div className="ml-auto flex shrink-0 items-center gap-1.5">
        <Button size="sm" variant="secondary" onClick={askNoesis}>
          Frag NOESIS
        </Button>
        <Button size="sm" variant="ghost" onClick={() => dispatch({ type: "RESET_PREDICTION" })}>
          Neue Vorhersage
        </Button>
      </div>
    </div>
  );
}
