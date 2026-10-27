"use client";

/** Observed FIFO queue with a separate legacy manual-entry calculator. */
import { useMemo, useState } from "react";
import Navbar from "@/components/Navbar";
import ObservedDashboard from "@/components/ObservedDashboard";
import InputForm, { type NewClientInput } from "@/components/InputForm";
import QueueTable from "@/components/QueueTable";
import ResultsCard from "@/components/ResultsCard";
import { minutesToTimeString, processFieldRecords, calculateQueueMetrics, type FieldRecord } from "@/lib/queueSimulation";

type RawClient = {
  arrivalMinute: number;
  serviceTimeMin: number;
};

type ResolvedRow = {
  id: number;
  arrivalTime: string;
  serviceStartTime: string;
  departureTime: string;
};

function resolveQueueSequence(raws: RawClient[]): ResolvedRow[] {
  const rows: ResolvedRow[] = [];
  let serverAvailableAt = 0;

  raws.forEach((raw, index) => {
    const arrival = raw.arrivalMinute;
    const serviceStart = Math.max(arrival, serverAvailableAt);
    const departure = serviceStart + raw.serviceTimeMin;

    rows.push({
      id: index + 1,
      arrivalTime: minutesToTimeString(arrival),
      serviceStartTime: minutesToTimeString(serviceStart),
      departureTime: minutesToTimeString(departure),
    });

    serverAvailableAt = departure;
  });

  return rows;
}

const TEAM_MEMBERS = [
  "1. Berthol Acosta Osorio",
  "2. Juany Nicol Velasquez Carrillo",
  "3. Jhamil Veliz Loayza",
];

export default function Home() {
  const [activeTab, setActiveTab] = useState<"observed" | "manual">("observed");

  const [raws, setRaws] = useState<RawClient[]>([]);

  const handleAddManual = (input: NewClientInput) => {
    setRaws((prev) => [...prev, input]);
  };

  const handleRemoveManual = (id: number) => {
    setRaws((prev) => prev.filter((_, i) => i + 1 !== id));
  };

  const handleLoadSampleManual = () => {
    setRaws([
      { arrivalMinute: 0, serviceTimeMin: 2.5 },
      { arrivalMinute: 2, serviceTimeMin: 2.5 },
      { arrivalMinute: 4.5, serviceTimeMin: 3.25 },
      { arrivalMinute: 6, serviceTimeMin: 2.75 },
      { arrivalMinute: 10, serviceTimeMin: 2.5 },
      { arrivalMinute: 12.5, serviceTimeMin: 2.5 },
      { arrivalMinute: 17, serviceTimeMin: 2.75 },
      { arrivalMinute: 18.25, serviceTimeMin: 2.75 },
      { arrivalMinute: 21, serviceTimeMin: 2.5 },
      { arrivalMinute: 24, serviceTimeMin: 3.5 },
      { arrivalMinute: 27.5, serviceTimeMin: 2.5 },
      { arrivalMinute: 30, serviceTimeMin: 3.25 },
    ]);
  };

  const handleClearAllManual = () => {
    setRaws([]);
  };

  const resolvedManual = useMemo(() => resolveQueueSequence(raws), [raws]);

  const fieldRecordsManual: FieldRecord[] = useMemo(
    () =>
      resolvedManual.map((r) => ({
        id: r.id,
        arrivalTime: r.arrivalTime,
        serviceStartTime: r.serviceStartTime,
        departureTime: r.departureTime,
      })),
    [resolvedManual]
  );

  const processedManual = useMemo(
    () => processFieldRecords(fieldRecordsManual),
    [fieldRecordsManual]
  );

  const metricsManual = useMemo(
    () => calculateQueueMetrics(processedManual),
    [processedManual]
  );

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-800">
      <Navbar />

      <main className="mx-auto max-w-6xl px-6 py-10 sm:py-14">
        <header className="mb-8 max-w-3xl">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-600">Operations Research II</p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-zinc-900 sm:text-4xl">Observed single-server queue</h1>
          <p className="mt-4 text-sm leading-relaxed text-zinc-600">Analyze 40 paired vehicle arrivals and service durations from 16:00 using deterministic FIFO calculations. Compare observations with a separate theoretical M/M/1 model.</p>
        </header>
        <div className="mb-8 flex flex-wrap gap-2 border-b border-zinc-200 pb-3" role="tablist" aria-label="Queue analysis mode">
          <button type="button" role="tab" aria-selected={activeTab === "observed"} onClick={() => setActiveTab("observed")}
            className={`rounded-lg px-3.5 py-2 text-sm font-medium ${activeTab === "observed" ? "bg-emerald-600 text-white" : "text-zinc-600 hover:bg-zinc-100"}`}>
            Observed FIFO
          </button>
          <button type="button" role="tab" aria-selected={activeTab === "manual"} onClick={() => setActiveTab("manual")}
            className={`rounded-lg px-3.5 py-2 text-sm font-medium ${activeTab === "manual" ? "bg-zinc-800 text-white" : "text-zinc-600 hover:bg-zinc-100"}`}>
            Manual entry (M/M/1)
          </button>
        </div>
        {activeTab === "observed" && <ObservedDashboard />}

        {/* Existing manual-entry calculator */}
        {activeTab === "manual" && (
          <div className="space-y-6" lang="es">
            <section className="mb-6 grid gap-3 rounded-2xl border border-zinc-200 bg-white p-6 sm:grid-cols-3 shadow-sm shadow-zinc-200/40">
              <ContextItem
                label="Entrada Manual"
                value="Carga secuencial de clientes y tiempos de atención"
              />
              <ContextItem
                label="Disciplina"
                value="FIFO (First In, First Out) en servidor único"
              />
              <ContextItem
                label="Resultados"
                value="Cálculo directo de esperas y tasas M/M/1"
              />
            </section>

            <InputForm
              nextClientNumber={raws.length + 1}
              hasRecords={raws.length > 0}
              onAdd={handleAddManual}
              onLoadSample={handleLoadSampleManual}
              onClearAll={handleClearAllManual}
            />

            <QueueTable records={processedManual} onRemove={handleRemoveManual} />

            {metricsManual ? (
              <ResultsCard metrics={metricsManual} />
            ) : (
              <section className="rounded-2xl border border-dashed border-zinc-300 bg-white p-8 text-center">
                <p className="text-sm text-zinc-500">
                  Agregá al menos un cliente para ver los indicadores del sistema.
                </p>
              </section>
            )}
          </div>
        )}

        <footer className="mt-14 border-t border-zinc-200 pt-6 text-xs text-zinc-500">
          <p>Operations Research II · Team: {TEAM_MEMBERS.join(" · ")}</p>
        </footer>
      </main>
    </div>
  );
}

function ContextItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[11px] font-medium uppercase tracking-wide text-zinc-400">
        {label}
      </p>
      <p className="mt-1 text-sm text-zinc-700">{value}</p>
    </div>
  );
}
