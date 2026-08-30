import { Fragment, type ReactNode } from "react";

/**
 * The small slice of Markdown the assistant actually uses: `**bold**`,
 * `*italic*`, `` `code` `` and paragraph breaks.
 *
 * Deliberately not a Markdown library. The output goes into the editor and the
 * chat, where a full renderer would be both heavier than needed and a way to
 * get HTML from a model into the page — this returns React nodes, so there is
 * no `dangerouslySetInnerHTML` anywhere in the path.
 */

const INLINE = /(\*\*[^*]+\*\*|`[^`]+`|\*[^*\n]+\*)/g;

function renderInline(text: string, keyPrefix: string): ReactNode[] {
  return text.split(INLINE).map((part, i) => {
    const key = `${keyPrefix}-${i}`;
    if (part.startsWith("**") && part.endsWith("**") && part.length > 4) {
      return (
        <strong key={key} className="font-semibold text-fg">
          {part.slice(2, -2)}
        </strong>
      );
    }
    if (part.startsWith("`") && part.endsWith("`") && part.length > 2) {
      return (
        <code
          key={key}
          className="rounded border border-line bg-bg px-1 py-px font-mono text-[0.92em] text-fg"
        >
          {part.slice(1, -1)}
        </code>
      );
    }
    if (part.startsWith("*") && part.endsWith("*") && part.length > 2) {
      return (
        <em key={key} className="italic">
          {part.slice(1, -1)}
        </em>
      );
    }
    return <Fragment key={key}>{part}</Fragment>;
  });
}

export function Markdown({ text, className }: { text: string; className?: string }) {
  const paragraphs = text.trim().split(/\n{2,}/);
  return (
    <div className={className}>
      {paragraphs.map((paragraph, i) => (
        <p key={i} className={i > 0 ? "mt-2" : undefined}>
          {paragraph.split("\n").map((line, j) => (
            <Fragment key={j}>
              {j > 0 && <br />}
              {renderInline(line, `${i}-${j}`)}
            </Fragment>
          ))}
        </p>
      ))}
    </div>
  );
}
