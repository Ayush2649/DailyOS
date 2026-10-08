"use client";

import React from "react";
import { cn } from "@/lib/utils";
import { Check, Square } from "lucide-react";

interface Props {
  text: string;
  className?: string;
}

/**
 * Render inline markdown tokens:
 * - Bold: **text**
 * - Italic: *text*
 * - Inline code: `code`
 * - Links: [label](url)
 */
function renderInline(text: string): React.ReactNode[] {
  // Regex splitting on code (`...`), bold (**...**), italic (*...*), or markdown link ([...](...))
  const tokenRegex = /(`[^`]+`|\*\*[^*]+\*\*|\*[^*]+\*|\[[^\]]+\]\([^)]+\))/g;
  const parts = text.split(tokenRegex);

  return parts.map((part, i) => {
    if (!part) return null;

    // Inline code: `code`
    if (part.startsWith("`") && part.endsWith("`") && part.length > 2) {
      return (
        <code
          key={i}
          className="px-1.5 py-0.5 rounded text-[12px] font-mono font-medium mx-0.5"
          style={{
            background: "rgba(255, 255, 255, 0.08)",
            color: "var(--satat-brand, #6E8BFF)",
            border: "1px solid rgba(255, 255, 255, 0.06)",
          }}
        >
          {part.slice(1, -1)}
        </code>
      );
    }

    // Bold: **bold**
    if (part.startsWith("**") && part.endsWith("**") && part.length > 4) {
      return (
        <strong key={i} className="font-semibold" style={{ color: "var(--text-primary, #F2F3F0)" }}>
          {part.slice(2, -2)}
        </strong>
      );
    }

    // Italic: *italic*
    if (part.startsWith("*") && part.endsWith("*") && part.length > 2) {
      return (
        <em key={i} className="italic" style={{ color: "var(--text-secondary, #AEB3B0)" }}>
          {part.slice(1, -1)}
        </em>
      );
    }

    // Markdown link: [label](url)
    const linkMatch = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
    if (linkMatch) {
      const [, label, url] = linkMatch;
      return (
        <a
          key={i}
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="underline underline-offset-2 transition-opacity hover:opacity-80"
          style={{ color: "var(--satat-brand, #6E8BFF)" }}
        >
          {label}
        </a>
      );
    }

    return <span key={i}>{part}</span>;
  });
}

/**
 * Robust, lightweight structured Markdown renderer for SATAT Orbit and summaries.
 * Supports:
 * - Headings: #, ##, ###
 * - Lists: ordered (1.), unordered (-, *, •)
 * - Checklists: - [ ] and - [x]
 * - Code blocks: ```...```
 * - Blockquotes: > ...
 * - Horizontal rules: ---
 * - Tables: | ... | ... |
 * - Bold, italic, inline code, and links
 */
export function MarkdownText({ text, className }: Props) {
  if (!text) return null;

  const lines = text.split("\n");
  const elements: React.ReactNode[] = [];
  let i = 0;

  while (i < lines.length) {
    const rawLine = lines[i];
    const trimmed = rawLine.trim();

    // 1. Empty line — small spacer
    if (!trimmed) {
      elements.push(<div key={`sp-${i}`} className="h-2" />);
      i++;
      continue;
    }

    // 2. Fenced Code Block: ```lang ... ```
    if (trimmed.startsWith("```")) {
      const codeLines: string[] = [];
      const lang = trimmed.slice(3).trim();
      i++;
      while (i < lines.length && !lines[i].trim().startsWith("```")) {
        codeLines.push(lines[i]);
        i++;
      }
      if (i < lines.length && lines[i].trim().startsWith("```")) {
        i++; // skip closing ```
      }

      elements.push(
        <div
          key={`code-${i}`}
          className="rounded-xl overflow-hidden my-2.5 border"
          style={{
            background: "var(--surface, #0D0F11)",
            borderColor: "var(--border, rgba(255, 255, 255, 0.08))",
          }}
        >
          {lang && (
            <div
              className="px-3 py-1 text-[10px] uppercase font-mono tracking-wider border-b font-semibold"
              style={{
                borderColor: "var(--border-subtle, rgba(255, 255, 255, 0.05))",
                color: "var(--text-muted, #7F8682)",
              }}
            >
              {lang}
            </div>
          )}
          <pre className="p-3 text-xs font-mono overflow-x-auto leading-relaxed select-text" style={{ color: "var(--text-primary, #F2F3F0)" }}>
            <code>{codeLines.join("\n")}</code>
          </pre>
        </div>
      );
      continue;
    }

    // 3. Horizontal Rule: --- or ***
    if (/^([-*_]){3,}$/.test(trimmed)) {
      elements.push(
        <hr
          key={`hr-${i}`}
          className="my-3 border-t"
          style={{ borderColor: "var(--border, rgba(255, 255, 255, 0.08))" }}
        />
      );
      i++;
      continue;
    }

    // 4. Blockquote: > text
    if (trimmed.startsWith(">")) {
      const quoteText = trimmed.replace(/^>\s?/, "");
      elements.push(
        <blockquote
          key={`quote-${i}`}
          className="border-l-2 pl-3 my-2 italic text-sm leading-relaxed"
          style={{
            borderColor: "var(--satat-brand, #6E8BFF)",
            color: "var(--text-secondary, #AEB3B0)",
          }}
        >
          {renderInline(quoteText)}
        </blockquote>
      );
      i++;
      continue;
    }

    // 5. Headings: #, ##, ###
    const hMatch = trimmed.match(/^(#{1,3})\s+(.+)$/);
    if (hMatch) {
      const level = hMatch[1].length;
      const headingText = hMatch[2];
      elements.push(
        <p
          key={`h-${i}`}
          className={cn(
            "font-semibold tracking-tight mt-3 mb-1",
            level === 1 && "text-base font-bold",
            level === 2 && "text-sm font-semibold",
            level === 3 && "text-xs uppercase tracking-wider text-brand font-bold"
          )}
          style={{
            fontFamily: "var(--font-display)",
            color: level === 3 ? "var(--satat-brand, #6E8BFF)" : "var(--text-primary, #F2F3F0)",
          }}
        >
          {headingText}
        </p>
      );
      i++;
      continue;
    }

    // 6. Standalone bold heading: **Heading** or **Heading:**
    if (/^\*\*[^*]+\*\*:?\s*$/.test(trimmed)) {
      const headingText = trimmed.replace(/^\*\*/, "").replace(/\*\*:?\s*$/, "");
      elements.push(
        <p
          key={`bhd-${i}`}
          className="font-semibold text-sm mt-3 mb-1"
          style={{ color: "var(--text-primary, #F2F3F0)" }}
        >
          {headingText}
        </p>
      );
      i++;
      continue;
    }

    // 7. Checklists: - [ ] or - [x]
    const checkMatch = trimmed.match(/^[-*]\s+\[([ xX])\]\s+(.+)$/);
    if (checkMatch) {
      const checked = checkMatch[1].toLowerCase() === "x";
      const checkText = checkMatch[2];
      elements.push(
        <div key={`chk-${i}`} className="flex items-start gap-2.5 my-1 text-sm">
          <div
            className={cn(
              "w-4 h-4 rounded mt-0.5 shrink-0 flex items-center justify-center border transition-colors",
              checked
                ? "bg-brand/20 border-brand text-brand"
                : "border-white/20 text-muted"
            )}
          >
            {checked ? <Check className="w-3 h-3 stroke-[3]" /> : <Square className="w-3 h-3 opacity-0" />}
          </div>
          <span
            className={cn("leading-relaxed flex-1", checked && "line-through opacity-60")}
            style={{ color: "var(--text-primary, #F2F3F0)" }}
          >
            {renderInline(checkText)}
          </span>
        </div>
      );
      i++;
      continue;
    }

    // 8. Numbered List Item: 1. or 1)
    const numMatch = trimmed.match(/^(\d+)[.)]\s+(.+)$/);
    if (numMatch) {
      const num = numMatch[1];
      const content = numMatch[2];
      elements.push(
        <div key={`num-${i}`} className="flex items-start gap-2.5 my-1.5 text-sm">
          <span
            className="shrink-0 w-5 h-5 rounded-full text-[10px] font-bold flex items-center justify-center mt-0.5"
            style={{
              background: "rgba(110, 139, 255, 0.12)",
              color: "var(--satat-brand, #6E8BFF)",
              border: "1px solid rgba(110, 139, 255, 0.25)",
            }}
          >
            {num}
          </span>
          <div className="leading-relaxed flex-1" style={{ color: "var(--text-primary, #F2F3F0)" }}>
            {renderInline(content)}
          </div>
        </div>
      );
      i++;
      continue;
    }

    // 9. Bullet List Item: - or * or •
    if (/^[-*•]\s/.test(trimmed)) {
      const bulletText = trimmed.replace(/^[-*•]\s/, "");
      elements.push(
        <div key={`blt-${i}`} className="flex items-start gap-2.5 my-1 text-sm">
          <span
            className="w-1.5 h-1.5 rounded-full shrink-0 mt-2"
            style={{ backgroundColor: "var(--satat-brand, #6E8BFF)" }}
          />
          <div className="leading-relaxed flex-1" style={{ color: "var(--text-primary, #F2F3F0)" }}>
            {renderInline(bulletText)}
          </div>
        </div>
      );
      i++;
      continue;
    }

    // 10. Table: lines starting and ending with |
    if (trimmed.startsWith("|") && trimmed.endsWith("|")) {
      const tableRows: string[] = [trimmed];
      i++;
      while (i < lines.length && lines[i].trim().startsWith("|") && lines[i].trim().endsWith("|")) {
        tableRows.push(lines[i].trim());
        i++;
      }

      // Filter out markdown separator line (|---|---|)
      const dataRows = tableRows.filter(r => !/^\|[\s\-:|]+\|$/.test(r));

      if (dataRows.length > 0) {
        const headerCells = dataRows[0]
          .split("|")
          .slice(1, -1)
          .map(c => c.trim());
        const bodyRows = dataRows.slice(1).map(r =>
          r
            .split("|")
            .slice(1, -1)
            .map(c => c.trim())
        );

        elements.push(
          <div
            key={`tbl-${i}`}
            className="overflow-x-auto my-3 rounded-lg border text-xs"
            style={{
              borderColor: "var(--border, rgba(255, 255, 255, 0.08))",
              background: "var(--surface, #0D0F11)",
            }}
          >
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b" style={{ borderColor: "var(--border, rgba(255, 255, 255, 0.08))" }}>
                  {headerCells.map((h, hIdx) => (
                    <th
                      key={hIdx}
                      className="p-2 text-left font-semibold"
                      style={{ color: "var(--text-primary, #F2F3F0)" }}
                    >
                      {renderInline(h)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {bodyRows.map((row, rIdx) => (
                  <tr
                    key={rIdx}
                    className="border-b last:border-b-0 hover:bg-white/[0.02]"
                    style={{ borderColor: "var(--border-subtle, rgba(255, 255, 255, 0.05))" }}
                  >
                    {row.map((cell, cIdx) => (
                      <td key={cIdx} className="p-2" style={{ color: "var(--text-secondary, #AEB3B0)" }}>
                        {renderInline(cell)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      }
      continue;
    }

    // 11. Regular paragraph
    elements.push(
      <p
        key={`p-${i}`}
        className="text-sm leading-relaxed my-1"
        style={{ color: "var(--text-primary, #F2F3F0)" }}
      >
        {renderInline(trimmed)}
      </p>
    );
    i++;
  }

  return <div className={cn("space-y-0.5", className)}>{elements}</div>;
}

export default MarkdownText;
