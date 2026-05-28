import type { SxProps, Theme } from "@mui/material/styles";

export const MUI_DATE_FIELD_SX: SxProps<Theme> = {
  width: "100%",
  // Make sure the field actually has room for the date string plus the
  // calendar icon without truncating mid-character on narrow columns.
  minWidth: "11rem",
  "& .MuiOutlinedInput-root": {
    borderRadius: "0.75rem",
    backgroundColor: "var(--color-cf-surface)",
    color: "var(--color-cf-text)",
    boxShadow: "0 1px 2px rgba(15, 23, 42, 0.05)",
    // Tighten the gap MUI leaves between the input text and the
    // end-adornment (calendar icon). Default ``padding-right: 14px`` on
    // the root combined with an extra 8px on the adornment pushed the
    // icon too far in; this reins that in.
    paddingRight: "8px",
    "& fieldset": {
      borderColor: "var(--color-cf-border-strong)",
    },
    "&:hover fieldset": {
      borderColor: "var(--color-cf-border-strong)",
    },
    "&.Mui-focused fieldset": {
      borderColor: "var(--color-cf-accent)",
      borderWidth: 1,
    },
  },
  "& .MuiOutlinedInput-input": {
    padding: "10px 12px",
    fontSize: "0.875rem",
    lineHeight: "1.25rem",
  },
  // When MUI sees an end adornment it adds the ``MuiInputBase-inputAdornedEnd``
  // class and zeroes the right padding. We want a visible gap between the
  // last character and the calendar icon so the date label has breathing
  // room (and doesn't appear to be visually clipped).
  "& .MuiInputBase-inputAdornedEnd": {
    paddingRight: "6px",
  },
  "& .MuiInputAdornment-positionEnd": {
    marginLeft: "4px",
  },
  "& .MuiFormHelperText-root": {
    marginLeft: 0,
    marginRight: 0,
  },
  "& .MuiIconButton-root": {
    color: "var(--color-cf-text-subtle)",
  },
  "& .MuiInputLabel-root": {
    color: "var(--color-cf-text-subtle)",
  },
  "& .MuiSvgIcon-root": {
    color: "var(--color-cf-text-subtle)",
  },
};
