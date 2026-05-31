import {
  ChevronLeft,
  ChevronRight,
  GripVertical,
  PanelRightClose,
  PanelRightOpen,
  Search,
  UserPlus,
  X,
} from "lucide-react";

import { Button, Input } from "../../../shared/components/ui";

import type { ChangeEvent, HTMLAttributes } from "react";

type PatientSearchHeaderProps = {
  dragHandleProps: HTMLAttributes<HTMLDivElement>;
  smartQuery: string;
  railCollapsed: boolean;
  onSmartQueryChange: (value: string) => void;
  onToggleRail: () => void;
  onClose?: () => void;
  onOpenCreatePatient?: () => void;
};

type ResultsPaginationProps = {
  page: number;
  totalPages: number;
  onNext: () => void;
  onPrevious: () => void;
};

export function PatientSearchHeader({
  dragHandleProps,
  smartQuery,
  railCollapsed,
  onSmartQueryChange,
  onToggleRail,
  onClose,
  onOpenCreatePatient,
}: PatientSearchHeaderProps) {
  return (
    <div
      {...dragHandleProps}
      className="flex shrink-0 cursor-move select-none items-center gap-3 border-b border-cf-border bg-cf-surface px-4 py-3"
    >
      <GripVertical
        className="h-4 w-4 shrink-0 text-cf-text-subtle"
        aria-hidden="true"
      />

      <div
        className="relative flex-1 select-text"
        onPointerDown={(event) => event.stopPropagation()}
      >
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-cf-text-subtle" />
        <Input
          type="text"
          value={smartQuery}
          onChange={(event: ChangeEvent<HTMLInputElement>) =>
            onSmartQueryChange(event.target.value)
          }
          aria-label="Smart patient search"
          placeholder="Name, MRN, DOB, or phone"
          className="h-10 rounded-xl border-cf-border bg-cf-surface pl-10 pr-4 text-sm font-semibold focus:border-cf-border-strong focus:ring-0"
          autoFocus
        />
      </div>

      <button
        type="button"
        onPointerDown={(event) => event.stopPropagation()}
        onClick={onToggleRail}
        className="hidden h-9 w-9 shrink-0 place-items-center rounded-lg text-cf-text-subtle transition hover:bg-cf-surface-muted hover:text-cf-text lg:grid"
        aria-label={
          railCollapsed ? "Show chart snapshot" : "Hide chart snapshot"
        }
        aria-pressed={!railCollapsed}
        title={railCollapsed ? "Show chart snapshot" : "Hide chart snapshot"}
      >
        {railCollapsed ? (
          <PanelRightOpen className="h-4 w-4" />
        ) : (
          <PanelRightClose className="h-4 w-4" />
        )}
      </button>

      <Button
        type="button"
        variant="primary"
        size="sm"
        onPointerDown={(event) => event.stopPropagation()}
        onClick={onOpenCreatePatient}
        className="shrink-0 !text-cf-page-bg"
      >
        <UserPlus className="h-4 w-4" />
        New patient
      </Button>

      <button
        type="button"
        onPointerDown={(event) => event.stopPropagation()}
        onClick={onClose}
        className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-cf-text-subtle transition hover:bg-cf-surface-soft hover:text-cf-text-muted"
        aria-label="Close"
      >
        <X className="h-5 w-5" />
      </button>
    </div>
  );
}

export function ResultsPagination({
  page,
  totalPages,
  onNext,
  onPrevious,
}: ResultsPaginationProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-cf-border px-4 py-3">
      <div className="text-sm text-cf-text-muted">
        Page {page} of {totalPages}
      </div>
      <div className="flex gap-2">
        <Button
          type="button"
          variant="default"
          size="sm"
          onClick={onPrevious}
          disabled={page === 1}
        >
          <ChevronLeft className="h-4 w-4" />
          Prev
        </Button>
        <Button
          type="button"
          variant="default"
          size="sm"
          onClick={onNext}
          disabled={page === totalPages}
        >
          Next
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
