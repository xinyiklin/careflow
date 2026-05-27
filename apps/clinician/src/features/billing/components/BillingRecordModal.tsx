import { useEffect, useMemo, useState } from "react";

import { FormLabel as Label } from "../../patients/components/PatientFormFields";
import {
  BillingDiagnosisEditor,
  BillingServiceLineEditor,
  blankChargeLine,
  blankDiagnosis,
} from "./BillingRecordModalSections";
import { POS_CODES } from "./BillingTabSections";
import {
  fetchInsuranceCarriers,
  fetchPatientInsurancePolicies,
} from "../../patients/api/insurance";
import { Button, Input, ModalShell } from "../../../shared/components/ui";

import type {
  BillingChargeLine,
  BillingDiagnosis,
  BillingRecordStatus,
  ClinicalEncounter,
  EncounterBillingRecord,
  EncounterBillingRecordPayload,
  FeeScheduleItem,
} from "../types";
import type { InsuranceCarrier } from "../../patients/types";
import type { EntityId } from "../../../shared/api/types";
import type { ChargeLineRow, DiagnosisRow } from "./BillingRecordModalSections";

type BillingRecordModalProps = {
  isOpen: boolean;
  record?: EncounterBillingRecord | null;
  encounter?: ClinicalEncounter | null;
  facilityId?: EntityId | null;
  feeScheduleItems?: FeeScheduleItem[];
  defaultPayerName?: string;
  saving?: boolean;
  error?: string;
  onClose: () => void;
  onSave: (values: EncounterBillingRecordPayload) => void | Promise<void>;
};

function getStatusLabel(status: BillingRecordStatus) {
  if (status === "ready_to_submit") return "Ready to Submit";
  if (status === "claim_created") return "Claim Created";
  return "Coding Needed";
}

function toDiagnosisRows(diagnoses?: BillingDiagnosis[]) {
  const rows = (diagnoses || []).map((diagnosis) => ({
    code: diagnosis.code || "",
    description: diagnosis.description || "",
  }));
  return rows.length ? rows : [{ ...blankDiagnosis }];
}

function toChargeLineRows(chargeLines?: BillingChargeLine[]) {
  const rows = (chargeLines || []).map((line) => ({
    service_code: line.service_code || "",
    description: line.description || "",
    modifier_1: line.modifier_1 || "",
    modifier_2: line.modifier_2 || "",
    modifier_3: line.modifier_3 || "",
    modifier_4: line.modifier_4 || "",
    units: String(line.units || "1.00"),
    charge_amount: String(line.charge_amount || "0.00"),
    diagnosis_pointers: (line.diagnosis_pointers || []).join(", ") || "1",
  }));
  return rows.length ? rows : [{ ...blankChargeLine }];
}

function parseDiagnosisPointers(value: string) {
  return value
    .split(",")
    .map((item) => Number.parseInt(item.trim(), 10))
    .filter((item) => Number.isFinite(item) && item > 0);
}

