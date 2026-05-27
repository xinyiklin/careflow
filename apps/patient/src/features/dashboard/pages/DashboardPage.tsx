import { Link } from "react-router-dom";
import { AlertTriangle, Calendar, Pill, User } from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { useAuth } from "../../auth/AuthProvider";
import { PageHeader } from "../../../shared/components/ui/PageHeader";

type QuickLink = {
  to: string;
  label: string;
  description: string;
  Icon: LucideIcon;
};

const LINKS: QuickLink[] = [
  {
    to: "/appointments",
    label: "Appointments",
    description: "Upcoming and recent visits",
    Icon: Calendar,
  },
  {
    to: "/medications",
    label: "Medications",
    description: "Active and inactive prescriptions",
    Icon: Pill,
  },
  {
    to: "/allergies",
    label: "Allergies",
    description: "Known allergies and reactions",
    Icon: AlertTriangle,
  },
  {
    to: "/profile",
    label: "Profile",
    description: "Personal and contact details",
    Icon: User,
  },
];

export function DashboardPage() {
  const { patient } = useAuth();
  const firstName = patient?.first_name?.trim() || "there";

  return (
    <div className="px-4 py-6 sm:px-6 sm:py-8">
      <PageHeader title={`Welcome, ${firstName}`} />
      <ul className="grid gap-2 sm:grid-cols-2">
        {LINKS.map(({ to, label, description, Icon }) => (
          <li key={to}>
            <Link
              to={to}
              className="flex items-start gap-3 rounded-cf-card border border-cf-border bg-cf-surface px-4 py-3 transition-colors hover:bg-cf-surface-muted"
            >
              <Icon
                size={18}
                className="mt-0.5 shrink-0 text-cf-text-muted"
                aria-hidden="true"
              />
              <div className="min-w-0">
                <div className="text-sm font-medium text-cf-text">{label}</div>
                <div className="text-xs text-cf-text-muted">{description}</div>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
