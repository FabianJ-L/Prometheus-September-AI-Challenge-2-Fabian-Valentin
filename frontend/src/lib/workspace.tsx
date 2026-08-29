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
import type { ChatMessage, ExecutionTrace, ProjectFile, TraceStep, WorkspaceState } from "@/lib/types";
import { STARTER_ENTRY_PATH, STARTER_FILES } from "@/mock/starter-project";

const STORAGE_KEY = "noesis.workspace.v1";

function seedState(): WorkspaceState {
  return {
    files: STARTER_FILES,
    activePath: STARTER_ENTRY_PATH,
    chatHistory: [],
    lastTrace: null,
    isRunning: false,
    isAssistantThinking: false,
    connectionError: null,
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
  | { type: "APPEND_TRACE_STEP"; step: TraceStep }
  | { type: "SET_RUN_RESULT"; trace: ExecutionTrace }
  | { type: "SET_CONNECTION_ERROR"; message: string | null }
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
      return action.running
        ? { ...state, isRunning: true, lastTrace: null, connectionError: null }
        : { ...state, isRunning: false };

    case "APPEND_TRACE_STEP": {
      const base: ExecutionTrace = state.lastTrace ?? {
        entryPath: state.activePath ?? "",
        steps: [],
        finalLocals: {},
        stdout: "",
        error: null,
        truncated: false,
      };
      return { ...state, lastTrace: { ...base, steps: [...base.steps, action.step] } };
    }

    case "SET_RUN_RESULT":
      return { ...state, lastTrace: action.trace, isRunning: false };

    case "SET_CONNECTION_ERROR":
      return { ...state, connectionError: action.message, isRunning: false, isAssistantThinking: false };

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
        dispatch({ type: "HYDRATE", state: { ...seedState(), ...parsed } });
      }
    } catch {
      /* private mode / blocked storage — defaults are fine */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
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
