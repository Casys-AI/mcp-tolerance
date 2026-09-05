/** @jsxImportSource preact */

import { ElementSection, Message } from "@casys/mcp-view-components/preact/components";
import { omittedNotCheckedLabel, type ToleranceLabels } from "./i18n.ts";
import type { CappedNotes } from "./model.ts";

export function ScopeNotes(
  { notes, t, locale }: {
    readonly notes: CappedNotes;
    readonly t: ToleranceLabels;
    readonly locale?: string;
  },
) {
  if (notes.items.length === 0) return null;
  const omitted = omittedNotCheckedLabel(t, notes.omitted, locale);
  return (
    <ElementSection title={t("notChecked")}>
      {notes.items.map((note, index) => (
        <Message key={`note-${index}`} tone="neutral">{note}</Message>
      ))}
      {omitted ? <Message tone="neutral">{omitted}</Message> : null}
    </ElementSection>
  );
}