export default function BillingRecordModal({
  isOpen,
  record = null,
  encounter = null,
  facilityId = null,
  feeScheduleItems = [],
  defaultPayerName = "",
  saving = false,
  error = "",
  onClose,
  onSave,
}: BillingRecordModalProps) {
  const [status, setStatus] = useState<BillingRecordStatus>("coding_needed");
  const [payerName, setPayerName] = useState("");
  const [carriers, setCarriers] = useState<InsuranceCarrier[]>([]);
  const [selectedCarrierId, setSelectedCarrierId] = useState<string | number>(
    ""
  );
  const [isManualOverride, setIsManualOverride] = useState(false);
  const [placeOfService, setPlaceOfService] = useState("11");
  const [notes, setNotes] = useState("");
  const [diagnoses, setDiagnoses] = useState<DiagnosisRow[]>([
    { ...blankDiagnosis },
  ]);
  const [chargeLines, setChargeLines] = useState<ChargeLineRow[]>([
    { ...blankChargeLine },
  ]);
  const [localError, setLocalError] = useState("");
  const title = record?.id ? "Edit Superbill" : "Create Superbill";
  const sourceEncounter = record?.encounter || encounter?.id;

  useEffect(() => {
    if (!isOpen) return;
    setStatus((record?.status as BillingRecordStatus) || "coding_needed");
    setPlaceOfService(record?.place_of_service || "11");
    setNotes(record?.notes || "");
    setDiagnoses(toDiagnosisRows(record?.diagnoses));
    setChargeLines(toChargeLineRows(record?.charge_lines));
    setLocalError("");

    setCarriers([]);
    setSelectedCarrierId("");
    setIsManualOverride(false);

    const initialPayer = record?.payer_name || defaultPayerName || "";

    const loadData = async () => {
      try {
        const fetchedCarriers = await fetchInsuranceCarriers({ facilityId });
        setCarriers(fetchedCarriers || []);

        const patientId = record?.patient || encounter?.patient;
        const policyFacilityId =
          record?.facility || encounter?.facility || facilityId;

        let finalPayer = initialPayer;

        if (patientId && !record?.id) {
          const policiesList = await fetchPatientInsurancePolicies({
            patientId,
            facilityId: policyFacilityId,
          });
          const primaryActivePolicy = (policiesList || []).find(
            (p) => p.is_primary && p.is_active !== false
          );
          if (primaryActivePolicy && primaryActivePolicy.carrier_name) {
            finalPayer = primaryActivePolicy.carrier_name;
          }
        }

        if (finalPayer) {
          const matched = (fetchedCarriers || []).find(
            (c: InsuranceCarrier) =>
              c.name?.toLowerCase().trim() === finalPayer.toLowerCase().trim()
          );
          if (matched) {
            setSelectedCarrierId(String(matched.id));
            setIsManualOverride(false);
          } else {
            setSelectedCarrierId("manual");
            setIsManualOverride(true);
          }
        } else {
          setSelectedCarrierId("");
          setIsManualOverride(false);
        }

        setPayerName(finalPayer);
      } catch (err) {
        console.error("Error loading superbill insurance details:", err);
      }
    };

    void loadData();
  }, [defaultPayerName, facilityId, isOpen, record, encounter]);

  const selectedCarrier = useMemo(() => {
    if (selectedCarrierId === "manual" || selectedCarrierId === "") return null;
    return (
      carriers.find((c) => String(c.id) === String(selectedCarrierId)) || null
    );
  }, [carriers, selectedCarrierId]);

  const handleCarrierChange = (val: string) => {
    setSelectedCarrierId(val);
    if (val === "manual") {
      setIsManualOverride(true);
      setPayerName("");
    } else if (val === "") {
      setIsManualOverride(false);
      setPayerName("");
    } else {
      setIsManualOverride(false);
      const matched = carriers.find((c) => String(c.id) === String(val));
      if (matched) {
        setPayerName(matched.name || "");
      }
    }
  };

  const totalPreview = useMemo(
    () =>
      chargeLines.reduce((total, line) => {
        const units = Number.parseFloat(line.units || "0");
        const amount = Number.parseFloat(line.charge_amount || "0");
        if (!Number.isFinite(units) || !Number.isFinite(amount)) return total;
        return total + units * amount;
      }, 0),
    [chargeLines]
  );

  const setDiagnosisField = (
    index: number,
    field: keyof DiagnosisRow,
    value: string
  ) => {
    setDiagnoses((current) =>
      current.map((row, rowIndex) =>
        rowIndex === index ? { ...row, [field]: value } : row
      )
    );
  };

  const setChargeLineField = (
    index: number,
    field: keyof ChargeLineRow,
    value: string
  ) => {
    if (field === "service_code") {
      const normalizedCode = value.trim().toUpperCase();
      const matchedFee = feeScheduleItems.find(
        (item) => item.service_code?.toUpperCase() === normalizedCode
      );

      if (matchedFee) {
        if (matchedFee.place_of_service) {
          setPlaceOfService(matchedFee.place_of_service);
        }
        setChargeLines((current) =>
          current.map((row, rowIndex) =>
            rowIndex === index
              ? {
                  ...row,
                  service_code: normalizedCode,
                  description: matchedFee.description || row.description,
                  modifier_1: matchedFee.modifier_1 || "",
                  modifier_2: matchedFee.modifier_2 || "",
                  modifier_3: matchedFee.modifier_3 || "",
                  modifier_4: matchedFee.modifier_4 || "",
                  units: matchedFee.default_units || row.units || "1.00",
                  charge_amount:
                    matchedFee.charge_amount || row.charge_amount || "0.00",
                }
              : row
          )
        );
        return;
      }
    }

    setChargeLines((current) =>
      current.map((row, rowIndex) =>
        rowIndex === index ? { ...row, [field]: value } : row
      )
    );
  };

  const handleSubmit = () => {
    const diagnosisPayload = diagnoses
      .map((diagnosis, index) => ({
        code: diagnosis.code.trim(),
        description: diagnosis.description.trim(),
        sequence: index + 1,
      }))
      .filter((diagnosis) => diagnosis.code);
    const chargeLinePayload = chargeLines
      .map((line, index) => ({
        service_code: line.service_code.trim(),
        description: line.description.trim(),
        modifier_1: line.modifier_1.trim(),
        modifier_2: line.modifier_2.trim(),
        modifier_3: line.modifier_3.trim(),
        modifier_4: line.modifier_4.trim(),
        units: line.units.trim() || "1.00",
        charge_amount: line.charge_amount.trim() || "0.00",
        diagnosis_pointers: parseDiagnosisPointers(line.diagnosis_pointers),
        sequence: index + 1,
      }))
      .filter((line) => line.service_code);

    if (status === "ready_to_submit") {
      if (!diagnosisPayload.length || !chargeLinePayload.length) {
        setLocalError(
          "Ready to Submit needs at least one diagnosis and service line."
        );
        return;
      }
    }

    setLocalError("");
    void onSave({
      ...(record?.id ? {} : { encounter: sourceEncounter }),
      status,
      payer_name: payerName.trim(),
      place_of_service: placeOfService.trim() || "11",
      notes: notes.trim(),
      diagnoses: diagnosisPayload,
      charge_lines: chargeLinePayload,
    });
  };

  return (
    <ModalShell
      isOpen={isOpen}
      onClose={onClose}
      eyebrow="Billing"
      title={title}
      maxWidth="4xl"
      footerClassName="bg-cf-surface !py-3"
      footer={
        <div className="flex w-full flex-wrap items-center justify-between gap-3">
          <div className="text-sm font-semibold tabular-nums text-cf-text-muted">
            Total ${totalPreview.toFixed(2)}
          </div>
          <div className="flex items-center gap-3">
            <Button
              type="button"
              variant="default"
              onClick={onClose}
              disabled={saving}
            >
              Close
            </Button>
            <Button
              type="button"
              variant="primary"
              onClick={handleSubmit}
              disabled={saving}
            >
              {saving ? "Saving..." : "Save Superbill"}
            </Button>
          </div>
        </div>
      }
    >
      <div className="space-y-5">
        {error || localError ? (
          <div
            className="rounded-xl border border-cf-danger-text/25 bg-cf-danger-bg px-4 py-3 text-sm text-cf-danger-text"
            role="alert"
          >
            {localError || error}
          </div>
        ) : null}

        <div className="grid gap-4 md:grid-cols-3">
          <div>
            <Label compact>Status</Label>
            <Input
              as="select"
              value={status}
              onChange={(event) =>
                setStatus(event.target.value as BillingRecordStatus)
              }
              disabled={saving}
            >
              {(
                ["coding_needed", "ready_to_submit"] as BillingRecordStatus[]
              ).map((option) => (
                <option key={option} value={option}>
                  {getStatusLabel(option)}
                </option>
              ))}
            </Input>
          </div>
          <div className="space-y-1.5">
            <Label compact>Payer</Label>
            <Input
              as="select"
              value={selectedCarrierId}
              onChange={(event) => handleCarrierChange(event.target.value)}
              disabled={saving}
            >
              <option value="">Unassigned</option>
              {carriers.map((carrier) => (
                <option key={carrier.id} value={carrier.id}>
                  {carrier.name}{" "}
                  {carrier.payer_id ? `(${carrier.payer_id})` : ""}
                </option>
              ))}
              <option value="manual">Other (Manual Override)</option>
            </Input>
            {isManualOverride && (
              <Input
                placeholder="Enter custom payer name"
                value={payerName}
                onChange={(event) => setPayerName(event.target.value)}
                disabled={saving}
              />
            )}
          </div>
          <div>
            <Label compact>Place of Service</Label>
            <Input
              as="select"
              value={placeOfService}
              onChange={(event) => setPlaceOfService(event.target.value)}
              disabled={saving}
            >
              {POS_CODES.map((pos) => (
                <option key={pos.value} value={pos.value}>
                  {pos.label}
                </option>
              ))}
            </Input>
          </div>
        </div>

        {selectedCarrier && (
          <div className="border-t border-cf-border pt-4">
            <div className="flex items-center justify-between mb-2">
              <span className="font-semibold text-cf-text text-sm">
                Electronic Claim Information
              </span>
              {selectedCarrier.payer_id && (
                <span className="inline-flex items-center rounded-md bg-cf-accent/10 px-2 py-0.5 font-mono text-[11px] font-semibold text-cf-accent border border-cf-accent/20">
                  Payer ID: {selectedCarrier.payer_id}
                </span>
              )}
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <div>
                <span className="block font-medium text-xs text-cf-text-subtle">
                  Phone Number
                </span>
                <span className="text-cf-text font-mono text-xs mt-0.5 block">
                  {selectedCarrier.phone_number || "—"}
                </span>
              </div>
              <div>
                <span className="block font-medium text-xs text-cf-text-subtle">
                  Website
                </span>
                <span className="text-cf-text text-xs mt-0.5 block truncate">
                  {selectedCarrier.website ? (
                    <a
                      href={selectedCarrier.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-cf-accent hover:underline"
                    >
                      {selectedCarrier.website}
                    </a>
                  ) : (
                    "—"
                  )}
                </span>
              </div>
              <div>
                <span className="block font-medium text-xs text-cf-text-subtle">
                  Claim Submission Address
                </span>
                <span className="text-cf-text text-xs mt-0.5 block leading-relaxed">
                  {selectedCarrier.address_line_1 ? (
                    <>
                      {selectedCarrier.address_line_1}
                      {selectedCarrier.address_line_2
                        ? `, ${selectedCarrier.address_line_2}`
                        : ""}
                      <br />
                      {selectedCarrier.city && `${selectedCarrier.city}, `}
                      {selectedCarrier.state && `${selectedCarrier.state} `}
                      {selectedCarrier.zip_code}
                    </>
                  ) : (
                    "—"
                  )}
                </span>
              </div>
            </div>
          </div>
        )}

        <BillingDiagnosisEditor
          diagnoses={diagnoses}
          saving={saving}
          setDiagnoses={setDiagnoses}
          setDiagnosisField={setDiagnosisField}
        />

        <BillingServiceLineEditor
          chargeLines={chargeLines}
          saving={saving}
          diagnoses={diagnoses}
          feeScheduleItems={feeScheduleItems}
          setChargeLines={setChargeLines}
          setChargeLineField={setChargeLineField}
        />

        <div>
          <Label compact>Billing Notes</Label>
          <Input
            as="textarea"
            rows={3}
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            disabled={saving}
          />
        </div>
      </div>
    </ModalShell>
  );
}
