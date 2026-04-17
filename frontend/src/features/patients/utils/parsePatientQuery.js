import { parse, isValid, format } from "date-fns";

export function parsePatientQuery(query) {
  if (!query)
    return { name: "", date_of_birth: "", chart_number: "", needsAi: false };

  const mrnMatch = query.match(/\b(?:mrn|chart)\s*[:#]?\s*([a-z0-9-]+)\b/i);
  let chart_number = mrnMatch ? mrnMatch[1].toUpperCase() : "";

  const dateMatch = query.match(
    /\b(\d{8}|\d{4}-\d{2}-\d{2}|\d{1,2}\/\d{1,2}\/\d{4})\b/
  );
  let date_of_birth = "";

  if (dateMatch) {
    const raw = dateMatch[1];
    let parsedDate = null;

    if (raw.includes("-")) {
      parsedDate = parse(raw, "yyyy-MM-dd", new Date());
    } else if (raw.includes("/")) {
      parsedDate = parse(raw, "M/d/yyyy", new Date());
    } else if (raw.length === 8) {
      const firstFour = parseInt(raw.substring(0, 4), 10);

      if (firstFour >= 1900 && firstFour <= new Date().getFullYear() + 1) {
        parsedDate = parse(raw, "yyyyMMdd", new Date());
      } else {
        parsedDate = parse(raw, "MMddyyyy", new Date());
      }
    }

    if (isValid(parsedDate)) {
      date_of_birth = format(parsedDate, "yyyy-MM-dd");
    }
  }

  let name = query
    .replace(/\b(?:mrn|chart)\s*[:#]?\s*[a-z0-9-]+\b/gi, "")
    .replace(/\b\d{8}\b/g, "")
    .replace(/\b\d{4}-\d{2}-\d{2}\b/g, "")
    .replace(/\b\d{1,2}\/\d{1,2}\/\d{4}\b/g, "")
    .replace(/\bborn\b/gi, "")
    .trim()
    .replace(/^,|,$/g, "")
    .trim();

  const needsAi =
    !chart_number &&
    !date_of_birth &&
    /\b(?:born|male|female|patient|mrn)\b/i.test(query);

  return { name, date_of_birth, chart_number, needsAi };
}
