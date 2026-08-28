"use client";

import { useCallback, useEffect, useReducer } from "react";
import { CodeEditor } from "@/components/learning/CodeEditor";
import { CompareView } from "@/components/learning/CompareView";
import { ExecutionTrace } from "@/components/learning/ExecutionTrace";
import {
  LoopProgress,
  UnitProgress,
} from "@/components/learning/LessonProgress";
import { MisconceptionView } from "@/components/learning/MisconceptionView";
import {
  CompletePanel,
  UnderstoodPanel,
} from "@/components/learning/OutcomePanel";
import { PredictionPanel } from "@/components/learning/PredictionPanel";
import { ProgramState } from "@/components/learning/ProgramState";
import { TeacherIntervention } from "@/components/learning/TeacherIntervention";
import { Card, CardBody } from "@/components/ui/Card";
import { useMentalModel } from "@/lib/mental-model";
import {
  currentStepOf,
  initSession,
  isLastStep,
  sessionReducer,
} from "@/lib/session";
import { useSettings } from "@/lib/settings";
import { teacher } from "@/lib/teacher";
import type { TeacherOption } from "@/lib/types";
import { getLesson } from "@/mock/lessons";

/**
 * Drives one pass of CODE → PREDICT → EXECUTE → COMPARE → UNDERSTAND → RETRY.
 *
 * All session state lives in one reducer (`lib/session.ts`) so the phase is
 * always well defined and every phase has a forward action — the student can
 * never land somewhere with no way on.
 */
