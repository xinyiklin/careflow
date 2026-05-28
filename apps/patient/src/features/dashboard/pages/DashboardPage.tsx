import useMinimumLoading from "../../../shared/hooks/useMinimumLoading";
import { useAuth } from "../../auth/AuthProvider";
import { useUpcomingAppointments } from "../../appointments/api/appointments";
import { useMedications } from "../../medications/api/medications";
import { useRefillRequests } from "../../medications/api/refills";
import { useMessageThreads } from "../../messages/api/messaging";
import { MedicationsSummaryCard } from "../components/MedicationsSummaryCard";
import { MessagesSummaryCard } from "../components/MessagesSummaryCard";
import { NextAppointmentHero } from "../components/NextAppointmentHero";
import { WelcomeStrip } from "../components/WelcomeStrip";

export function DashboardPage() {
  const { patient } = useAuth();
  const firstName = patient?.first_name?.trim() || "there";
  const initials =
    [patient?.first_name?.[0], patient?.last_name?.[0]]
      .filter(Boolean)
      .join("")
      .toUpperCase() || "?";

  const { data: upcoming, isLoading: isLoadingAppointments } =
    useUpcomingAppointments();
  const { data: medications, isLoading: isLoadingMedications } =
    useMedications();
  const { data: refillRequests, isLoading: isLoadingRefills } =
    useRefillRequests();
  const { data: messageThreads, isLoading: isLoadingMessages } =
    useMessageThreads();

  const appointmentsLoading = useMinimumLoading(isLoadingAppointments);
  const messagesLoading = useMinimumLoading(isLoadingMessages);
  const medsLoading = useMinimumLoading(
    isLoadingMedications || isLoadingRefills
  );

  const nextAppointment = upcoming && upcoming.length > 0 ? upcoming[0] : null;
  const activeMedicationsCount = medications
    ? medications.filter((m) => m.status === "active").length
    : 0;
  const pendingRefillCount = refillRequests
    ? refillRequests.filter((r) => r.status === "pending").length
    : 0;
  const unreadCount = messageThreads
    ? messageThreads.filter((thread) => thread.unread_for_patient).length
    : 0;

  return (
    <div className="space-y-6 sm:space-y-8">
      <WelcomeStrip firstName={firstName} initials={initials} />
      <NextAppointmentHero
        appointment={nextAppointment}
        loading={appointmentsLoading}
      />
      <div className="grid gap-4 md:grid-cols-2 lg:gap-6">
        <MessagesSummaryCard
          unreadCount={unreadCount}
          loading={messagesLoading}
        />
        <MedicationsSummaryCard
          activeCount={activeMedicationsCount}
          pendingRefillCount={pendingRefillCount}
          loading={medsLoading}
        />
      </div>
    </div>
  );
}
