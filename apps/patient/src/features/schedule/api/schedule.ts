import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { apiRequest } from "../../../shared/api/client";

export type PortalSchedulingProvider = {
  id: number;
  display_name: string;
  specialty: string;
};

export type PortalSchedulingAppointmentType = {
  id: number;
  code: string;
  name: string;
  duration_minutes: number;
};

export type PortalSchedulingSlot = {
  id: number;
  start_time: string;
  end_time: string;
  auto_confirms: boolean;
};

export type PortalScheduledAppointment = {
  id: number;
  appointment_time: string;
  end_time: string | null;
  facility_name: string;
  facility_timezone: string;
  status_name: string;
  status_code: string;
  appointment_type_name: string;
  provider_display_name: string;
  reason: string;
  cancel_eligibility: {
    can_cancel: boolean;
    cutoff_hours: number;
  };
};

export function useScheduleProviders() {
  return useQuery<PortalSchedulingProvider[]>({
    queryKey: ["portal", "schedule", "providers"],
    queryFn: async () =>
      (await apiRequest<PortalSchedulingProvider[]>(
        "/portal/scheduling/providers/"
      )) ?? [],
  });
}

export function useScheduleAppointmentTypes(providerId: number | null) {
  return useQuery<PortalSchedulingAppointmentType[]>({
    queryKey: ["portal", "schedule", "types", providerId],
    enabled: providerId !== null,
    queryFn: async () => {
      if (providerId === null) return [];
      return (
        (await apiRequest<PortalSchedulingAppointmentType[]>(
          `/portal/scheduling/appointment-types/?provider=${providerId}`
        )) ?? []
      );
    },
  });
}

export function useScheduleSlots(
  providerId: number | null,
  typeId: number | null
) {
  return useQuery<PortalSchedulingSlot[]>({
    queryKey: ["portal", "schedule", "slots", providerId, typeId],
    enabled: providerId !== null && typeId !== null,
    queryFn: async () => {
      if (providerId === null || typeId === null) return [];
      return (
        (await apiRequest<PortalSchedulingSlot[]>(
          `/portal/scheduling/slots/?provider=${providerId}&type=${typeId}`
        )) ?? []
      );
    },
  });
}

export function useBookSlot() {
  const queryClient = useQueryClient();
  return useMutation<
    PortalScheduledAppointment | null,
    Error,
    { slot_id: number; reason?: string }
  >({
    mutationFn: (payload) =>
      apiRequest<PortalScheduledAppointment>("/portal/scheduling/book/", {
        method: "POST",
        body: JSON.stringify(payload),
      }),
    onSuccess: () => {
      // Slots and appointments both change after a booking.
      queryClient.invalidateQueries({ queryKey: ["portal", "schedule"] });
      queryClient.invalidateQueries({ queryKey: ["portal", "appointments"] });
    },
  });
}

export function useCancelAppointment() {
  const queryClient = useQueryClient();
  return useMutation<PortalScheduledAppointment | null, Error, number>({
    mutationFn: (appointmentId) =>
      apiRequest<PortalScheduledAppointment>(
        `/portal/appointments/${appointmentId}/cancel/`,
        { method: "POST" }
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["portal", "appointments"] });
      queryClient.invalidateQueries({ queryKey: ["portal", "schedule"] });
    },
  });
}
