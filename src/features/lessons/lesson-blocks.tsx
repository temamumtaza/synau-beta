'use client';

import * as React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AiBlock } from '@/components/layout/primitives';
import { renderMarkdown, renderMarkdownInline } from '@/lib/markdown';
import {
  Lightbulb,
  TriangleAlert,
  Info,
  CheckCircle2,
  Quote as QuoteIcon,
  ListOrdered,
} from 'lucide-react';

/**
 * Renders a single dynamic lesson block. Block data comes from Convex via
 * the HTTP gateway (so it is loosely typed at runtime); fields are read
 * defensively and missing fields degrade gracefully rather than throwing.
 */
export interface LessonBlockData {
  type: string;
  title?: string;
  content?: string;
  term?: string;
  points?: string[];
  steps?: string[];
  headers?: string[];
  rows?: string[][];
  language?: string;
  caption?: string;
  variant?: 'info' | 'tip' | 'warning' | 'success' | string;
  attribution?: string;
}

/* Markdown body, isolated so prose styles don't leak into chrome. */
function Markdown({ source }: { source: string }) {
  if (!source) return null;
  return (
    <div
      className="md-prose"
      dangerouslySetInnerHTML={{ __html: renderMarkdown(source) }}
    />
  );
}

const CALLOUT_STYLES: Record<
  string,
  { icon: React.ComponentType<{ className?: string }>; label: string }
> = {
  info: { icon: Info, label: 'Info' },
  tip: { icon: Lightbulb, label: 'Tip' },
  warning: { icon: TriangleAlert, label: 'Perhatian' },
  success: { icon: CheckCircle2, label: 'Baik' },
};

