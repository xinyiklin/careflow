import { parse, isValid, format } from "date-fns";

function normalizeQuery(query) {
  return String(query || "")
    .trim()
    .replace(/\s+/g, " ");
}

function stripKnownTokens(query) {
  return query
    .replace(/\b(?:mrn|chart)\s*[:#]?\s*\d+\b/gi, "")
    .replace(/\b(?:dob|birth(?:day)?|born)\s*[:#]?\s*/gi, "")
    .replace(/\b\d{8}\b/g, "")
    .replace(/\b\d{4}-\d{2}-\d{2}\b/g, "")
    .replace(/\b\d{1,2}[/-]\d{1,2}[/-]\d{2,4}\b/g, "")
    .replace(
      /\b(?:phone|cell|mobile|tel)\s*[:#]?\s*(?:\+?1[\s.-]?)?(?:\(?\d{3}\)?[\s.-]?)?\d{3}[\s.-]?\d{4}\b/gi,
      ""
    )
    .replace(
      /\b(?:\+?1[\s.-]?)?(?:\(?\d{3}\)?[\s.-]?)?\d{3}[\s.-]?\d{4}\b/g,
      ""
    )
    .replace(/^,|,$/g, "")
    .trim()
    .replace(/\s*,\s*/g, ", ")
    .replace(/\s+/g, " ");
}

export function parsePatientQuery(query) {
  if (!query)
    return {
      name: "",
      date_of_birth: "",
      chart_number: "",
      phone: "",
      needsAi: false,
    };

  const normalizedQuery = normalizeQuery(query);
  const mrnMatch = normalizedQuery.match(/\b(?:mrn|chart)\s*[:#]?\s*(\d+)\b/i);
  let chart_number = mrnMatch ? mrnMatch[1] : "";

  const dateMatch = normalizedQuery.match(
    /\b(\d{8}|\d{4}-\d{2}-\d{2}|\d{1,2}[/-]\d{1,2}[/-]\d{2,4})\b/
  );
  let date_of_birth = "";

  if (dateMatch) {
    const raw = dateMatch[1];
    let parsedDate = null;

    if (raw.includes("-")) {
      parsedDate =
        raw.length === 10 && raw.indexOf("-") === 4
          ? parse(raw, "yyyy-MM-dd", new Date())
          : parse(
              raw,
              raw.split("-")[2]?.length === 2 ? "M-d-yy" : "M-d-yyyy",
              new Date()
            );
    } else if (raw.includes("/")) {
      parsedDate = parse(
        raw,
        raw.split("/")[2]?.length === 2 ? "M/d/yy" : "M/d/yyyy",
        new Date()
      );
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

  const phoneMatch = normalizedQuery.match(
    /\b(?:phone|cell|mobile|tel)?\s*[:#]?\s*((?:\+?1[\s.-]?)?(?:\(?\d{3}\)?[\s.-]?)?\d{3}[\s.-]?\d{4})\b/i
  );
  const phone = phoneMatch ? phoneMatch[1].replace(/\D/g, "") : "";

  if (
    !chart_number &&
    !date_of_birth &&
    !phone &&
    /^\d+$/.test(normalizedQuery)
  ) {
    chart_number = normalizedQuery;
  }

  const name =
    chart_number === normalizedQuery ? "" : stripKnownTokens(normalizedQuery);

  const needsAi =
    !chart_number &&
    !date_of_birth &&
    !phone &&
    /\b(?:born|male|female|patient|mrn)\b/i.test(normalizedQuery);

  return { name, date_of_birth, chart_number, phone, needsAi };
}
