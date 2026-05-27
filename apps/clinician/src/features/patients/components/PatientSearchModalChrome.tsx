import { ChevronLeft, ChevronRight, Search, UserPlus, X } from "lucide-react";

import { Button, Input, Notice } from "../../../shared/components/ui";

import type { ChangeEvent, HTMLAttributes } from "react";

type SearchMetaProps = {
  label: string;
  value: string;
};

type PatientSearchHeaderProps = {
  dragHandleProps: HTMLAttributes<HTMLDivElement>;
  onClose?: () => void;
  onOpenCreatePatient?: () => void;
};

type PatientSearchInputPanelProps = {
  error: string;
  page: number;
  searchStatusLabel: string;
  smartQuery: string;
  totalPages: number;
  onSmartQueryChange: (value: string) => void;
};

type MatchQueueHeaderProps = {
  canSearch: boolean;
  loading: boolean;
  resultLabel: string;
  selected: boolean;
};

type ResultsPaginationProps = {
  page: number;
  totalPages: number;
  onNext: () => void;
  onPrevious: () => void;
};

function SearchMeta({ label, value }: SearchMetaProps) {
  return (
    <div className="min-w-0">
      <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-cf-text-subtle">
        {label}
      </div>
      <div className="mt-0.5 truncate text-sm font-semibold text-cf-text">
        {value}
      </div>
    </div>
  );
}

export function PatientSearchHeader({
  dragHandleProps,
  onClose,
  onOpenCreatePatient,
}: PatientSearchHeaderProps) {
  return (
    <div
      {...dragHandleProps}
      className="flex cursor-move select-none items-center justify-between gap-4 border-b border-cf-border bg-cf-surface px-5 py-4"
    >
      <div className="min-w-0">
        <div className="mb-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-cf-text-subtle">
          Patient Lookup
        </div>
        <div className="text-lg font-semibold text-cf-text">Search Patient</div>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        <Button
          type="button"
          variant="primary"
          size="sm"
          onPointerDown={(event) => event.stopPropagation()}
          onClick={onOpenCreatePatient}
          className="!text-cf-page-bg"
        >
          <UserPlus className="h-4 w-4" />
          New patient
        </Button>
        <button
          type="button"
          onPointerDown={(event) => event.stopPropagation()}
          onClick={onClose}
          className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-cf-text-subtle transition hover:bg-cf-surface-soft hover:text-cf-text-muted"
          aria-label="Close"
        >
          <X className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
}

export function PatientSearchInputPanel({
  error,
  page,
  searchStatusLabel,
  smartQuery,
  totalPages,
  onSmartQueryChange,
}: PatientSearchInputPanelProps) {
  return (
    <div className="bg-cf-surface px-5 py-4">
      {error && (
        <Notice tone="danger" title="Patient search failed">
          {error}
        </Notice>
      )}

      <div className={error ? "mt-3" : ""}>
        <div className="grid gap-3 border-y border-cf-border py-3 lg:grid-cols-[minmax(0,1fr)_220px]">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-cf-text-subtle" />
            <Input
              type="text"
              value={smartQuery}
              onChange={(event: ChangeEvent<HTMLInputElement>) =>
                onSmartQueryChange(event.target.value)
              }
              aria-label="Smart patient search"
              placeholder="Name, MRN, DOB, or phone"
              className="h-11 rounded-xl border-cf-border bg-cf-surface pl-10 pr-4 text-sm font-semibold focus:border-cf-border-strong focus:ring-0"
              autoFocus
            />
          </div>

          <div className="grid grid-cols-2 gap-4 border-cf-border lg:border-l lg:pl-4">
            <SearchMeta label="Status" value={searchStatusLabel} />
            <SearchMeta label="Page" value={`${page} / ${totalPages}`} />
          </div>
        </div>
      </div>
    </div>
  );
}

export function MatchQueueHeader({
  canSearch,
  loading,
  resultLabel,
  selected,
}: MatchQueueHeaderProps) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-cf-border bg-cf-surface-muted/45 px-4 py-3">
      <div>
        <div className="text-sm font-semibold text-cf-text">Match queue</div>
        <div className="text-xs text-cf-text-subtle">
          {canSearch
            ? loading
              ? "Checking facility records"
              : resultLabel
            : "Waiting for input"}
        </div>
      </div>
      {selected ? (
        <div className="rounded-full border border-cf-border bg-cf-surface px-3 py-1 text-xs font-semibold text-cf-text-muted">
          Chart selected
        </div>
      ) : null}
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
