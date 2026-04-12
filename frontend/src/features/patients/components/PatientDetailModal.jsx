import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { createPatient, updatePatient } from "../api/patients";

const emptyValues = {
  first_name: "",
  last_name: "",
  date_of_birth: "",
  gender: "",
  is_active: true,
};

export default function PatientDetailModal({
  isOpen,
  mode,
  patient,
  genderOptions,
  onClose,
  onSaved,
}) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({
    defaultValues: emptyValues,
  });

  useEffect(() => {
    if (!isOpen) return;

    reset({
      first_name: patient?.first_name || "",
      last_name: patient?.last_name || "",
      date_of_birth: patient?.date_of_birth || "",
      gender: mode === "create" ? "U" : patient?.gender || "U",
      is_active: patient?.is_active ?? true,
    });
  }, [isOpen, patient, mode, reset]);

  if (!isOpen) return null;

  const onSubmit = async (data) => {
    const payload = {
      first_name: data.first_name.trim(),
      last_name: data.last_name.trim(),
      date_of_birth: data.date_of_birth,
      gender: data.gender,
      is_active: data.is_active,
    };

    try {
      let savedPatient;

      if (mode === "edit" && patient?.id) {
        savedPatient = await updatePatient(patient.id, payload);
      } else {
        savedPatient = await createPatient(payload);
      }

      onSaved?.(savedPatient);
      onClose();
    } catch (error) {
      console.error(error);
      alert("Failed to save patient.");
    }
  };

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40 px-3 py-3 sm:px-4 sm:py-4"
      onClick={onClose}
    >
      <div
        className="flex max-h-[min(90dvh,900px)] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <form
          onSubmit={handleSubmit(onSubmit)}
          className="flex min-h-0 flex-1 flex-col"
        >
          <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
            <h2 className="text-lg font-semibold text-slate-900">
              {mode === "edit" ? "Patient Details" : "Create Patient"}
            </h2>

            <button
              type="button"
              onClick={onClose}
              className="rounded-md p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-700"
              aria-label="Close"
            >
              ✕
            </button>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  First Name
                </label>
                <input
                  type="text"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 shadow-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                  {...register("first_name", {
                    required: "First name is required.",
                  })}
                />
                {errors.first_name && (
                  <p className="mt-1 text-sm text-red-600">
                    {errors.first_name.message}
                  </p>
                )}
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Last Name
                </label>
                <input
                  type="text"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 shadow-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                  {...register("last_name", {
                    required: "Last name is required.",
                  })}
                />
                {errors.last_name && (
                  <p className="mt-1 text-sm text-red-600">
                    {errors.last_name.message}
                  </p>
                )}
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Date of Birth
                </label>
                <input
                  type="date"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 shadow-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                  {...register("date_of_birth", {
                    required: "Date of birth is required.",
                  })}
                />
                {errors.date_of_birth && (
                  <p className="mt-1 text-sm text-red-600">
                    {errors.date_of_birth.message}
                  </p>
                )}
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Gender
                </label>
                {!genderOptions || genderOptions.length === 0 ? (
                  <div className="rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-500">
                    Loading genders...
                  </div>
                ) : (
                  <select
                    {...register("gender", {
                      required: "Gender is required.",
                    })}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                  >
                    {genderOptions.map((option) => (
                      <option key={option.code} value={option.id}>
                        {option.name}
                      </option>
                    ))}
                  </select>
                )}
                {errors.gender && (
                  <p className="mt-1 text-sm text-red-600">
                    {errors.gender.message}
                  </p>
                )}
              </div>

              <div className="md:col-span-2">
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  MRN
                </label>
                <input
                  type="text"
                  value={patient?.chart_number || ""}
                  readOnly
                  placeholder="Assigned by system"
                  className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-500 shadow-sm outline-none"
                />
              </div>

              {mode === "edit" && (
                <div className="md:col-span-2">
                  <label className="inline-flex items-center gap-2 text-sm text-slate-700">
                    <input
                      type="checkbox"
                      {...register("is_active")}
                      className="h-4 w-4 rounded border-slate-300"
                    />
                    Active patient
                  </label>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 border-t border-slate-200 px-6 py-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={
                isSubmitting || !genderOptions || genderOptions.length === 0
              }
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSubmitting
                ? "Saving..."
                : mode === "edit"
                  ? "Save Changes"
                  : "Create Patient"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}