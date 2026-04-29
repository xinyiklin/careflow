import { useEffect, useState } from "react";

import { Input } from "../../../../shared/components/ui";
import { AdminFormModal } from "../shared/AdminFormModal";
import {
  CompactCard,
  CompactField,
  CompactMetric,
  CompactModalGrid,
  CompactModalLane,
  CompactPill,
  CompactRecordHeader,
  CompactToggle,
} from "../shared/AdminCompactModal";

const DEFAULT_FORM = {
  username: "",
  email: "",
  first_name: "",
  last_name: "",
  role: "member",
  is_active: true,
};

const ROLE_LABELS = {
  owner: "Owner",
  admin: "Admin",
  member: "Member",
};

function getDisplayName(formData) {
  const fullName = [formData.first_name, formData.last_name]
    .filter(Boolean)
    .join(" ")
    .trim();
  return fullName || formData.username || "New user";
}

export default function OrganizationUserModal({
  isOpen,
  mode = "create",
  initialValues = null,
  saving = false,
  onClose,
  onSubmit,
}) {
  const [formData, setFormData] = useState(DEFAULT_FORM);

  useEffect(() => {
    if (!isOpen) return;
    if (initialValues) {
      setFormData({
        username: initialValues.username || "",
        email: initialValues.email || "",
        first_name: initialValues.first_name || "",
        last_name: initialValues.last_name || "",
        role: initialValues.role || "member",
        is_active:
          typeof initialValues.is_active === "boolean"
            ? initialValues.is_active
            : true,
      });
    } else {
      setFormData(DEFAULT_FORM);
    }
  }, [isOpen, initialValues]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const values =
      mode === "edit"
        ? {
            email: formData.email,
            first_name: formData.first_name,
            last_name: formData.last_name,
            role: formData.role,
            is_active: formData.is_active,
          }
        : formData;
    onSubmit?.(values);
  };

  return (
    <AdminFormModal
      isOpen={isOpen}
      onClose={onClose}
      scope="Organization admin"
      title={mode === "edit" ? "Edit User" : "New User"}
      maxWidth="2xl"
      formId="person-form"
      saving={saving}
    >
      <form id="person-form" onSubmit={handleSubmit}>
        <CompactModalGrid>
          <CompactModalLane>
            <CompactCard>
              <CompactRecordHeader
                initials={getDisplayName(formData).slice(0, 2).toUpperCase()}
                title={getDisplayName(formData)}
                meta={`${ROLE_LABELS[formData.role]} · ${formData.email || "No email"}`}
                action={
                  <CompactToggle
                    label="Active"
                    name="is_active"
                    checked={formData.is_active}
                    onChange={handleChange}
                  />
                }
              />
            </CompactCard>

            <CompactCard eyebrow="Identity">
              <div className="grid gap-3 sm:grid-cols-2">
                <CompactField label="Username">
                  <Input
                    name="username"
                    value={formData.username}
                    onChange={handleChange}
                    required
                    disabled={mode === "edit" || saving}
                  />
                </CompactField>
                <CompactField label="Email">
                  <Input
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={handleChange}
                    required
                  />
                </CompactField>
                <CompactField label="First name">
                  <Input
                    name="first_name"
                    value={formData.first_name}
                    onChange={handleChange}
                  />
                </CompactField>
                <CompactField label="Last name">
                  <Input
                    name="last_name"
                    value={formData.last_name}
                    onChange={handleChange}
                  />
                </CompactField>
              </div>
            </CompactCard>
          </CompactModalLane>

          <CompactCard eyebrow="Access" title={ROLE_LABELS[formData.role]}>
            <CompactField label="Role">
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
            </CompactField>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <CompactMetric
                label="Account"
                value={formData.is_active ? "On" : "Off"}
              />
              <CompactMetric label="Scope" value="Org" />
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <CompactPill tone={formData.is_active ? "success" : "muted"}>
                {formData.is_active ? "Active" : "Inactive"}
              </CompactPill>
              <CompactPill>{ROLE_LABELS[formData.role]}</CompactPill>
            </div>
          </CompactCard>
        </CompactModalGrid>
      </form>
    </AdminFormModal>
  );
}
