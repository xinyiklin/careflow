import AppointmentEditBlockedDialog from "../../appointments/components/AppointmentEditBlockedDialog";
import AppointmentHistoryModal from "../../appointments/components/AppointmentHistoryModal";
import AppointmentModal from "../../appointments/components/AppointmentModal";
import InsurancePolicyModal from "./InsurancePolicyModal";
import ProgressNoteModal from "./ProgressNoteModal";
import VitalsIntakeModal from "./VitalsIntakeModal";
import ConfirmDialog from "../../../shared/components/ConfirmDialog";
import DatePickerProvider from "../../../shared/components/DatePickerProvider";

import type { EntityId } from "../../../shared/api/types";
import type { AppointmentLike } from "../../../shared/types/domain";
import type { AppointmentEditSessionActiveEditor } from "../../appointments/api/appointments";
import type {
  AppointmentMode,
  AppointmentResource,
  AppointmentStaff,
  AppointmentStatusOption,
  AppointmentSubmitPayload,
  AppointmentTypeOption,
} from "../../appointments/types";
import type {
  ClinicalEncounter,
  ClinicalVitals,
  ClinicalVitalsFormValues,
  ProgressNoteFormValues,
} from "../../billing/types";
import type {
  InsuranceCarrier,
  InsurancePolicyFormValues,
  InsurancePolicyPayload,
  PatientCareProvider,
  PatientHubInsurancePolicy,
} from "../types";

type ConfirmDialogState = {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText: string;
  cancelText: string;
  variant: "default" | "danger" | "warning";
  onConfirm: (() => void | Promise<void>) | null;
};

type HistoryModalState = {
  isOpen: boolean;
  appointmentId: EntityId | null;
  patientName: string;
  appointmentTime: string;
};

type EditBlockedDialogState = {
  isOpen: boolean;
  activeEditor: AppointmentEditSessionActiveEditor;
};

type ProgressNoteModalState = {
  isOpen: boolean;
  encounter: ClinicalEncounter | null;
  appointment: AppointmentLike | null;
};

type AppointmentFlowModal = {
  isOpen: boolean;
  editingId: EntityId | null;
  formData: Record<string, unknown>;
  mode: string;
};

export type PatientHubModalsProps = {
  facilityId: EntityId | null;
  timeZone?: string;
  patientName: string;

  insurance: {
    isPolicyModalOpen: boolean;
    editingPolicy: PatientHubInsurancePolicy | null;
    carriers: InsuranceCarrier[];
    saving: boolean;
    onClose: () => void;
    onSubmit?: (
      values: InsurancePolicyFormValues | InsurancePolicyPayload
    ) => unknown;
    onDelete?: () => void;
  };

  appointment: {
    modal: AppointmentFlowModal;
    selectedPatient: AppointmentLike | null;
    setSelectedPatient: (patient: AppointmentLike | null) => void;
    physicians: AppointmentStaff[];
    staffs: AppointmentStaff[];
    resources: AppointmentResource[];
    statusOptions: AppointmentStatusOption[];
    typeOptions: AppointmentTypeOption[];
    error: string;
    onSubmit: (data: AppointmentSubmitPayload) => Promise<void>;
    onClose: () => void;
    onDelete: () => void;
    onOpenHistory: () => void;
    onEditSessionBlocked: (editor: AppointmentEditSessionActiveEditor) => void;
  };

  historyModal: HistoryModalState & { onClose: () => void };

  progressNote: {
    state: ProgressNoteModalState;
    providers: PatientCareProvider[];
    canEdit: boolean;
    canSign: boolean;
    canUnsign: boolean;
    saving: boolean;
    signing: boolean;
    unsigning: boolean;
    error: string;
    onClose: () => void;
    onSaveDraft: (values: ProgressNoteFormValues) => Promise<void>;
    onSign: (values: ProgressNoteFormValues) => Promise<void>;
    onUnsign: () => Promise<void>;
  };

  vitals?: {
    state: {
      isOpen: boolean;
      encounter: ClinicalEncounter | null;
      vitals: ClinicalVitals | null;
    };
    saving: boolean;
    error: string;
    onClose: () => void;
    onSubmit: (values: ClinicalVitalsFormValues) => Promise<void>;
  };

  confirmDialog: ConfirmDialogState & { onCancel: () => void };

  editBlockedDialog: EditBlockedDialogState & { onClose: () => void };
};

