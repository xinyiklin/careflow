export function getDefaultColumnResourceKey(resources) {
  if (!resources.length) return "";
  return resources[0].key;
}

export function buildResourceLabel(resource, duplicateCount) {
  const name = resource.name?.trim() || "Unnamed resource";
  if (duplicateCount <= 1) return name;

  const linkedStaffName = resource.linked_staff_name?.trim();
  if (linkedStaffName && linkedStaffName !== name) {
    return `${name} · ${linkedStaffName}`;
  }

  return `${name} · #${resource.id}`;
}

export function areStringArraysEqual(left, right) {
  if (left.length !== right.length) return false;
  return left.every((value, index) => value === right[index]);
}

export function getDefaultResourceKey(resourceOptions) {
  if (!resourceOptions.length) return "";
  return resourceOptions[0].key;
}

export function doesAppointmentMatchResource(appointment, resource) {
  if (!resource) return false;
  return (
    String(appointment.resource || "") === String(resource.resourceId || "")
  );
}
