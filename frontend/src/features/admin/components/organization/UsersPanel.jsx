import { useState } from "react";
import { Plus, RefreshCw } from "lucide-react";
import useAdminListControls, {
  compareBoolean,
  compareText,
} from "../../hooks/shared/useAdminListControls";
import useOrganizationPeople from "../../hooks/organization/useOrganizationPeople";
import PersonModal from "./PersonModal";
import {
  AdminInlineNotice,
  AdminListToolbar,
  AdminTableCard,
  AdminTableFooter,
  getAdminRowActionProps,
} from "../shared/AdminSurface";
import { Badge, Button } from "../../../../shared/components/ui";

function getPersonName(person) {
  return (
    `${person.first_name || ""} ${person.last_name || ""}`.trim() ||
    person.username
  );
}

const USER_FILTERS = [
  { key: "all", label: "All", predicate: () => true },
  {
    key: "active",
    label: "Active",
    predicate: (person) => person.is_active !== false,
  },
  {
    key: "inactive",
    label: "Inactive",
    predicate: (person) => person.is_active === false,
  },
  {
    key: "admins",
    label: "Admins",
    predicate: (person) => String(person.role || "").includes("admin"),
  },
];

const USER_SORT_OPTIONS = [
  {
    key: "name",
    label: "User",
    compare: (a, b) => compareText(getPersonName(a), getPersonName(b)),
  },
  {
    key: "username",
    label: "Username",
    compare: (a, b) => compareText(a.username, b.username),
  },
  {
    key: "role",
    label: "Role",
    compare: (a, b) =>
      compareText(a.role, b.role) ||
      compareText(getPersonName(a), getPersonName(b)),
  },
  {
    key: "active",
    label: "Active first",
    compare: (a, b) =>
      compareBoolean(a.is_active !== false, b.is_active !== false) ||
      compareText(getPersonName(a), getPersonName(b)),
  },
];

export default function UsersPanel() {
  const { people, loading, saving, error, reload, savePerson } =
    useOrganizationPeople();
  const {
    activeFilter,
    activeSort,
    filterOptions,
    visibleRecords: visiblePeople,
    setActiveFilter,
    setActiveSort,
  } = useAdminListControls(people, {
    filters: USER_FILTERS,
    sortOptions: USER_SORT_OPTIONS,
  });

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPerson, setEditingPerson] = useState(null);

  const handleOpenCreate = () => {
    setEditingPerson(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (person) => {
    setEditingPerson(person);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setEditingPerson(null);
    setIsModalOpen(false);
  };

  const handleSave = async (values) => {
    await savePerson({ id: editingPerson?.id || null, values });
    handleCloseModal();
  };

  return (
    <div className="space-y-4">
      {error && <AdminInlineNotice tone="danger">{error}</AdminInlineNotice>}

      <AdminTableCard
        description="Manage organization users and their access roles."
        savingLabel={saving ? "Saving..." : ""}
        actions={
          <>
            <Button
              variant="default"
              size="sm"
              onClick={reload}
              disabled={loading || saving}
            >
              <RefreshCw
                className={["h-3.5 w-3.5", loading ? "animate-spin" : ""].join(
                  " "
                )}
              />
              Refresh
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleOpenCreate}
              disabled={saving}
            >
              <Plus className="h-3.5 w-3.5" />
              New User
            </Button>
          </>
        }
      >
        <AdminListToolbar
          savingLabel={saving ? "Saving..." : ""}
          filters={filterOptions}
          activeFilter={activeFilter}
          onFilterChange={setActiveFilter}
          sortOptions={USER_SORT_OPTIONS}
          activeSort={activeSort}
          onSortChange={setActiveSort}
        />
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="border-b border-cf-border bg-cf-surface-soft/50 text-[10px] font-semibold uppercase tracking-[0.14em] text-cf-text-subtle">
              <tr>
                {["User", "Username", "Email", "Role", "Status"].map(
                  (heading, index) => (
                    <th
                      key={`${heading}-${index}`}
                      className="px-5 py-3 text-left"
                    >
                      {heading}
                    </th>
                  )
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-cf-border text-cf-text">
              {loading ? (
                <tr>
                  <td
                    colSpan="5"
                    className="px-5 py-12 text-center text-sm text-cf-text-muted"
                  >
                    Loading users...
                  </td>
                </tr>
              ) : people.length === 0 ? (
                <tr>
                  <td
                    colSpan="5"
                    className="px-5 py-12 text-center text-sm text-cf-text-muted"
                  >
                    No users found. Add a user to assign organization-level
                    permissions.
                  </td>
                </tr>
              ) : visiblePeople.length === 0 ? (
                <tr>
                  <td
                    colSpan="5"
                    className="px-5 py-12 text-center text-sm text-cf-text-muted"
                  >
                    No users match the selected filter.
                  </td>
                </tr>
              ) : (
                visiblePeople.map((person) => {
                  const fullName = getPersonName(person);
                  return (
                    <tr
                      key={person.id}
                      {...getAdminRowActionProps({
                        label: `Edit user ${fullName}`,
                        onAction: () => handleOpenEdit(person),
                      })}
                    >
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <span className="grid h-9 w-9 place-items-center rounded-xl bg-blue-100 text-[11px] font-semibold text-blue-800">
                            {fullName
                              .split(/\s+/)
                              .slice(0, 2)
                              .map((part) => part.charAt(0))
                              .join("")
                              .toUpperCase() || "US"}
                          </span>
                          <div>
                            <div className="font-semibold text-cf-text">
                              {fullName}
                            </div>
                            <div className="text-[11px] text-cf-text-muted">
                              Organization user
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4 text-cf-text-muted">
                        {person.username}
                      </td>
                      <td className="px-5 py-4 text-cf-text-muted">
                        {person.email || "—"}
                      </td>
                      <td className="px-5 py-4">
                        <Badge variant="neutral" className="capitalize">
                          {person.role}
                        </Badge>
                      </td>
                      <td className="px-5 py-4">
                        <Badge variant={person.is_active ? "success" : "muted"}>
                          {person.is_active ? "Active" : "Inactive"}
                        </Badge>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        <AdminTableFooter
          shown={visiblePeople.length}
          total={people.length}
          label="users"
        />
      </AdminTableCard>

      <PersonModal
        isOpen={isModalOpen}
        mode={editingPerson ? "edit" : "create"}
        initialValues={editingPerson}
        saving={saving}
        onClose={handleCloseModal}
        onSubmit={handleSave}
      />
    </div>
  );
}
