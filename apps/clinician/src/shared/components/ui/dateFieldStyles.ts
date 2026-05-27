import type { SxProps, Theme } from "@mui/material/styles";

export const MUI_DATE_FIELD_SX: SxProps<Theme> = {
  width: "100%",
  "& .MuiOutlinedInput-root": {
    borderRadius: "0.75rem",
    backgroundColor: "var(--color-cf-surface)",
    color: "var(--color-cf-text)",
    boxShadow: "0 1px 2px rgba(15, 23, 42, 0.05)",
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
