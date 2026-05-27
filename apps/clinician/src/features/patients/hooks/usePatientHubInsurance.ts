import { useCallback, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  createPatientInsurancePolicy,
  deletePatientInsurancePolicy,
  fetchInsuranceCarriers,
  fetchPatientInsurancePolicies,
  updatePatientInsurancePolicy,
} from "../api/insurance";
import {
  findConflictingInsurancePolicy,
  formatCoverageOrder,
  formatPolicyDateRange,
} from "../components/PatientHubSections";

import type { EntityId } from "../../../shared/api/types";
import type { ApiPayload } from "../../../shared/api/types";
import type {
  InsuranceCarrier,
  InsurancePolicyFormValues,
  InsurancePolicyPayload,
  PatientHubInsurancePolicy,
} from "../types";

export type ConfirmRequest = {
  title: string;
  message: string;
  confirmText: string;
  cancelText: string;
  variant: "default" | "danger" | "warning";
  onConfirm: () => void | Promise<void>;
};

export default function usePatientHubInsurance({
  facilityId,
  patientId,
  enabled = true,
  onConfirmNeeded,
}: {
  facilityId?: EntityId | null;
  patientId?: EntityId | null;
  enabled?: boolean;
  onConfirmNeeded: (request: ConfirmRequest) => void;
}) {
  const queryClient = useQueryClient();
  const [isPolicyModalOpen, setIsPolicyModalOpen] = useState(false);
  const [editingPolicy, setEditingPolicy] =
    useState<PatientHubInsurancePolicy | null>(null);

  const policiesQueryKey = [
    "patientHub",
    "insurancePolicies",
    facilityId || null,
    patientId || null,
  ];

  const insurancePoliciesQuery = useQuery({
    queryKey: policiesQueryKey,
    queryFn: () => fetchPatientInsurancePolicies({ facilityId, patientId }),
    enabled: enabled && !!facilityId && !!patientId,
  });

  const carriersQuery = useQuery({
    queryKey: ["patientHub", "insuranceCarriers", facilityId || null],
    queryFn: () => fetchInsuranceCarriers({ facilityId }),
    enabled: enabled && !!facilityId,
  });

  const insurancePolicies = useMemo(
    () =>
      Array.isArray(insurancePoliciesQuery.data)
        ? (insurancePoliciesQuery.data as PatientHubInsurancePolicy[])
        : [],
    [insurancePoliciesQuery.data]
  );

  const carriers: InsuranceCarrier[] = Array.isArray(carriersQuery.data)
    ? (carriersQuery.data as InsuranceCarrier[])
    : [];

  const closePolicyModal = useCallback(() => {
    setEditingPolicy(null);
    setIsPolicyModalOpen(false);
  }, []);

  const insuranceMutation = useMutation({
    mutationFn: async ({
      id,
      values,
    }: {
      id?: EntityId | null;
      values: InsurancePolicyFormValues | InsurancePolicyPayload;
    }) => {
      if (id) {
        return updatePatientInsurancePolicy(
          facilityId,
          id,
          values as ApiPayload
        );
      }
      return createPatientInsurancePolicy(facilityId, {
        ...values,
        patient: Number(patientId),
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: policiesQueryKey });
      closePolicyModal();
    },
  });

  const deleteInsuranceMutation = useMutation({
    mutationFn: (id: EntityId) => deletePatientInsurancePolicy(facilityId, id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: policiesQueryKey });
      closePolicyModal();
    },
  });

  const openPolicyModal = useCallback(
    (policy: PatientHubInsurancePolicy | null = null) => {
      if (!enabled) return;
      setEditingPolicy(policy);
      setIsPolicyModalOpen(true);
    },
    [enabled]
  );

  const submitPolicy = useCallback(
    (values: InsurancePolicyFormValues | InsurancePolicyPayload) => {
      const editingPolicyId = editingPolicy?.id || null;
      const conflictingPolicy = findConflictingInsurancePolicy(
        insurancePolicies,
        values,
        editingPolicyId
      );

      const savePolicy = async () => {
        await insuranceMutation.mutateAsync({ id: editingPolicyId, values });
      };

      if (!conflictingPolicy) {
        return savePolicy();
      }

      const coverageLabel = formatCoverageOrder(
        values.coverage_order,
        values.is_primary
      ).toLowerCase();
      const carrierLabel = conflictingPolicy.carrier_name || "another policy";

      onConfirmNeeded({
        title: "Overlapping Insurance Policy",
        message: `This patient already has an active ${coverageLabel} insurance policy for ${carrierLabel} during ${formatPolicyDateRange(conflictingPolicy)}. You can keep both policies if this is intentional.`,
        confirmText: "Save Anyway",
        cancelText: "Review Policy",
        variant: "warning",
        onConfirm: savePolicy,
      });

      return null;
    },
    [editingPolicy, insuranceMutation, insurancePolicies, onConfirmNeeded]
  );

  const requestDeletePolicy = useCallback(() => {
    if (!editingPolicy?.id) return;
    const policyId = editingPolicy.id;
    onConfirmNeeded({
      title: "Remove Insurance Policy",
      message:
        "Are you sure you want to remove this insurance policy from the patient record?",
      confirmText: "Remove",
      cancelText: "Cancel",
      variant: "danger",
      onConfirm: async () => {
        await deleteInsuranceMutation.mutateAsync(policyId);
      },
    });
  }, [deleteInsuranceMutation, editingPolicy, onConfirmNeeded]);

  return {
    insurancePoliciesQuery,
    insurancePolicies,
    carriers,
    isPolicyModalOpen,
    editingPolicy,
    saving: insuranceMutation.isPending || deleteInsuranceMutation.isPending,
    openPolicyModal,
    closePolicyModal,
    submitPolicy,
    requestDeletePolicy,
  };
}
