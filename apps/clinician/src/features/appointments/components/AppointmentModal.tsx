import { useEffect, useId, useMemo, useState } from "react";
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
import useModalFocusTrap from "../../../shared/hooks/useModalFocusTrap";
import {
  useLatestOpenValue,
  useModalPresence,
} from "../../../shared/hooks/useModalPresence";
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
  LabeledField,
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
  const { isClosing, shouldRender } = useModalPresence(isOpen);
  const displayedState = useLatestOpenValue(
    {
      appointmentId,
      error,
      facilityId,
      formData,
      mode,
      selectedPatient,
      timeZone,
    },
    isOpen
  );
  const displayedAppointmentId = displayedState.appointmentId;
  const displayedError = displayedState.error;
  const displayedFacilityId = displayedState.facilityId;
  const displayedFormData = displayedState.formData;
  const displayedMode = displayedState.mode;
  const displayedSelectedPatient = displayedState.selectedPatient;
  const displayedTimeZone = displayedState.timeZone;
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
      is_billable: true,
    },
  });

  const appointmentTimeId = useId();
  const endTimeId = useId();
  const billingLabelId = useId();

  const [internalError, setInternalError] = useState("");
  const { modalRef, modalStyle, dragHandleProps } = useDraggableModal({
    isOpen,
  });
  const { handlePanelKeyDown } = useModalFocusTrap(modalRef, isOpen, onClose);
  const editSession = useAppointmentEditSession({
    appointmentId: displayedAppointmentId,
    facilityId: displayedFacilityId,
    isOpen,
    mode: displayedMode,
  });

  useEffect(() => {
    if (!isOpen) return;

    const initialResourceId = toFormString(displayedFormData.resource);
    const initialResource =
      resources.find(
        (resource) => String(resource.id) === String(initialResourceId)
      ) || null;
    const initialAppointmentTime = displayedFormData.appointment_time
      ? parseFacilityLocalDateTime(
          displayedFormData.appointment_time,
          displayedTimeZone
        )
      : null;
    const initialAppointmentType =
      typeOptions.find(
        (option) =>
          String(option.id) === String(displayedFormData.appointment_type)
      ) || null;
    const initialDuration =
      Number(displayedFormData.duration_minutes) ||
      Number(initialAppointmentType?.duration_minutes) ||
      0;
    const initialEndTime = displayedFormData.end_time
      ? parseFacilityLocalDateTime(
          displayedFormData.end_time,
          displayedTimeZone
        )
      : addMinutes(initialAppointmentTime, initialDuration);

    reset({
      patient: toFormString(
        displayedSelectedPatient?.id || displayedFormData.patient
      ),
      resource: initialResourceId,
      rendering_provider: toFormString(displayedFormData.rendering_provider),
      appointment_time: initialAppointmentTime,
      end_time: initialEndTime,
      room: displayedFormData.room || initialResource?.default_room || "",
      reason: displayedFormData.reason || "",
      notes: displayedFormData.notes || "",
      status: toFormString(displayedFormData.status),
      appointment_type: toFormString(displayedFormData.appointment_type),
      facility: toFormString(displayedFormData.facility || displayedFacilityId),
      is_billable: displayedFormData.is_billable !== false,
    });

    setInternalError("");
  }, [
    displayedFacilityId,
    displayedFormData,
    displayedSelectedPatient,
    displayedTimeZone,
    isOpen,
    reset,
    resources,
    typeOptions,
  ]);

  useEffect(() => {
    setValue("patient", toFormString(displayedSelectedPatient?.id));
    if (displayedSelectedPatient?.id) {
      clearErrors("patient");
    }
  }, [displayedSelectedPatient, setValue, clearErrors]);

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
      displayedTimeZone,
      "MMM d, yyyy"
    );
  }, [watchedAppointmentTime, displayedTimeZone]);

  const appointmentHeaderTime = useMemo(() => {
    if (!watchedAppointmentTime) return "—";
    return formatTimeInTimeZone(
      watchedAppointmentTime,
      displayedTimeZone,
      "h:mm a"
    );
  }, [watchedAppointmentTime, displayedTimeZone]);

  const appointmentHeaderEndTime = useMemo(() => {
    if (!watchedEndTime) return "";
    return formatTimeInTimeZone(watchedEndTime, displayedTimeZone, "h:mm a");
  }, [watchedEndTime, displayedTimeZone]);

  const selectedPatientId =
    displayedSelectedPatient?.id || displayedFormData.patient || "";
  const patientDetailsQuery = useQuery<AppointmentPatient>({
    queryKey: [
      "appointmentPatientSnapshot",
      displayedFacilityId || null,
      selectedPatientId || null,
    ],
    queryFn: async () =>
      (await fetchPatientById(
        selectedPatientId as EntityId,
        displayedFacilityId
      )) || {},
    enabled: isOpen && Boolean(displayedFacilityId && selectedPatientId),
    staleTime: 60_000,
  });
  const insurancePoliciesQuery = useQuery<PatientInsurancePolicy[]>({
    queryKey: [
      "appointmentPatientInsuranceSnapshot",
      displayedFacilityId || null,
      selectedPatientId || null,
    ],
    queryFn: async () =>
      (await fetchPatientInsurancePolicies({
        facilityId: displayedFacilityId,
        patientId: selectedPatientId,
      })) || [],
    enabled: isOpen && Boolean(displayedFacilityId && selectedPatientId),
    staleTime: 60_000,
  });
  const patientSnapshot: AppointmentPatient =
    patientDetailsQuery.data || displayedSelectedPatient || {};
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
    if (!isOpen || displayedMode !== "create" || !watchedResource) return;

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
    displayedMode,
    renderingProviderOptions,
    selectedResource,
    setValue,
    watchedResource,
  ]);

  if (!shouldRender) return null;

  const isEditSessionUnavailable = Boolean(
    displayedMode === "edit" &&
    displayedAppointmentId &&
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
        patient: displayedSelectedPatient?.id || "",
        facility: data.facility || toFormString(displayedFacilityId),
        appointment_time: formatPickerValueForApi(data.appointment_time),
        end_time: formatPickerValueForApi(data.end_time),
      };
      onSubmit(payload);
    } catch (err) {
      setInternalError(getErrorMessage(err, "Failed to submit form."));
    }
  };

  const displayError = displayedError || internalError;
  const editSessionError = editSession.error;
  const patientDisplayName = getPatientDisplayName(patientSnapshot);
  const patientPhones = getPatientPhoneEntries(patientSnapshot);
  const patientAddress = formatAddress(patientSnapshot.address);
  const selectedStatusColor = selectedStatusOption?.color || null;
  const providerDisplayName = selectedRenderingProvider
    ? getPhysicianLabel(selectedRenderingProvider)
    : displayedFormData.rendering_provider_name || "";

  return (
    <div
      className={[
        "cf-modal-backdrop fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 py-4",
        isClosing ? "is-closing" : "is-opening",
      ].join(" ")}
      onClick={(e) => {
        e.stopPropagation();
        onClose?.();
      }}
    >
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-label={
          displayedMode === "create" ? "New Appointment" : "Edit Appointment"
        }
        tabIndex={-1}
        onKeyDown={handlePanelKeyDown}
        style={modalStyle}
        className={[
          "cf-modal-panel fixed flex h-[min(92vh,940px)] w-[min(1220px,96vw)] flex-col overflow-hidden rounded-2xl border border-cf-border bg-cf-surface shadow-[var(--shadow-panel-lg)]",
          isClosing ? "is-closing" : "is-opening",
        ].join(" ")}
        onClick={(e) => e.stopPropagation()}
      >
        <form
          onSubmit={handleSubmit(submitForm)}
          className="flex min-h-0 flex-1 flex-col"
        >
          <AppointmentModalHeader
            dragHandleProps={dragHandleProps}
            patientDisplayName={patientDisplayName}
            selectedPatient={displayedSelectedPatient}
            mode={displayedMode}
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

            <div className="grid h-full min-h-0 lg:grid-cols-[minmax(0,1fr)_280px]">
              <AppointmentPatientLens
                selectedPatient={displayedSelectedPatient}
                onOpenPatientHub={onOpenPatientHub}
                patientDisplayName={patientDisplayName}
                patientSnapshot={patientSnapshot}
                mode={displayedMode}
                facilityId={displayedFacilityId}
                onSelectPatient={onSelectPatient}
                onOpenDetailedSearch={onOpenDetailedSearch}
                onOpenCreatePatient={onOpenCreatePatient}
                recentPatients={recentPatients}
                errors={errors}
                patientPhones={patientPhones}
                patientAddress={patientAddress}
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
                      <FieldLabel required htmlFor={appointmentTimeId}>
                        Appointment Time
                      </FieldLabel>
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
                                id: appointmentTimeId,
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
                      <FieldLabel required htmlFor={endTimeId}>
                        End Time
                      </FieldLabel>
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
                                id: endTimeId,
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

                    <LabeledField
                      label="Resource"
                      required
                      error={errors.resource?.message}
                    >
                      {(fieldId) => (
                        <Input
                          id={fieldId}
                          as="select"
                          {...register("resource", {
                            required: "Resource is required.",
                            onChange: (event) => {
                              const nextResource =
                                resources.find(
                                  (resource) =>
                                    String(resource.id) === event.target.value
                                ) || null;
                              if (
                                !watch("room") &&
                                nextResource?.default_room
                              ) {
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
                      )}
                    </LabeledField>

                    <LabeledField label="Room">
                      {(fieldId) => (
                        <Input id={fieldId} {...register("room")} />
                      )}
                    </LabeledField>
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
                  <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_10rem]">
                    <LabeledField label="Rendering Provider">
                      {(fieldId) => (
                        <Input
                          id={fieldId}
                          as="select"
                          {...register("rendering_provider")}
                        >
                          <option value="">
                            No rendering provider selected
                          </option>
                          {renderingProviderOptions.map((provider) => (
                            <option key={provider.id} value={provider.id}>
                              {getPhysicianLabel(provider)}
                            </option>
                          ))}
                        </Input>
                      )}
                    </LabeledField>

                    <div>
                      <FieldLabel id={billingLabelId}>Billing</FieldLabel>
                      <Controller
                        name="is_billable"
                        control={control}
                        render={({ field }) => (
                          <Button
                            type="button"
                            shape="rounded"
                            variant={field.value ? "primary" : "default"}
                            aria-pressed={field.value}
                            aria-labelledby={billingLabelId}
                            onClick={() => field.onChange(!field.value)}
                            className="h-10 w-full"
                          >
                            {field.value ? "Billable" : "Non-billable"}
                          </Button>
                        )}
                      />
                    </div>
                  </div>
                </FormSection>

                <FormSection icon={ClipboardList} title="Visit Context">
                  <div className="grid gap-3 lg:grid-cols-2">
                    <LabeledField label="Reason">
                      {(fieldId) => (
                        <Input
                          id={fieldId}
                          as="textarea"
                          rows={3}
                          {...register("reason")}
                        />
                      )}
                    </LabeledField>

                    <LabeledField label="Notes">
                      {(fieldId) => (
                        <Input
                          id={fieldId}
                          as="textarea"
                          rows={3}
                          {...register("notes")}
                        />
                      )}
                    </LabeledField>
                  </div>
                </FormSection>
              </div>
            </div>
          </div>

          <div className="flex shrink-0 flex-col gap-2 border-t border-cf-border bg-cf-surface px-4 py-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-center gap-2">
              {displayedMode === "edit" ? (
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
                {displayedMode === "edit"
                  ? "Save Changes"
                  : "Create Appointment"}
              </Button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
