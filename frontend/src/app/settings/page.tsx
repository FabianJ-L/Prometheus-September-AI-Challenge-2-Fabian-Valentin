"use client";

import { useState } from "react";
import { Check, X } from "lucide-react";
import { Page, PageHeader } from "@/components/layout/PageHeader";
import {
  SettingsNav,
  type SettingsSection,
} from "@/components/layout/SettingsNav";
import { Button } from "@/components/ui/Button";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { RadioGroup, Select, Stepper } from "@/components/ui/Select";
import { SettingRow, Toggle } from "@/components/ui/Toggle";
import { HINT_LEVELS, useSettings, type HintLevel } from "@/lib/settings";
import { useMentalModel } from "@/lib/mental-model";
import { cn } from "@/lib/utils";

export default function SettingsPage() {
  const [section, setSection] = useState<SettingsSection>("general");
  const { settings, update, reset } = useSettings();
  const { reset: resetModel } = useMentalModel();
  const [cleared, setCleared] = useState(false);

  return (
    <Page>
      <PageHeader title="Settings" className="mb-7" />

      <div className="grid gap-6 lg:grid-cols-[168px_minmax(0,1fr)]">
        <SettingsNav active={section} onSelect={setSection} />

        <div className="min-w-0">
          {section === "general" && (
            <Card>
              <CardHeader title="General" />
              <CardBody className="py-1">
                <SettingRow
                  label="Language"
                  control={
                    <Select
                      className="w-40"
                      label="Interface language"
                      value={settings.language}
                      onChange={(v) => update("language", v)}
                      options={[{ value: "English", label: "English" }]}
                    />
                  }
                />
                <SettingRow
                  label="Start page"
                  description="Where NOESIS opens when you launch it."
                  control={
                    <Select
                      className="w-40"
                      label="Start page"
                      value={settings.startPage}
                      onChange={(v) => update("startPage", v)}
                      options={[
                        { value: "continue", label: "Continue learning" },
                        { value: "dashboard", label: "Dashboard" },
                        { value: "practice", label: "Practice" },
                      ]}
                    />
                  }
                />
                <SettingRow
                  label="Confirm before reset"
                  description="Ask before discarding progress or learning data."
                  control={
                    <Toggle
                      label="Confirm before reset"
                      checked={settings.confirmBeforeReset}
                      onChange={(v) => update("confirmBeforeReset", v)}
                    />
                  }
                />
              </CardBody>
            </Card>
          )}

          {section === "appearance" && (
            <div className="space-y-5">
              <Card>
                <CardHeader title="Theme" />
                <CardBody>
                  <RadioGroup
                    name="Theme"
                    value={settings.theme}
                    onChange={(v) => update("theme", v)}
                    options={[
                      { value: "dark", label: "Dark", description: "The designed default." },
                      { value: "light", label: "Light" },
                      { value: "system", label: "System", description: "Follow your OS setting." },
                    ]}
                  />
                </CardBody>
              </Card>

              <Card>
                <CardHeader title="Editor" />
                <CardBody className="py-1">
                  <SettingRow
                    label="Font size"
                    description="Applies to the code viewer and execution trace."
                    control={
                      <Stepper
                        label="Code font size"
                        value={settings.codeFontSize}
                        onChange={(v) => update("codeFontSize", v)}
                        min={11}
                        max={20}
                      />
                    }
                  />
                  <SettingRow
                    label="Line numbers"
                    control={
                      <Toggle
                        label="Line numbers"
                        checked={settings.lineNumbers}
                        onChange={(v) => update("lineNumbers", v)}
                      />
                    }
                  />
                  <SettingRow
                    label="Animations"
                    description="Transitions when execution state changes."
                    control={
                      <Toggle
                        label="Animations"
                        checked={settings.animations}
                        onChange={(v) => update("animations", v)}
                      />
                    }
                  />
                </CardBody>
              </Card>
            </div>
          )}

          {section === "learning" && (
            <div className="space-y-5">
              <Card>
                <CardHeader title="Teaching style" />
                <CardBody>
                  <RadioGroup
                    name="Teaching style"
                    value={settings.teachingStyle}
                    onChange={(v) => update("teachingStyle", v)}
                    options={[
                      {
                        value: "socratic",
                        label: "Socratic",
                        description: "Questions only. No framing, no pointers.",
                      },
                      {
                        value: "guided",
                        label: "Guided",
                        description: "Questions with framing and a pointer to the relevant line.",
                      },
                      {
                        value: "minimal",
                        label: "Minimal hints",
                        description: "Framing without pointers — you locate the line.",
                      },
                    ]}
                  />
                </CardBody>
              </Card>

              <Card>
                <CardHeader title="Diagnosis" />
                <CardBody className="py-1">
                  <SettingRow
                    label="Difficulty adaptation"
                    description="Let NOESIS choose what to test next from your concept model."
                    control={
                      <Toggle
                        label="Difficulty adaptation"
                        checked={settings.difficultyAdaptation}
                        onChange={(v) => update("difficultyAdaptation", v)}
                      />
                    }
                  />
                  <SettingRow
                    label="Prediction mode"
                    control={
                      <Select
                        className="w-44"
                        label="Prediction mode"
                        value={settings.predictionMode}
                        onChange={(v) => update("predictionMode", v)}
                        options={[
                          { value: "always", label: "Always ask" },
                          { value: "relevant", label: "Only when relevant" },
                        ]}
                      />
                    }
                  />
                  <SettingRow
                    label="Show misconceptions"
                    description="Name the gap as soon as it is detected, or hold it until the session summary."
                    control={
                      <Select
                        className="w-44"
                        label="Show misconceptions"
                        value={settings.showMisconceptions}
                        onChange={(v) => update("showMisconceptions", v)}
                        options={[
                          { value: "immediately", label: "Immediately" },
                          { value: "end", label: "At end of session" },
                        ]}
                      />
                    }
                  />
                </CardBody>
              </Card>
            </div>
          )}

          {section === "ai-teacher" && (
            <div className="space-y-5">
              <Card>
                <CardHeader title="Teacher behavior" />
                <CardBody className="py-1">
                  <SettingRow
                    label="Never give me the solution"
                    description="The teacher may not state a corrected answer or write code for you."
                    control={
                      <Toggle
                        label="Never give me the solution"
                        checked={settings.neverGiveSolution}
                        onChange={(v) => update("neverGiveSolution", v)}
                      />
                    }
                  />
                  <SettingRow
                    label="Ask before explaining"
                    description="Probe your reasoning first; explain only after you have answered."
                    control={
                      <Toggle
                        label="Ask before explaining"
                        checked={settings.askBeforeExplaining}
                        onChange={(v) => update("askBeforeExplaining", v)}
                      />
                    }
                  />
                  <SettingRow
                    label="Allow hints"
                    control={
                      <Toggle
                        label="Allow hints"
                        checked={settings.allowHints}
                        onChange={(v) => update("allowHints", v)}
                      />
                    }
                  />
                </CardBody>
              </Card>

              <Card>
                <CardHeader title="Maximum hint level" />
                <CardBody className="space-y-4">
                  <HintLevelSlider
                    value={settings.maxHintLevel}
                    disabled={!settings.allowHints}
                    onChange={(v) => update("maxHintLevel", v)}
                  />
                  <p className="text-[12px] leading-relaxed text-fg-muted">
                    Hints escalate in that order. NOESIS never goes past the level you set here,
                    even if you ask again.
                  </p>
                </CardBody>
              </Card>

              <Card>
                <CardHeader title="Explanation policy" />
                <CardBody className="grid gap-2.5 sm:grid-cols-2">
                  {[
                    "Ask questions",
                    "Point to relevant code",
                    "Explain concepts",
                    "Challenge my assumptions",
                  ].map((item) => (
                    <PolicyRow key={item} allowed label={item} />
                  ))}
                  {["Rewrite my code", "Give complete solutions"].map((item) => (
                    <PolicyRow key={item} allowed={false} label={item} />
                  ))}
                </CardBody>
              </Card>
            </div>
          )}

          {section === "code" && (
            <div className="space-y-5">
              <Card>
                <CardHeader title="Language" />
                <CardBody className="py-1">
                  <SettingRow
                    label="Language"
                    description="More languages are planned; NOESIS v1 diagnoses Python only."
                    control={
                      <Select
                        className="w-40"
                        label="Code language"
                        value={settings.codeLanguage}
                        onChange={(v) => update("codeLanguage", v)}
                        options={[{ value: "python", label: "Python" }]}
                      />
                    }
                  />
                  <SettingRow
                    label="Sandbox mode"
                    description="Run lesson code in an isolated environment."
                    control={
                      <Toggle
                        label="Sandbox mode"
                        checked={settings.sandboxMode}
                        onChange={(v) => update("sandboxMode", v)}
                      />
                    }
                  />
                </CardBody>
              </Card>

              <Card>
                <CardHeader title="Execution view" />
                <CardBody className="py-1">
                  <SettingRow
                    label="Auto-run after prediction"
                    description="Start stepping as soon as a prediction is recorded."
                    control={
                      <Toggle
                        label="Auto-run after prediction"
                        checked={settings.autoRunAfterPrediction}
                        onChange={(v) => update("autoRunAfterPrediction", v)}
                      />
                    }
                  />
                  <SettingRow
                    label="Show memory"
                    control={
                      <Toggle
                        label="Show memory"
                        checked={settings.showMemory}
                        onChange={(v) => update("showMemory", v)}
                      />
                    }
                  />
                  <SettingRow
                    label="Show call stack"
                    control={
                      <Toggle
                        label="Show call stack"
                        checked={settings.showCallStack}
                        onChange={(v) => update("showCallStack", v)}
                      />
                    }
                  />
                  <SettingRow
                    label="Show execution timeline"
                    control={
                      <Toggle
                        label="Show execution timeline"
                        checked={settings.showExecutionTimeline}
                        onChange={(v) => update("showExecutionTimeline", v)}
                      />
                    }
                  />
                </CardBody>
              </Card>
            </div>
          )}

          {section === "privacy" && (
            <div className="space-y-5">
              <Card>
                <CardHeader title="Execution" />
                <CardBody>
                  <p className="text-[13px] leading-relaxed text-fg-muted">
                    Lesson code runs in an isolated environment with a restricted set of builtins
                    and a hard step and time limit.
                  </p>
                </CardBody>
              </Card>

              <Card>
                <CardHeader title="AI analysis" />
                <CardBody>
                  <p className="text-[13px] leading-relaxed text-fg-muted">
                    This build runs the diagnostic model locally in your browser — nothing you write
                    leaves this device. When a hosted model is enabled, your code and prediction are
                    sent for analysis only at the moment a diagnosis is requested.
                  </p>
                </CardBody>
              </Card>

              <Card>
                <CardHeader title="Learning data" />
                <CardBody className="space-y-3">
                  <p className="text-[13px] leading-relaxed text-fg-muted">
                    Your concept estimates and session history are stored in this browser only.
                  </p>
                  <div className="flex items-center gap-3">
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={() => {
                        if (
                          settings.confirmBeforeReset &&
                          !window.confirm("Delete all learning data? This cannot be undone.")
                        ) {
                          return;
                        }
                        resetModel();
                        reset();
                        setCleared(true);
                      }}
                    >
                      Delete all learning data
                    </Button>
                    {cleared && (
                      <span className="animate-fade-in text-[12px] text-success">
                        Learning data cleared.
                      </span>
                    )}
                  </div>
                </CardBody>
              </Card>
            </div>
          )}
        </div>
      </div>
    </Page>
  );
}

