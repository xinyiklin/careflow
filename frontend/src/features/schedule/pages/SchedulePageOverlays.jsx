import AppointmentContextMenu from "../../appointments/components/AppointmentContextMenu";
import AppointmentHistoryModal from "../../appointments/components/AppointmentHistoryModal";
import AppointmentModal from "../../appointments/components/AppointmentModal";
import ConfirmDialog from "../../../shared/components/ConfirmDialog";

export default function SchedulePageOverlays({
  appError,
  appointmentFlow,
  confirmDialogState,
  contextMenuState,
  facility,
  handleCloseAppointmentHistory,
  handleCloseAppointmentModal,
  handleConfirmDialogConfirm,
  handleDeleteAppointment,
  handleDeleteAppointmentFromMenu,
  handleOpenAppointmentHistory,
  handleOpenDuplicate,
  handleOpenEdit,
  handleOpenPatientHub,
  handleSubmitAppointment,
  historyModalState,
  onCloseAppointmentContextMenu,
  onCloseConfirmDialog,
  onOpenPatientSearch,
  patientFlow,
  physicians,
  recentPatients,
  resources,
  selectedFacilityId,
  staffs,
  statusOptions,
  typeOptions,
}) {
  return (
    <>
      <AppointmentModal
        isOpen={appointmentFlow.modal.isOpen}
        mode={appointmentFlow.modal.mode}
        formData={appointmentFlow.modal.formData}
        facilityId={selectedFacilityId}
        physicians={physicians}
        staffs={staffs}
        resources={resources}
        statusOptions={statusOptions}
        typeOptions={typeOptions}
        error={appError}
        onSubmit={handleSubmitAppointment}
        onClose={handleCloseAppointmentModal}
        onDelete={handleDeleteAppointment}
        onOpenHistory={handleOpenAppointmentHistory}
        onOpenPatientHub={() => {
          const patientId = appointmentFlow.selectedPatient?.id;
          if (patientId) patientFlow.hub.openById(patientId);
        }}
        selectedPatient={appointmentFlow.selectedPatient}
        onSelectPatient={appointmentFlow.setSelectedPatient}
        recentPatients={recentPatients}
        onOpenDetailedSearch={() =>
          onOpenPatientSearch("appointment", {
            onSelectPatient: appointmentFlow.setSelectedPatient,
          })
        }
        onOpenCreatePatient={() =>
          patientFlow.modal.open({ mode: "create", source: "appointment" })
        }
        timeZone={facility?.timezone}
      />

      <AppointmentContextMenu
        isOpen={contextMenuState.isOpen}
        appointment={contextMenuState.appointment}
        x={contextMenuState.x}
        y={contextMenuState.y}
        timeZone={facility?.timezone}
        onClose={onCloseAppointmentContextMenu}
        onOpenAppointment={handleOpenEdit}
        onOpenPatientHub={handleOpenPatientHub}
        onDuplicateAppointment={handleOpenDuplicate}
        onOpenHistory={handleOpenAppointmentHistory}
        onDeleteAppointment={handleDeleteAppointmentFromMenu}
      />

      <AppointmentHistoryModal
        isOpen={historyModalState.isOpen}
        appointmentId={historyModalState.appointmentId}
        facilityId={selectedFacilityId}
        patientName={historyModalState.patientName}
        appointmentTime={historyModalState.appointmentTime}
        timeZone={facility?.timezone}
        onClose={handleCloseAppointmentHistory}
      />

      <ConfirmDialog
        isOpen={confirmDialogState.isOpen}
        title={confirmDialogState.title}
        message={confirmDialogState.message}
        confirmText={confirmDialogState.confirmText}
        cancelText={confirmDialogState.cancelText}
        variant={confirmDialogState.variant}
        onConfirm={handleConfirmDialogConfirm}
        onCancel={onCloseConfirmDialog}
      />
    </>
  );
}
