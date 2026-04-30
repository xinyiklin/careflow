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
  DocumentsPage,
  FacilityAdminPage,
  OrganizationAdminPage,
  SchedulePage,
} from "./routeModules";

const devPreviewDocuments = {
  admin: "/dev-previews/opus/admin.preview.html",
  appointment: "/dev-previews/opus/appointment-modal.preview.html",
  dashboard: "/dev-previews/opus/dashboard.preview.html",
  documents: "/dev-previews/opus/documents.preview.html",
  index: "/dev-previews/opus/index.html",
  patientSearch: "/dev-previews/patient-search.preview.html",
  permissionsRoles: "/dev-previews/opus/permissions-roles.preview.html",
  schedule: "/dev-previews/opus/schedule.preview.html",
};

function DevPreviewRoute({ children }) {
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

function DevPreviewDocument({ src, title }) {
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
        path: "/__permissions-roles-preview",
        element: (
          <DevPreviewDocument
            src={devPreviewDocuments.permissionsRoles}
            title="Permissions and roles preview"
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

function PageRouteLoader({ children }) {
  return (
    <Suspense
      fallback={
        <div className="flex h-full min-h-0 items-center justify-center bg-cf-page-bg px-4">
          <div className="cf-ui-panel w-full max-w-sm px-5 py-5">
            <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-cf-text-subtle">
              CareFlow
            </div>
            <div className="mt-1 text-base font-semibold text-cf-text">
              Preparing view
            </div>
            <div className="mt-4 space-y-2" aria-hidden="true">
              <div className="cf-loading-skeleton h-2.5 w-11/12 rounded-full bg-cf-surface-soft" />
              <div className="cf-loading-skeleton h-2.5 w-8/12 rounded-full bg-cf-surface-soft" />
            </div>
          </div>
        </div>
      }
    >
      {children}
    </Suspense>
  );
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
            path: "inbox",
            element: <Navigate to="/schedule" replace />,
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
