import {
  DEFAULT_APPOINTMENT_BLOCK_DISPLAY,
  sanitizeAppointmentBlockDisplay,
} from "../../../shared/constants/appointmentBlockDisplay";

function parseHexColor(value) {
  if (typeof value !== "string") return null;
  const hex = value.trim().replace("#", "");
  const normalized =
    hex.length === 3
      ? hex
          .split("")
          .map((char) => char + char)
          .join("")
      : hex;

  if (!/^[0-9a-f]{6}$/i.test(normalized)) return null;

  return {
    r: parseInt(normalized.slice(0, 2), 16),
    g: parseInt(normalized.slice(2, 4), 16),
    b: parseInt(normalized.slice(4, 6), 16),
  };
}

function formatHexChannel(value) {
  return Math.max(0, Math.min(255, Math.round(value)))
    .toString(16)
    .padStart(2, "0");
}

function shadeHexColor(value, amount) {
  const rgb = parseHexColor(value);
  if (!rgb) return null;

  const adjust = (channel) =>
    amount < 0 ? channel * (1 + amount) : channel + (255 - channel) * amount;

  return `#${formatHexChannel(adjust(rgb.r))}${formatHexChannel(
    adjust(rgb.g)
  )}${formatHexChannel(adjust(rgb.b))}`;
}

function getRelativeLuminance({ r, g, b }) {
  const [red, green, blue] = [r, g, b].map((channel) => {
    const normalized = channel / 255;
    return normalized <= 0.03928
      ? normalized / 12.92
      : ((normalized + 0.055) / 1.055) ** 2.4;
  });

  return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
}

function getContrastRatio(firstLuminance, secondLuminance) {
  const lighter = Math.max(firstLuminance, secondLuminance);
  const darker = Math.min(firstLuminance, secondLuminance);
  return (lighter + 0.05) / (darker + 0.05);
}

function getReadableTone(backgroundColor) {
  const rgb = parseHexColor(backgroundColor);
  if (!rgb) {
    return {
      text: "var(--color-cf-text)",
      muted: "var(--color-cf-text-muted)",
      badgeBg: "rgba(255, 255, 255, 0.55)",
      badgeText: "var(--color-cf-text-muted)",
    };
  }

  const luminance = getRelativeLuminance(rgb);
  const useDarkText =
    getContrastRatio(luminance, 0) >= getContrastRatio(luminance, 1);

  return useDarkText
    ? {
        text: "rgba(15, 23, 42, 0.94)",
        muted: "rgba(51, 65, 85, 0.78)",
        badgeBg: "rgba(15, 23, 42, 0.08)",
        badgeText: "rgba(15, 23, 42, 0.76)",
      }
    : {
        text: "rgba(255, 255, 255, 0.96)",
        muted: "rgba(255, 255, 255, 0.76)",
        badgeBg: "rgba(255, 255, 255, 0.2)",
        badgeText: "rgba(255, 255, 255, 0.82)",
      };
}

export default function AppointmentBlock({
  appointment,
  onDoubleClick,
  onPointerDragStart,
  onContextMenu,
  isDragging = false,
  isPreview = false,
  fullWidth = false,
  equalWidth = false,
  displayOptions = DEFAULT_APPOINTMENT_BLOCK_DISPLAY,
  className = "",
  style,
}) {
  const display = sanitizeAppointmentBlockDisplay(displayOptions);
  const statusColor = appointment.status_color || "#ffffff";
  const blockColor = appointment.appointment_type_color || statusColor;
  const borderColor =
    shadeHexColor(blockColor, -0.22) || "rgba(15, 23, 42, 0.16)";
  const tone = getReadableTone(blockColor);
  const chipColor = statusColor || blockColor || "#ccc";
  const chipLabel = appointment.status_name || "Unscheduled";
  const detailText = [
    display.showVisitType ? appointment.appointment_type_name : "",
    display.showRoom && appointment.room ? `Room ${appointment.room}` : "",
    display.showResource ? appointment.resource_name : "",
    display.showProvider ? appointment.rendering_provider_name : "",
    display.showReason ? appointment.reason : "",
  ]
    .filter(Boolean)
    .join(" • ");
  const actionLabel = [
    appointment.patient_name || "Appointment",
    appointment.time,
    appointment.status_name,
  ]
    .filter(Boolean)
    .join(", ");

  return (
    <div
      role={isPreview ? undefined : "button"}
      tabIndex={isPreview ? undefined : 0}
      aria-label={isPreview ? undefined : `Open ${actionLabel}`}
      className={[
        "flex h-full min-w-0 select-none items-stretch rounded-lg border px-2.5 py-1.5 shadow-sm transition",
        fullWidth || equalWidth
          ? "min-w-0 flex-1 basis-0"
          : "w-[200px] min-w-[200px]",
        isDragging
          ? "cursor-grabbing opacity-40 shadow-none"
          : isPreview
            ? "opacity-90 shadow-md"
            : "cursor-grab hover:shadow-md active:cursor-grabbing",
        className,
      ].join(" ")}
      style={{
        backgroundColor: blockColor,
        borderColor,
        touchAction: "none",
        ...style,
      }}
      onPointerDown={
        isPreview
          ? undefined
          : (e) => {
              if (e.button !== 0) return;
              e.stopPropagation();
              e.currentTarget.focus({ preventScroll: true });
              if (e.detail >= 2) {
                onDoubleClick?.();
                return;
              }
              onPointerDragStart?.(e, appointment);
            }
      }
      onContextMenu={
        isPreview
          ? undefined
          : (event) => {
              event.preventDefault();
              event.stopPropagation();
              onContextMenu?.(event, appointment);
            }
      }
      onDoubleClick={
        isPreview
          ? undefined
          : (e) => {
              e.stopPropagation();
              onDoubleClick?.();
            }
      }
      onKeyDown={
        isPreview
          ? undefined
          : (event) => {
              if (event.key !== "Enter" && event.key !== " ") return;
              event.preventDefault();
              event.stopPropagation();
              onDoubleClick?.();
            }
      }
    >
      <div className="mr-2 flex min-w-0 flex-1 flex-col justify-center">
        <div className="flex min-w-0 items-center justify-between gap-2">
          <span
            className="truncate text-[11px] font-semibold"
            style={{ color: tone.text }}
          >
            {appointment.time}
            {appointment.duration_minutes
              ? ` · ${appointment.duration_minutes}m`
              : ""}
          </span>
          {display.showStatusChip && chipLabel ? (
            <span
              className="inline-flex min-w-0 max-w-[7.5rem] shrink-0 items-center gap-1 rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide"
              style={{ backgroundColor: tone.badgeBg, color: tone.badgeText }}
            >
              <span
                className="h-1.5 w-1.5 shrink-0 rounded-full ring-1 ring-white/70"
                style={{ backgroundColor: chipColor }}
              />
              <span className="truncate">{chipLabel}</span>
            </span>
          ) : null}
        </div>
        <div
          className="truncate text-xs font-semibold"
          style={{ color: tone.text }}
        >
          {appointment.patient_name}
        </div>
        {detailText ? (
          <div className="truncate text-[10px]" style={{ color: tone.muted }}>
            {detailText}
          </div>
        ) : null}
      </div>
    </div>
  );
}
