import { useCallback, useMemo, useState } from "react";

export type AdminListFilter<TRecord> = {
  key: string;
  label: string;
  predicate: (record: TRecord) => boolean;
};

export type AdminListSortOption<TRecord> = {
  key: string;
  compare: (first: TRecord, second: TRecord) => number;
};

type AdminListControlsOptions<TRecord> = {
  filters?: AdminListFilter<TRecord>[];
  sortOptions?: AdminListSortOption<TRecord>[];
  defaultFilter?: string;
  defaultSort?: string;
  storageKey?: string;
};

function getStoredControl(
  storageKey: string | undefined,
  kind: string,
  fallback: string
) {
  if (!storageKey || typeof window === "undefined") return fallback;
  try {
    return (
      window.localStorage.getItem(`careflow.adminList.${storageKey}.${kind}`) ||
      fallback
    );
  } catch {
    return fallback;
  }
}

function persistControl(
  storageKey: string | undefined,
  kind: string,
  value: string
) {
  if (!storageKey || typeof window === "undefined") return;
  try {
    window.localStorage.setItem(
      `careflow.adminList.${storageKey}.${kind}`,
      value
    );
  } catch {
    // Storage may be unavailable (private mode, quota); fall back to in-memory.
  }
}

export function compareBoolean(first: unknown, second: unknown) {
  return Number(Boolean(second)) - Number(Boolean(first));
}

export function compareNumber(first: unknown, second: unknown) {
  return (Number(first) || 0) - (Number(second) || 0);
}

export function compareText(first: unknown, second: unknown) {
  return String(first || "").localeCompare(String(second || ""), undefined, {
    numeric: true,
    sensitivity: "base",
  });
}

export default function useAdminListControls<TRecord>(
  records: TRecord[] = [],
  {
    filters = [],
    sortOptions = [],
    defaultFilter = "all",
    defaultSort = "name",
    storageKey,
  }: AdminListControlsOptions<TRecord>
) {
  const [activeFilter, setActiveFilterState] = useState(() =>
    getStoredControl(storageKey, "filter", defaultFilter)
  );
  const [activeSort, setActiveSortState] = useState(() =>
    getStoredControl(storageKey, "sort", defaultSort)
  );

  const setActiveFilter = useCallback(
    (key: string) => {
      setActiveFilterState(key);
      persistControl(storageKey, "filter", key);
    },
    [storageKey]
  );

  const setActiveSort = useCallback(
    (key: string) => {
      setActiveSortState(key);
      persistControl(storageKey, "sort", key);
    },
    [storageKey]
  );

  const filterOptions = useMemo(
    () =>
      filters.map((filter) => ({
        key: filter.key,
        label: filter.label,
        count: records.filter(filter.predicate).length,
      })),
    [filters, records]
  );

  const visibleRecords = useMemo(() => {
    const filter =
      filters.find((option) => option.key === activeFilter) || filters[0];
    const sorter =
      sortOptions.find((option) => option.key === activeSort) || sortOptions[0];

    return records
      .filter(filter?.predicate || (() => true))
      .slice()
      .sort(sorter?.compare || (() => 0));
  }, [activeFilter, activeSort, filters, records, sortOptions]);

  return {
    activeFilter,
    activeSort,
    filterOptions,
    visibleRecords,
    setActiveFilter,
    setActiveSort,
  };
}
