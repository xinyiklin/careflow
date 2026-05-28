import { Navigate, Route, Routes } from "react-router-dom";

import { AllergiesPage } from "../features/allergies/pages/AllergiesPage";
import { AppointmentsPage } from "../features/appointments/pages/AppointmentsPage";
import { DashboardPage } from "../features/dashboard/pages/DashboardPage";
import { MedicalSummaryPage } from "../features/medical-summary/pages/MedicalSummaryPage";
import { MedicationsPage } from "../features/medications/pages/MedicationsPage";
import { ProfilePage } from "../features/profile/pages/ProfilePage";
import { SchedulePage } from "../features/schedule/pages/SchedulePage";

export function PortalRoutes() {
  return (
    <Routes>
      <Route path="/" element={<DashboardPage />} />
      <Route path="/profile" element={<ProfilePage />} />
      <Route path="/appointments" element={<AppointmentsPage />} />
      <Route path="/schedule" element={<SchedulePage />} />
      <Route path="/records" element={<MedicalSummaryPage />} />
      <Route path="/medications" element={<MedicationsPage />} />
      <Route path="/allergies" element={<AllergiesPage />} />
      <Route path="/login" element={<Navigate to="/" replace />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
