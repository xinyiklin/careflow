import { useEffect, useState } from "react";

import { Input } from "../../../../shared/components/ui";
import {
  AdminField,
  AdminFormModal,
  AdminFormSection,
  AdminToggleField,
} from "../shared/AdminFormModal";

const DEFAULT_FORM = {
  username: "",
  email: "",
  first_name: "",
  last_name: "",
  role: "member",
  is_active: true,
};

export default function PersonModal({
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
      description="Create or update the user identity and organization-level access."
      maxWidth="2xl"
      formId="person-form"
      saving={saving}
    >
      <form id="person-form" onSubmit={handleSubmit} className="space-y-4">
        <AdminFormSection title="Identity">
          <div className="grid gap-4 md:grid-cols-2">
            <AdminField label="Username">
              <Input
                name="username"
                value={formData.username}
                onChange={handleChange}
                required
                disabled={mode === "edit" || saving}
              />
            </AdminField>

            <AdminField label="Email">
              <Input
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                required
              />
            </AdminField>

            <AdminField label="First Name">
              <Input
                name="first_name"
                value={formData.first_name}
                onChange={handleChange}
              />
            </AdminField>

            <AdminField label="Last Name">
              <Input
                name="last_name"
                value={formData.last_name}
                onChange={handleChange}
              />
            </AdminField>
          </div>
        </AdminFormSection>

        <AdminFormSection title="Access">
          <div className="grid gap-4 md:grid-cols-2">
            <AdminField label="Role">
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
            </AdminField>

            <div className="flex items-end">
              <AdminToggleField
                label="Active"
                name="is_active"
                checked={formData.is_active}
                onChange={handleChange}
              />
            </div>
          </div>
        </AdminFormSection>
      </form>
    </AdminFormModal>
  );
}
