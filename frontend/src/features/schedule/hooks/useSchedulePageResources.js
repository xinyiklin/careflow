import { useCallback, useEffect, useMemo, useState } from "react";

import { MAX_SCHEDULE_COLUMNS } from "../utils/scheduleConstants";
import {
  areStringArraysEqual,
  buildResourceLabel,
  getDefaultColumnResourceKey,
} from "../utils/scheduleResourceUtils";

export default function useSchedulePageResources({
  resourceColumnCount,
  resources,
  scheduleMode,
  setResourceColumnCount,
  visibleDayCount,
}) {
  const [visibleColumnResourceKeys, setVisibleColumnResourceKeys] = useState([
    "",
  ]);
  const [multiDayResourceKey, setMultiDayResourceKey] = useState("");

  const resourceDefinitions = useMemo(() => {
    const labelCounts = resources.reduce((counts, resource) => {
      const normalizedName = (
        resource.name?.trim() || "Unnamed resource"
      ).toLowerCase();
      counts.set(normalizedName, (counts.get(normalizedName) || 0) + 1);
      return counts;
    }, new Map());

    return resources.map((resource) => ({
      key: String(resource.id),
      label: buildResourceLabel(
        resource,
        labelCounts.get(
          (resource.name?.trim() || "Unnamed resource").toLowerCase()
        ) || 0
      ),
      resourceId: resource.id,
    }));
  }, [resources]);

  useEffect(() => {
    setMultiDayResourceKey((currentKey) => {
      if (
        currentKey &&
        resourceDefinitions.some((resource) => resource.key === currentKey)
      ) {
        return currentKey;
      }

      return getDefaultColumnResourceKey(resourceDefinitions);
    });
  }, [resourceDefinitions]);

  const activeColumnResourceKeys = useMemo(() => {
    const boundedCount = Math.min(
      Math.max(visibleDayCount, 1),
      MAX_SCHEDULE_COLUMNS
    );

    if (scheduleMode === "days") {
      const resourceKey =
        multiDayResourceKey || getDefaultColumnResourceKey(resourceDefinitions);
      return Array.from({ length: boundedCount }, () => resourceKey);
    }

    return Array.from(
      { length: boundedCount },
      (_, index) =>
        visibleColumnResourceKeys[index] ||
        resourceDefinitions[index]?.key ||
        getDefaultColumnResourceKey(resourceDefinitions)
    );
  }, [
    multiDayResourceKey,
    resourceDefinitions,
    scheduleMode,
    visibleColumnResourceKeys,
    visibleDayCount,
  ]);

  const handleColumnResourceKeysChange = useCallback(
    (nextKeys) => {
      if (scheduleMode === "days") {
        const changedKey =
          nextKeys.find(
            (key, index) => key && key !== activeColumnResourceKeys[index]
          ) || nextKeys.find(Boolean);
        if (changedKey) setMultiDayResourceKey(changedKey);
        return;
      }

      setVisibleColumnResourceKeys(nextKeys);
    },
    [activeColumnResourceKeys, scheduleMode]
  );

  const handleScheduleModeResourceChange = useCallback(
    (nextMode) => {
      if (nextMode !== "resources") return;

      setVisibleColumnResourceKeys((current) => {
        const nextLength = Math.min(
          Math.max(resourceColumnCount, 1),
          MAX_SCHEDULE_COLUMNS
        );
        const nextKeys = Array.from({ length: nextLength }, (_, index) => {
          const existingKey = current[index];
          if (
            existingKey &&
            resourceDefinitions.some((resource) => resource.key === existingKey)
          ) {
            return existingKey;
          }

          return (
            resourceDefinitions[index]?.key ||
            getDefaultColumnResourceKey(resourceDefinitions)
          );
        });

        return areStringArraysEqual(current, nextKeys) ? current : nextKeys;
      });
    },
    [resourceColumnCount, resourceDefinitions]
  );

  const handleToggleScheduleResource = useCallback(
    (resourceKey) => {
      if (!resourceKey) return;

      if (scheduleMode === "days") {
        setMultiDayResourceKey(resourceKey);
        return;
      }

      const validResourceKeys = new Set(
        resourceDefinitions.map((resource) => resource.key)
      );
      const currentKeys = activeColumnResourceKeys.filter(
        (key, index, keys) =>
          key && validResourceKeys.has(key) && keys.indexOf(key) === index
      );
      const selectedKeys = new Set(
        currentKeys.length ? currentKeys : [resourceKey]
      );

      if (selectedKeys.has(resourceKey)) {
        if (selectedKeys.size <= 1) return;
        selectedKeys.delete(resourceKey);
      } else {
        if (selectedKeys.size >= MAX_SCHEDULE_COLUMNS) return;
        selectedKeys.add(resourceKey);
      }

      const nextKeys = resourceDefinitions
        .map((resource) => resource.key)
        .filter((key) => selectedKeys.has(key))
        .slice(0, MAX_SCHEDULE_COLUMNS);

      const normalizedNextKeys = nextKeys.length ? nextKeys : [resourceKey];
      setVisibleColumnResourceKeys(normalizedNextKeys);
      setResourceColumnCount(normalizedNextKeys.length);
    },
    [
      activeColumnResourceKeys,
      resourceDefinitions,
      scheduleMode,
      setResourceColumnCount,
    ]
  );

  useEffect(() => {
    setVisibleColumnResourceKeys((current) => {
      const nextLength = Math.min(
        Math.max(visibleDayCount, 1),
        MAX_SCHEDULE_COLUMNS
      );

      const nextKeys = Array.from({ length: nextLength }, (_, index) => {
        const existingKey = current[index];
        if (
          existingKey &&
          resourceDefinitions.some((resource) => resource.key === existingKey)
        ) {
          return existingKey;
        }

        const distinctResource = resourceDefinitions[index]?.key;
        if (distinctResource) {
          return distinctResource;
        }

        const inheritedKey = current[index - 1] || current[0];
        if (
          inheritedKey &&
          resourceDefinitions.some((resource) => resource.key === inheritedKey)
        ) {
          return inheritedKey;
        }

        return getDefaultColumnResourceKey(resourceDefinitions);
      });

      return areStringArraysEqual(current, nextKeys) ? current : nextKeys;
    });
  }, [resourceDefinitions, visibleDayCount]);

  return {
    activeColumnResourceKeys,
    handleColumnResourceKeysChange,
    handleScheduleModeResourceChange,
    handleToggleScheduleResource,
    multiDayResourceKey,
    resourceDefinitions,
    visibleColumnResourceKeys,
  };
}
