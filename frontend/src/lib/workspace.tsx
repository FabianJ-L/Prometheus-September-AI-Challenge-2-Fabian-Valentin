"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  type Dispatch,
  type ReactNode,
} from "react";
import type {
  Anchor,
  Annotation,
  ChatMessage,
  ExecutionTrace,
  ProjectFile,
  Thread,
  TraceStep,
  WorkspaceState,
} from "@/lib/types";
import {
  STARTER_ENTRY_PATH,
  STARTER_FILES,
  STARTER_PREDICTION_TARGET,
} from "@/mock/starter-project";

const STORAGE_KEY = "noesis.workspace.v3";

/** Past this the editor stops being a lesson and starts being a highlighter. */
const MAX_VISIBLE_ANNOTATIONS = 8;

function seedState(): WorkspaceState {
  return {
    files: STARTER_FILES,
    activePath: STARTER_ENTRY_PATH,
    threads: [],
    lastTrace: null,
    isRunning: false,
    isAssistantThinking: false,
    connectionError: null,
    debugStepIndex: 0,
    annotations: [],
    showInlineValues: true,
    showMemory: false,
    composingAt: null,
    threadListOpen: false,
    prediction: null,
  };
}

export type WorkspaceAction =
  | { type: "SET_ACTIVE_PATH"; path: string }
  | { type: "UPDATE_FILE_CONTENT"; path: string; content: string }
  | { type: "CREATE_FILE"; path: string }
  | { type: "RENAME_FILE"; path: string; nextPath: string }
  | { type: "DELETE_FILE"; path: string }
  | { type: "OPEN_COMPOSER"; line: number | null }
  | { type: "START_THREAD"; id: string; anchor: Anchor | null; message: ChatMessage }
  | { type: "APPEND_TO_THREAD"; id: string; message: ChatMessage }
  | { type: "REPLY_TO_THREAD"; id: string | null; message: ChatMessage }
  | { type: "TOGGLE_THREAD"; id: string }
  | { type: "CLOSE_THREAD"; id: string }
  | { type: "SET_THREAD_LIST_OPEN"; open: boolean }
  | { type: "SET_RUNNING"; running: boolean }
  | { type: "APPEND_TRACE_STEPS"; steps: TraceStep[] }
  | { type: "SET_RUN_RESULT"; trace: ExecutionTrace }
  | { type: "SET_CONNECTION_ERROR"; message: string | null }
  | { type: "SET_DEBUG_STEP_INDEX"; index: number }
  | { type: "SET_ANNOTATIONS"; annotations: Annotation[] }
  | { type: "CLEAR_ANNOTATIONS" }
  | { type: "SET_SHOW_INLINE_VALUES"; show: boolean }
  | { type: "SET_SHOW_MEMORY"; show: boolean }
  | { type: "SUBMIT_PREDICTION"; value: string }
  | { type: "RESET_PREDICTION" }
  | { type: "RESET_WORKSPACE" }
  | { type: "HYDRATE"; state: WorkspaceState };

