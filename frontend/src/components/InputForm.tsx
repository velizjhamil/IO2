"use client";

/**
 * InputForm — formulario para registrar un cliente nuevo.
 * El usuario carga 2 datos: minuto de llegada y tiempo en el servidor.
 * El cálculo secuencial (espera cuando el cliente llega antes de que el
 * anterior salga) se hace en la página, no acá.
 */
import { useState, type FormEvent } from "react";

export type NewClientInput = {
  arrivalMinute: number;
  serviceTimeMin: number;
};

type Props = {
  nextClientNumber: number;
  onAdd: (input: NewClientInput) => void;
  onLoadSample?: () => void;
  onClearAll?: () => void;
  hasRecords: boolean;
};

function parseNumber(value: string): number | null {
  if (value.trim() === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

export default function InputForm({
  nextClientNumber,
  onAdd,
  onLoadSample,
  onClearAll,
  hasRecords,
}: Props) {
  const [arrival, setArrival] = useState("");
  const [service, setService] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    const arrivalMin = parseNumber(arrival);
    const serviceMin = parseNumber(service);

    if (arrivalMin === null || arrivalMin < 0) {
      setError("El minuto de llegada debe ser un número ≥ 0.");
      return;
    }
    if (serviceMin === null || serviceMin <= 0) {
      setError("El tiempo en el servidor debe ser un número > 0.");
      return;
    }

    onAdd({ arrivalMinute: arrivalMin, serviceTimeMin: serviceMin });
    setArrival("");
    setService("");
  };

  return (
    <section
      id="datos"
      className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm shadow-zinc-200/50"
    >
      <header className="mb-5 flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold tracking-tight text-zinc-900">
            Cargar cliente
          </h2>
          <p className="mt-0.5 text-sm text-zinc-500">
            Cliente N°{nextClientNumber} — minuto de llegada y tiempo de servicio.
          </p>
        </div>
        {onLoadSample && (
          <button
            type="button"
            onClick={onLoadSample}
            className="text-xs font-medium text-emerald-600 transition hover:text-emerald-700"
          >
            Cargar muestra
          </button>
        )}
      </header>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Field
          label="Minuto de llegada"
          placeholder="0"
          unit="min"
          value={arrival}
          onChange={setArrival}
        />
        <Field
          label="Tiempo en el servidor"
          placeholder="3"
          unit="min"
          value={service}
          onChange={setService}
        />

        <div className="flex flex-col justify-end gap-2">
          <button
            type="submit"
            className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 text-sm font-medium text-white shadow-sm transition hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 focus:ring-offset-white"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-4 w-4"
            >
              <path d="M12 5v14M5 12h14" />
            </svg>
            Agregar cliente
          </button>
          {onClearAll && hasRecords && (
            <button
              type="button"
              onClick={onClearAll}
              className="text-xs text-zinc-500 underline-offset-2 transition hover:text-zinc-800 hover:underline"
            >
              Vaciar tabla
            </button>
          )}
        </div>
      </form>

      {error && (
        <p
          role="alert"
          className="mt-4 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700"
        >
          {error}
        </p>
      )}
    </section>
  );
}

type FieldProps = {
  label: string;
  placeholder: string;
  unit: string;
  value: string;
  onChange: (value: string) => void;
};

function Field({ label, placeholder, unit, value, onChange }: FieldProps) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-xs font-medium uppercase tracking-wide text-zinc-500">
        {label}
      </span>
      <div className="relative">
        <input
          type="number"
          inputMode="decimal"
          step="any"
          min="0"
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-10 w-full rounded-lg border border-zinc-200 bg-white pl-3 pr-12 text-sm text-zinc-900 placeholder:text-zinc-400 transition focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
        />
        <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs text-zinc-400">
          {unit}
        </span>
      </div>
    </label>
  );
}
