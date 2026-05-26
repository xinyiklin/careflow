import { useEffect, useState } from "react";
import { User, Shield, Building2 } from "lucide-react";

import { Input } from "../../../../shared/components/ui";
import { AdminFormModal } from "../shared/AdminFormModal";
import { CompactModalGrid } from "../shared/AdminCompactModal";
import useOrganizationFacilities from "../../hooks/organization/useOrganizationFacilities";
import { UserPreviewPanel } from "./OrganizationUserModalSections";

import type { ChangeEvent, FormEvent } from "react";
import type {
  AdminOrganizationUser,
  AdminOrganizationUserForm,
  AdminSavePayload,
} from "../../types";

const DEFAULT_FORM: AdminOrganizationUserForm = {
  username: "",
  email: "",
  first_name: "",
  last_name: "",
  role: "member",
  is_active: true,
  facility_ids: [],
  admin_facility_ids: [],
};

type OrganizationUserModalProps = {
  isOpen: boolean;
  mode?: "create" | "edit";
  initialValues?: AdminOrganizationUser | null;
  saving?: boolean;
  onClose: () => void;
  onSubmit?: (values: AdminSavePayload["values"]) => void | Promise<void>;
};

function normalizeRole(
  role: AdminOrganizationUser["role"]
): AdminOrganizationUserForm["role"] {
  return role === "owner" || role === "admin" || role === "member"
    ? role
    : "member";
}

function getDisplayName(formData: AdminOrganizationUserForm) {
  const fullName = [formData.first_name, formData.last_name]
    .filter(Boolean)
    .join(" ")
    .trim();
  return fullName || formData.username || "New User";
}

