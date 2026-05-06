import { useEffect, useMemo, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import type { SubmitHandler } from "react-hook-form";
import { DateTimePicker } from "@mui/x-date-pickers/DateTimePicker";
import { useQuery } from "@tanstack/react-query";
import { ClipboardList, Clock3, UserRoundCheck } from "lucide-react";

import { fetchPatientById } from "../../patients/api/patients";
import { fetchPatientInsurancePolicies } from "../../patients/api/insurance";
import useAppointmentEditSession from "../hooks/useAppointmentEditSession";
import { getPatientPhoneEntries } from "../../patients/utils/contactValidation";
import { Button, Input, Notice } from "../../../shared/components/ui";
import { MUI_DATE_FIELD_SX } from "../../../shared/components/ui/dateFieldStyles";
import useDraggableModal from "../../../shared/hooks/useDraggableModal";
import {
  formatDateOnlyInTimeZone,
  formatTimeInTimeZone,
} from "../../../shared/utils/dateTime";
import { getErrorMessage } from "../../../shared/utils/errors";
import type { EntityId } from "../../../shared/api/types";
import type { AppointmentLike } from "../../../shared/types/domain";
import type { AppointmentEditSessionActiveEditor } from "../api/appointments";
import {
  ChipPicker,
  FieldLabel,
  FormSection,
  ReadOnlyValueField,
} from "./AppointmentModalFields";
import AppointmentModalHeader from "./AppointmentModalHeader";
import AppointmentPatientLens from "./AppointmentPatientLens";
import {
  addMinutes,
  formatAddress,
  formatPickerValueForApi,
  getPatientDisplayName,
  getPhysicianLabel,
  getPrimaryInsurancePolicy,
  isRenderingProviderStaff,
  parseFacilityLocalDateTime,
} from "./appointmentModalUtils";
import type {
  AppointmentFormData,
  AppointmentFormValues,
  AppointmentMode,
  AppointmentPatient,
  AppointmentResource,
  AppointmentStaff,
  AppointmentStatusOption,
  AppointmentSubmitPayload,
  AppointmentTypeOption,
  PatientInsurancePolicy,
} from "../types";

type AppointmentModalProps = {
  isOpen: boolean;
  mode: AppointmentMode;
  appointmentId?: EntityId | null;
  formData: AppointmentFormData;
  facilityId?: EntityId | null;
  physicians?: AppointmentStaff[];
  staffs?: AppointmentStaff[];
  resources: AppointmentResource[];
  statusOptions: AppointmentStatusOption[];
  typeOptions: AppointmentTypeOption[];
  error?: string;
  onSubmit: (payload: AppointmentSubmitPayload) => void | Promise<void>;
  onClose?: () => void;
  onDelete?: () => void;
  onOpenHistory?: (appointment?: AppointmentLike | null) => void;
  onOpenPatientHub?: (patient?: AppointmentPatient | AppointmentLike) => void;
  selectedPatient?: AppointmentPatient | null;
  onSelectPatient?: (patient: AppointmentPatient | null) => void;
  recentPatients?: AppointmentPatient[];
  onOpenDetailedSearch?: () => void;
  onOpenCreatePatient?: () => void;
  timeZone?: string | null;
  onEditSessionBlocked?: (
    activeEditor: AppointmentEditSessionActiveEditor
  ) => void;
};

function toFormString(value: unknown): string {
  return value === null || value === undefined ? "" : String(value);
}

function getDurationMinutes(
  start: Date | null | undefined,
  end: Date | null | undefined
): number {
  if (
    !(start instanceof Date) ||
    !(end instanceof Date) ||
    Number.isNaN(start.getTime()) ||
    Number.isNaN(end.getTime())
  ) {
    return 0;
  }

  return Math.max(0, Math.round((end.getTime() - start.getTime()) / 60000));
}

export default function AppointmentModal({
  isOpen,
  mode,
  appointmentId,
  formData,
  facilityId,
  staffs = [],
  resources,
  statusOptions,
  typeOptions,
  error,
  onSubmit,
  onClose,
  onDelete,
  onOpenHistory,
  onOpenPatientHub,
  selectedPatient,
  onSelectPatient,
  recentPatients = [],
  onOpenDetailedSearch,
  onOpenCreatePatient,
  timeZone,
  onEditSessionBlocked,
}: AppointmentModalProps) {
  const {
    register,
    control,
    handleSubmit,
    reset,
    setValue,
    clearErrors,
    watch,
    formState: { errors },
  } = useForm<AppointmentFormValues>({
    defaultValues: {
      patient: "",
      resource: "",
      rendering_provider: "",
      appointment_time: null,
      end_time: null,
      room: "",
      reason: "",
      notes: "",
      status: "",
      appointment_type: "",
      facility: "",
    },
  });

  const [internalError, setInternalError] = useState("");
  const { modalRef, modalStyle, dragHandleProps } = useDraggableModal({
    isOpen,
  });
  const editSession = useAppointmentEditSession({
    appointmentId,
    facilityId,
    isOpen,
    mode,
  });

  useEffect(() => {
    if (!isOpen) return;

    const initialResourceId = toFormString(formData.resource);
    const initialResource =
      resources.find(
        (resource) => String(resource.id) === String(initialResourceId)
      ) || null;
    const initialAppointmentTime = formData.appointment_time
      ? parseFacilityLocalDateTime(formData.appointment_time, timeZone)
      : null;
    const initialAppointmentType =
      typeOptions.find(
        (option) => String(option.id) === String(formData.appointment_type)
      ) || null;
    const initialDuration =
      Number(formData.duration_minutes) ||
      Number(initialAppointmentType?.duration_minutes) ||
      0;
    const initialEndTime = formData.end_time
      ? parseFacilityLocalDateTime(formData.end_time, timeZone)
      : addMinutes(initialAppointmentTime, initialDuration);

    reset({
      patient: toFormString(selectedPatient?.id || formData.patient),
      resource: initialResourceId,
      rendering_provider: toFormString(formData.rendering_provider),
      appointment_time: initialAppointmentTime,
      end_time: initialEndTime,
      room: formData.room || initialResource?.default_room || "",
      reason: formData.reason || "",
      notes: formData.notes || "",
      status: toFormString(formData.status),
      appointment_type: toFormString(formData.appointment_type),
      facility: toFormString(formData.facility || facilityId),
    });

    setInternalError("");
  }, [
    facilityId,
    formData,
    isOpen,
    reset,
    resources,
    selectedPatient,
    timeZone,
    typeOptions,
  ]);

  useEffect(() => {
    setValue("patient", toFormString(selectedPatient?.id));
    if (selectedPatient?.id) {
      clearErrors("patient");
    }
  }, [selectedPatient, setValue, clearErrors]);

  useEffect(() => {
    if (!editSession.isBlockedByActiveEditor) return;

    onEditSessionBlocked?.(editSession.activeEditor);
    onClose?.();
  }, [
    editSession.activeEditor,
    editSession.isBlockedByActiveEditor,
    onClose,
    onEditSessionBlocked,
  ]);

  const watchedAppointmentTime = watch("appointment_time");
  const watchedEndTime = watch("end_time");
  const watchedResource = watch("resource");
  const watchedRenderingProvider = watch("rendering_provider");
  const watchedAppointmentType = watch("appointment_type");
  const selectedAppointmentType = useMemo(
    () =>
      typeOptions.find(
        (option) => String(option.id) === String(watchedAppointmentType)
      ) || null,
    [typeOptions, watchedAppointmentType]
  );

  const watchedStatus = watch("status");
  const selectedStatusOption = useMemo(
    () =>
      statusOptions.find(
        (option) => String(option.id) === String(watchedStatus)
      ) || null,
    [statusOptions, watchedStatus]
  );

  const appointmentHeaderDate = useMemo(() => {
    if (!watchedAppointmentTime) return "—";
    return formatDateOnlyInTimeZone(
      watchedAppointmentTime,
      timeZone,
      "MMM d, yyyy"
    );
  }, [watchedAppointmentTime, timeZone]);

  const appointmentHeaderTime = useMemo(() => {
    if (!watchedAppointmentTime) return "—";
    return formatTimeInTimeZone(watchedAppointmentTime, timeZone, "h:mm a");
  }, [watchedAppointmentTime, timeZone]);

  const appointmentHeaderEndTime = useMemo(() => {
    if (!watchedEndTime) return "";
    return formatTimeInTimeZone(watchedEndTime, timeZone, "h:mm a");
  }, [watchedEndTime, timeZone]);

  const selectedPatientId = selectedPatient?.id || formData.patient || "";
  const patientDetailsQuery = useQuery<AppointmentPatient>({
    queryKey: [
      "appointmentPatientSnapshot",
      facilityId || null,
      selectedPatientId || null,
    ],
    queryFn: async () =>
      (await fetchPatientById(selectedPatientId as EntityId, facilityId)) || {},
    enabled: isOpen && Boolean(facilityId && selectedPatientId),
    staleTime: 60_000,
  });
  const insurancePoliciesQuery = useQuery<PatientInsurancePolicy[]>({
    queryKey: [
      "appointmentPatientInsuranceSnapshot",
      facilityId || null,
      selectedPatientId || null,
    ],
    queryFn: async () =>
      (await fetchPatientInsurancePolicies({
        facilityId,
        patientId: selectedPatientId,
      })) || [],
    enabled: isOpen && Boolean(facilityId && selectedPatientId),
    staleTime: 60_000,
  });
  const patientSnapshot: AppointmentPatient =
    patientDetailsQuery.data || selectedPatient || {};
  const primaryInsurancePolicy = getPrimaryInsurancePolicy(
    insurancePoliciesQuery.data
  );
  const renderingProviderOptions = useMemo(
    () => staffs.filter(isRenderingProviderStaff),
    [staffs]
  );
  const selectedResource = useMemo(
    () =>
      resources.find(
        (resource) => String(resource.id) === String(watchedResource)
      ) || null,
    [resources, watchedResource]
  );
  const selectedRenderingProvider = useMemo(
    () =>
      renderingProviderOptions.find(
        (staff) => String(staff.id) === String(watchedRenderingProvider)
      ) || null,
    [renderingProviderOptions, watchedRenderingProvider]
  );

  useEffect(() => {
    if (!isOpen || mode !== "create" || !watchedResource) return;

    const linkedRenderingProvider = renderingProviderOptions.find(
      (staff) => String(staff.id) === String(selectedResource?.linked_staff)
    );

    if (linkedRenderingProvider) {
      setValue("rendering_provider", String(linkedRenderingProvider.id), {
        shouldDirty: true,
      });
    }
  }, [
    isOpen,
    mode,
    renderingProviderOptions,
    selectedResource,
    setValue,
    watchedResource,
  ]);

  if (!isOpen) return null;

  const isEditSessionUnavailable = Boolean(
    mode === "edit" &&
    appointmentId &&
    (editSession.isChecking ||
      editSession.isBlockedByActiveEditor ||
      editSession.status === "error")
  );

  const submitForm: SubmitHandler<AppointmentFormValues> = (data) => {
    if (editSession.isBlockedByActiveEditor) {
      onEditSessionBlocked?.(editSession.activeEditor);
      onClose?.();
      return;
    }

    if (isEditSessionUnavailable) {
      setInternalError("Retry the editing check before saving.");
      return;
    }

    try {
      const payload: AppointmentSubmitPayload = {
        ...data,
        patient: selectedPatient?.id || "",
        facility: data.facility || toFormString(facilityId),
        appointment_time: formatPickerValueForApi(data.appointment_time),
        end_time: formatPickerValueForApi(data.end_time),
      };
      onSubmit(payload);
    } catch (err) {
      setInternalError(getErrorMessage(err, "Failed to submit form."));
    }
  };

  const displayError = error || internalError;
  const editSessionError = editSession.error;
  const patientDisplayName = getPatientDisplayName(patientSnapshot);
  const patientPhones = getPatientPhoneEntries(patientSnapshot);
  const patientAddress = formatAddress(patientSnapshot.address);
  const selectedStatusColor = selectedStatusOption?.color || null;
  const providerDisplayName = selectedRenderingProvider
    ? getPhysicianLabel(selectedRenderingProvider)
    : formData.rendering_provider_name || "";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 py-4"
      onClick={(e) => {
        e.stopPropagation();
        onClose?.();
      }}
    >
      <div
        ref={modalRef}
        style={modalStyle}
        className="fixed flex h-[min(88vh,860px)] w-[min(1180px,96vw)] flex-col overflow-hidden rounded-2xl border border-cf-border bg-cf-surface shadow-[var(--shadow-panel-lg)]"
        onClick={(e) => e.stopPropagation()}
      >
        <form
          onSubmit={handleSubmit(submitForm)}
          className="flex min-h-0 flex-1 flex-col"
        >
          <AppointmentModalHeader
            dragHandleProps={dragHandleProps}
            patientDisplayName={patientDisplayName}
            selectedPatient={selectedPatient}
            mode={mode}
            formData={formData}
            appointmentHeaderDate={appointmentHeaderDate}
            appointmentHeaderTime={appointmentHeaderTime}
            appointmentHeaderEndTime={appointmentHeaderEndTime}
            selectedResource={selectedResource}
            providerDisplayName={providerDisplayName}
            selectedStatusOption={selectedStatusOption}
            selectedStatusColor={selectedStatusColor}
            onOpenHistory={onOpenHistory}
            onClose={onClose}
          />

          <div className="min-h-0 flex-1 overflow-hidden">
            <input type="hidden" {...register("facility")} />
            <input
              type="hidden"
              {...register("patient", { required: "Patient is required." })}
            />
            <input
              type="hidden"
              {...register("appointment_type", {
                required: "Visit type is required.",
              })}
            />
            <input
              type="hidden"
              {...register("status", { required: "Status is required." })}
            />

            <div className="grid h-full min-h-0 lg:grid-cols-[minmax(0,1fr)_320px]">
              <AppointmentPatientLens
                selectedPatient={selectedPatient}
                onOpenPatientHub={onOpenPatientHub}
                patientDisplayName={patientDisplayName}
                patientSnapshot={patientSnapshot}
                mode={mode}
                facilityId={facilityId}
                onSelectPatient={onSelectPatient}
                onOpenDetailedSearch={onOpenDetailedSearch}
                onOpenCreatePatient={onOpenCreatePatient}
                recentPatients={recentPatients}
                patientDetailsQuery={patientDetailsQuery}
                errors={errors}
                patientPhones={patientPhones}
                patientAddress={patientAddress}
                insurancePoliciesQuery={insurancePoliciesQuery}
                primaryInsurancePolicy={primaryInsurancePolicy}
              />

              <div className="min-h-0 overflow-y-auto bg-cf-surface lg:order-1">
                {editSessionError ? (
                  <div className="px-5 pt-4">
                    <Notice tone="danger" title="Editing check failed">
                      <div className="space-y-3">
                        <p>{editSessionError}</p>
                        <Button
                          type="button"
                          size="sm"
                          variant="danger"
                          onClick={() => editSession.beginSession()}
                        >
                          Retry
                        </Button>
                      </div>
                    </Notice>
                  </div>
                ) : null}

                {displayError ? (
                  <div className="px-5 pt-4">
                    <Notice tone="danger" title="Appointment was not saved">
                      {displayError}
                    </Notice>
                  </div>
                ) : null}

                <FormSection icon={Clock3} title="Schedule">
                  <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                    <div className="md:col-span-1 xl:col-span-1">
                      <FieldLabel required>Appointment Time</FieldLabel>
                      <Controller
                        name="appointment_time"
                        control={control}
                        rules={{ required: "Appointment time is required." }}
                        render={({ field }) => (
                          <DateTimePicker
                            enableAccessibleFieldDOMStructure={false}
                            value={field.value}
                            onChange={(nextValue) => {
                              const nextDuration =
                                getDurationMinutes(
                                  field.value,
                                  watchedEndTime
                                ) ||
                                selectedAppointmentType?.duration_minutes ||
                                0;
                              field.onChange(nextValue);
                              setValue(
                                "end_time",
                                addMinutes(nextValue, nextDuration),
                                {
                                  shouldDirty: true,
                                  shouldValidate: true,
                                }
                              );
                            }}
                            slotProps={{
                              textField: {
                                size: "small",
                                fullWidth: true,
                                error: !!errors.appointment_time,
                                helperText:
                                  errors.appointment_time?.message || "",
                                sx: MUI_DATE_FIELD_SX,
                              },
                            }}
                          />
                        )}
                      />
                    </div>

                    <div>
                      <FieldLabel required>End Time</FieldLabel>
                      <Controller
                        name="end_time"
                        control={control}
                        rules={{
                          required: "End time is required.",
                          validate: (value) =>
                            getDurationMinutes(watchedAppointmentTime, value) >
                            0
                              ? true
                              : "End time must be after start time.",
                        }}
                        render={({ field }) => (
                          <DateTimePicker
                            enableAccessibleFieldDOMStructure={false}
                            value={field.value}
                            onChange={field.onChange}
                            slotProps={{
                              textField: {
                                size: "small",
                                fullWidth: true,
                                error: !!errors.end_time,
                                helperText: errors.end_time?.message || "",
                                sx: MUI_DATE_FIELD_SX,
                              },
                            }}
                          />
                        )}
                      />
                    </div>

                    <div>
                      <FieldLabel required>Resource</FieldLabel>
                      <Input
                        as="select"
                        {...register("resource", {
                          required: "Resource is required.",
                          onChange: (event) => {
                            const nextResource =
                              resources.find(
                                (resource) =>
                                  String(resource.id) === event.target.value
                              ) || null;
                            if (!watch("room") && nextResource?.default_room) {
                              setValue("room", nextResource.default_room, {
                                shouldDirty: true,
                              });
                            }
                          },
                        })}
                      >
                        <option
                          value=""
                          disabled={resources.length > 0}
                          hidden={resources.length > 0}
                        >
                          {resources.length
                            ? "Select a resource"
                            : "No active resources"}
                        </option>
                        {resources.map((resource) => (
                          <option key={resource.id} value={resource.id}>
                            {resource.name}
                          </option>
                        ))}
                      </Input>
                      {errors.resource ? (
                        <p className="mt-1 text-sm text-cf-danger-text">
                          {errors.resource.message}
                        </p>
                      ) : null}
                    </div>

                    <div>
                      <FieldLabel>Room</FieldLabel>
                      <Input {...register("room")} />
                      {selectedResource?.default_room ? (
                        <p className="mt-1 text-xs text-cf-text-subtle">
                          Defaults to {selectedResource.default_room} for this
                          resource.
                        </p>
                      ) : null}
                    </div>
                  </div>

                  <div className="mt-5">
                    <ChipPicker
                      label="Visit Type"
                      required
                      options={typeOptions}
                      value={watchedAppointmentType}
                      onChange={(optionId) => {
                        setValue("appointment_type", String(optionId), {
                          shouldDirty: true,
                          shouldValidate: true,
                        });
                        const nextType = typeOptions.find(
                          (option) => String(option.id) === String(optionId)
                        );
                        if (watchedAppointmentTime && nextType) {
                          setValue(
                            "end_time",
                            addMinutes(
                              watchedAppointmentTime,
                              nextType.duration_minutes || 0
                            ),
                            {
                              shouldDirty: true,
                              shouldValidate: true,
                            }
                          );
                        }
                      }}
                      error={errors.appointment_type?.message}
                      singleRow
                      getMeta={(option) =>
                        option.duration_minutes
                          ? `${option.duration_minutes} min`
                          : null
                      }
                    />
                  </div>

                  <div className="mt-5">
                    <ChipPicker
                      label="Status"
                      required
                      options={statusOptions}
                      value={watchedStatus}
                      onChange={(optionId) =>
                        setValue("status", String(optionId), {
                          shouldDirty: true,
                          shouldValidate: true,
                        })
                      }
                      error={errors.status?.message}
                      singleRow
                    />
                  </div>
                </FormSection>

                <FormSection icon={UserRoundCheck} title="Clinical & Billing">
                  <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(14rem,0.65fr)]">
                    <div>
                      <FieldLabel>Rendering Provider</FieldLabel>
                      <Input as="select" {...register("rendering_provider")}>
                        <option value="">No rendering provider selected</option>
                        {renderingProviderOptions.map((provider) => (
                          <option key={provider.id} value={provider.id}>
                            {getPhysicianLabel(provider)}
                          </option>
                        ))}
                      </Input>
                    </div>

                    <div>
                      <FieldLabel>Billing Route</FieldLabel>
                      <ReadOnlyValueField
                        value={
                          selectedRenderingProvider
                            ? "Provider ready"
                            : selectedResource?.linked_staff_name
                              ? "Linked resource"
                              : "Needs provider"
                        }
                      />
                    </div>
                  </div>
                </FormSection>

                <FormSection icon={ClipboardList} title="Visit Context">
                  <div className="grid gap-3 lg:grid-cols-2">
                    <div>
                      <FieldLabel>Reason</FieldLabel>
                      <Input
                        as="textarea"
                        rows={3}
                        placeholder="Annual checkup, medication follow-up, intake, or similar"
                        {...register("reason")}
                      />
                    </div>

                    <div>
                      <FieldLabel>Notes</FieldLabel>
                      <Input
                        as="textarea"
                        rows={3}
                        placeholder="Anything the team should know before or during the visit"
                        {...register("notes")}
                      />
                    </div>
                  </div>
                </FormSection>
              </div>
            </div>
          </div>

          <div className="flex shrink-0 flex-col gap-3 border-t border-cf-border bg-cf-surface px-5 py-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-center gap-2">
              {mode === "edit" ? (
                <Button type="button" onClick={onDelete} variant="danger">
                  Delete
                </Button>
              ) : null}
            </div>

            <div className="flex items-center justify-end gap-3">
              <Button type="button" onClick={onClose} variant="default">
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                disabled={isEditSessionUnavailable}
              >
                {mode === "edit" ? "Save Changes" : "Create Appointment"}
              </Button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
