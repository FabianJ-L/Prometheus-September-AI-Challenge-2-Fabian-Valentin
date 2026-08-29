"use client";

import { useEffect } from "react";
import { ChatPanel } from "@/components/workspace/ChatPanel";
import { Editor } from "@/components/workspace/Editor";
import { FileTree } from "@/components/workspace/FileTree";
import { RunPanel } from "@/components/workspace/RunPanel";
import { useWorkspace } from "@/lib/workspace";
import { getWorkspaceService } from "@/lib/workspace-service";

export default function WorkspacePage() {
  const { dispatch } = useWorkspace();

  useEffect(() => {
    getWorkspaceService().connect(dispatch);
  }, [dispatch]);

  return (
    <div className="flex h-screen">
      <aside className="w-52 shrink-0 border-r border-line bg-surface">
        <FileTree />
      </aside>

      <section className="flex min-w-0 flex-1 flex-col">
        <div className="min-h-0 flex-[2]">
          <Editor />
        </div>
        <div className="min-h-0 flex-1 border-t border-line">
          <RunPanel />
        </div>
      </section>

      <aside className="w-96 shrink-0 border-l border-line bg-surface">
        <ChatPanel />
      </aside>
    </div>
  );
}
