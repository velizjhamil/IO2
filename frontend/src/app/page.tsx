"use client";

/** Cola observada determinista con una calculadora manual independiente. */
import { useMemo, useRef, useState, type KeyboardEvent } from "react";
import Navbar from "@/components/Navbar";
import ObservedDashboard from "@/components/ObservedDashboard";
import InputForm, { type NewClientInput } from "@/components/InputForm";
import QueueTable from "@/components/QueueTable";
import ResultsCard from "@/components/ResultsCard";
import { minutesToTimeString, processFieldRecords, calculateQueueMetrics, type FieldRecord } from "@/lib/queueSimulation";

type RawClient = {
  id: number;
  arrivalMinute: number;
  serviceTimeMin: number;
};

type ResolvedRow = {
  id: number;
  arrivalMinute: number;
  serviceStartMinute: number;
  departureMinute: number;
};

function resolveQueueSequence(raws: RawClient[]): ResolvedRow[] {
  const rows: ResolvedRow[] = [];
  let serverAvailableAt = 0;

  // Conserva el ID de entrada y atiende los registros por orden de llegada.
  const arrivals = [...raws].sort(
    (a, b) => a.arrivalMinute - b.arrivalMinute || a.id - b.id
  );
  arrivals.forEach((raw) => {
    const arrival = raw.arrivalMinute;
    const serviceStart = Math.max(arrival, serverAvailableAt);
    const departure = serviceStart + raw.serviceTimeMin;

    rows.push({
      id: raw.id,
      arrivalMinute: arrival,
      serviceStartMinute: serviceStart,
      departureMinute: departure,
    });

    serverAvailableAt = departure;
  });

  return rows;
}

const TEAM_MEMBERS = [
  "Berthol Acosta Osorio",
  "Juany Nicol Velasquez Carrillo",
  "Jhamil Veliz Loayza",
];

