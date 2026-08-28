"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import type { Concept, ConceptUpdate, MasteryLevel } from "@/lib/types";
import { CONCEPTS, levelFor } from "@/mock/concepts";

/**
 * The student model — the thing NOESIS actually builds.
 *
 * Held here (and persisted per browser) so that closing the learning loop in
 * /learn is visible afterwards in /progress, /practice and /concepts. It is
 * evidence accumulated across the session, not a score.
 */

const STORAGE_KEY = "noesis.mental-model.v1";

interface MentalModelValue {
  concepts: Concept[];
  byId: Record<string, Concept>;
  /** Concept most in need of practice — lowest mastery with recorded evidence. */
  recommended: Concept | null;
  applyUpdates: (updates: ConceptUpdate[]) => void;
  reset: () => void;
}

const MentalModelContext = createContext<MentalModelValue | null>(null);

export function MentalModelProvider({ children }: { children: ReactNode }) {
  const [mastery, setMastery] = useState<Record<string, number>>({});

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) setMastery(JSON.parse(raw) as Record<string, number>);
    } catch {
      /* ignore */
    }
  }, []);

  const applyUpdates = useCallback((updates: ConceptUpdate[]) => {
    setMastery((prev) => {
      const next = { ...prev };
      for (const u of updates) next[u.conceptId] = u.to;
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {
        /* ignore */
      }
      return next;
    });
  }, []);

  const reset = useCallback(() => {
    setMastery({});
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* ignore */
    }
  }, []);

  const value = useMemo<MentalModelValue>(() => {
    const concepts = CONCEPTS.map((c) => {
      const override = mastery[c.id];
      if (override === undefined) return c;
      const evidenceCount = c.evidenceCount + 1;
      const level: MasteryLevel = levelFor(override, evidenceCount);
      return { ...c, mastery: override, evidenceCount, level };
    });

    const assessed = concepts.filter((c) => c.evidenceCount > 0);
    const recommended =
      assessed.length > 0
        ? assessed.reduce((lowest, c) => (c.mastery < lowest.mastery ? c : lowest))
        : null;

    return {
      concepts,
      byId: Object.fromEntries(concepts.map((c) => [c.id, c])),
      recommended,
      applyUpdates,
      reset,
    };
  }, [mastery, applyUpdates, reset]);

  return <MentalModelContext.Provider value={value}>{children}</MentalModelContext.Provider>;
}

export function useMentalModel(): MentalModelValue {
  const ctx = useContext(MentalModelContext);
  if (!ctx) throw new Error("useMentalModel must be used inside <MentalModelProvider>");
  return ctx;
}

export const LEVEL_LABEL: Record<MasteryLevel, string> = {
  mastered: "Mastered",
  developing: "Developing",
  uncertain: "Uncertain",
  not_assessed: "Not assessed",
};

export const LEVEL_TONE: Record<MasteryLevel, "success" | "accent" | "warning" | "neutral"> = {
  mastered: "success",
  developing: "accent",
  uncertain: "warning",
  not_assessed: "neutral",
};
