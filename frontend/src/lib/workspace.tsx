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
  Annotation,
  ChatMessage,
  ExecutionTrace,
  ProjectFile,
  TraceStep,
  TraceViewMode,
  WorkspaceState,
} from "@/lib/types";
import { STARTER_ENTRY_PATH, STARTER_FILES } from "@/mock/starter-project";

const STORAGE_KEY = "noesis.workspace.v2";

function seedState(): WorkspaceState {
  return {
    files: STARTER_FILES,
    activePath: STARTER_ENTRY_PATH,
    chatHistory: [],
    lastTrace: null,
    isRunning: false,
    isAssistantThinking: false,
    connectionError: null,
    traceViewMode: "output",
    debugStepIndex: 0,
    annotations: [],
    showInlineValues: true,
  };
}

export type WorkspaceAction =
  | { type: "SET_ACTIVE_PATH"; path: string }
  | { type: "UPDATE_FILE_CONTENT"; path: string; content: string }
  | { type: "CREATE_FILE"; path: string }
  | { type: "RENAME_FILE"; path: string; nextPath: string }
  | { type: "DELETE_FILE"; path: string }
  | { type: "APPEND_CHAT_MESSAGE"; message: ChatMessage }
  | { type: "SET_ASSISTANT_THINKING"; thinking: boolean }
  | { type: "SET_RUNNING"; running: boolean }
  | { type: "APPEND_TRACE_STEPS"; steps: TraceStep[] }
  | { type: "SET_RUN_RESULT"; trace: ExecutionTrace }
  | { type: "SET_CONNECTION_ERROR"; message: string | null }
  | { type: "SET_TRACE_VIEW_MODE"; mode: TraceViewMode }
  | { type: "SET_DEBUG_STEP_INDEX"; index: number }
  | { type: "SET_ANNOTATIONS"; annotations: Annotation[] }
  | { type: "CLEAR_ANNOTATIONS" }
  | { type: "SET_SHOW_INLINE_VALUES"; show: boolean }
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

    case "APPEND_CHAT_MESSAGE":
      return { ...state, chatHistory: [...state.chatHistory, action.message] };

    case "SET_ASSISTANT_THINKING":
      return { ...state, isAssistantThinking: action.thinking };

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

    case "SET_ANNOTATIONS":
      return { ...state, annotations: action.annotations };

    case "CLEAR_ANNOTATIONS":
      return { ...state, annotations: [] };

    case "SET_SHOW_INLINE_VALUES":
      return { ...state, showInlineValues: action.show };

    case "SET_CONNECTION_ERROR":
      return { ...state, connectionError: action.message, isRunning: false, isAssistantThinking: false };

    case "SET_TRACE_VIEW_MODE":
      return { ...state, traceViewMode: action.mode };

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
        dispatch({ type: "HYDRATE", state: { ...seedState(), ...parsed, annotations: [] } });
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
      const { annotations: _dropped, ...persisted } = state;
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
