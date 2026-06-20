import {
  Check,
  ChevronLeft,
  ChevronRight,
  CircleDot,
  Clipboard,
  CopyPlus,
  FileText,
  History,
  SquarePen,
  Trash2,
  UserRound,
} from "lucide-react";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type {
  ComponentType,
  CSSProperties,
  MouseEventHandler,
  ReactNode,
} from "react";

import {
  formatDateOnlyInTimeZone,
  formatTimeInTimeZone,
} from "../../../shared/utils/dateTime";
import { useCopyToClipboard } from "../../../shared/hooks/useCopyToClipboard";
import type { EntityId } from "../../../shared/api/types";
import type { AppointmentLike } from "../../../shared/types/domain";
import type { AppointmentStatusOption } from "../types";

// Fallback footprint used for the first paint, before the menu is measured.
// `w-64` container = 256px wide; the height is an estimate that the measured
// value (see `useLayoutEffect` below) corrects before the browser paints.
const MENU_WIDTH = 256;
const MENU_HEIGHT = 430;
const VIEWPORT_MARGIN = 12;

type MenuPosition = Pick<CSSProperties, "left" | "top">;

type MenuSize = { width: number; height: number };

type MenuItemProps = {
  icon: ComponentType<{ className?: string }>;
  label: string;
  onClick?: MouseEventHandler<HTMLButtonElement>;
  variant?: "default" | "danger";
  trailing?: ReactNode;
};

type AppointmentContextMenuProps = {
  isOpen: boolean;
  appointment?: AppointmentLike | null;
  x?: number;
  y?: number;
  timeZone?: string | null;
  statusOptions?: AppointmentStatusOption[];
  onClose?: () => void;
  onOpenAppointment?: (appointment: AppointmentLike) => void;
  onOpenPatientHub?: (appointment: AppointmentLike) => void;
  onDuplicateAppointment?: (appointment: AppointmentLike) => void;
  onOpenHistory?: (appointment: AppointmentLike) => void;
  onChangeStatus?: (appointment: AppointmentLike, statusId: EntityId) => void;
  onDeleteAppointment?: (appointment: AppointmentLike) => void;
};

function getMenuPosition(x: number, y: number, size: MenuSize): MenuPosition {
  if (typeof window === "undefined") {
    return { left: x, top: y };
  }

  const maxLeft = Math.max(
    VIEWPORT_MARGIN,
    window.innerWidth - size.width - VIEWPORT_MARGIN
  );
  const maxTop = Math.max(
    VIEWPORT_MARGIN,
    window.innerHeight - size.height - VIEWPORT_MARGIN
  );

  return {
    left: Math.min(x, maxLeft),
    top: Math.min(y, maxTop),
  };
}

function MenuItem({
  icon: Icon,
  label,
  onClick,
  variant = "default",
  trailing,
}: MenuItemProps) {
  const isDanger = variant === "danger";

  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "flex w-full cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium transition",
        isDanger
          ? "text-cf-danger-text hover:bg-cf-danger-bg"
          : "text-cf-text-muted hover:bg-cf-surface-soft hover:text-cf-text",
      ].join(" ")}
    >
      <Icon className="h-4 w-4 shrink-0" />
      <span>{label}</span>
      {trailing ? <span className="ml-auto shrink-0">{trailing}</span> : null}
    </button>
  );
}

function MenuDivider() {
  return <div className="my-1 border-t border-cf-border/70" />;
}

