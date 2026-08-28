"use client";

import { useState } from "react";
import { Page, PageHeader } from "@/components/layout/PageHeader";
import { MentalModelPanel, MisconceptionHistory } from "@/components/progress/MentalModel";
import { SessionList } from "@/components/progress/SessionList";
import { Tabs } from "@/components/ui/Tabs";
import { MISCONCEPTION_HISTORY, SESSIONS } from "@/mock/sessions";

type View = "model" | "sessions";

export default function ProgressPage() {
  const [view, setView] = useState<View>("model");

  return (
    <Page>
      <PageHeader
        title="Mental model"
        description="A pedagogical diagnosis of what you understand — built from your predictions, not from lessons completed."
        actions={
          <Tabs
            label="Progress view"
            value={view}
            onChange={setView}
            options={[
              { value: "model", label: "Mental model" },
              { value: "sessions", label: "Sessions" },
            ]}
          />
        }
      />

      <div className="mt-7">
        {view === "model" ? (
          <div className="space-y-6">
            <MentalModelPanel />
            <MisconceptionHistory records={MISCONCEPTION_HISTORY} />
          </div>
        ) : (
          <SessionList sessions={SESSIONS} />
        )}
      </div>
    </Page>
  );
}
