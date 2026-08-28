"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { api, openLoopSocket, type LoopEvent } from "@/lib/api";
import { Bar, Panel } from "@/components/ui";
import type { Lesson, SessionState, TraceStep } from "@/lib/types";

export default function LearnPage() {
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [session, setSession] = useState<SessionState | null>(null);
  const [steps, setSteps] = useState<TraceStep[]>([]);
  const [cursor, setCursor] = useState(0);
  const [prediction, setPrediction] = useState("");
  const [answer, setAnswer] = useState("");
  const [error, setError] = useState<string | null>(null);

  const socket = useRef<ReturnType<typeof openLoopSocket> | null>(null);

  const onEvent = useCallback((e: LoopEvent) => {
    if (e.type === "session") {
      setSession(e.payload);
      if (e.payload.trace) {
        setSteps(e.payload.trace.steps);
        setCursor(e.payload.trace.steps.length);
      }
    } else if (e.type === "step") {
      setSteps((prev) => [...prev, e.payload]);
      setCursor((c) => c + 1);
    } else if (e.type === "error") {
      setError(e.payload.message);
    }
  }, []);

  useEffect(() => {
    api.listLessons().then((ls) => {
      setLessons(ls);
      setLesson(ls[0] ?? null);
    }).catch((err) => setError(String(err)));
  }, []);

  useEffect(() => {
    if (!lesson) return;
    setSession(null);
    setSteps([]);
    setCursor(0);
    setPrediction("");
    setError(null);
    socket.current?.close();
    const s = openLoopSocket(onEvent);
    s.send("start", { lesson_id: lesson.id });
    socket.current = s;
    return () => s.close();
  }, [lesson, onEvent]);

  const phase = session?.phase ?? "predict";
  const check = session?.diagnostic?.prediction_check;
  const visibleSteps = steps.slice(0, cursor);
  const currentStep = visibleSteps[visibleSteps.length - 1];

  const submitPrediction = () => {
    setSteps([]);
    setCursor(0);
    socket.current?.send("prediction", { answer: prediction });
  };

  return (
    <div className="mx-auto max-w-5xl px-8 py-10">
      <header className="flex items-end justify-between">
        <div>
          <div className="text-xs uppercase tracking-widest text-muted">{lesson?.track}</div>
          <h1 className="mt-1 text-xl text-fg">{lesson?.unit}</h1>
        </div>
        <select
          className="rounded border border-line bg-ink-800 px-2 py-1 text-sm text-fg"
          value={lesson?.id ?? ""}
          onChange={(e) => setLesson(lessons.find((l) => l.id === e.target.value) ?? null)}
        >
          {lessons.map((l) => (
            <option key={l.id} value={l.id}>
              {l.title}
            </option>
          ))}
        </select>
      </header>

      <div className="mt-2 flex items-center gap-2 text-xs text-muted">
        <PhaseDot label="predict" phase={phase} />
        <PhaseDot label="execute" phase={phase} />
        <PhaseDot label="compare" phase={phase} />
        <PhaseDot label="understand" phase={phase} />
        <PhaseDot label="retry" phase={phase} />
        {session?.diagnostic?.mock && (
          <span className="ml-2 rounded bg-ink-700 px-2 py-0.5 text-[11px]">mock AI</span>
        )}
      </div>

      {error && (
        <div className="mt-4 rounded border border-diverge/40 bg-diverge/10 p-3 text-sm text-diverge">{error}</div>
      )}

      <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
        <Panel title="Code">
          <pre className="overflow-x-auto font-mono text-[13px] leading-6 text-fg">
            {(lesson?.starter_code ?? "").split("\n").map((line, i) => {
              const active = currentStep?.line === i + 1;
              return (
                <div
                  key={i}
                  className={active ? "-mx-2 rounded bg-accent-soft px-2" : "px-2"}
                >
                  <span className="mr-4 select-none text-muted">{String(i + 1).padStart(2, " ")}</span>
                  {line || " "}
                </div>
              );
            })}
          </pre>
        </Panel>

        <Panel title="Program state">
          {visibleSteps.length === 0 ? (
            <p className="text-sm text-muted">
              {phase === "predict"
                ? "Submit a prediction to run the code step by step."
                : "Running…"}
            </p>
          ) : (
            <StateView step={currentStep} />
          )}
        </Panel>
      </div>

      {/* --- prediction --- */}
      {(phase === "predict" || phase === "retry") && (
        <Panel className="mt-4" title="Your prediction">
          <p className="text-sm text-muted">{lesson?.prediction_prompt}</p>
          <div className="mt-3 flex gap-2">
            <input
              autoFocus
              value={prediction}
              onChange={(e) => setPrediction(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && prediction && submitPrediction()}
              placeholder={
                lesson?.prediction_kind === "output" ? "predicted output" : `value of ${lesson?.prediction_target ?? "result"}`
              }
              className="w-56 rounded border border-line bg-ink-900 px-3 py-2 font-mono text-sm text-fg outline-none focus:border-accent"
            />
            <button
              onClick={submitPrediction}
              disabled={!prediction}
              className="rounded bg-accent px-4 py-2 text-sm font-medium text-ink-900 disabled:opacity-40"
            >
              Submit prediction
            </button>
          </div>
        </Panel>
      )}

      {/* --- compare --- */}
      {check && (
        <Panel className="mt-4" title="Prediction vs reality">
          <div className="grid grid-cols-[auto_1fr_1fr] gap-x-8 gap-y-2 font-mono text-sm">
            <span />
            <span className="text-muted">your model</span>
            <span className="text-muted">actual</span>
            <span className="text-muted">{lesson?.prediction_target ?? "output"}</span>
            <span className="text-fg">{String(check.predicted)}</span>
            <span className={check.matches ? "text-ok" : "text-diverge"}>{String(check.actual)}</span>
          </div>
          <div className={`mt-4 text-sm font-medium ${check.matches ? "text-ok" : "text-diverge"}`}>
            {check.matches ? "✓ Model confirmed" : "✕ Your mental model diverged"}
          </div>
        </Panel>
      )}

      {/* --- understand --- */}
      {session && session.turns.length > 0 && phase !== "done" && (
        <Panel className="mt-4" title="NOESIS">
          {session.diagnostic?.misconception && (
            <div className="mb-3 rounded border border-line bg-ink-900 px-3 py-2 text-xs text-muted">
              likely gap: <span className="text-fg">{session.diagnostic.misconception.label}</span>
            </div>
          )}
          <div className="space-y-2">
            {session.turns.map((t, i) => (
              <p
                key={i}
                className={t.role === "student" ? "text-sm text-muted" : "text-sm text-fg"}
              >
                {t.role === "student" ? "you: " : ""}
                {t.text}
              </p>
            ))}
          </div>

          {phase === "understand" && (
            <div className="mt-3 flex gap-2">
              <input
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && answer) {
                    socket.current?.send("answer", { text: answer });
                    setAnswer("");
                  }
                }}
                placeholder="your reasoning…"
                className="flex-1 rounded border border-line bg-ink-900 px-3 py-2 text-sm text-fg outline-none focus:border-accent"
              />
              <button
                onClick={() => {
                  socket.current?.send("answer", { text: answer });
                  setAnswer("");
                }}
                disabled={!answer}
                className="rounded border border-line px-4 py-2 text-sm text-fg disabled:opacity-40"
              >
                Continue
              </button>
            </div>
          )}
        </Panel>
      )}

      {phase === "done" && check?.matches && (
        <Panel className="mt-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-ok">Concept reinforced.</span>
            <button
              onClick={() => setLesson({ ...(lesson as Lesson) })}
              className="rounded bg-accent px-4 py-2 text-sm font-medium text-ink-900"
            >
              Next attempt
            </button>
          </div>
        </Panel>
      )}

      {session && (
        <ConceptDeltas session={session} />
      )}
    </div>
  );
}