export default function AppointmentContextMenu({
  isOpen,
  appointment,
  x = 0,
  y = 0,
  timeZone,
  statusOptions = [],
  onClose,
  onOpenAppointment,
  onOpenPatientHub,
  onDuplicateAppointment,
  onOpenHistory,
  onChangeStatus,
  onDeleteAppointment,
}: AppointmentContextMenuProps) {
  const { copy } = useCopyToClipboard();
  const [view, setView] = useState<"root" | "status">("root");
  const menuRef = useRef<HTMLDivElement>(null);
  const [menuSize, setMenuSize] = useState<MenuSize | null>(null);

  // The menu stays mounted between openings, so reset to the root view on
  // each open and whenever it retargets a different appointment.
  useEffect(() => {
    setView("root");
  }, [isOpen, appointment?.id]);

  // Clamp against the menu's real footprint, which varies by view (root vs.
  // status) and the number of statuses. Measuring before paint keeps lower
  // actions (e.g. Delete) from being pushed off-screen near the viewport edge.
  useLayoutEffect(() => {
    const node = menuRef.current;
    if (!node) return;
    const { width, height } = node.getBoundingClientRect();
    setMenuSize((prev) =>
      prev && prev.width === width && prev.height === height
        ? prev
        : { width, height }
    );
  }, [isOpen, appointment?.id, view, statusOptions.length]);

  if (!isOpen || !appointment) return null;

  const position = getMenuPosition(
    x,
    y,
    menuSize ?? { width: MENU_WIDTH, height: MENU_HEIGHT }
  );
  const appointmentDate = appointment.appointment_time
    ? formatDateOnlyInTimeZone(
        appointment.appointment_time,
        timeZone,
        "MMM d, yyyy"
      )
    : "";
  const appointmentTime = appointment.appointment_time
    ? formatTimeInTimeZone(appointment.appointment_time, timeZone, "h:mm a")
    : "";

  const handleOpenAppointment = () => {
    onOpenAppointment?.(appointment);
    onClose?.();
  };

  const handleOpenHistory = () => {
    onOpenHistory?.(appointment);
    onClose?.();
  };

  const handleOpenPatientHub = () => {
    onOpenPatientHub?.(appointment);
    onClose?.();
  };

  const handleDuplicateAppointment = () => {
    onDuplicateAppointment?.(appointment);
    onClose?.();
  };

  const handleDeleteAppointment = () => {
    onDeleteAppointment?.(appointment);
    onClose?.();
  };

  const handleSelectStatus = (statusId: EntityId) => {
    onChangeStatus?.(appointment, statusId);
    onClose?.();
  };

  const canChangeStatus = Boolean(onChangeStatus) && statusOptions.length > 0;
  const currentStatusKey = String(appointment.status ?? "");

  const handleCopyPatient = async () => {
    if (await copy(appointment.patient_name)) {
      onClose?.();
    }
  };

  const handleCopyDetails = async () => {
    const details = [
      appointment.patient_name,
      [appointmentDate, appointmentTime].filter(Boolean).join(" "),
      appointment.appointment_type_name,
      appointment.status_name,
      appointment.rendering_provider_name,
      appointment.resource_name,
      appointment.reason,
    ]
      .filter(Boolean)
      .join("\n");

    if (await copy(details)) {
      onClose?.();
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-[72]" onClick={onClose} />

      <div
        ref={menuRef}
        data-appointment-context-menu
        className="fixed z-[73] flex max-h-[calc(100dvh-24px)] w-64 flex-col overflow-hidden rounded-2xl border border-cf-border bg-cf-surface shadow-[var(--shadow-panel-lg)]"
        style={position}
      >
        <div className="shrink-0 border-b border-cf-border bg-cf-surface-muted/45 px-4 py-3">
          <div className="truncate text-sm font-semibold text-cf-text">
            {appointment.patient_name || "Appointment"}
          </div>
          <div className="mt-1 truncate text-xs text-cf-text-subtle">
            {[
              appointmentDate,
              appointmentTime,
              appointment.rendering_provider_name,
            ]
              .filter(Boolean)
              .join(" • ")}
          </div>
        </div>

        {view === "status" ? (
          <div className="flex min-h-0 flex-col p-2">
            <div className="shrink-0">
              <MenuItem
                icon={ChevronLeft}
                label="Change status"
                onClick={() => setView("root")}
              />
              <MenuDivider />
            </div>
            <div className="min-h-0 overflow-y-auto">
              {statusOptions.map((option) => {
                const isCurrent = String(option.id) === currentStatusKey;

                return (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => handleSelectStatus(option.id)}
                    className="flex w-full cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium text-cf-text-muted transition hover:bg-cf-surface-soft hover:text-cf-text"
                  >
                    <span
                      className="h-2.5 w-2.5 shrink-0 rounded-full"
                      style={{
                        backgroundColor:
                          option.color || "var(--color-cf-accent)",
                      }}
                    />
                    <span className="truncate">{option.name}</span>
                    {isCurrent ? (
                      <Check className="ml-auto h-4 w-4 shrink-0 text-cf-accent" />
                    ) : null}
                  </button>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="min-h-0 overflow-y-auto p-2">
            <MenuItem
              icon={SquarePen}
              label="Open appointment"
              onClick={handleOpenAppointment}
            />
            <MenuItem
              icon={UserRound}
              label="Open patient hub"
              onClick={handleOpenPatientHub}
            />
            <MenuItem
              icon={CopyPlus}
              label="Duplicate appointment"
              onClick={handleDuplicateAppointment}
            />
            {canChangeStatus ? (
              <MenuItem
                icon={CircleDot}
                label="Change status"
                onClick={() => setView("status")}
                trailing={
                  <ChevronRight className="h-4 w-4 text-cf-text-subtle" />
                }
              />
            ) : null}
            <MenuDivider />
            <MenuItem
              icon={History}
              label="View activity log"
              onClick={handleOpenHistory}
            />
            <MenuItem
              icon={FileText}
              label="Copy appointment details"
              onClick={handleCopyDetails}
            />
            <MenuItem
              icon={Clipboard}
              label="Copy patient name"
              onClick={handleCopyPatient}
            />
            <MenuDivider />
            <MenuItem
              icon={Trash2}
              label="Delete appointment"
              variant="danger"
              onClick={handleDeleteAppointment}
            />
          </div>
        )}
      </div>
    </>
  );
}
