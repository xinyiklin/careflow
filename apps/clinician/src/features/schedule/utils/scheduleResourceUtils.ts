import type {
  AppointmentLike,
  ResourceDefinition,
  ResourceLike,
} from "../../../shared/types/domain";

export function getDefaultColumnResourceKey(
  resources: ResourceDefinition[]
): string {
  if (!resources.length) return "";
  return resources[0].key;
}

export function buildResourceLabel(
  resource: ResourceLike,
  duplicateCount: number
): string {
  const name = resource.name?.trim() || "Unnamed resource";
  if (duplicateCount <= 1) return name;

  const linkedStaffName = resource.linked_staff_name?.trim();
  if (linkedStaffName && linkedStaffName !== name) {
    return `${name} · ${linkedStaffName}`;
  }

  return `${name} · #${resource.id}`;
}

export function areStringArraysEqual(left: string[], right: string[]): boolean {
  if (left.length !== right.length) return false;
  return left.every((value, index) => value === right[index]);
}

export function getDefaultResourceKey(
  resourceOptions: ResourceDefinition[]
): string {
  if (!resourceOptions.length) return "";
  return resourceOptions[0].key;
}

export function doesAppointmentMatchResource(
  appointment: AppointmentLike,
  resource?: ResourceDefinition | null
): boolean {
  if (!resource) return false;
  return (
    String(appointment.resource || "") === String(resource.resourceId || "")
  );
}