export default function Home() {
  const [activeTab, setActiveTab] = useState<"observed" | "manual">("observed");
  const observedTabRef = useRef<HTMLButtonElement>(null);
  const manualTabRef = useRef<HTMLButtonElement>(null);
  const [nextManualId, setNextManualId] = useState(1);
  const [raws, setRaws] = useState<RawClient[]>([]);
  const [manualStartTime, setManualStartTime] = useState("16:00");

  const handleAddManual = (input: NewClientInput) => {
    const id = nextManualId;
    setNextManualId(id + 1);
    setRaws((prev) => [...prev, { ...input, id }]);
  };

  const handleRemoveManual = (id: number) => {
    setRaws((prev) => prev.filter((row) => row.id !== id));
  };

  const handleLoadSampleManual = () => {
    const sample = [
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
    ];
    const firstId = nextManualId;
    setNextManualId(firstId + sample.length);
    setRaws(sample.map((row, index) => ({ ...row, id: firstId + index })));
  };

  const handleClearAllManual = () => {
    setRaws([]);
  };

  const handleTabKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    let nextTab: "observed" | "manual" | null = null;

    if (event.key === "ArrowRight") {
      nextTab = activeTab === "observed" ? "manual" : "observed";
    } else if (event.key === "ArrowLeft") {
      nextTab = activeTab === "observed" ? "manual" : "observed";
    } else if (event.key === "Home") {
      nextTab = "observed";
    } else if (event.key === "End") {
      nextTab = "manual";
    }

    if (nextTab === null) return;

    event.preventDefault();
    setActiveTab(nextTab);
    (nextTab === "observed" ? observedTabRef : manualTabRef).current?.focus();
  };

  const resolvedManual = useMemo(() => resolveQueueSequence(raws), [raws]);

  const fieldRecordsManual: FieldRecord[] = useMemo(
    () =>
      resolvedManual.map((r) => ({
        id: r.id,
        arrivalTime: minutesToTimeString(r.arrivalMinute),
        serviceStartTime: minutesToTimeString(r.serviceStartMinute),
        departureTime: minutesToTimeString(r.departureMinute),
        arrivalMinute: r.arrivalMinute,
        serviceStartMinute: r.serviceStartMinute,
        departureMinute: r.departureMinute,
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
      <Navbar activeTab={activeTab} />

      <main className="mx-auto max-w-6xl px-6 py-10 sm:py-14">
        <header className="mb-8 max-w-3xl">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-600">Investigación Operativa II</p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-zinc-900 sm:text-4xl">Simulador de colas</h1>
          <p className="mt-4 text-sm leading-relaxed text-zinc-600">Consulte los tiempos de espera y atención de 40 vehículos registrados desde las 16:00. La atención sigue el orden de llegada. También puede comparar los resultados con el modelo teórico M/M/1.</p>
        </header>
        <div className="mb-8 flex flex-wrap gap-2 border-b border-zinc-200 pb-3" role="tablist" aria-label="Modo de análisis de colas">
          <button
            ref={observedTabRef}
            id="observed-tab"
            type="button"
            role="tab"
            aria-selected={activeTab === "observed"}
            aria-controls="observed-panel"
            tabIndex={activeTab === "observed" ? 0 : -1}
            onClick={() => setActiveTab("observed")}
            onKeyDown={handleTabKeyDown}
            className={`rounded-lg px-3.5 py-2 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2 ${activeTab === "observed" ? "bg-emerald-600 text-white" : "text-zinc-600 hover:bg-zinc-100"}`}
          >
            Datos de ejemplo
          </button>
          <button
            ref={manualTabRef}
            id="manual-tab"
            type="button"
            role="tab"
            aria-selected={activeTab === "manual"}
            aria-controls="manual-panel"
            tabIndex={activeTab === "manual" ? 0 : -1}
            onClick={() => setActiveTab("manual")}
            onKeyDown={handleTabKeyDown}
            className={`rounded-lg px-3.5 py-2 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2 ${activeTab === "manual" ? "bg-zinc-800 text-white" : "text-zinc-600 hover:bg-zinc-100"}`}
          >
            Entrada manual (M/M/1)
          </button>
        </div>
        <div
          id="observed-panel"
          role="tabpanel"
          aria-labelledby="observed-tab"
          tabIndex={0}
          lang="es"
          hidden={activeTab !== "observed"}
        >
          <ObservedDashboard />
        </div>

        {/* Existing manual-entry calculator */}
        <div
          id="manual-panel"
          role="tabpanel"
          aria-labelledby="manual-tab"
          tabIndex={0}
          className="space-y-6"
          lang="es"
          hidden={activeTab !== "manual"}
        >
            <section className="mb-6 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm shadow-zinc-200/40">
              <div>
                <p className="text-sm font-medium text-zinc-900">
                  Hora de inicio de la observación
                </p>
                <p className="mt-0.5 text-xs text-zinc-500">
                  Los minutos de llegada se cuentan desde esta hora. La tabla muestra la hora real de llegada y salida.
                </p>
              </div>
              <label className="flex items-center gap-2 text-sm text-zinc-600">
                <span>Hora de inicio</span>
                <input
                  type="time"
                  value={manualStartTime}
                  onChange={(event) => setManualStartTime(event.target.value)}
                  className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </label>
            </section>

            <section className="mb-6 grid gap-3 rounded-2xl border border-zinc-200 bg-white p-6 sm:grid-cols-3 shadow-sm shadow-zinc-200/40">
              <ContextItem
                label="Entrada manual"
                value="Carga secuencial de clientes y tiempos de atención"
              />
              <ContextItem
                label="Orden de atención"
                value="Se atiende a cada cliente en el orden en que llega."
              />
              <ContextItem
                label="Resultados"
                value="Cálculo directo de esperas y tasas M/M/1"
              />
            </section>

            <InputForm
              nextClientNumber={nextManualId}
              hasRecords={raws.length > 0}
              onAdd={handleAddManual}
              onLoadSample={handleLoadSampleManual}
              onClearAll={handleClearAllManual}
            />

            <QueueTable
              records={processedManual}
              onRemove={handleRemoveManual}
              startTime={manualStartTime}
            />

            {metricsManual ? (
              <ResultsCard metrics={metricsManual} />
            ) : (
              <section id="resultados" className="rounded-2xl border border-dashed border-zinc-300 bg-white p-8 text-center">
                <p className="text-sm text-zinc-500">
                  Agregue al menos un cliente para ver los indicadores del sistema.
                </p>
              </section>
            )}
        </div>

        <footer className="mt-14 border-t border-zinc-200 pt-8">
          <h2 className="text-2xl font-semibold tracking-tight text-zinc-900 sm:text-3xl">Integrantes</h2>
          <ul className="mt-5 grid gap-4 sm:grid-cols-3">
            {TEAM_MEMBERS.map((member) => (
              <li key={member} className="flex min-h-20 items-center rounded-xl border border-zinc-200 bg-white px-5 py-4 text-lg font-medium text-zinc-800 shadow-sm sm:text-xl">
                {member}
              </li>
            ))}
          </ul>
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