export function LearnSession({ lessonId }: { lessonId: string }) {
  const { settings } = useSettings();
  const { applyUpdates } = useMentalModel();
  const [state, dispatch] = useReducer(
    sessionReducer,
    getLesson(lessonId),
    initSession,
  );

  const { lesson, phase, diagnosis, prediction } = state;
  const step = currentStepOf(state);
  const atEnd = isLastStep(state);

  // If the route's lesson changes, restart the session on it.
  useEffect(() => {
    dispatch({ type: "start", lesson: getLesson(lessonId), attempt: 1 });
  }, [lessonId]);

  const submitPrediction = useCallback(
    async (value: string) => {
      dispatch({ type: "submitPrediction", prediction: value });
      const result = await teacher.diagnose({
        lesson: state.lesson,
        prediction: value,
        attempt: state.attempt,
      });
      dispatch({ type: "diagnosed", diagnosis: result });
      if (settings.autoRunAfterPrediction) dispatch({ type: "beginExecution" });
    },
    [state.lesson, state.attempt, settings.autoRunAfterPrediction],
  );

  const selectOption = useCallback(
    async (option: TeacherOption) => {
      if (!diagnosis?.question) return;
      dispatch({ type: "selectOption", option });
      const evaluation = await teacher.evaluate({
        question: diagnosis.question,
        option,
        hintsRevealed: state.hintsRevealed,
      });
      dispatch({ type: "evaluated", evaluation });
    },
    [diagnosis, state.hintsRevealed],
  );

  const afterComparison = useCallback(() => {
    if (diagnosis?.comparison.matches) {
      applyUpdates(diagnosis.conceptUpdates);
      dispatch({ type: "finish" });
    } else {
      dispatch({ type: "showDiagnosis" });
    }
  }, [diagnosis, applyUpdates]);

  const startRetest = useCallback(() => {
    const retestId = diagnosis?.retestLessonId;
    dispatch({
      type: "start",
      lesson: retestId ? getLesson(retestId) : state.lesson,
      attempt: state.attempt + 1,
      resolvedMisconceptionLabel: diagnosis?.misconception?.label ?? null,
    });
  }, [diagnosis, state.lesson, state.attempt]);

  // Keyboard stepping — this is a debugger, so arrow keys should work.
  useEffect(() => {
    if (phase !== "executing") return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") dispatch({ type: "nextStep" });
      if (e.key === "ArrowLeft") dispatch({ type: "previousStep" });
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [phase]);

  const showState =
    phase === "executing" || phase === "compare" || phase === "diagnose";
  const focusLine =
    phase === "teach" && settings.teachingStyle === "guided"
      ? diagnosis?.question?.focusLine
      : undefined;

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="label-caps mb-1.5">{lesson.track}</div>
          <h1 className="text-[19px] font-medium leading-tight tracking-[-0.01em] text-fg">
            {lesson.unit}
          </h1>
        </div>
        <UnitProgress index={lesson.index} total={lesson.total} />
      </header>

      <div className="border-y border-line py-2.5">
        <LoopProgress phase={phase} />
      </div>

      {phase === "predict" && (
        <p className="text-[15px] leading-relaxed text-fg">
          Before you run the code, predict what happens.
        </p>
      )}

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-4">
          {/* Fixed minimum height so the workspace doesn't resize between
              phases as lessons of different lengths load. */}
          <CodeEditor
            code={lesson.code}
            activeLine={showState ? step?.line : undefined}
            focusLine={focusLine}
            className="lg:min-h-[336px]"
          />

          {phase === "executing" && (
            <ExecutionTrace
              steps={lesson.steps}
              currentStep={state.currentStep}
              atEnd={atEnd}
              onStepTo={(index) => dispatch({ type: "stepTo", index })}
              onNext={() => dispatch({ type: "nextStep" })}
              onPrevious={() => dispatch({ type: "previousStep" })}
              onRunToEnd={() => dispatch({ type: "runToEnd" })}
              onFinish={() => dispatch({ type: "showComparison" })}
            />
          )}
        </div>

        <div className="space-y-4">
          {(phase === "predict" || phase === "predicted") && (
            <PredictionPanel
              prompt={lesson.predictionPrompt}
              target={lesson.predictionTarget}
              prediction={prediction}
              attempt={state.attempt}
              onSubmit={submitPrediction}
              onExecute={() => dispatch({ type: "beginExecution" })}
            />
          )}

          {showState && <ProgramState step={step} />}

          {(phase === "teach" ||
            phase === "understood" ||
            phase === "complete") && (
            <Card>
              <CardBody className="space-y-3">
                <div className="label-caps">Your prediction</div>
                <div className="flex items-baseline justify-between gap-4">
                  <span className="font-mono text-[13px] text-fg-muted">
                    {lesson.predictionTarget}
                  </span>
                  <span className="numeric font-mono text-2xl text-fg-muted line-through decoration-fg-subtle/40">
                    {prediction}
                  </span>
                </div>
                <div className="flex items-baseline justify-between gap-4 border-t border-line pt-3">
                  <span className="text-[12px] text-fg-subtle">Actual</span>
                  <span className="numeric font-mono text-2xl text-fg">
                    {lesson.actual}
                  </span>
                </div>
              </CardBody>
            </Card>
          )}
        </div>
      </div>

      {phase === "compare" && diagnosis && (
        <CompareView
          comparison={diagnosis.comparison}
          onContinue={afterComparison}
        />
      )}

      {phase === "diagnose" && diagnosis?.misconception && (
        <MisconceptionView
          misconception={diagnosis.misconception}
          lessonId={lesson.id}
          confidence={diagnosis.confidence}
          nameMisconception={settings.showMisconceptions === "immediately"}
          onContinue={() => dispatch({ type: "showQuestion" })}
        />
      )}

      {phase === "teach" && diagnosis?.question && (
        <TeacherIntervention
          question={diagnosis.question}
          misconception={diagnosis.misconception}
          confidence={diagnosis.confidence}
          selectedOption={state.selectedOption}
          evaluation={state.evaluation}
          hintsRevealed={state.hintsRevealed}
          pending={state.pending}
          onSelect={selectOption}
          onRetry={() => dispatch({ type: "clearSelection" })}
          onRevealHint={() => dispatch({ type: "revealHint" })}
          onContinue={() => dispatch({ type: "acknowledgeUnderstanding" })}
        />
      )}

      {phase === "understood" && (
        <UnderstoodPanel
          misconceptionLabel={diagnosis?.misconception?.label ?? null}
          hasRetest={Boolean(diagnosis?.retestLessonId)}
          onRetest={startRetest}
        />
      )}

      {phase === "complete" && diagnosis && (
        <CompletePanel
          updates={diagnosis.conceptUpdates}
          resolvedMisconceptionLabel={state.resolvedMisconceptionLabel}
          predictionAccuracy={state.attempt > 1 ? 0.5 : 1}
          onRestart={() =>
            dispatch({ type: "start", lesson: getLesson(lessonId), attempt: 1 })
          }
        />
      )}
    </div>
  );
}
