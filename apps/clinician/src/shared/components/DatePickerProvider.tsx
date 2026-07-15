import { LocalizationProvider } from "@mui/x-date-pickers";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";

import type { ReactNode } from "react";

/**
 * Keep the MUI date-picker runtime inside the lazy workflows that use it,
 * rather than loading it for the login and workspace shell.
 */
export default function DatePickerProvider({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      {children}
    </LocalizationProvider>
  );
}
