"use client";

import { useMemo, useState } from "react";
import SimulationChart from "@/components/SimulationChart";
import { minutesToTimeString } from "@/lib/queueSimulation";
import {
  calculateMM1, calculateObservedQueue, observedCsv, originalObservations,
  type MM1Result,
} from "@/lib/observedQueue";

type Draft = { arrival: string; service: string };

function originalDraft(): Draft[] {
  return originalObservations().map(({ arrival, service }) => ({ arrival: String(arrival), service: String(service) }));
}

function numberFrom(text: string): number {
  return text.trim() === "" ? NaN : Number(text);
}

function metric(value: number | null, unit = "", digits = 3): string {
  return value === null || !Number.isFinite(value) ? "Unavailable" : `${value.toFixed(digits)}${unit}`;
}

function clock(minutes: number): string {
  return minutesToTimeString(16 * 60 + minutes).slice(0, 5);
}

const inputClass = "w-24 rounded-lg border border-zinc-300 bg-white px-2 py-1.5 text-right font-mono text-sm text-zinc-900 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500";
const buttonClass = "rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50";

export default function ObservedDashboard() {
  const [draft, setDraft] = useState<Draft[]>(originalDraft);
  const [revision, setRevision] = useState(0);
  const [rateSource, setRateSource] = useState<"empirical" | "manual">("empirical");
  const [manualLambda, setManualLambda] = useState("0.2");
  const [manualMu, setManualMu] = useState("0.3");
  const [n, setN] = useState("0");

  const calculation = useMemo(() => {
    try {
      return { result: calculateObservedQueue(draft.map(({ arrival, service }) => ({ arrival: numberFrom(arrival), service: numberFrom(service) }))), error: null };
    } catch (error) {
      return { result: null, error: (error as Error).message };
    }
    // Revision also allows an explicit recalculation without changing the input.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft, revision]);

  const summary = calculation.result?.summary;
  const theoretical = useMemo((): { result: MM1Result | null; error: string | null } => {
    if (rateSource === "empirical" && (!summary || summary.lambda === null || summary.mu === null)) {
      return { result: null, error: "Empirical rates are unavailable. Add arrivals spanning more than 0 min and positive total service, or select manual rates." };
    }
    try {
      const lambda = rateSource === "empirical" ? summary!.lambda! : numberFrom(manualLambda);
      const mu = rateSource === "empirical" ? summary!.mu! : numberFrom(manualMu);
      const parsedN = /^\d+$/.test(n.trim()) ? Number(n) : NaN;
      return { result: calculateMM1(lambda, mu, parsedN), error: null };
    } catch (error) {
      return { result: null, error: (error as Error).message };
    }
  }, [rateSource, summary, manualLambda, manualMu, n]);

  function edit(index: number, key: keyof Draft, value: string) {
    setDraft((previous) => previous.map((row, i) => i === index ? { ...row, [key]: value } : row));
  }

  function exportCsv() {
    if (!calculation.result) return;
    const blob = new Blob([observedCsv(calculation.result.rows)], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "observed-queue.csv";
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-8">
      <section id="observations" className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-200 p-5">
          <div>
            <h2 className="text-lg font-semibold text-zinc-900">Observed arrivals and service times</h2>
            <p className="mt-1 text-sm text-zinc-600">Minutes since 16:00. Row 1 always arrives at 0; equal arrival times are allowed. FIFO, one server.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" className={buttonClass} onClick={() => setDraft((previous) => [...previous, { arrival: previous.at(-1)?.arrival ?? "0", service: "0" }])}>Add vehicle</button>
            <button type="button" className={buttonClass} onClick={() => setRevision((value) => value + 1)}>Recalculate</button>
            <button type="button" className={buttonClass} onClick={() => setDraft(originalDraft())}>Restore original 40</button>
            <button type="button" className={buttonClass} disabled={!calculation.result} onClick={exportCsv}>Export CSV</button>
          </div>
        </div>
        {calculation.error && <p role="alert" className="mx-5 mt-4 rounded-lg bg-rose-50 p-3 text-sm text-rose-700">{calculation.error} Correct the input to resume calculation.</p>}
        {draft.length === 0 && <p className="p-5 text-sm text-zinc-500">No observations. Add a vehicle or restore the original 40.</p>}
        <div className="max-h-[600px] overflow-auto">
          <table className="w-full min-w-[1020px] text-right text-sm">
            <thead className="sticky top-0 bg-zinc-50 text-xs text-zinc-600">
              <tr className="border-b border-zinc-200">
                {["Vehicle", "Arrival (min)", "Interarrival (min)", "Service (min)", "Start (min)", "Wait (min)", "Departure (min)", "System (min)", ""].map((heading) => <th key={heading} scope="col" className="px-3 py-3 font-semibold">{heading}</th>)}
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 font-mono text-zinc-700">
              {draft.map((entry, index) => {
                const row = calculation.result?.rows[index];
                return <tr key={index} className="hover:bg-zinc-50">
                  <td className="px-3 py-2">{index + 1}</td>
                  <td className="px-3 py-2"><label className="sr-only" htmlFor={`arrival-${index}`}>Arrival for vehicle {index + 1}</label><input id={`arrival-${index}`} className={inputClass} inputMode="decimal" value={entry.arrival} readOnly={index === 0} onChange={(event) => edit(index, "arrival", event.target.value)} />{row && <span className="block text-xs text-zinc-400">{clock(row.arrival)}</span>}</td>
                  <td className="px-3 py-2">{row ? metric(row.interval) : "—"}</td>
                  <td className="px-3 py-2"><label className="sr-only" htmlFor={`service-${index}`}>Service for vehicle {index + 1}</label><input id={`service-${index}`} className={inputClass} inputMode="decimal" value={entry.service} onChange={(event) => edit(index, "service", event.target.value)} /></td>
                  <td className="px-3 py-2">{row ? metric(row.start) : "—"}</td>
                  <td className="px-3 py-2 font-semibold text-amber-700">{row ? metric(row.wait) : "—"}</td>
                  <td className="px-3 py-2">{row ? metric(row.departure) : "—"}</td>
                  <td className="px-3 py-2">{row ? metric(row.system) : "—"}</td>
                  <td className="px-3 py-2"><button type="button" className="text-rose-700 hover:underline disabled:text-zinc-400" disabled={index === 0 && draft.length > 1} onClick={() => setDraft((previous) => previous.filter((_, i) => i !== index))} aria-label={`Remove vehicle ${index + 1}`}>Remove</button></td>
                </tr>;
              })}
            </tbody>
          </table>
        </div>
      </section>

      {summary && <>
        <section id="observed-summary" className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-zinc-900">Observed summary</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {([
              ["Vehicles", String(summary.count)], ["Average wait", metric(summary.avgWait, " min")],
              ["Average service", metric(summary.avgService, " min")], ["Average system time", metric(summary.avgSystem, " min")],
              ["Maximum wait", metric(summary.maxWait, " min")], ["Waited", `${summary.waited} (${summary.waitedPercent.toFixed(1)}%)`],
              ["Observation duration", metric(summary.duration, " min")], ["Server utilization", metric(summary.utilization === null ? null : 100 * summary.utilization, "%")],
              ["Empirical λ", metric(summary.lambda, " vehicles/min")], ["Empirical μ", metric(summary.mu, " vehicles/min")],
            ] as [string, string][]).map(([label, value]) => <div key={label} className="rounded-xl bg-zinc-50 p-4"><dt className="text-xs text-zinc-500">{label}</dt><dd className="mt-1 font-semibold text-zinc-900">{value}</dd></div>)}
          </div>
          <p className="mt-4 text-xs leading-relaxed text-zinc-600">Finite observation: duration runs from the first arrival to the last departure; busy time is the sum of service times. Utilization = busy / duration. λ = (vehicles − 1) / (last arrival − first arrival); μ = vehicles / total service time. Rates and utilization are unavailable when their denominator is zero. Observed values are not theoretical steady-state guarantees.</p>
        </section>
        {calculation.result && <SimulationChart vehicles={calculation.result.rows} summary={summary} />}
      </>}

      <section id="theoretical" className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-zinc-900">Theoretical M/M/1 (separate model)</h2>
        <p className="mt-1 text-sm text-zinc-600">Assumes Poisson arrivals and exponential service times; these assumptions are not inferred from the observations.</p>
        <div className="mt-4 flex flex-wrap items-end gap-4">
          <label className="text-sm text-zinc-600">Rate source<select className="mt-1 block rounded-lg border border-zinc-300 bg-white p-2" value={rateSource} onChange={(event) => setRateSource(event.target.value as "empirical" | "manual")}><option value="empirical">Empirical</option><option value="manual">Manual</option></select></label>
          {rateSource === "manual" && <>
            <label className="text-sm text-zinc-600">λ (vehicles/min)<input className={`mt-1 block ${inputClass}`} inputMode="decimal" value={manualLambda} onChange={(event) => setManualLambda(event.target.value)} /></label>
            <label className="text-sm text-zinc-600">μ (vehicles/min)<input className={`mt-1 block ${inputClass}`} inputMode="decimal" value={manualMu} onChange={(event) => setManualMu(event.target.value)} /></label>
          </>}
          {rateSource === "empirical" && summary && <span className="text-sm text-zinc-600">λ = {metric(summary.lambda)} · μ = {metric(summary.mu)} vehicles/min</span>}
          <label className="text-sm text-zinc-600">n for P(n)<input className={`mt-1 block ${inputClass}`} inputMode="numeric" value={n} onChange={(event) => setN(event.target.value)} /></label>
        </div>
        {theoretical.error && <p role="alert" className="mt-4 rounded-lg bg-rose-50 p-3 text-sm text-rose-700">{theoretical.error}</p>}
        {theoretical.result && <>
          {!theoretical.result.stable && <p role="status" className="mt-4 rounded-lg bg-amber-50 p-3 text-sm text-amber-800">Unstable (λ ≥ μ): no valid steady-state L, Lq, W, Wq, P0 or P(n).</p>}
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {([ ["ρ", theoretical.result.rho, ""], ["P0", theoretical.result.p0, ""], ["L", theoretical.result.L, " vehicles"], ["Lq", theoretical.result.Lq, " vehicles"], ["W", theoretical.result.W, " min"], ["Wq", theoretical.result.Wq, " min"], [`P(${n})`, theoretical.result.pn, ""] ] as [string, number | null, string][]).map(([label, value, unit]) => <div key={label} className="rounded-xl bg-zinc-50 p-4"><dt className="text-xs text-zinc-500">{label}</dt><dd className="mt-1 font-semibold text-zinc-900">{metric(value, unit)}</dd></div>)}
          </div>
        </>}
      </section>
    </div>
  );
}
