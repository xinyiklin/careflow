import { toFacilityDateTime } from "../../../shared/utils/dateTime";

export function getPatientDisplayName(selectedPatient) {
  if (!selectedPatient) return "";

  const fallbackName = `${selectedPatient.last_name || ""}, ${
    selectedPatient.first_name || ""
  }`
    .replace(/^,\s*/, "")
    .trim();

  return (
    selectedPatient.display_name || selectedPatient.full_name || fallbackName
  );
}

export function getPrimaryInsurancePolicy(policies) {
  if (!Array.isArray(policies) || !policies.length) return null;
  return policies.find((policy) => policy.is_primary) || policies[0] || null;
}

export function formatAddress(address) {
  if (!address?.line_1) return "";

  const cityStateZip = [
    address.city,
    [address.state, address.zip_code].filter(Boolean).join(" "),
  ]
    .filter(Boolean)
    .join(", ");

  return [address.line_1, address.line_2, cityStateZip]
    .filter(Boolean)
    .join(" • ");
}

export function formatPickerValueForApi(value) {
  if (!(value instanceof Date) || Number.isNaN(value.getTime())) {
    return "";
  }

  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  const hours = String(value.getHours()).padStart(2, "0");
  const minutes = String(value.getMinutes()).padStart(2, "0");

  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

export function parseFacilityLocalDateTime(value, timeZone) {
  if (!value) return null;

  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }

  if (typeof value !== "string") {
    return null;
  }

  const localDateTimeMatch = value.match(
    /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/
  );

  if (localDateTimeMatch && !/[zZ]|[+-]\d{2}:?\d{2}$/.test(value)) {
    const [, year, month, day, hours, minutes] = localDateTimeMatch;
    const parsed = new Date(
      Number(year),
      Number(month) - 1,
      Number(day),
      Number(hours),
      Number(minutes)
    );
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  return toFacilityDateTime(value, timeZone);
}

export function addMinutes(date, minutes) {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) return null;
  return new Date(date.getTime() + minutes * 60000);
}

export function getPhysicianLabel(physician) {
  if (physician?.display_name) return physician.display_name;

  const fullName = [physician.user?.first_name, physician.user?.last_name]
    .filter(Boolean)
    .join(" ")
    .trim();

  return [physician.title_name, fullName || physician.user?.username]
    .filter(Boolean)
    .join(" ")
    .trim();
}

export function isRenderingProviderStaff(staff) {
  if (!staff?.is_active) return false;
  if (staff.can_render_claims) return true;

  const roleCode = String(
    staff.role_code || staff.role_name || ""
  ).toLowerCase();
  const titleCode = String(
    staff.title_code || staff.title_name || ""
  ).toLowerCase();

  return (
    roleCode === "physician" ||
    ["md", "do", "np", "pa", "cnm", "cns", "crna"].includes(titleCode)
  );
}
