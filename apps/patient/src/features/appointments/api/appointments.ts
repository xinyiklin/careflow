import { useQuery } from "@tanstack/react-query";

import { apiRequest } from "../../../shared/api/client";

export type PortalAppointment = {
  id: number;
  appointment_time: string;
  end_time: string | null;
  duration_minutes: number | null;
  facility_name: string;
  facility_timezone: string;
  status_name: string;
  status_code: string;
  appointment_type_name: string | null;
  appointment_type_code: string | null;
  provider_display_name: string;
  room: string | null;
  reason: string | null;
};

export function useUpcomingAppointments() {
  return useQuery<PortalAppointment[]>({
    queryKey: ["portal", "appointments", "upcoming"],
    queryFn: async () =>
      (await apiRequest<PortalAppointment[]>("/portal/appointments/")) ?? [],
  });
}

export function usePastAppointments() {
  return useQuery<PortalAppointment[]>({
    queryKey: ["portal", "appointments", "past"],
    queryFn: async () =>
      (await apiRequest<PortalAppointment[]>(
        "/portal/appointments/?past=true"
      )) ?? [],
  });
}
