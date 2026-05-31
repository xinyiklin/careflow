import { Suspense } from "react";
import { Navigate, createBrowserRouter } from "react-router-dom";

import App from "./App";
import AppShell from "./AppShell";
import LandingRedirect from "./LandingRedirect";
import RouteErrorBoundary from "./RouteErrorBoundary";
import LoadingScreen from "../shared/components/LoadingScreen";
import LoginPage from "../features/auth/pages/LoginPage";
import {
  AdminRedirect,
  BillingPage,
  DocumentsPage,
  FacilityAdminPage,
  InboxPage,
  OrganizationAdminPage,
  RefillInboxPage,
  SchedulePage,
} from "./routeModules";

import type { ReactNode } from "react";

const devPreviewDocuments = {
  admin: "/dev-previews/opus/admin.preview.html",
  appointment: "/dev-previews/opus/appointment-modal.preview.html",
  dashboard: "/dev-previews/opus/dashboard.preview.html",
  documents: "/dev-previews/opus/documents.preview.html",
  index: "/dev-previews/opus/index.html",
  patientSearch: "/dev-previews/patient-search.preview.html",
  security: "/dev-previews/opus/permissions-roles.preview.html",
  schedule: "/dev-previews/opus/schedule.preview.html",
};

function DevPreviewRoute({ children }: { children: ReactNode }) {
  return (
    <Suspense
      fallback={
        <LoadingScreen
          title="Opening preview"
          message="Loading local design reference."
        />
      }
    >
      {children}
    </Suspense>
  );
}

function DevPreviewDocument({ src, title }: { src: string; title: string }) {
  return (
    <DevPreviewRoute>
      <iframe
        className="h-screen w-screen border-0 bg-[#f6f3ea]"
        src={src}
        title={title}
      />
    </DevPreviewRoute>
  );
}

const devPreviewRoutes = import.meta.env.DEV
  ? [
      {
        path: "/__loading-preview",
        element: (
          <LoadingScreen
            title="Opening workspace"
            message="Bringing the next CareFlow view into focus."
          />
        ),
      },
      {
        path: "/__appointment-modal-preview",
        element: (
          <DevPreviewDocument
            src={devPreviewDocuments.appointment}
            title="Appointment modal preview"
          />
        ),
      },
      {
        path: "/__dashboard-preview",
        element: (
          <DevPreviewDocument
            src={devPreviewDocuments.dashboard}
            title="Dashboard preview"
          />
        ),
      },
      {
        path: "/__admin-preview",
        element: (
          <DevPreviewDocument
            src={devPreviewDocuments.admin}
            title="Admin preview"
          />
        ),
      },
      {
        path: "/__documents-preview",
        element: (
          <DevPreviewDocument
            src={devPreviewDocuments.documents}
            title="Documents preview"
          />
        ),
      },
      {
        path: "/__schedule-preview",
        element: (
          <DevPreviewDocument
            src={devPreviewDocuments.schedule}
            title="Schedule preview"
          />
        ),
      },
      {
        path: "/__patient-search-preview",
        element: (
          <DevPreviewDocument
            src={devPreviewDocuments.patientSearch}
            title="Patient search preview"
          />
        ),
      },
      {
        path: "/__security-preview",
        element: (
          <DevPreviewDocument
            src={devPreviewDocuments.security}
            title="Security preview"
          />
        ),
      },
      {
        path: "/__preview-index",
        element: (
          <DevPreviewDocument
            src={devPreviewDocuments.index}
            title="CareFlow preview index"
          />
        ),
      },
    ]
  : [];

// Lazy route chunks resolve through Suspense with a null fallback —
// no intermediate "Preparing view" panel. The shell (sidebar + navbar)
// stays visible; the content area is briefly empty until the chunk
// arrives, matching the accepted gap pattern used elsewhere.
function PageRouteLoader({ children }: { children: ReactNode }) {
  return <Suspense fallback={null}>{children}</Suspense>;
}

const router = createBrowserRouter([
  ...devPreviewRoutes,
  {
    path: "/login",
    element: <LoginPage />,
    errorElement: <RouteErrorBoundary />,
  },
  {
    path: "/",
    element: <App />,
    errorElement: <RouteErrorBoundary />,
    children: [
      {
        element: <AppShell />,
        children: [
          {
            index: true,
            element: <LandingRedirect />,
          },
          {
            path: "overview",
            element: <Navigate to="/schedule" replace />,
          },
          {
            path: "schedule",
            element: (
              <PageRouteLoader>
                <SchedulePage />
              </PageRouteLoader>
            ),
          },
          {
            path: "appointments",
            element: <Navigate to="/schedule" replace />,
          },
          {
            path: "documents",
            element: (
              <PageRouteLoader>
                <DocumentsPage />
              </PageRouteLoader>
            ),
          },
          {
            path: "billing",
            element: (
              <PageRouteLoader>
                <BillingPage />
              </PageRouteLoader>
            ),
          },
          {
            path: "inbox",
            element: (
              <PageRouteLoader>
                <InboxPage />
              </PageRouteLoader>
            ),
          },
          {
            path: "refills",
            element: (
              <PageRouteLoader>
                <RefillInboxPage />
              </PageRouteLoader>
            ),
          },
          {
            path: "tasks",
            element: <Navigate to="/schedule" replace />,
          },
          {
            path: "analytics",
            element: <Navigate to="/schedule" replace />,
          },
          {
            path: "patients",
            element: <LandingRedirect />,
          },
          {
            path: "admin",
            element: (
              <PageRouteLoader>
                <AdminRedirect />
              </PageRouteLoader>
            ),
          },
          {
            path: "admin/organization",
            element: (
              <PageRouteLoader>
                <OrganizationAdminPage />
              </PageRouteLoader>
            ),
          },
          {
            path: "admin/facility",
            element: (
              <PageRouteLoader>
                <FacilityAdminPage />
              </PageRouteLoader>
            ),
          },
        ],
      },
    ],
  },
]);

export default router;
