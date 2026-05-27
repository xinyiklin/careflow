import { Pill } from "lucide-react";

import { Badge } from "../../../../shared/components/ui";
import { formatAddress } from "../PatientHubSections";
import InlineEditField from "./InlineEditField";
import { RegistrationSectionShell } from "./RegistrationSectionShell";

import type {
  PatientPatchPayload,
  PatientRecord,
  PharmacyRecord,
} from "../../types";

type PharmacySectionProps = {
  patient: PatientRecord;
  pharmacies?: PharmacyRecord[];
  onSavePartial: (partial: PatientPatchPayload) => Promise<void> | void;
};

function buildPharmacyOptions(pharmacies: PharmacyRecord[]) {
  return [
    { value: "", label: "No preferred pharmacy" },
    ...(pharmacies || []).map((pharmacy) => ({
      value: String(pharmacy.id),
      label: pharmacy.name || `Pharmacy ${pharmacy.id}`,
    })),
  ];
}

export default function PharmacySection({
  patient,
  pharmacies = [],
  onSavePartial,
}: PharmacySectionProps) {
  const options = buildPharmacyOptions(pharmacies);
  const selectedPharmacy = (pharmacies || []).find(
    (pharmacy) => String(pharmacy.id) === String(patient?.preferred_pharmacy)
  );
  const displayName =
    selectedPharmacy?.name || patient?.preferred_pharmacy_name || "";

  return (
    <RegistrationSectionShell
      icon={Pill}
      title="Preferred pharmacy"
      bodyClassName="px-3.5 py-2.5"
      badge={
        selectedPharmacy?.accepts_erx ? (
          <Badge variant="success">eRx accepted</Badge>
        ) : null
      }
    >
      <InlineEditField
        label="Pharmacy"
        type="select"
        options={options}
        value={
          patient?.preferred_pharmacy ? String(patient.preferred_pharmacy) : ""
        }
        displayValue={displayName}
        emptyHint="No preferred pharmacy"
        compact
        onSave={(next) =>
          onSavePartial({
            preferred_pharmacy: next ? Number(next) : null,
          })
        }
      />

      {selectedPharmacy ? (
        <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg border border-cf-border bg-cf-surface-muted/55 px-2.5 py-1.5 text-[11px] leading-4 text-cf-text-muted">
          {selectedPharmacy.phone_number ? (
            <div className="min-w-fit">
              <span className="text-cf-text-subtle">Phone </span>
              {selectedPharmacy.phone_number}
            </div>
          ) : null}
          {selectedPharmacy.address ? (
            <div className="min-w-0 flex-1 truncate">
              {formatAddress(selectedPharmacy.address)}
            </div>
          ) : null}
        </div>
      ) : null}
    </RegistrationSectionShell>
  );
}
