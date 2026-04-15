import { useEffect, useState } from "react";
import dayjs from "dayjs";
import { useForm, Controller } from "react-hook-form";
import { DateTimePicker } from "@mui/x-date-pickers/DateTimePicker";
import PatientSearchField from "../../patients/components/PatientSearchField";
import { X } from "lucide-react";
import useDraggableModal from "../../../shared/hooks/useDraggableModal";

export default function AppointmentFormModal({
  isOpen,
  mode,
  formData,
  physicians,
  statusOptions,
  typeOptions,
  error,
  onSubmit,
  onClose,
  onDelete,
  selectedPatient,
  onSelectPatient,
  onOpenDetailedSearch,
  onOpenCreatePatient,
}) {
  const {
    register,
    control,
    handleSubmit,
    reset,
    setValue,
    clearErrors,
    formState: { errors },
  } = useForm({
    defaultValues: {
      patient: "",
      doctor_name: "",
      appointment_time: null,
      reason: "",
      status: "",
      appointment_type: "",
      facility: "",
    },
  });

  const [internalError, setInternalError] = useState("");

  const { modalRef, modalStyle, dragHandleProps } = useDraggableModal({
    isOpen,
  });

  useEffect(() => {
    if (!isOpen) return;

    reset({
      patient: selectedPatient?.id || formData.patient || "",
      doctor_name: formData.doctor_name || "",
      appointment_time: formData.appointment_time
        ? dayjs(formData.appointment_time)
        : null,
      reason: formData.reason || "",
      status: formData.status || "",
      appointment_type: formData.appointment_type || "",
      facility: formData.facility || "",
    });

    setInternalError("");
  }, [isOpen, formData, selectedPatient, reset]);

  useEffect(() => {
    setValue("patient", selectedPatient?.id || "");
    if (selectedPatient?.id) {
      clearErrors("patient");
    }
  }, [selectedPatient, setValue, clearErrors]);

  if (!isOpen) return null;

  const submitForm = (data) => {
    try {
      onSubmit({
        ...data,
        patient: selectedPatient?.id || "",
        appointment_time: data.appointment_time
          ? data.appointment_time.format("YYYY-MM-DDTHH:mm")
          : "",
      });
    } catch (err) {
      console.error(err);
      setInternalError("Failed to submit form.");
    }
  };

  const displayError = error || internalError;

  const handleBackdropClick = (e) => {
    e.stopPropagation();
    handleClose();
  };

  const handleClose = () => {
    onClose?.();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-3 py-3 sm:px-4 sm:py-4"
      onClick={handleBackdropClick}
    >
      <div
        ref={modalRef}
        style={modalStyle}
        className="fixed flex max-h-[min(90dvh,900px)] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <form
          onSubmit={handleSubmit(submitForm)}
          className="flex min-h-0 flex-1 flex-col"
        >
          <div
            {...dragHandleProps}
            className="flex cursor-move items-center justify-between border-b border-slate-200 px-6 py-4 select-none"
          >
            <h2 className="text-lg font-semibold text-slate-900">
              {mode === "edit" ? "Edit Appointment" : "Create Appointment"}
            </h2>

            <button
              type="button"
              onPointerDown={(e) => e.stopPropagation()}
              onClick={handleClose}
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-700"
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
            <div className="space-y-4">
              {displayError && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {displayError}
                </div>
              )}

              <input type="hidden" {...register("facility")} />
              <input
                type="hidden"
                {...register("patient", { required: "Patient is required." })}
              />

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Patient
                </label>

                {mode === "edit" ? (
                  <div className="rounded-lg border border-slate-300 bg-slate-50 px-3 py-2">
                    <p className="text-sm font-medium text-slate-900">
                      {selectedPatient?.display_name ||
                        selectedPatient?.full_name ||
                        "No patient"}
                    </p>
                    <p className="text-xs text-slate-500">
                      {selectedPatient?.date_of_birth
                        ? `DOB: ${selectedPatient.date_of_birth}`
                        : ""}
                      {selectedPatient?.chart_number
                        ? ` • MRN: ${selectedPatient.chart_number}`
                        : ""}
                    </p>
                  </div>
                ) : (
                  <>
                    <PatientSearchField
                      selectedPatient={selectedPatient}
                      onSelectPatient={onSelectPatient}
                      onOpenDetailedSearch={onOpenDetailedSearch}
                      onOpenCreatePatient={onOpenCreatePatient}
                    />
                    {errors.patient && (
                      <p className="mt-1 text-sm text-red-600">
                        {errors.patient.message}
                      </p>
                    )}
                  </>
                )}
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Physician
                </label>
                <select
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                  {...register("doctor_name", {
                    required: "Physician is required.",
                  })}
                >
                  <option value="">Select a physician</option>
                  {physicians.map((physician) => (
                    <option key={physician.id} value={physician.name}>
                      {physician.title
                        ? `${physician.title.toUpperCase()} ${physician.name}`
                        : physician.name}
                    </option>
                  ))}
                </select>
                {errors.doctor_name && (
                  <p className="mt-1 text-sm text-red-600">
                    {errors.doctor_name.message}
                  </p>
                )}
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Appointment Time
                </label>
                <Controller
                  name="appointment_time"
                  control={control}
                  rules={{ required: "Appointment time is required." }}
                  render={({ field }) => (
                    <DateTimePicker
                      value={field.value}
                      onChange={field.onChange}
                      slotProps={{
                        textField: {
                          size: "small",
                          fullWidth: true,
                          error: !!errors.appointment_time,
                          helperText: errors.appointment_time?.message || "",
                          sx: { width: "100%" },
                        },
                      }}
                    />
                  )}
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Visit Type
                </label>
                <select
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                  {...register("appointment_type", {
                    required: "Visit type is required.",
                  })}
                >
                  <option value="">Select visit type</option>
                  {typeOptions.map((option) => (
                    <option key={option.id} value={option.id}>
                      {option.name}
                    </option>
                  ))}
                </select>
                {errors.appointment_type && (
                  <p className="mt-1 text-sm text-red-600">
                    {errors.appointment_type.message}
                  </p>
                )}
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Status
                </label>
                <select
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                  {...register("status", { required: "Status is required." })}
                >
                  <option value="">Select status</option>
                  {statusOptions.map((option) => (
                    <option key={option.id} value={option.id}>
                      {option.name}
                    </option>
                  ))}
                </select>
                {errors.status && (
                  <p className="mt-1 text-sm text-red-600">
                    {errors.status.message}
                  </p>
                )}
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Reason
                </label>
                <textarea
                  rows="3"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 shadow-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                  {...register("reason")}
                />
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 border-t border-slate-200 px-6 py-4">
            {mode === "edit" && (
              <button
                type="button"
                className="mr-auto rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-red-700"
                onClick={onDelete}
              >
                Delete
              </button>
            )}

            <button
              type="button"
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
              onClick={onClose}
            >
              Cancel
            </button>

            <button
              type="submit"
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700"
            >
              {mode === "edit" ? "Save Changes" : "Create Appointment"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