function HintLevelSlider({
  value,
  onChange,
  disabled,
}: {
  value: HintLevel;
  onChange: (v: HintLevel) => void;
  disabled: boolean;
}) {
  const activeIndex = HINT_LEVELS.indexOf(value);
  const last = HINT_LEVELS.length - 1;

  return (
    <div className={cn("relative px-1", disabled && "opacity-40")}>
      {/* One continuous track behind evenly distributed stops, so the steps sit
          at equal intervals regardless of label width. */}
      <span
        aria-hidden
        className="absolute left-1 right-1 top-[5px] h-px bg-line"
      />
      <span
        aria-hidden
        className="absolute left-1 top-[5px] h-px bg-accent transition-[width] duration-200"
        style={{ width: `calc((100% - 0.5rem) * ${activeIndex / last})` }}
      />
      <div className="relative flex justify-between">
        {HINT_LEVELS.map((level, i) => (
          <button
            key={level}
            type="button"
            disabled={disabled}
            aria-pressed={i === activeIndex}
            onClick={() => onChange(level)}
            className="flex flex-col items-center gap-1.5 disabled:cursor-not-allowed"
          >
            <span
              className={cn(
                "h-2.5 w-2.5 rounded-full border transition-colors",
                i === activeIndex
                  ? "border-accent bg-accent ring-4 ring-accent/15"
                  : i < activeIndex
                    ? "border-accent bg-accent"
                    : "border-line-strong bg-raised",
              )}
            />
            <span
              className={cn(
                "text-[12px] capitalize",
                i === activeIndex ? "text-fg" : "text-fg-subtle",
              )}
            >
              {level}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

function PolicyRow({ label, allowed }: { label: string; allowed: boolean }) {
  return (
    <div className="flex items-center gap-2 text-[13px]">
      <span className={allowed ? "text-success" : "text-danger"} aria-hidden>
        {allowed ? <Check size={14} /> : <X size={14} />}
      </span>
      <span className={allowed ? "text-fg" : "text-fg-muted line-through decoration-line-strong"}>
        {label}
      </span>
    </div>
  );
}
