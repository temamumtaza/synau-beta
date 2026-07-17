import * as React from 'react';
import Link from 'next/link';
import { ArrowLeft, Loader2, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';

/* Uppercase eyebrow label — the recurring section divider. */
export function SectionLabel({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <h2
      className={cn(
        'text-xs font-medium tracking-wider text-muted-foreground uppercase',
        className
      )}
    >
      {children}
    </h2>
  );
}

/* Back breadcrumb — consistent across sub-pages. */
export function BackLink({
  href,
  children,
  className,
}: {
  href: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={cn(
        'inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground',
        className
      )}
    >
      <ArrowLeft className="h-3.5 w-3.5" />
      {children}
    </Link>
  );
}

/* Page header — title + description + optional trailing action. */
export function PageHeader({
  title,
  description,
  back,
  action,
  className,
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  back?: { href: string; label: string };
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('space-y-4', className)}>
      {back && <BackLink href={back.href}>{back.label}</BackLink>}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-1.5">
          <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
          {description && (
            <p className="text-sm text-muted-foreground">{description}</p>
          )}
        </div>
        {action}
      </div>
    </div>
  );
}

/* Empty state — dashed card, consistent across pages. */
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <Card
      size="default"
      className={cn(
        'border-muted-foreground/20 border-dashed bg-transparent shadow-none',
        className
      )}
    >
      <CardContent className="flex flex-col items-center justify-center py-16 text-center">
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-secondary text-muted-foreground">
          <Icon className="h-5 w-5" />
        </div>
        <p className="font-medium text-foreground">{title}</p>
        {description && (
          <p className="mt-1 max-w-xs text-sm text-muted-foreground">
            {description}
          </p>
        )}
        {action && <div className="mt-6">{action}</div>}
      </CardContent>
    </Card>
  );
}

/* Inline loading — centered spinner + message. */
export function LoadingState({
  message = 'Memuat…',
  className,
}: {
  message?: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center py-20 text-center',
        className
      )}
    >
      <Loader2 className="mb-4 h-6 w-6 animate-spin text-muted-foreground" />
      <p className="text-sm text-muted-foreground">{message}</p>
    </div>
  );
}

/* Stat tile — icon + big number + label. */
export function StatCard({
  icon: Icon,
  value,
  label,
  className,
}: {
  icon: React.ComponentType<{ className?: string }>;
  value: React.ReactNode;
  label: React.ReactNode;
  className?: string;
}) {
  return (
    <Card className={cn('shadow-none', className)}>
      <CardContent className="flex items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-secondary text-foreground/70">
          <Icon className="h-4 w-4" />
        </div>
        <div className="min-w-0">
          <p className="text-2xl font-semibold leading-none tracking-tight">
            {value}
          </p>
          <p className="mt-1.5 truncate text-xs text-muted-foreground">
            {label}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

/* Synau Note — AI-generated content block.
   #f9f9f9 well + 2px black left rule (see .synau-ai in globals.css). */
export function AiBlock({
  children,
  label = 'Synau Note',
  className,
}: {
  children: React.ReactNode;
  label?: string;
  className?: string;
}) {
  return (
    <div className={cn('synau-ai pl-6', className)}>
      <div className="mb-1.5 flex items-center gap-1.5 text-xs font-medium tracking-wide text-foreground/70 uppercase">
        <Sparkles className="h-3.5 w-3.5" />
        {label}
      </div>
      <div className="text-sm leading-relaxed text-foreground/80">
        {children}
      </div>
    </div>
  );
}
