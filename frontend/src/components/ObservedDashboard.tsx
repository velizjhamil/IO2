"use client";

import { useMemo, useRef, useState, type ChangeEvent } from "react";
import SimulationChart from "@/components/SimulationChart";
import { formatClockFromStart, parseDecimalInput, timeStringToMinutes } from "@/lib/queueSimulation";
import {
  calculateMM1,
  calculateObservedQueue,
  observedCsv,
  originalObservations,
  parseObservedCsv,
  type MM1Result,
} from "@/lib/observedQueue";

type Draft = { id: number; arrival: string; service: string };
type ImportStatus = { type: "success" | "error"; text: string };
const INITIAL_NEXT_DRAFT_ID = originalObservations().length + 1;

function originalDraft(firstId = 1): Draft[] {
  return originalObservations().map(({ arrival, service }, index) => ({
    id: firstId + index,
    arrival: String(arrival),
    service: String(service),
  }));
}

function numberFrom(text: string): number {
  return parseDecimalInput(text) ?? NaN;
}

function metric(value: number | null, unit = "", digits = 3): string {
  return value === null || !Number.isFinite(value) ? "No disponible" : `${value.toFixed(digits)}${unit}`;
}

function getDurationMin(start: string, end: string): number {
  const s = timeStringToMinutes(start);
  const e = timeStringToMinutes(end);
  let diff = e - s;
  if (diff < 0) diff += 24 * 60;
  return Math.round(diff * 100) / 100;
}

const inputClass = "w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 font-mono text-sm text-zinc-900 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500";
const tableInputClass = "w-28 rounded-lg border border-zinc-300 bg-white px-2 py-1.5 text-right font-mono text-sm text-zinc-900 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500";
const buttonClass = "rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2";
const actionChipClass = "rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-100 hover:border-zinc-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 transition";