function PhaseDot({ label, phase }: { label: string; phase: string }) {
  const order = ["predict", "execute", "compare", "understand", "retry", "done"];
  const active = phase === label;
  const done = order.indexOf(phase) > order.indexOf(label);
  return (
    <span className={active ? "text-fg" : done ? "text-ok" : "text-muted"}>
      {active ? "●" : "○"} {label}
    </span>
  );
}

function StateView({ step }: { step?: TraceStep }) {
  const entries = useMemo(() => Object.entries(step?.locals ?? {}), [step]);
  return (
    <div className="space-y-2 font-mono text-sm">
      <div className="text-xs text-muted">line {step?.line} · step {step?.step}</div>
      {entries.length === 0 && <div className="text-muted">no bindings yet</div>}
      {entries.map(([k, v]) => (
        <div key={k} className="flex gap-3">
          <span className="text-muted">{k}</span>
          <span className="text-fg">{JSON.stringify(v)}</span>
        </div>
      ))}
      {step?.stdout ? (
        <div className="mt-3 border-t border-line pt-2 text-muted">
          stdout: <span className="text-fg">{step.stdout.trim()}</span>
        </div>
      ) : null}
    </div>
  );
}

function ConceptDeltas({ session }: { session: SessionState }) {
  const states = Object.values(session.concept_states);
  if (states.length === 0) return null;
  return (
    <Panel className="mt-4" title="Mental model (this session)">
      <div className="space-y-2">
        {states
          .sort((a, b) => a.concept_id.localeCompare(b.concept_id))
          .map((s) => (
            <div key={s.concept_id} className="flex items-center gap-3">
              <span className="w-40 text-xs text-muted">{s.concept_id}</span>
              <div className="flex-1">
                <Bar value={s.score} tone={s.score >= 0.8 ? "ok" : s.score < 0.3 ? "diverge" : "accent"} />
              </div>
              <span className="w-10 text-right text-xs text-muted">{Math.round(s.score * 100)}%</span>
            </div>
          ))}
      </div>
    </Panel>
  );
}
