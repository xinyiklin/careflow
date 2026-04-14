import { useEffect, useMemo, useState } from "react";
import dayjs from "dayjs";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { searchPatients } from "../api/patients";
import { X } from "lucide-react";
import useDraggableModal from "../../../shared/hooks/useDraggableModal";

const PAGE_SIZE = 10;
const SEARCH_DELAY_MS = 500;

export default function PatientSearchModal({
  isOpen,
  onClose,
  onSelectPatient,
  onOpenCreatePatient,
  onOpenPatientProfile,
  allowSelect = true,
  injectedPatient,
  injectedPatientMode,
}) {
  const [name, setName] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState(null);
  const [chartNumber, setChartNumber] = useState("");
  const [results, setResults] = useState([]);
  const [selectedPatientId, setSelectedPatientId] = useState(null);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);

  const selectedPatient =
    results.find((patient) => patient.id === selectedPatientId) || null;

  const totalPages = Math.max(1, Math.ceil(results.length / PAGE_SIZE));

  const paginatedResults = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return results.slice(start, start + PAGE_SIZE);
  }, [results, page]);

  const { modalRef, modalStyle, dragHandleProps } = useDraggableModal({
    isOpen,
  });

  useEffect(() => {
    if (!isOpen) return;

    setName("");
    setChartNumber("");
    setDateOfBirth(null);
    setResults([]);
    setSelectedPatientId(null);
    setPage(1);
    setError("");
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    const trimmedName = name.trim();
    const trimmedChartNumber = chartNumber.trim();
    const validDob =
      dateOfBirth && dayjs(dateOfBirth).isValid()
        ? dayjs(dateOfBirth).format("YYYY-MM-DD")
        : "";

    const canSearchByName = trimmedName.length >= 2;
    const canSearchByMrn = trimmedChartNumber.length >= 1;
    const canSearchByDob = !!validDob;

    if (!canSearchByName && !canSearchByMrn && !canSearchByDob) {
      setResults([]);
      return;
    }

    const timeoutId = setTimeout(async () => {
      try {
        setError("");
        setSelectedPatientId(null);
        setPage(1);

        const data = await searchPatients({
          name: canSearchByName ? trimmedName : "",
          date_of_birth: canSearchByDob ? validDob : "",
          chart_number: canSearchByMrn ? trimmedChartNumber : "",
        });

        setResults(data);
      } catch (err) {
        console.error(err);
        setError("Failed to search patients.");
      }
    }, SEARCH_DELAY_MS);

    return () => clearTimeout(timeoutId);
  }, [isOpen, name, chartNumber, dateOfBirth]);

  useEffect(() => {
    if (!injectedPatient) return;

    if (injectedPatientMode === "edit") {
      setResults((prev) =>
        prev.map((patient) =>
          patient.id === injectedPatient.id ? injectedPatient : patient
        )
      );
    } else {
      setResults([injectedPatient]);
    }

    setSelectedPatientId(injectedPatient.id);
    setPage(1);
  }, [injectedPatient, injectedPatientMode]);

  if (!isOpen) return null;

  const handleOpenProfile = () => {
    if (!selectedPatient) return;
    onOpenPatientProfile?.(selectedPatient);
  };

  const handleSelectPatient = () => {
    if (!selectedPatient || !allowSelect) return;
    onSelectPatient?.(selectedPatient);
    onClose();
  };

  const handleBackdropClick = (e) => {
    e.stopPropagation();
    onClose?.();
  };

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 px-3 py-3 sm:px-4 sm:py-4"
      onClick={handleBackdropClick}
    >
      <div
        ref={modalRef}
        style={modalStyle}
        className="fixed flex max-h-[min(90dvh,900px)] w-full max-w-5xl flex-col overflow-hidden rounded-2xl bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div
          {...dragHandleProps}
          className="flex cursor-move items-center justify-between border-b border-slate-200 px-6 py-4 select-none"
        >
          <div>
            <h2 className="text-lg font-semibold text-slate-900">
              Patient Search
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Search by name, date of birth, and MRN. All filled fields must match.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onPointerDown={(e) => e.stopPropagation()}
              onClick={onOpenCreatePatient}
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            >
              New
            </button>

            <button
              type="button"
              onPointerDown={(e) => e.stopPropagation()}
              onClick={onClose}
              className="rounded-md p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-700"
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="space-y-4 border-b border-slate-200 px-6 py-5">
          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Last, First or Last"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 shadow-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Date of Birth
              </label>
              <DatePicker
                value={dateOfBirth}
                onChange={(newValue) => {
                  setDateOfBirth(newValue);
                }}
                slotProps={{
                  textField: {
                    size: "small",
                    fullWidth: true,
                    sx: { width: "100%" },
                  },
                }}
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                MRN
              </label>
              <input
                type="text"
                value={chartNumber}
                onChange={(e) => setChartNumber(e.target.value)}
                placeholder="Chart number"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 shadow-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
              />
            </div>
          </div>
        </div>

        <div className="min-h-0 flex-1 px-6 py-5">
          <div className="flex h-full min-h-[320px] flex-col overflow-hidden rounded-xl border border-slate-200">
            <div className="min-h-0 flex-1 overflow-auto">
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead className="sticky top-0 bg-slate-50">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium text-slate-600">
                      Patient
                    </th>
                    <th className="px-4 py-3 text-left font-medium text-slate-600">
                      DOB
                    </th>
                    <th className="px-4 py-3 text-left font-medium text-slate-600">
                      MRN
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-200 bg-white">
                  {paginatedResults.map((patient) => {
                    const isSelected = patient.id === selectedPatientId;

                    return (
                      <tr
                        key={patient.id}
                        onClick={() => setSelectedPatientId(patient.id)}
                        onDoubleClick={() => onOpenPatientProfile?.(patient)}
                        className={`cursor-pointer select-none transition ${isSelected ? "bg-blue-50" : "hover:bg-slate-50"
                          }`}
                      >
                        <td className="select-none px-4 py-3 text-slate-900">
                          {patient.display_name || patient.full_name}
                        </td>
                        <td className="select-none px-4 py-3 text-slate-700">
                          {patient.date_of_birth}
                        </td>
                        <td className="select-none px-4 py-3 text-slate-700">
                          {patient.chart_number || "—"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-between border-t border-slate-200 bg-slate-50 px-4 py-3">
              {results.length > 0 && (
                <>
                  <p className="text-sm text-slate-600">
                    Page {page} of {totalPages}
                  </p>

                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                      disabled={page === 1}
                      className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Prev
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        setPage((prev) => Math.min(totalPages, prev + 1))
                      }
                      disabled={page === totalPages}
                      className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Next
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between border-t border-slate-200 px-6 py-4">
          <div className="text-sm text-slate-500">
            {selectedPatient
              ? `Selected: ${selectedPatient.display_name || selectedPatient.full_name
              }`
              : "No patient selected"}
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={handleOpenProfile}
              disabled={!selectedPatient}
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Open
            </button>

            {allowSelect && (
              <button
                type="button"
                onClick={handleSelectPatient}
                disabled={!selectedPatient}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Select
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}