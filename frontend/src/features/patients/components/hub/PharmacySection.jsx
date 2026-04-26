import { Pill } from "lucide-react";

import { Badge } from "../../../../shared/components/ui";
import { formatAddress } from "../PatientHubSections";
import InlineEditField from "./InlineEditField";
import { RegistrationSectionShell } from "./RegistrationSectionShell";

function buildPharmacyOptions(pharmacies) {
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
}) {
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
        onSave={(next) =>
          onSavePartial({
            preferred_pharmacy: next ? Number(next) : null,
          })
        }
      />

      {selectedPharmacy ? (
        <div className="mt-3 space-y-1 rounded-xl border border-cf-border bg-cf-surface-muted/55 px-3 py-2 text-xs text-cf-text-muted">
          {selectedPharmacy.phone_number ? (
            <div>
              <span className="text-cf-text-subtle">Phone · </span>
              {selectedPharmacy.phone_number}
            </div>
          ) : null}
          {selectedPharmacy.address ? (
            <div className="leading-snug">
              {formatAddress(selectedPharmacy.address)}
            </div>
          ) : null}
        </div>
      ) : null}
    </RegistrationSectionShell>
  );
}
