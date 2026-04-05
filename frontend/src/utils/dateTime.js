export function getTodayLocal() {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

export function parseLocalDate(dateString) {
  return new Date(dateString + "T00:00:00");
}

// Extract YYYY-MM-DD directly from stored datetime string
export function extractStoredDate(dateTimeString) {
  if (!dateTimeString) return "";
  return dateTimeString.slice(0, 10);
}

// Extract HH:mm directly from stored datetime string
export function extractStoredTime(dateTimeString) {
  if (!dateTimeString) return "";

  const timePart = dateTimeString.split("T")[1] || "";
  return timePart.slice(0, 5);
}