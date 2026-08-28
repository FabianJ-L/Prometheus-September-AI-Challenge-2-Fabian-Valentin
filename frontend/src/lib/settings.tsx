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

export type Theme = "dark" | "light" | "system";
export type TeachingStyle = "socratic" | "guided" | "minimal";
export type HintLevel = "concept" | "strategy" | "steps";

export interface Settings {
  // General
  language: string;
  startPage: "continue" | "dashboard" | "practice";
  confirmBeforeReset: boolean;
  // Appearance
  theme: Theme;
  codeFontSize: number;
  lineNumbers: boolean;
  animations: boolean;
  // Learning
  teachingStyle: TeachingStyle;
  difficultyAdaptation: boolean;
  predictionMode: "always" | "relevant";
  showMisconceptions: "immediately" | "end";
  // AI teacher
  neverGiveSolution: boolean;
  askBeforeExplaining: boolean;
  allowHints: boolean;
  maxHintLevel: HintLevel;
  // Code
  codeLanguage: "python";
  sandboxMode: boolean;
  autoRunAfterPrediction: boolean;
  showMemory: boolean;
  showCallStack: boolean;
  showExecutionTimeline: boolean;
}

export const DEFAULT_SETTINGS: Settings = {
  language: "English",
  startPage: "continue",
  confirmBeforeReset: true,

  theme: "dark",
  codeFontSize: 13,
  lineNumbers: true,
  animations: true,

  teachingStyle: "guided",
  difficultyAdaptation: true,
  predictionMode: "always",
  showMisconceptions: "immediately",

  neverGiveSolution: true,
  askBeforeExplaining: true,
  allowHints: true,
  maxHintLevel: "strategy",

  codeLanguage: "python",
  sandboxMode: true,
  autoRunAfterPrediction: false,
  showMemory: true,
  showCallStack: false,
  showExecutionTimeline: true,
};

export const HINT_LEVELS: HintLevel[] = ["concept", "strategy", "steps"];

/** How many progressive hints the AI-teacher policy allows. */
export function maxHints(settings: Settings): number {
  if (!settings.allowHints) return 0;
  return HINT_LEVELS.indexOf(settings.maxHintLevel) + 1;
}

const STORAGE_KEY = "noesis.settings.v1";

interface SettingsContextValue {
  settings: Settings;
  update: <K extends keyof Settings>(key: K, value: Settings[K]) => void;
  reset: () => void;
}

const SettingsContext = createContext<SettingsContextValue | null>(null);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);

  // Hydrate after mount so server and first client render agree.
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) setSettings({ ...DEFAULT_SETTINGS, ...(JSON.parse(raw) as Partial<Settings>) });
    } catch {
      /* private mode / blocked storage — defaults are fine */
    }
  }, []);

  // Reflect the settings that have a visual effect onto the document.
  useEffect(() => {
    const root = document.documentElement;
    root.dataset.theme = settings.theme;
    root.dataset.animations = settings.animations ? "on" : "off";
    root.style.setProperty("--code-font-size", `${settings.codeFontSize}px`);
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    } catch {
      /* ignore */
    }
  }, [settings]);

  const update = useCallback(<K extends keyof Settings>(key: K, value: Settings[K]) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  }, []);

  const reset = useCallback(() => setSettings(DEFAULT_SETTINGS), []);

  const value = useMemo(() => ({ settings, update, reset }), [settings, update, reset]);
  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings(): SettingsContextValue {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error("useSettings must be used inside <SettingsProvider>");
  return ctx;
}

/**
 * Applied before first paint so a stored light theme never flashes dark.
 * Inlined in <head> by the root layout.
 */
export const THEME_BOOTSTRAP = `
(function(){try{
  var s=JSON.parse(localStorage.getItem(${JSON.stringify(STORAGE_KEY)})||"{}");
  var r=document.documentElement;
  r.dataset.theme=s.theme||"dark";
  r.dataset.animations=s.animations===false?"off":"on";
  if(s.codeFontSize)r.style.setProperty("--code-font-size",s.codeFontSize+"px");
}catch(e){document.documentElement.dataset.theme="dark";}})();
`;
