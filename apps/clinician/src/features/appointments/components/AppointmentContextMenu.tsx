import {
  Clipboard,
  CopyPlus,
  FileText,
  History,
  SquarePen,
  Trash2,
  UserRound,
} from "lucide-react";
import type { ComponentType, CSSProperties, MouseEventHandler } from "react";

import {
  formatDateOnlyInTimeZone,
  formatTimeInTimeZone,
} from "../../../shared/utils/dateTime";
import type { AppointmentLike } from "../../../shared/types/domain";

const MENU_WIDTH = 224;
const MENU_HEIGHT = 356;

type MenuPosition = Pick<CSSProperties, "left" | "top">;

type MenuItemProps = {
  icon: ComponentType<{ className?: string }>;
  label: string;
  onClick?: MouseEventHandler<HTMLButtonElement>;
  variant?: "default" | "danger";
};

type AppointmentContextMenuProps = {
  isOpen: boolean;
  appointment?: AppointmentLike | null;
  x?: number;
  y?: number;
  timeZone?: string | null;
  onClose?: () => void;
  onOpenAppointment?: (appointment: AppointmentLike) => void;
  onOpenPatientHub?: (appointment: AppointmentLike) => void;
  onDuplicateAppointment?: (appointment: AppointmentLike) => void;
  onOpenHistory?: (appointment: AppointmentLike) => void;
  onDeleteAppointment?: (appointment: AppointmentLike) => void;
};

function getMenuPosition(x: number, y: number): MenuPosition {
  if (typeof window === "undefined") {
    return { left: x, top: y };
  }

  const maxLeft = Math.max(12, window.innerWidth - MENU_WIDTH - 12);
  const maxTop = Math.max(12, window.innerHeight - MENU_HEIGHT - 12);

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
}: MenuItemProps) {
  const isDanger = variant === "danger";

  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium transition",
        isDanger
          ? "text-red-600 hover:bg-red-50 hover:text-red-700 dark:text-red-300 dark:hover:bg-red-950/35 dark:hover:text-red-200"
          : "text-cf-text-muted hover:bg-cf-surface-soft hover:text-cf-text",
      ].join(" ")}
    >
      <Icon className="h-4 w-4 shrink-0" />
      <span>{label}</span>
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
  onClose,
  onOpenAppointment,
  onOpenPatientHub,
  onDuplicateAppointment,
  onOpenHistory,
  onDeleteAppointment,
}: AppointmentContextMenuProps) {
  if (!isOpen || !appointment) return null;

  const position = getMenuPosition(x, y);
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

  const handleCopyPatient = async () => {
    try {
      await navigator.clipboard.writeText(appointment.patient_name || "");
    } catch {
      return;
    }

    onClose?.();
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

    try {
      await navigator.clipboard.writeText(details);
    } catch {
      return;
    }

    onClose?.();
  };

  return (
    <>
      <div className="fixed inset-0 z-[72]" onClick={onClose} />

      <div
        className="fixed z-[73] w-64 overflow-hidden rounded-2xl border border-cf-border bg-cf-surface shadow-[var(--shadow-panel-lg)]"
        style={position}
      >
        <div className="border-b border-cf-border bg-cf-surface-muted/45 px-4 py-3">
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

        <div className="p-2">
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
      </div>
    </>
  );
}