function Block({ block }: { block: LessonBlockData }) {
  switch (block.type) {
    case 'text':
      return (
        <article className="font-body text-[1.05rem] leading-7 text-foreground/90">
          <Markdown source={block.content ?? ''} />
        </article>
      );

    case 'definition':
      return (
        <div className="space-y-1.5">
          <p className="text-sm">
            <span className="font-semibold">{block.term}</span>
            {block.term && block.content ? ' — ' : ''}
            <span className="text-foreground/80">{block.content}</span>
          </p>
        </div>
      );

    case 'example':
      return (
        <Card className="shadow-none">
          <CardContent className="space-y-2">
            {block.title && <p className="font-medium">{block.title}</p>}
            <div className="text-sm leading-6 text-foreground/80">
              <Markdown source={block.content ?? ''} />
            </div>
          </CardContent>
        </Card>
      );

    case 'analogy':
      return (
        <AiBlock label="Analogi">
          <Markdown source={block.content ?? ''} />
        </AiBlock>
      );

    case 'steps': {
      const steps = block.steps ?? [];
      if (steps.length === 0) return null;
      return (
        <div className="space-y-3">
          {block.title && (
            <p className="flex items-center gap-2 text-sm font-medium">
              <ListOrdered className="h-4 w-4 text-foreground/60" />
              {block.title}
            </p>
          )}
          <ol className="space-y-3">
            {steps.map((step, i) => (
              <li key={i} className="flex items-start gap-3">
                <Badge
                  variant="outline"
                  className="mt-0.5 h-6 w-6 shrink-0 justify-center rounded-full px-0 font-mono text-xs font-normal"
                >
                  {i + 1}
                </Badge>
                <div className="flex-1 text-sm leading-6 text-foreground/80">
                  <span
                    dangerouslySetInnerHTML={{
                      __html: renderMarkdownInline(step),
                    }}
                  />
                </div>
              </li>
            ))}
          </ol>
        </div>
      );
    }

    case 'table': {
      const headers = block.headers ?? [];
      const rows = block.rows ?? [];
      if (headers.length === 0 && rows.length === 0) return null;
      return (
        <div className="space-y-2 overflow-x-auto">
          {block.title && (
            <p className="text-sm font-medium">{block.title}</p>
          )}
          <table className="w-full border-collapse text-sm">
            {headers.length > 0 && (
              <thead>
                <tr className="border-b border-border">
                  {headers.map((h, i) => (
                    <th
                      key={i}
                      className="px-3 py-2 text-left font-medium text-foreground/70"
                    >
                      <span
                        dangerouslySetInnerHTML={{ __html: renderMarkdownInline(h) }}
                      />
                    </th>
                  ))}
                </tr>
              </thead>
            )}
            <tbody>
              {rows.map((row, ri) => (
                <tr key={ri} className="border-b border-border/60 last:border-0">
                  {(row.length ? row : headers).map((cell, ci) => (
                    <td key={ci} className="px-3 py-2 align-top text-foreground/80">
                      <span
                        dangerouslySetInnerHTML={{
                          __html: renderMarkdownInline(cell ?? ''),
                        }}
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    }

    case 'code': {
      const lang = block.language ?? '';
      return (
        <figure className="space-y-2">
          {lang && (
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="font-mono text-xs font-normal">
                {lang}
              </Badge>
            </div>
          )}
          <pre className="overflow-x-auto rounded-lg border border-border bg-secondary/60 p-4 text-sm leading-6">
            <code className="font-mono text-foreground/90 whitespace-pre">
              {block.content ?? ''}
            </code>
          </pre>
          {block.caption && (
            <figcaption className="text-xs text-muted-foreground">
              {block.caption}
            </figcaption>
          )}
        </figure>
      );
    }

    case 'callout': {
      const cfg = CALLOUT_STYLES[block.variant ?? 'info'] ?? CALLOUT_STYLES.info;
      const Icon = cfg.icon;
      return (
        <div className="rounded-lg border border-border bg-accent/40 p-4">
          <div className="flex items-start gap-3">
            <Icon className="mt-0.5 h-4 w-4 shrink-0 text-foreground/60" />
            <div className="min-w-0 flex-1 space-y-1.5">
              <p className="text-xs font-medium tracking-wide text-foreground/70 uppercase">
                {block.title ?? cfg.label}
              </p>
              <div className="text-sm leading-6 text-foreground/80">
                <Markdown source={block.content ?? ''} />
              </div>
            </div>
          </div>
        </div>
      );
    }

    case 'quote':
      return (
        <blockquote className="border-l-2 border-foreground pl-4 py-1">
          <div className="flex items-start gap-2 text-foreground/80">
            <QuoteIcon className="mt-1 h-4 w-4 shrink-0 text-foreground/40" />
            <div className="flex-1">
              <div className="text-base italic leading-7">
                <Markdown source={block.content ?? ''} />
              </div>
              {block.attribution && (
                <footer className="mt-1 text-xs text-muted-foreground">
                  — {block.attribution}
                </footer>
              )}
            </div>
          </div>
        </blockquote>
      );

    case 'keyPoints': {
      const points = block.points ?? [];
      if (points.length === 0) return null;
      return (
        <AiBlock label={block.title ?? 'Synau Note'}>
          <ul className="space-y-2">
            {points.map((point, i) => (
              <li key={i} className="flex items-start gap-2">
                <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-foreground/50" />
                <span
                  dangerouslySetInnerHTML={{
                    __html: renderMarkdownInline(point),
                  }}
                />
              </li>
            ))}
          </ul>
        </AiBlock>
      );
    }

    case 'summary':
      return (
        <Card className="border-none bg-accent/60 shadow-none">
          <CardContent>
            <div className="text-sm leading-6 text-foreground/80">
              <Markdown source={block.content ?? ''} />
            </div>
          </CardContent>
        </Card>
      );

    default:
      // Unknown block type — render its content as markdown if present, else skip.
      if (block.content) {
        return (
          <div className="text-sm leading-6 text-foreground/80">
            <Markdown source={block.content} />
          </div>
        );
      }
      return null;
  }
}

/**
 * Renders an ordered list of lesson blocks. A leading section label is shown
 * only when the first block isn't already a body `text` block, to avoid a
 * redundant "Materi" heading above prose.
 */
export function LessonBlocks({ blocks }: { blocks: LessonBlockData[] }) {
  return (
    <div className="space-y-10">
      {blocks.map((block, i) => (
        <Block key={i} block={block} />
      ))}
    </div>
  );
}
