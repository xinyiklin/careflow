import { ShieldCheck } from "lucide-react";
import { useTranslation } from "react-i18next";

import { Badge, Card, EmptyState } from "../../../shared/ui";
import { formatDateOnly } from "../../../shared/utils/dates";
import type {
  PortalInsurancePolicy,
  PortalPatient,
} from "../../auth/api/portalAuth";
import { SectionHeader, dash } from "./sectionUi";

type InsuranceSectionProps = {
  patient: PortalPatient;
};

function InsuranceCard({ policy }: { policy: PortalInsurancePolicy }) {
  const { t } = useTranslation();

  return (
    <Card padded tone="default" className="flex flex-col gap-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-text-subtle">
            {t("profile.insurancePolicyEyebrow")}
          </p>
          <h3 className="mt-1 truncate text-base font-semibold tracking-tight text-text">
            {policy.carrier_name || t("profile.insuranceUnknownCarrier")}
          </h3>
        </div>
        {policy.is_primary ? (
          <Badge tone="accent">{t("profile.insurancePrimaryBadge")}</Badge>
        ) : null}
      </div>

      <div className="grid grid-cols-2 gap-x-4 gap-y-3 text-xs">
        <div>
          <div className="text-[10px] font-medium uppercase tracking-wider text-text-subtle">
            {t("profile.insuranceMemberId")}
          </div>
          <div className="mt-0.5 font-mono text-sm text-text">
            {dash(policy.member_id)}
          </div>
        </div>
        <div>
          <div className="text-[10px] font-medium uppercase tracking-wider text-text-subtle">
            {t("profile.insuranceGroupNumber")}
          </div>
          <div className="mt-0.5 font-mono text-sm text-text">
            {dash(policy.group_number)}
          </div>
        </div>
        <div>
          <div className="text-[10px] font-medium uppercase tracking-wider text-text-subtle">
            {t("profile.insuranceSubscriber")}
          </div>
          <div className="mt-0.5 truncate text-sm text-text">
            {dash(policy.subscriber_name)}
          </div>
        </div>
        <div>
          <div className="text-[10px] font-medium uppercase tracking-wider text-text-subtle">
            {t("profile.insuranceRelationship")}
          </div>
          <div className="mt-0.5 text-sm capitalize text-text">
            {dash(policy.relationship_to_subscriber)}
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border pt-3 text-xs text-text-muted">
        <div>
          {t("profile.insurancePlan")}:{" "}
          <span className="font-medium text-text">
            {policy.plan_name || t("profile.insurancePlanFallback")}
          </span>
        </div>
        <div>
          {t("profile.insuranceEffective")}:{" "}
          <span className="font-medium text-text">
            {formatDateOnly(policy.effective_date)}
          </span>
        </div>
      </div>
    </Card>
  );
}

export function InsuranceSection({ patient }: InsuranceSectionProps) {
  const { t } = useTranslation();
  const policies = patient.insurance_policies ?? [];

  return (
    <Card padded>
      <div className="space-y-5">
        <SectionHeader title={t("profile.sectionInsuranceTitle")} />
        {policies.length === 0 ? (
          <EmptyState
            icon={ShieldCheck}
            title={t("profile.sectionInsuranceTitle")}
            description={t("profile.noInsurance")}
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {policies.map((policy) => (
              <InsuranceCard key={policy.id} policy={policy} />
            ))}
          </div>
        )}
      </div>
    </Card>
  );
}
