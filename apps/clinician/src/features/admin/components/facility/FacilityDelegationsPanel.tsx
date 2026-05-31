import { useMemo, useState } from "react";
import { Plus, RefreshCw, Trash2 } from "lucide-react";

import { Badge, Button } from "../../../../shared/components/ui";
import ConfirmDialog from "../../../../shared/components/ConfirmDialog";
import useFacility from "../../../facilities/hooks/useFacility";
import useAdminFacility from "../../hooks/shared/useAdminFacility";
import useAdminFacilityConfig from "../../hooks/facility/useAdminFacilityConfig";
import useStaff from "../../hooks/facility/useStaff";
import usePrescriberDelegations from "../../hooks/facility/usePrescriberDelegations";
import {
  AdminInlineNotice,
  AdminTableCard,
  AdminTableFooter,
  AdminTableLoadError,
} from "../shared/AdminSurface";
import { EmptyRow, FacilityListTable } from "./FacilityListPanelShared";

import type { PrescriberDelegation } from "../../api/facility/prescriberDelegations";

const SELECT_CLASS =
  "h-8 max-w-[14rem] cursor-pointer rounded-lg border border-cf-border bg-cf-surface px-2.5 text-xs font-semibold text-cf-text-muted outline-none transition hover:bg-cf-surface-soft focus:border-cf-accent focus:ring-2 focus:ring-cf-accent/10";

function formatDate(value: string) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function FacilityDelegationsPanel() {
  const { adminFacility } = useAdminFacility();
  const facilityId = adminFacility?.id || null;
  const { selectedMembership } = useFacility();
  const canManage = Boolean(
    selectedMembership?.effective_security_permissions?.[
      "admin.security.manage"
    ]
  );

  const { careProviders } = useAdminFacilityConfig();
  const { staff } = useStaff(canManage ? facilityId : null);
  const {
    delegations,
    loading,
    loadError,
    saving,
    saveError,
    reload,
    createDelegation,
    removeDelegation,
  } = usePrescriberDelegations(canManage ? facilityId : null);

  const [prescriberId, setPrescriberId] = useState("");
  const [delegateId, setDelegateId] = useState("");
  const [pendingRemoval, setPendingRemoval] =
    useState<PrescriberDelegation | null>(null);

  const prescriberOptions = useMemo(
    () =>
      (careProviders ?? []).filter((provider) => provider.is_active !== false),
    [careProviders]
  );
  const delegateOptions = useMemo(
    () => (staff ?? []).filter((member) => member.is_active !== false),
    [staff]
  );

  const handleAdd = async () => {
    if (!prescriberId || !delegateId) return;
    try {
      await createDelegation({
        prescriber: Number(prescriberId),
        delegate: Number(delegateId),
      });
      setPrescriberId("");
      setDelegateId("");
    } catch {
      // saveError renders in the toolbar.
    }
  };

  const handleConfirmRemove = async () => {
    if (!pendingRemoval) return;
    try {
      await removeDelegation(pendingRemoval.id);
    } finally {
      setPendingRemoval(null);
    }
  };

  if (!facilityId) {
    return (
      <AdminInlineNotice>
        Select a facility to manage prescriber delegations.
      </AdminInlineNotice>
    );
  }

  if (!canManage) {
    return (
      <AdminInlineNotice>
        You do not have access to manage prescriber delegations.
      </AdminInlineNotice>
    );
  }

  return (
    <div className="space-y-4">
      <AdminTableCard>
        <div className="flex flex-wrap items-center justify-between gap-3 bg-cf-surface px-3 py-3">
          <div className="flex flex-wrap items-center gap-2">
            <select
              aria-label="Prescriber"
              value={prescriberId}
              onChange={(event) => setPrescriberId(event.target.value)}
              className={SELECT_CLASS}
            >
              <option value="">Prescriber…</option>
              {prescriberOptions.map((provider) => (
                <option key={provider.id} value={String(provider.id)}>
                  {provider.display_name ||
                    [provider.first_name, provider.last_name]
                      .filter(Boolean)
                      .join(" ") ||
                    "Unnamed provider"}
                </option>
              ))}
            </select>
            <span className="text-xs text-cf-text-subtle">acts via</span>
            <select
              aria-label="Delegate"
              value={delegateId}
              onChange={(event) => setDelegateId(event.target.value)}
              className={SELECT_CLASS}
            >
              <option value="">Delegate…</option>
              {delegateOptions.map((member) => (
                <option key={member.id} value={String(member.id)}>
                  {member.display_name || "Staff member"}
                  {member.role_name ? ` — ${member.role_name}` : ""}
                </option>
              ))}
            </select>
            <Button
              size="sm"
              variant="primary"
              onClick={handleAdd}
              disabled={!prescriberId || !delegateId || saving}
            >
              <Plus className="h-3.5 w-3.5" />
              Add
            </Button>
            {saveError ? (
              <span className="text-xs text-cf-danger-text">{saveError}</span>
            ) : null}
          </div>
          <div className="flex items-center gap-2">
            {saving ? <Badge variant="muted">Saving...</Badge> : null}
            <Button
              variant="default"
              size="sm"
              onClick={() => reload()}
              disabled={loading || saving}
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Refresh
            </Button>
          </div>
        </div>

        <FacilityListTable columns={["Prescriber", "Delegate", "Added", ""]}>
          {loading ? null : loadError ? (
            <AdminTableLoadError
              colSpan={4}
              message="Couldn't load prescriber delegations."
              onRetry={() => reload()}
            />
          ) : delegations.length === 0 ? (
            <EmptyRow colSpan={4} label="No prescriber delegations yet." />
          ) : (
            delegations.map((delegation) => (
              <tr key={delegation.id}>
                <td className="px-3 py-4 font-semibold text-cf-text">
                  {delegation.prescriber_display || "—"}
                </td>
                <td className="px-3 py-4 text-cf-text-muted">
                  {delegation.delegate_name || "—"}
                </td>
                <td className="px-3 py-4 text-cf-text-muted">
                  {formatDate(delegation.created_at)}
                </td>
                <td className="px-3 py-4 text-right">
                  <Button
                    size="sm"
                    variant="default"
                    onClick={() => setPendingRemoval(delegation)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Remove
                  </Button>
                </td>
              </tr>
            ))
          )}
        </FacilityListTable>
        <AdminTableFooter
          shown={delegations.length}
          total={delegations.length}
          label="delegations"
        />
      </AdminTableCard>

      <ConfirmDialog
        isOpen={!!pendingRemoval}
        title="Remove delegation"
        message={
          pendingRemoval
            ? `Remove ${pendingRemoval.delegate_name || "this delegate"}'s authority to act for ${pendingRemoval.prescriber_display || "this prescriber"}?`
            : ""
        }
        confirmText="Remove"
        variant="danger"
        onConfirm={handleConfirmRemove}
        onCancel={() => setPendingRemoval(null)}
      />
    </div>
  );
}