export default function ObservedDashboard() {
  const nextDraftId = useRef(INITIAL_NEXT_DRAFT_ID);
  const [draft, setDraft] = useState<Draft[]>(originalDraft);
  const [lambdaInput, setLambdaInput] = useState("0.250");
  const [muInput, setMuInput] = useState("0.350");
  const [n, setN] = useState("0");
  const [startTime, setStartTime] = useState("16:00");
  const [endTime, setEndTime] = useState("18:10");
  const [tableExpanded, setTableExpanded] = useState(true);
  const [importStatus, setImportStatus] = useState<ImportStatus | null>(null);

  const calculation = useMemo(() => {
    try {
      const observations = [...draft]
        .sort((a, b) => a.id - b.id)
        .map(({ arrival, service }) => ({ arrival: numberFrom(arrival), service: numberFrom(service) }));
      return { result: calculateObservedQueue(observations), error: null };
    } catch (error) {
      return { result: null, error: (error as Error).message };
    }
  }, [draft]);

  const summary = calculation.result?.summary.count ? calculation.result.summary : null;

  const windowDuration = useMemo(() => getDurationMin(startTime, endTime), [startTime, endTime]);
  const durationHours = Math.floor(windowDuration / 60);
  const durationMins = Math.round(windowDuration % 60);

  const calculatedLastDepartureClock = calculation.result && summary && calculation.result.rows.length > 0
    ? formatClockFromStart(calculation.result.rows.at(-1)!.departure, startTime)
    : null;

  const theoretical = useMemo((): { result: MM1Result | null; error: string | null } => {
    try {
      const lambda = numberFrom(lambdaInput);
      const mu = numberFrom(muInput);
      if (Number.isNaN(lambda) || Number.isNaN(mu)) {
        return { result: null, error: "Ingrese números válidos para λ y μ." };
      }
      if (lambda < 0 || mu <= 0) {
        return { result: null, error: "λ debe ser no negativo y μ debe ser mayor a 0." };
      }
      const parsedN = /^\d+$/.test(n.trim()) ? Number(n) : NaN;
      if (Number.isNaN(parsedN) || parsedN < 0) {
        return { result: null, error: "n debe ser un número entero mayor o igual a 0." };
      }
      return { result: calculateMM1(lambda, mu, parsedN), error: null };
    } catch (error) {
      return { result: null, error: (error as Error).message };
    }
  }, [lambdaInput, muInput, n]);

  function handleLoadObservedRates() {
    if (summary && summary.lambda !== null && summary.mu !== null) {
      setLambdaInput(summary.lambda.toFixed(3));
      setMuInput(summary.mu.toFixed(3));
    }
  }

  function handleLoadStableRates() {
    setLambdaInput("0.250");
    setMuInput("0.350");
  }

  function handleCalculateLambdaFromWindow() {
    if (windowDuration > 0 && draft.length > 0) {
      const calculatedLambda = draft.length / windowDuration;
      setLambdaInput(calculatedLambda.toFixed(3));
    }
  }

  function handleSyncEndTimeWithTable() {
    if (calculatedLastDepartureClock) {
      setEndTime(calculatedLastDepartureClock.slice(0, 5));
    }
  }

  function edit(id: number, key: "arrival" | "service", value: string) {
    setImportStatus(null);
    setDraft((previous) => previous.map((row) => row.id === id ? { ...row, [key]: value } : row));
  }

  function addVehicle() {
    const id = nextDraftId.current;
    nextDraftId.current += 1;
    setImportStatus(null);
    setDraft((previous) => [...previous, { id, arrival: previous.at(-1)?.arrival ?? "0", service: "1" }]);
  }

  function restoreOriginal() {
    setImportStatus(null);
    const restoredDraft = originalDraft(nextDraftId.current);
    nextDraftId.current += restoredDraft.length;
    setDraft(restoredDraft);
    setTableExpanded(true);
  }

  function removeVehicle(id: number) {
    setImportStatus(null);
    setDraft((previous) => previous.filter((row) => row.id !== id));
  }

  function exportCsv() {
    if (!calculation.result || calculation.result.rows.length === 0) return;
    const blob = new Blob([observedCsv(calculation.result.rows)], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "cola-observada.csv";
    link.style.display = "none";
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  async function importCsv(event: ChangeEvent<HTMLInputElement>) {
    const input = event.currentTarget;
    const file = input.files?.[0];
    if (!file) return;

    setImportStatus(null);
    try {
      const observations = parseObservedCsv(await file.text());
      const importedDraft = observations.map(({ arrival, service }, index) => ({
        id: nextDraftId.current + index,
        arrival: String(arrival),
        service: String(service),
      }));
      nextDraftId.current += importedDraft.length;
      setDraft(importedDraft);
      setTableExpanded(true);
      setImportStatus({ type: "success", text: `Se importaron ${observations.length} observaciones. Las columnas calculadas se actualizaron con estos datos.` });
    } catch (error) {
      setImportStatus({ type: "error", text: (error as Error).message });
    } finally {
      input.value = "";
    }
  }

  const comparisonRows = summary && theoretical.result ? [
    {
      label: "Utilización (ρ)",
      theoretical: theoretical.result.rho,
      observed: summary.utilization,
      scale: 100,
      unit: "%",
      differenceUnit: " p. p.",
    },
    {
      label: "Espera promedio (Wq)",
      theoretical: theoretical.result.Wq,
      observed: summary.avgWait,
      scale: 1,
      unit: " min",
      differenceUnit: " min",
    },
    {
      label: "Tiempo promedio en el sistema (W)",
      theoretical: theoretical.result.W,
      observed: summary.avgSystem,
      scale: 1,
      unit: " min",
      differenceUnit: " min",
    },
    {
      label: "Ocupación media de la cola (Lq)",
      theoretical: theoretical.result.Lq,
      observed: summary.avgQueueOccupancy,
      scale: 1,
      unit: " vehículos",
      differenceUnit: " vehículos",
    },
    {
      label: "Ocupación media del sistema (L)",
      theoretical: theoretical.result.L,
      observed: summary.avgSystemOccupancy,
      scale: 1,
      unit: " vehículos",
      differenceUnit: " vehículos",
    },
  ] : [];

  const lambdaNum = numberFrom(lambdaInput);
  const muNum = numberFrom(muInput);

  return (
    <div className="space-y-8">
      {/* Calculadora M/M/1 reactiva */}
      <section id="calculator" className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-100 pb-4">
          <div>
            <h2 className="text-xl font-semibold text-zinc-900">Calculadora de colas M/M/1</h2>
            <p className="mt-1 text-sm text-zinc-600">
              Todos los campos son editables. Modifique cualquier parámetro y los resultados se actualizarán en tiempo real.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className={actionChipClass}
              onClick={handleLoadStableRates}
              title="Cargar tasas con ρ < 1 (sistema en equilibrio)"
            >
              Cargar ejemplo estable
            </button>
            {summary && summary.lambda !== null && summary.mu !== null && (
              <button
                type="button"
                className={actionChipClass}
                onClick={handleLoadObservedRates}
                title="Cargar tasas empíricas calculadas de la tabla de vehículos"
              >
                Copiar tasas de la tabla (λ={summary.lambda.toFixed(3)}, μ={summary.mu.toFixed(3)})
              </button>
            )}
            <button
              type="button"
              className={actionChipClass}
              onClick={handleCalculateLambdaFromWindow}
              title="Calcular λ dividiendo vehículos entre la duración de la ventana"
            >
              Calcular λ por ventana ({draft.length} veh en {windowDuration} min)
            </button>
          </div>
        </div>

        {/* Inputs de la calculadora */}
        <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <label className="text-sm font-medium text-zinc-700">
            Hora de inicio
            <input
              className={`mt-1.5 ${inputClass}`}
              type="time"
              value={startTime}
              onChange={(event) => setStartTime(event.target.value)}
            />
            <span className="mt-1 block text-xs text-zinc-400">Inicio de la observación</span>
          </label>

          <label className="text-sm font-medium text-zinc-700">
            Hora de fin
            <div className="relative">
              <input
                className={`mt-1.5 ${inputClass}`}
                type="time"
                value={endTime}
                onChange={(event) => setEndTime(event.target.value)}
              />
            </div>
            <div className="mt-1 flex items-center justify-between text-xs text-zinc-500">
              <span>{windowDuration} min ({durationHours}h {durationMins}m)</span>
              {calculatedLastDepartureClock && (
                <button
                  type="button"
                  onClick={handleSyncEndTimeWithTable}
                  className="text-emerald-600 hover:underline"
                  title="Alinear con la salida del último vehículo registrado"
                >
                  Fijar {calculatedLastDepartureClock.slice(0, 5)}
                </button>
              )}
            </div>
          </label>

          <label className="text-sm font-medium text-zinc-700">
            λ (Llegadas / min)
            <input
              className={`mt-1.5 ${inputClass}`}
              inputMode="decimal"
              value={lambdaInput}
              onChange={(event) => setLambdaInput(event.target.value)}
              placeholder="0.250"
            />
            <span className="mt-1 block text-xs text-zinc-400">
              {Number.isFinite(lambdaNum) && lambdaNum > 0 ? `≈ ${(lambdaNum * 60).toFixed(1)} veh/hora` : "Tasa de llegada"}
            </span>
          </label>

          <label className="text-sm font-medium text-zinc-700">
            μ (Servicio / min)
            <input
              className={`mt-1.5 ${inputClass}`}
              inputMode="decimal"
              value={muInput}
              onChange={(event) => setMuInput(event.target.value)}
              placeholder="0.350"
            />
            <span className="mt-1 block text-xs text-zinc-400">
              {Number.isFinite(muNum) && muNum > 0 ? `≈ ${(muNum * 60).toFixed(1)} veh/hora` : "Tasa de atención"}
            </span>
          </label>

          <label className="text-sm font-medium text-zinc-700">
            n para P(n)
            <input
              className={`mt-1.5 ${inputClass}`}
              inputMode="numeric"
              value={n}
              onChange={(event) => setN(event.target.value)}
              placeholder="0"
            />
            <span className="mt-1 block text-xs text-zinc-400">Clientes para evaluar P(n)</span>
          </label>
        </div>

        {/* Mensajes de error / advertencia */}
        {theoretical.error && (
          <p role="alert" className="mt-4 rounded-lg bg-rose-50 p-3 text-sm text-rose-700">
            {theoretical.error}
          </p>
        )}

        {theoretical.result && !theoretical.result.stable && (
          <div role="status" className="mt-4 rounded-xl border border-amber-200 bg-amber-50/70 p-4">
            <div className="flex items-center gap-2">
              <span className="inline-flex h-2.5 w-2.5 rounded-full bg-amber-500" />
              <p className="text-sm font-semibold text-amber-900">
                Sistema inestable (λ ≥ μ · ρ = {theoretical.result.rho.toFixed(3)})
              </p>
            </div>
            <p className="mt-1.5 text-xs leading-relaxed text-amber-800">
              Llegan más clientes ({lambdaInput} veh/min) de los que el servidor puede atender ({muInput} veh/min).
              En este escenario la cola crece indefinidamente y no existe estado estable. Reduzca λ o aumente μ para estabilizar el sistema (o haga clic en &ldquo;Cargar ejemplo estable&rdquo;).
            </p>
          </div>
        )}

        {/* Tarjetas de resultados teóricos M/M/1 */}
        {theoretical.result && (
          <div className="mt-6">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-zinc-800">
                Resultados del modelo teórico M/M/1
              </h3>
              <span
                className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                  theoretical.result.stable
                    ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                    : "bg-amber-50 text-amber-800 border border-amber-200"
                }`}
              >
                <span className={`h-1.5 w-1.5 rounded-full ${theoretical.result.stable ? "bg-emerald-500" : "bg-amber-500"}`} />
                {theoretical.result.stable ? `Estable (ρ = ${(theoretical.result.rho * 100).toFixed(1)}%)` : "Sobrecargado (ρ ≥ 1)"}
              </span>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
              {[
                { label: "Utilización (ρ)", value: theoretical.result.rho, unit: "", desc: "Fracción de tiempo ocupado" },
                { label: "P(0) Vacío", value: theoretical.result.p0, unit: "", desc: "Probabilidad servidor desocupado" },
                { label: "L (en sistema)", value: theoretical.result.L, unit: " veh", desc: "Promedio total de clientes" },
                { label: "Lq (en cola)", value: theoretical.result.Lq, unit: " veh", desc: "Promedio esperando en cola" },
                { label: "W (espera total)", value: theoretical.result.W, unit: " min", desc: "Tiempo promedio en sistema" },
                { label: "Wq (espera cola)", value: theoretical.result.Wq, unit: " min", desc: "Tiempo promedio en cola" },
                { label: `P(${n || 0})`, value: theoretical.result.pn, unit: "", desc: `Probabilidad de ${n || 0} clientes` },
              ].map(({ label, value, unit, desc }) => (
                <div key={label} className="rounded-xl border border-zinc-100 bg-zinc-50/70 p-3.5 transition hover:bg-zinc-50">
                  <dt className="text-xs font-medium text-zinc-500">{label}</dt>
                  <dd className="mt-1 text-base font-bold text-zinc-900">{metric(value, unit)}</dd>
                  <p className="mt-1 text-[11px] text-zinc-400 leading-tight">{desc}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Comparación directa si hay datos observados */}
        {comparisonRows.length > 0 && theoretical.result?.stable && (
          <div className="mt-6 border-t border-zinc-100 pt-5">
            <h3 className="text-sm font-semibold text-zinc-900">Comparación teórica M/M/1 vs Observaciones reales</h3>
            <p className="mt-1 text-xs text-zinc-500">
              Contrasta las predicciones teóricas calculadas arriba contra el comportamiento promedio registrado en la tabla.
            </p>
            <div className="mt-3 overflow-x-auto">
              <table className="w-full min-w-[640px] text-right text-sm">
                <thead className="bg-zinc-50 text-xs text-zinc-600">
                  <tr>
                    {["Medida", "M/M/1 teórico", "Cola observada", "Diferencia (observada − teórica)"].map((heading) => (
                      <th key={heading} scope="col" className="px-3 py-2.5 font-semibold">
                        {heading}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 text-zinc-700 font-mono">
                  {comparisonRows.map((row) => {
                    const difference = row.theoretical === null || row.observed === null ? null : row.observed - row.theoretical;
                    return (
                      <tr key={row.label} className="hover:bg-zinc-50/60">
                        <th scope="row" className="px-3 py-2.5 text-left font-sans font-medium text-zinc-800">
                          {row.label}
                        </th>
                        <td className="px-3 py-2.5">{metric(row.theoretical === null ? null : row.theoretical * row.scale, row.unit)}</td>
                        <td className="px-3 py-2.5 font-semibold text-emerald-700">{metric(row.observed === null ? null : row.observed * row.scale, row.unit)}</td>
                        <td className="px-3 py-2.5 text-zinc-500">{metric(difference === null ? null : difference * row.scale, row.differenceUnit)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>

      {/* Tabla de observaciones de campo */}
      <section id="observations" className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-200 p-5">
          <div>
            <h2 className="text-lg font-semibold text-zinc-900">Llegadas y tiempos de servicio observados</h2>
            <p className="mt-1 text-sm text-zinc-600">
              Minutos contados a partir de las {startTime}. Puede modificar la llegada o duración del servicio de cualquier fila y la simulación se actualizará automáticamente.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" className={buttonClass} onClick={addVehicle}>
              Agregar vehículo
            </button>
            <button type="button" className={buttonClass} onClick={restoreOriginal}>
              Restaurar 40 originales
            </button>
            <button type="button" className={buttonClass} disabled={!calculation.result || calculation.result.rows.length === 0} onClick={exportCsv}>
              Exportar CSV
            </button>
            <label className={`${buttonClass} inline-flex cursor-pointer items-center focus-within:outline-none focus-within:ring-2 focus-within:ring-emerald-600 focus-within:ring-offset-2`}>
              Importar CSV
              <input className="sr-only" type="file" accept=".csv,text/csv" onChange={importCsv} />
            </label>
            <button
              type="button"
              className={buttonClass}
              aria-expanded={tableExpanded}
              aria-controls="observations-table"
              onClick={() => setTableExpanded((expanded) => !expanded)}
            >
              {tableExpanded ? "Ocultar tabla" : `Mostrar tabla (${draft.length})`}
            </button>
          </div>
        </div>

        {importStatus && (
          <p role={importStatus.type === "error" ? "alert" : "status"} className={`mx-5 mt-4 rounded-lg p-3 text-sm ${importStatus.type === "error" ? "bg-rose-50 text-rose-700" : "bg-emerald-50 text-emerald-800"}`}>
            {importStatus.text}
          </p>
        )}
        {calculation.error && (
          <p role="alert" className="mx-5 mt-4 rounded-lg bg-rose-50 p-3 text-sm text-rose-700">
            {calculation.error} Corrija los datos para reanudar el cálculo.
          </p>
        )}
        {draft.length === 0 && (
          <p className="p-5 text-sm text-zinc-500">No hay observaciones. Agregue un vehículo, importe un CSV o restaure los 40 originales.</p>
        )}

        <div id="observations-table" className="max-h-[600px] overflow-auto" hidden={!tableExpanded}>
          <table className="w-full min-w-[1020px] text-right text-sm">
            <thead className="sticky top-0 bg-zinc-50 text-xs text-zinc-600">
              <tr className="border-b border-zinc-200">
                {["Vehículo", "Llegada (min)", "Entre llegadas (min)", "Servicio (min)", "Inicio (min)", "Espera (min)", "Salida (min)", "Sistema (min)", "Acción"].map((heading) => (
                  <th key={heading} scope="col" className="px-3 py-3 font-semibold">
                    {heading}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 font-mono text-zinc-700">
              {draft.map((entry, index) => {
                const row = calculation.result?.rows[index];
                const rowNumber = index + 1;
                return (
                  <tr key={entry.id} className="hover:bg-zinc-50">
                    <td className="px-3 py-2">{rowNumber}</td>
                    <td className="px-3 py-2">
                      <label className="sr-only" htmlFor={`arrival-${entry.id}`}>
                        Llegada del vehículo {rowNumber}
                      </label>
                      <input
                        id={`arrival-${entry.id}`}
                        className={tableInputClass}
                        inputMode="decimal"
                        value={entry.arrival}
                        onChange={(event) => edit(entry.id, "arrival", event.target.value)}
                      />
                      {row && <span className="block text-xs text-zinc-400">{formatClockFromStart(row.arrival, startTime)}</span>}
                    </td>
                    <td className="px-3 py-2">{row ? metric(row.interval) : "—"}</td>
                    <td className="px-3 py-2">
                      <label className="sr-only" htmlFor={`service-${entry.id}`}>
                        Servicio del vehículo {rowNumber}
                      </label>
                      <input
                        id={`service-${entry.id}`}
                        className={tableInputClass}
                        inputMode="decimal"
                        value={entry.service}
                        onChange={(event) => edit(entry.id, "service", event.target.value)}
                      />
                    </td>
                    <td className="px-3 py-2">{row ? metric(row.start) : "—"}</td>
                    <td className="px-3 py-2 font-semibold text-amber-700">{row ? metric(row.wait) : "—"}</td>
                    <td className="px-3 py-2">
                      {row ? metric(row.departure) : "—"}
                      {row && <span className="block text-xs text-zinc-400">{formatClockFromStart(row.departure, startTime)}</span>}
                    </td>
                    <td className="px-3 py-2">{row ? metric(row.system) : "—"}</td>
                    <td className="px-3 py-2">
                      <button
                        type="button"
                        className="text-rose-700 hover:underline disabled:text-zinc-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-600 focus-visible:ring-offset-2"
                        onClick={() => removeVehicle(entry.id)}
                        aria-label={`Eliminar vehículo ${rowNumber}`}
                      >
                        Eliminar
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* Resumen empírico de observaciones */}
      <section id="observed-summary" className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-zinc-900">Resumen de observaciones de campo</h2>
        {summary ? (
          <>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {([
                ["Vehículos", String(summary.count)],
                ["Espera promedio", metric(summary.avgWait, " min")],
                ["Servicio promedio", metric(summary.avgService, " min")],
                ["Tiempo promedio en el sistema", metric(summary.avgSystem, " min")],
                ["Espera máxima", metric(summary.maxWait, " min")],
                ["Vehículos que esperaron", `${summary.waited} (${summary.waitedPercent.toFixed(1)}%)`],
                ["Duración de la observación", metric(summary.duration, " min")],
                ["Utilización del servidor", metric(summary.utilization === null ? null : 100 * summary.utilization, "%")],
                ["Ocupación media de la cola", metric(summary.avgQueueOccupancy, " vehículos")],
                ["Ocupación media del sistema", metric(summary.avgSystemOccupancy, " vehículos")],
                ["λ empírica", metric(summary.lambda, " vehículos/min")],
                ["μ empírica", metric(summary.mu, " vehículos/min")],
              ] as [string, string][]).map(([label, value]) => (
                <div key={label} className="rounded-xl bg-zinc-50 p-4">
                  <dt className="text-xs text-zinc-500">{label}</dt>
                  <dd className="mt-1 font-semibold text-zinc-900">{value}</dd>
                </div>
              ))}
            </div>
            <p className="mt-4 text-xs leading-relaxed text-zinc-600">
              La observación abarca desde la primera llegada hasta la última salida. La utilización es el tiempo ocupado dividido por esa duración.
              λ empírica = (vehículos − 1) / intervalo entre la primera y la última llegada; μ empírica = vehículos / tiempo total de servicio.
            </p>
          </>
        ) : (
          <p role="status" className="mt-3 rounded-lg bg-amber-50 p-3 text-sm text-amber-800">
            {calculation.error
              ? `El resumen se actualizará cuando los datos vuelvan a ser válidos. ${calculation.error}`
              : "No hay observaciones para mostrar métricas. Agregue un vehículo, importe un CSV o restaure los 40 originales."}
          </p>
        )}
      </section>

      {/* Gráfico de simulación */}
      {calculation.result && summary && <SimulationChart vehicles={calculation.result.rows} summary={summary} />}
    </div>
  );
}