function reducer(state: WorkspaceState, action: WorkspaceAction): WorkspaceState {
  switch (action.type) {
    case "SET_ACTIVE_PATH":
      return { ...state, activePath: action.path };

    case "UPDATE_FILE_CONTENT":
      return {
        ...state,
        files: state.files.map((f) => (f.path === action.path ? { ...f, content: action.content } : f)),
        // A prediction was made against the code as it stood; once it
        // changes, the prediction no longer applies to the run it gates.
        prediction: null,
      };

    case "CREATE_FILE": {
      if (state.files.some((f) => f.path === action.path)) return state;
      const file: ProjectFile = { path: action.path, content: "", language: "python" };
      return { ...state, files: [...state.files, file], activePath: action.path };
    }

    case "RENAME_FILE": {
      if (!action.nextPath || state.files.some((f) => f.path === action.nextPath)) return state;
      return {
        ...state,
        files: state.files.map((f) => (f.path === action.path ? { ...f, path: action.nextPath } : f)),
        activePath: state.activePath === action.path ? action.nextPath : state.activePath,
      };
    }

    case "DELETE_FILE": {
      const files = state.files.filter((f) => f.path !== action.path);
      const activePath = state.activePath === action.path ? (files[0]?.path ?? null) : state.activePath;
      return { ...state, files, activePath };
    }

    case "OPEN_COMPOSER":
      return { ...state, composingAt: action.line };

    case "START_THREAD": {
      const thread: Thread = {
        id: action.id,
        anchor: action.anchor,
        messages: [action.message],
        pending: true,
        collapsed: false,
      };
      return {
        ...state,
        threads: [...state.threads, thread],
        composingAt: null,
        isAssistantThinking: true,
      };
    }

    case "APPEND_TO_THREAD":
      return {
        ...state,
        isAssistantThinking: true,
        threads: state.threads.map((t) =>
          t.id === action.id ? { ...t, messages: [...t.messages, action.message], pending: true } : t,
        ),
      };

    case "REPLY_TO_THREAD": {
      // A reply with no id belongs to whichever thread is still waiting — the
      // backend is stateless and older clients may not echo one back.
      const target = action.id ?? state.threads.find((t) => t.pending)?.id ?? null;
      if (target === null) return { ...state, isAssistantThinking: false };
      return {
        ...state,
        isAssistantThinking: false,
        threads: state.threads.map((t) =>
          t.id === target
            ? { ...t, messages: [...t.messages, action.message], pending: false, collapsed: false }
            : t,
        ),
      };
    }

    case "TOGGLE_THREAD":
      return {
        ...state,
        threads: state.threads.map((t) =>
          t.id === action.id ? { ...t, collapsed: !t.collapsed } : t,
        ),
      };

    case "CLOSE_THREAD":
      return {
        ...state,
        threads: state.threads.filter((t) => t.id !== action.id),
        annotations: state.annotations.filter((a) => a.threadId !== action.id),
      };

    case "SET_THREAD_LIST_OPEN":
      return { ...state, threadListOpen: action.open };

    case "SET_RUNNING":
      // A new run supersedes whatever the assistant marked about the old one.
      return action.running
        ? {
            ...state,
            isRunning: true,
            lastTrace: null,
            connectionError: null,
            debugStepIndex: 0,
            annotations: [],
          }
        : { ...state, isRunning: false };

    case "APPEND_TRACE_STEPS": {
      const base: ExecutionTrace = state.lastTrace ?? {
        entryPath: state.activePath ?? "",
        steps: [],
        finalLocals: {},
        finalHeap: {},
        stdout: "",
        error: null,
        errorLine: null,
        truncated: false,
      };
      return { ...state, lastTrace: { ...base, steps: [...base.steps, ...action.steps] } };
    }

    case "SET_RUN_RESULT":
      return { ...state, lastTrace: action.trace, isRunning: false, debugStepIndex: 0 };

    case "SET_ANNOTATIONS": {
      const threadId = action.annotations[0]?.threadId ?? null;
      const kept = threadId
        ? state.annotations.filter((a) => a.threadId !== threadId)
        : state.annotations.filter((a) => a.threadId !== null);
      return { ...state, annotations: [...kept, ...action.annotations].slice(-MAX_VISIBLE_ANNOTATIONS) };
    }

    case "CLEAR_ANNOTATIONS":
      return { ...state, annotations: [] };

    case "SET_SHOW_INLINE_VALUES":
      return { ...state, showInlineValues: action.show };

    case "SET_SHOW_MEMORY":
      return { ...state, showMemory: action.show };

    case "SUBMIT_PREDICTION":
      return {
        ...state,
        prediction: { target: STARTER_PREDICTION_TARGET, value: action.value },
      };

    case "RESET_PREDICTION":
      return { ...state, prediction: null };

    case "SET_CONNECTION_ERROR":
      return { ...state, connectionError: action.message, isRunning: false, isAssistantThinking: false };

    case "SET_DEBUG_STEP_INDEX":
      return { ...state, debugStepIndex: action.index };

    case "RESET_WORKSPACE":
      return seedState();

    case "HYDRATE":
      return action.state;

    default:
      return state;
  }
}

interface WorkspaceContextValue {
  state: WorkspaceState;
  dispatch: Dispatch<WorkspaceAction>;
}

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null);

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, seedState);

  // Hydrate after mount so server and first client render agree.
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as WorkspaceState;
        dispatch({
          type: "HYDRATE",
          state: { ...seedState(), ...parsed, annotations: [], composingAt: null },
        });
      }
    } catch {
      /* private mode / blocked storage — defaults are fine */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    try {
      // Annotations are deliberately not persisted: they belong to one moment
      // in one conversation, and restoring them after a reload would point at
      // code the user may have edited in between.
      const { annotations: _marks, composingAt: _open, ...persisted } = state;
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(persisted));
    } catch {
      /* ignore */
    }
  }, [state]);

  const value = useMemo(() => ({ state, dispatch }), [state]);
  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>;
}

export function useWorkspace(): WorkspaceContextValue {
  const ctx = useContext(WorkspaceContext);
  if (!ctx) throw new Error("useWorkspace must be used inside <WorkspaceProvider>");
  return ctx;
}