export default function PatientHubModals({
  facilityId,
  timeZone,
  patientName,
  insurance,
  appointment,
  historyModal,
  progressNote,
  vitals,
  confirmDialog,
  editBlockedDialog,
}: PatientHubModalsProps) {
  return (
    <DatePickerProvider>
      <>
        <InsurancePolicyModal
          isOpen={insurance.isPolicyModalOpen}
          policy={insurance.editingPolicy}
          carriers={insurance.carriers}
          saving={insurance.saving}
          onClose={insurance.onClose}
          onSubmit={insurance.onSubmit}
          onDelete={insurance.onDelete}
        />

        <AppointmentModal
          isOpen={appointment.modal.isOpen}
          mode={appointment.modal.mode as AppointmentMode}
          appointmentId={appointment.modal.editingId}
          formData={appointment.modal.formData}
          facilityId={facilityId}
          physicians={appointment.physicians}
          staffs={appointment.staffs}
          resources={appointment.resources}
          statusOptions={appointment.statusOptions}
          typeOptions={appointment.typeOptions}
          error={appointment.error}
          onSubmit={appointment.onSubmit}
          onClose={appointment.onClose}
          onDelete={appointment.onDelete}
          onOpenHistory={appointment.onOpenHistory}
          selectedPatient={appointment.selectedPatient}
          onSelectPatient={appointment.setSelectedPatient}
          timeZone={timeZone}
          onEditSessionBlocked={appointment.onEditSessionBlocked}
        />

        <AppointmentHistoryModal
          isOpen={historyModal.isOpen}
          appointmentId={historyModal.appointmentId}
          facilityId={facilityId}
          patientName={historyModal.patientName}
          appointmentTime={historyModal.appointmentTime}
          timeZone={timeZone}
          onClose={historyModal.onClose}
        />

        <ProgressNoteModal
          isOpen={progressNote.state.isOpen}
          encounter={progressNote.state.encounter}
          appointment={progressNote.state.appointment}
          patientName={patientName}
          providers={progressNote.providers}
          canEdit={progressNote.canEdit}
          canSign={progressNote.canSign}
          canUnsign={progressNote.canUnsign}
          saving={progressNote.saving}
          signing={progressNote.signing}
          unsigning={progressNote.unsigning}
          error={progressNote.error}
          onClose={progressNote.onClose}
          onSaveDraft={progressNote.onSaveDraft}
          onSign={progressNote.onSign}
          onUnsign={progressNote.onUnsign}
        />

        {vitals ? (
          <VitalsIntakeModal
            isOpen={vitals.state.isOpen}
            encounter={vitals.state.encounter}
            vitals={vitals.state.vitals}
            patientName={patientName}
            saving={vitals.saving}
            error={vitals.error}
            onClose={vitals.onClose}
            onSubmit={vitals.onSubmit}
          />
        ) : null}

        <ConfirmDialog
          isOpen={confirmDialog.isOpen}
          title={confirmDialog.title}
          message={confirmDialog.message}
          confirmText={confirmDialog.confirmText}
          cancelText={confirmDialog.cancelText}
          variant={confirmDialog.variant}
          onConfirm={confirmDialog.onConfirm ?? undefined}
          onCancel={confirmDialog.onCancel}
        />

        <AppointmentEditBlockedDialog
          isOpen={editBlockedDialog.isOpen}
          activeEditor={editBlockedDialog.activeEditor}
          onClose={editBlockedDialog.onClose}
        />
      </>
    </DatePickerProvider>
  );
}