export default function OrganizationUserModal({
  isOpen,
  mode = "create",
  initialValues = null,
  saving = false,
  onClose,
  onSubmit,
}: OrganizationUserModalProps) {
  const [formData, setFormData] =
    useState<AdminOrganizationUserForm>(DEFAULT_FORM);

  const { facilities = [], loading: loadingFacilities } =
    useOrganizationFacilities({ enabled: isOpen });

  useEffect(() => {
    if (!isOpen) return;
    if (initialValues) {
      setFormData({
        username: initialValues.username || "",
        email: initialValues.email || "",
        first_name: initialValues.first_name || "",
        last_name: initialValues.last_name || "",
        role: normalizeRole(initialValues.role),
        is_active:
          typeof initialValues.is_active === "boolean"
            ? initialValues.is_active
            : true,
        facility_ids: initialValues.facility_ids || [],
        admin_facility_ids: initialValues.admin_facility_ids || [],
      });
    } else {
      setFormData(DEFAULT_FORM);
    }
  }, [isOpen, initialValues]);

  const handleChange = (
    e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value, type } = e.target;
    const checked = e.target instanceof HTMLInputElement && e.target.checked;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleFacilityAccessChange = (facilityId: number, checked: boolean) => {
    setFormData((prev) => {
      const nextIds = checked
        ? [...(prev.facility_ids || []), facilityId].filter(
            (value, index, self) => self.indexOf(value) === index
          )
        : (prev.facility_ids || []).filter((id) => id !== facilityId);

      const nextAdminIds = checked
        ? prev.admin_facility_ids || []
        : (prev.admin_facility_ids || []).filter((id) => id !== facilityId);

      return {
        ...prev,
        facility_ids: nextIds,
        admin_facility_ids: nextAdminIds,
      };
    });
  };

  const handleFacilityAdminChange = (facilityId: number, checked: boolean) => {
    setFormData((prev) => {
      const nextAdminIds = checked
        ? [...(prev.admin_facility_ids || []), facilityId].filter(
            (value, index, self) => self.indexOf(value) === index
          )
        : (prev.admin_facility_ids || []).filter((id) => id !== facilityId);

      const nextIds = checked
        ? [...(prev.facility_ids || []), facilityId].filter(
            (value, index, self) => self.indexOf(value) === index
          )
        : prev.facility_ids || [];

      return {
        ...prev,
        facility_ids: nextIds,
        admin_facility_ids: nextAdminIds,
      };
    });
  };

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const values =
      mode === "edit"
        ? {
            email: formData.email,
            first_name: formData.first_name,
            last_name: formData.last_name,
            role: formData.role,
            is_active: formData.is_active,
            facility_ids: formData.facility_ids,
            admin_facility_ids: formData.admin_facility_ids,
          }
        : formData;
    onSubmit?.(values);
  };

  const initials =
    getDisplayName(formData)
      .split(/\s+/)
      .slice(0, 2)
      .map((name) => name.charAt(0))
      .join("")
      .toUpperCase() || "U";

  const modalTitle = (
    <div className="flex items-center justify-between gap-4 mr-6">
      <span className="text-sm font-semibold text-cf-text">
        {mode === "edit" ? "Edit User Profile" : "Create New User"}
      </span>
      <label className="flex shrink-0 items-center gap-1.5 rounded-full border border-cf-border bg-cf-surface px-2.5 py-1 text-[11px] font-semibold text-cf-text-muted hover:bg-cf-surface-soft cursor-pointer transition select-none">
        <input
          type="checkbox"
          name="is_active"
          form="person-form"
          checked={formData.is_active}
          onChange={handleChange}
          className="h-3.5 w-3.5 accent-[var(--color-cf-accent)] cursor-pointer"
        />
        Active
      </label>
    </div>
  );

  return (
    <AdminFormModal
      isOpen={isOpen}
      onClose={onClose}
      scope="Organization Admin"
      title={modalTitle}
      maxWidth="4xl"
      formId="person-form"
      saving={saving}
      bodyClassName="bg-cf-surface px-6 py-5 border-t border-b border-cf-border/60 !overflow-hidden flex flex-col md:max-h-[70vh] min-h-0 flex-1"
    >
      <form
        id="person-form"
        onSubmit={handleSubmit}
        className="py-2 flex-1 flex flex-col min-h-0"
      >
        <CompactModalGrid className="flex-1 min-h-0">
          <UserPreviewPanel
            formData={formData}
            initials={initials}
            facilities={facilities}
            loadingFacilities={loadingFacilities}
          />
          <div className="overflow-y-auto pr-2 min-h-0 space-y-6">
            {/* Identity Details Group */}
            <div className="space-y-4">
              <h3 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-cf-text-subtle border-b border-cf-border pb-1">
                <User className="h-4 w-4 text-cf-accent" />
                Identity Details
              </h3>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block">
                  <span className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-cf-text-subtle">
                    Username
                  </span>
                  <Input
                    name="username"
                    value={formData.username}
                    onChange={handleChange}
                    required
                    disabled={mode === "edit" || saving}
                    placeholder="e.g. jsmith"
                  />
                </label>

                <label className="block">
                  <span className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-cf-text-subtle">
                    Email Address
                  </span>
                  <Input
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={handleChange}
                    required
                    placeholder="e.g. john@example.com"
                  />
                </label>

                <label className="block">
                  <span className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-cf-text-subtle">
                    First Name
                  </span>
                  <Input
                    name="first_name"
                    value={formData.first_name}
                    onChange={handleChange}
                    placeholder="John"
                  />
                </label>

                <label className="block">
                  <span className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-cf-text-subtle">
                    Last Name
                  </span>
                  <Input
                    name="last_name"
                    value={formData.last_name}
                    onChange={handleChange}
                    placeholder="Smith"
                  />
                </label>
              </div>
            </div>

            {/* Access Permissions Group */}
            <div className="border-t border-cf-border/60 pt-5 space-y-4">
              <h3 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-cf-text-subtle border-b border-cf-border pb-1">
                <Shield className="h-4 w-4 text-cf-accent" />
                Access & Permissions
              </h3>

              <div className="grid gap-4">
                <label className="block">
                  <span className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-cf-text-subtle">
                    Organization Role
                  </span>
                  <Input
                    as="select"
                    name="role"
                    value={formData.role}
                    onChange={handleChange}
                  >
                    <option value="owner">Owner</option>
                    <option value="admin">Admin</option>
                    <option value="member">Member</option>
                  </Input>
                </label>
              </div>
            </div>

            {/* Facility Access and Admin Mapping */}
            <div className="border-t border-cf-border/60 pt-5 space-y-4">
              <h3 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-cf-text-subtle border-b border-cf-border pb-1">
                <Building2 className="h-4 w-4 text-cf-accent" />
                Facility Access & Administration
              </h3>

              {loadingFacilities ? (
                <div className="h-20" />
              ) : facilities.length === 0 ? (
                <p className="text-xs text-cf-text-muted">
                  No facilities configured in this organization.
                </p>
              ) : (
                <div className="rounded-xl border border-cf-border bg-cf-surface overflow-hidden shadow-sm">
                  <table className="min-w-full text-xs divide-y divide-cf-border">
                    <thead className="bg-cf-surface-soft/60 font-semibold text-cf-text-subtle uppercase tracking-wider">
                      <tr>
                        <th className="px-4 py-2.5 text-left">Facility Name</th>
                        <th className="px-4 py-2.5 text-center w-24">Access</th>
                        <th className="px-4 py-2.5 text-center w-24">
                          Facility Admin
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-cf-border text-cf-text bg-cf-surface">
                      {facilities.map((facility) => {
                        const hasAccess = Boolean(
                          formData.facility_ids?.includes(Number(facility.id))
                        );
                        const isAdmin = Boolean(
                          formData.admin_facility_ids?.includes(
                            Number(facility.id)
                          )
                        );

                        return (
                          <tr
                            key={facility.id}
                            className="hover:bg-cf-surface-soft/30"
                          >
                            <td className="px-4 py-3 font-medium text-cf-text">
                              {facility.name}
                            </td>
                            <td className="px-4 py-3 text-center align-middle">
                              <input
                                type="checkbox"
                                checked={hasAccess}
                                onChange={(e) =>
                                  handleFacilityAccessChange(
                                    Number(facility.id),
                                    e.target.checked
                                  )
                                }
                                className="h-3.5 w-3.5 accent-[var(--color-cf-accent)] cursor-pointer"
                              />
                            </td>
                            <td className="px-4 py-3 text-center align-middle">
                              <input
                                type="checkbox"
                                checked={isAdmin}
                                onChange={(e) =>
                                  handleFacilityAdminChange(
                                    Number(facility.id),
                                    e.target.checked
                                  )
                                }
                                className="h-3.5 w-3.5 accent-[var(--color-cf-accent)] cursor-pointer"
                              />
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </CompactModalGrid>
      </form>
    </AdminFormModal>
  );
}
