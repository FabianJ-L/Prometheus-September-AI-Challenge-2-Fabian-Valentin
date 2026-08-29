"use client";

import { useState } from "react";
import { Page, PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/Button";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { RadioGroup, Select, Stepper } from "@/components/ui/Select";
import { SettingRow, Toggle } from "@/components/ui/Toggle";
import { useSettings } from "@/lib/settings";
import { useWorkspace } from "@/lib/workspace";

export default function SettingsPage() {
  const { settings, update, reset } = useSettings();
  const { dispatch } = useWorkspace();
  const [cleared, setCleared] = useState(false);

  return (
    <Page width="narrow">
      <PageHeader title="Settings" className="mb-7" />

      <div className="space-y-5">
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
              label="Confirm before reset"
              description="Ask before discarding workspace files or chat history."
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
              description="Applies to the code editor."
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
              description="Transitions across the interface."
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

        <Card>
          <CardHeader title="Privacy" />
          <CardBody>
            <p className="text-[13px] leading-relaxed text-fg-muted">
              Code runs in an isolated environment with a restricted set of builtins and a hard
              step and time limit. Your files and chat history are stored in this browser and sent
              to the backend only when you run code or send a message.
            </p>
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Workspace data" />
          <CardBody className="space-y-3">
            <p className="text-[13px] leading-relaxed text-fg-muted">
              Your files and chat history are stored in this browser only.
            </p>
            <div className="flex items-center gap-3">
              <Button
                variant="danger"
                size="sm"
                onClick={() => {
                  if (
                    settings.confirmBeforeReset &&
                    !window.confirm("Delete all workspace data? This cannot be undone.")
                  ) {
                    return;
                  }
                  dispatch({ type: "RESET_WORKSPACE" });
                  reset();
                  setCleared(true);
                }}
              >
                Delete all workspace data
              </Button>
              {cleared && (
                <span className="animate-fade-in text-[12px] text-success">
                  Workspace data cleared.
                </span>
              )}
            </div>
          </CardBody>
        </Card>
      </div>
    </Page>
  );
}
