import { useMemo, useState } from "react";
import { HexColorPicker } from "react-colorful";
import { Input } from "./ui";

import type { ChangeEvent, MouseEvent } from "react";

// Soft Tailwind 300/400 palette inspired by the Opus schedule preview. These
// stay calm on dense schedule blocks while preserving enough contrast for text.
const DEFAULT_PRESET_COLORS = [
  "#93c5fd", // blue-300    · follow-ups
  "#7dd3fc", // sky-300     · consults
  "#86efac", // green-300   · wellness
  "#34d399", // emerald-400 · completed
  "#fbbf24", // amber-400   · pending
  "#fda4af", // rose-300    · urgent
  "#fb7185", // rose-400    · cancelled
  "#c084fc", // purple-400  · procedures
  "#818cf8", // indigo-400  · new patient
  "#94a3b8", // slate-400   · neutral fallback
];

type ColorPickerFieldProps = {
  label?: string;
  value?: string;
  onChange?: (value: string) => void;
  presets?: string[];
};

function normalizeHex(value: unknown, fallback = "#94a3b8") {
  if (typeof value !== "string") return fallback;
  const trimmed = value.trim();
  const withHash = trimmed.startsWith("#") ? trimmed : `#${trimmed}`;
  const validHex = /^#[0-9A-Fa-f]{6}$/;
  return validHex.test(withHash) ? withHash : fallback;
}

export default function ColorPickerField({
  label = "Color",
  value,
  onChange,
  presets = DEFAULT_PRESET_COLORS,
}: ColorPickerFieldProps) {
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const normalizedColor = useMemo(() => normalizeHex(value), [value]);

  const handleColorChange = (nextColor: string) =>
    onChange?.(normalizeHex(nextColor));
  const handleTextInputChange = (e: ChangeEvent<HTMLInputElement>) =>
    onChange?.(e.target.value);
  const handleTextInputBlur = () => onChange?.(normalizeHex(value));

  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-cf-text-muted">
        {label}
      </label>

      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setIsPickerOpen((prev) => !prev)}
            className="h-11 w-14 rounded-lg border border-cf-border-strong shadow-sm transition hover:opacity-90"
            style={{ backgroundColor: normalizedColor }}
            aria-label="Open color picker"
            title="Open color picker"
          />
          <Input
            value={value || ""}
            onChange={handleTextInputChange}
            onBlur={handleTextInputBlur}
            placeholder="#94a3b8"
            className="flex-1"
          />
        </div>

        {isPickerOpen && (
          <div
            className="rounded-2xl border border-cf-border bg-cf-surface p-4 shadow-sm"
            onMouseDown={(e: MouseEvent<HTMLDivElement>) => e.stopPropagation()}
            onClick={(e: MouseEvent<HTMLDivElement>) => e.stopPropagation()}
          >
            <HexColorPicker
              color={normalizedColor}
              onChange={handleColorChange}
              className="!w-full"
            />
            <div className="mt-4 flex flex-wrap gap-2">
              {presets.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => handleColorChange(preset)}
                  className="h-7 w-7 rounded-full border border-cf-border shadow-sm transition hover:scale-105"
                  style={{ backgroundColor: preset }}
                  aria-label={`Select color ${preset}`}
                  title={preset}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
