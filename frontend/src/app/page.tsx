"use client";

/**
 * Página principal — Calculadora de Teoría de Colas M/M/1.
 * Orquesta: formulario → tabla → resultados.
 *
 * Modelo de cálculo (sistema unicanal / M/M/1):
 *   - El usuario carga: { arrivalMinute, serviceTimeMin } por cliente.
 *   - Esta página hace el cálculo SECUENCIAL de esperas:
 *       serviceStart_i = max(arrival_i, departure_{i-1})
 *       departure_i    = serviceStart_i + serviceTime_i
 *   - Una vez que tenemos los 3 timestamps por fila, los transformamos a
 *     HH:mm:ss y los pasamos a processFieldRecords/calculateQueueMetrics,
 *     que ya están en src/lib/queueSimulation.ts.
 */
import { useMemo, useState } from "react";

import Navbar from "@/components/Navbar";
import InputForm, { type NewClientInput } from "@/components/InputForm";
import QueueTable from "@/components/QueueTable";
import ResultsCard from "@/components/ResultsCard";

import {
  calculateQueueMetrics,
  minutesToTimeString,
  processFieldRecords,
  type FieldRecord,
} from "@/lib/queueSimulation";

/** Entrada cruda que el usuario carga (2 valores numéricos). */
type RawClient = {
  arrivalMinute: number;
  serviceTimeMin: number;
};

/** Una fila de la tabla con los 3 timestamps ya resueltos secuencialmente. */
type ResolvedRow = {
  id: number;
  arrivalTime: string;
  serviceStartTime: string;
  departureTime: string;
};

/**
 * Resuelve la secuencia de un sistema unicanal.
 * Para cada cliente: si llega antes de que el anterior salga, espera.
 */
function resolveQueueSequence(raws: RawClient[]): ResolvedRow[] {
  const rows: ResolvedRow[] = [];
  let serverAvailableAt = 0; // minutos desde 00:00 — el servidor arranca libre

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
  "Juany Nicol Velasquez Carrillo",
  "Jhamil Veliz Loayza",
  "—", // tercer integrante pendiente
];

export default function Home() {
  const [raws, setRaws] = useState<RawClient[]>([]);

  const handleAdd = (input: NewClientInput) => {
    setRaws((prev) => [...prev, input]);
  };

  const handleRemove = (id: number) => {
    setRaws((prev) => prev.filter((_, i) => i + 1 !== id));
  };

  const handleLoadSample = () => {
    // 12 clientes en horario pico.
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

  const handleClearAll = () => {
    setRaws([]);
  };

  // 1) Resolución secuencial de esperas (2 inputs → 3 timestamps por fila).
  const resolved = useMemo(() => resolveQueueSequence(raws), [raws]);

  // 2) Conversión al formato que ya entiende processFieldRecords.
  const fieldRecords: FieldRecord[] = useMemo(
    () =>
      resolved.map((r) => ({
        id: r.id,
        arrivalTime: r.arrivalTime,
        serviceStartTime: r.serviceStartTime,
        departureTime: r.departureTime,
      })),
    [resolved],
  );

  // 3) Módulo de dominio: ya hace el resto (orden cronológico, métricas).
  const processed = useMemo(
    () => processFieldRecords(fieldRecords),
    [fieldRecords],
  );

  const metrics = useMemo(
    () => calculateQueueMetrics(processed),
    [processed],
  );

  const nextClientNumber = raws.length + 1;

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-800">
      <Navbar />

      <main className="mx-auto max-w-6xl px-6 py-10 sm:py-14">
        <header className="mb-10 max-w-2xl">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-emerald-600">
            Investigación Operativa II
          </p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-zinc-900 sm:text-4xl">
            Calculadora de Teoría de Colas
            <span className="block text-zinc-500">Sistema Unicanal M/M/1</span>
          </h1>
          <p className="mt-4 text-sm leading-relaxed text-zinc-600">
            Herramienta académica para simular un sistema de colas de un solo
            servidor. Ingresá los datos de campo (minuto de llegada y tiempo
            de servicio de cada cliente) y la calculadora resuelve la secuencia
            de atención —incluyendo las esperas cuando un cliente llega antes
            de que el anterior salga— y estima las tasas λ, μ, Wq y Ws del
            modelo M/M/1.
          </p>
        </header>

        {/* Contexto del proyecto */}
        <section className="mb-10 grid gap-3 rounded-2xl border border-zinc-200 bg-white p-6 sm:grid-cols-3 shadow-sm shadow-zinc-200/40">
          <ContextItem
            label="Datos"
            value="Tiempos de llegada y servicio por cliente"
          />
          <ContextItem
            label="Simulación de colas"
            value="Resuelve esperas cuando hay concurrencia"
          />
          <ContextItem
            label="Simulación de tablas"
            value="Genera secuencia y métricas M/M/1"
          />
        </section>

        <div className="space-y-6">
          <InputForm
            nextClientNumber={nextClientNumber}
            hasRecords={raws.length > 0}
            onAdd={handleAdd}
            onLoadSample={handleLoadSample}
            onClearAll={handleClearAll}
          />

          <QueueTable records={processed} onRemove={handleRemove} />

          {metrics ? (
            <ResultsCard metrics={metrics} />
          ) : (
            <section className="rounded-2xl border border-dashed border-zinc-300 bg-white p-8 text-center">
              <p className="text-sm text-zinc-500">
                Agregá al menos un cliente para ver los indicadores del sistema.
              </p>
            </section>
          )}
        </div>

        <footer className="mt-14 border-t border-zinc-200 pt-6">
          <div className="flex flex-col gap-3 text-xs text-zinc-500 sm:flex-row sm:items-center sm:justify-between">
            <p>
              Cálculo secuencial en
              <code className="mx-1 rounded bg-zinc-100 px-1.5 py-0.5 font-mono text-[11px] text-zinc-700">
                page.tsx
              </code>
              · métricas en
              <code className="mx-1 rounded bg-zinc-100 px-1.5 py-0.5 font-mono text-[11px] text-zinc-700">
                src/lib/queueSimulation.ts
              </code>
            </p>
            <p className="text-zinc-500">
              <span className="font-medium text-zinc-700">Integrantes:</span>{" "}
              {TEAM_MEMBERS.join(" · ")}
            </p>
          </div>
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
