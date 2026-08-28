import { Fragment } from "react";

/**
 * Renders `backtick spans` inside teaching copy as monospace. The teacher's
 * text constantly names identifiers and operators; they must not read as prose.
 */
export function InlineCode({ text }: { text: string }) {
  return (
    <>
      {text.split(/(`[^`]+`)/g).map((part, i) =>
        part.startsWith("`") && part.endsWith("`") && part.length > 2 ? (
          <code
            key={i}
            className="rounded border border-line bg-raised px-1 py-px font-mono text-[0.9em] text-fg"
          >
            {part.slice(1, -1)}
          </code>
        ) : (
          <Fragment key={i}>{part}</Fragment>
        ),
      )}
    </>
  );
}
