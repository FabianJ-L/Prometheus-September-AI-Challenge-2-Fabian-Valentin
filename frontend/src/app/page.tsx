"use client";

import { useEffect } from "react";
import { Editor } from "@/components/workspace/Editor";
import { FileTree } from "@/components/workspace/FileTree";
import { RunBar } from "@/components/workspace/RunBar";
import { ThreadList } from "@/components/workspace/ThreadList";
import { useWorkspace } from "@/lib/workspace";
import { getWorkspaceService } from "@/lib/workspace-service";

/**
 * Three surfaces, three questions.
 *
 *   editor    where in the code   — marks, values, memory, the conversation
 *   run bar   when in the run     — timeline and console
 *   threads   an index of what has been asked, collapsed by default
 *
 * The editor gets the room because that is where everything now happens; the
 * bar is a fixed strip rather than a third of the height, and the side panel
 * is a rail until someone opens it.
 */
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
        <div className="min-h-0 flex-1">
          <Editor />
        </div>
        <div className="h-[168px] shrink-0 border-t border-line">
          <RunBar />
        </div>
      </section>

      <ThreadList />
    </div>
  );
}
