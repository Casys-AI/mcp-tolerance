/** @jsxImportSource preact */

import {
  Badge,
  Card,
  ElementProvenance,
  KeyValueList,
  Message,
  MetricGrid,
  Stack,
  StateMessage,
} from "@casys/mcp-view-components/preact/components";
import { presentNotChecked, type ResultCardView } from "./model.ts";

export function ResultCard({ view }: { readonly view: ResultCardView }) {
  return (
    <Card
      title={view.title}
      eyebrow={view.eyebrow}
      actions={view.badge
        ? <Badge tone={view.badge.tone}>{view.badge.label}</Badge>
        : undefined}
    >
      <Stack gap="sm">
        <MetricGrid items={view.metrics} />
        {view.facts.length > 0 ? <KeyValueList items={view.facts} /> : null}
        <ElementProvenance label="Provenance" value={view.provenance} />
      </Stack>
    </Card>
  );
}

export function NotCheckedCard(
  { notes }: { readonly notes: readonly string[] },
) {
  const listed = presentNotChecked(notes);
  return (
    <Card title="Not checked" eyebrow="Scope notes from the tool result">
      {listed.items.length === 0
        ? <StateMessage title="No not-checked notes" tone="neutral" />
        : (
          <Stack gap="xs">
            {listed.items.map((note, index) => (
              <Message key={`note-${index}`} tone="neutral">{note}</Message>
            ))}
            {listed.omittedLabel
              ? <Message tone="neutral">{listed.omittedLabel}</Message>
              : null}
          </Stack>
        )}
    </Card>
  );
}
