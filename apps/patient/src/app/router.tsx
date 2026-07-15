import { Suspense, lazy } from "react";
import { Navigate, Route, Routes } from "react-router-dom";

const AppointmentsPage = lazy(() =>
  import("../features/appointments/pages/AppointmentsPage").then(
    ({ AppointmentsPage: Page }) => ({ default: Page })
  )
);
const DashboardPage = lazy(() =>
  import("../features/dashboard/pages/DashboardPage").then(
    ({ DashboardPage: Page }) => ({ default: Page })
  )
);
const MedicalSummaryPage = lazy(() =>
  import("../features/medical-summary/pages/MedicalSummaryPage").then(
    ({ MedicalSummaryPage: Page }) => ({ default: Page })
  )
);
const MedicationsPage = lazy(() =>
  import("../features/medications/pages/MedicationsPage").then(
    ({ MedicationsPage: Page }) => ({ default: Page })
  )
);
const MessagesPage = lazy(() =>
  import("../features/messages/pages/MessagesPage").then(
    ({ MessagesPage: Page }) => ({ default: Page })
  )
);
const ProfilePage = lazy(() =>
  import("../features/profile/pages/ProfilePage").then(
    ({ ProfilePage: Page }) => ({ default: Page })
  )
);
const SchedulePage = lazy(() =>
  import("../features/schedule/pages/SchedulePage").then(
    ({ SchedulePage: Page }) => ({ default: Page })
  )
);

export function PortalRoutes() {
  return (
    <Suspense fallback={<RouteLoadingFallback />}>
      <Routes>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/appointments" element={<AppointmentsPage />} />
        <Route path="/schedule" element={<SchedulePage />} />
        <Route path="/records" element={<MedicalSummaryPage />} />
        <Route path="/medications" element={<MedicationsPage />} />
        <Route path="/messages" element={<MessagesPage />} />
        <Route path="/login" element={<Navigate to="/" replace />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}

function RouteLoadingFallback() {
  return (
    <div
      role="status"
      aria-live="polite"
      className="flex min-h-40 items-center justify-center text-sm text-text-muted"
    >
      Loading…
    </div>
  );
}
