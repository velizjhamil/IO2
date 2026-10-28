"use client";

import { useState } from "react";
import type { ObservedRow, ObservedSummary } from "@/lib/observedQueue";

type Props = {
  vehicles: ObservedRow[];
  summary: ObservedSummary;
};

export default function SimulationChart({ vehicles, summary }: Props) {
  const [hoveredVehicleNumber, setHoveredVehicleNumber] = useState<number | null>(null);
  const [focusedVehicleNumber, setFocusedVehicleNumber] = useState<number | null>(null);
  const [selectedVehicleNumber, setSelectedVehicleNumber] = useState<number | null>(null);

  if (vehicles.length === 0) return null;

  // Take first 50 vehicles or full list for visualization
  const displayVehicles = vehicles.slice(0, 50);
  const activeVehicleNumber = focusedVehicleNumber ?? hoveredVehicleNumber ?? selectedVehicleNumber;
  const activeVehicle = displayVehicles.find((vehicle) => vehicle.number === activeVehicleNumber);
  const maxSystemTime = Math.max(...displayVehicles.map((v) => v.system), 1);

  // Group observed wait times
  const waitZero = vehicles.filter((v) => v.wait === 0).length;
  const wait1to2 = vehicles.filter((v) => v.wait > 0 && v.wait <= 2).length;
  const waitOver2 = vehicles.filter((v) => v.wait > 2).length;

  return (
    <section
      id="chart"
      className="space-y-4 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm shadow-zinc-200/50"
    >
      <header className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between">
        <div className="flex items-center gap-2">
          <span className="inline-flex h-6 w-6 items-center justify-center rounded-md bg-emerald-100 text-emerald-700 text-xs font-semibold">
          •
          </span>
          <h2 className="text-base font-semibold tracking-tight text-zinc-900">
             Tiempos observados de espera y servicio
          </h2>
        </div>
        <div className="flex items-center gap-4 text-xs">
          <div className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm bg-amber-500" />
             <span className="text-zinc-600">Espera en cola</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm bg-emerald-500" />
             <span className="text-zinc-600">Tiempo de servicio</span>
          </div>
        </div>
      </header>

      {/* Breakdown summary bars */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Server Utilization Bar */}
        <div className="rounded-xl border border-zinc-200 bg-zinc-50/60 p-4">
          <div className="flex justify-between text-xs font-medium text-zinc-700 mb-2">
             <span>Utilización del servidor</span>
            <span className="font-mono text-emerald-700 font-semibold">
               {summary.utilization === null ? "No disponible" : `${(summary.utilization * 100).toFixed(1)}% ocupado`}
            </span>
          </div>
          <div className="h-3 w-full overflow-hidden rounded-full bg-zinc-200 flex">
            <div
              style={{ width: `${(summary.utilization ?? 0) * 100}%` }}
              className="bg-emerald-500 transition-all duration-500"
               title={`Servicio: ${summary.busy.toFixed(1)} min`}
            />
            <div
              style={{ width: `${100 - (summary.utilization ?? 0) * 100}%` }}
              className="bg-zinc-300 transition-all duration-500"
               title={`Inactividad: ${(summary.duration - summary.busy).toFixed(1)} min`}
            />
          </div>
          <div className="mt-2 flex justify-between text-[11px] text-zinc-500">
             <span>Servicio: {summary.busy.toFixed(1)} min</span>
             <span>Inactividad: {(summary.duration - summary.busy).toFixed(1)} min</span>
          </div>
        </div>

        {/* Observed wait categories */}
        <div className="rounded-xl border border-zinc-200 bg-zinc-50/60 p-4 lg:col-span-2">
          <div className="flex justify-between text-xs font-medium text-zinc-700 mb-2">
             <span>Categorías de espera observada</span>
            <span className="font-mono text-zinc-500">
               {summary.waited} esperaron / {summary.count - summary.waited} sin espera
            </span>
          </div>
          <div className="h-3 w-full overflow-hidden rounded-full bg-zinc-200 flex">
            <div
              style={{ width: `${(waitZero / vehicles.length) * 100}%` }}
              className="bg-emerald-500"
               title={`Sin espera (0 min): ${waitZero} vehículos`}
            />
            <div
              style={{ width: `${(wait1to2 / vehicles.length) * 100}%` }}
              className="bg-amber-400"
               title={`Espera de hasta 2 min: ${wait1to2} vehículos`}
            />
            <div
              style={{ width: `${(waitOver2 / vehicles.length) * 100}%` }}
              className="bg-rose-500"
               title={`Espera de más de 2 min: ${waitOver2} vehículos`}
            />
          </div>
          <div className="mt-2 flex flex-wrap justify-between text-[11px] text-zinc-500">
             <span className="text-emerald-700 font-medium">Sin espera: {waitZero} ({((waitZero / vehicles.length) * 100).toFixed(0)}%)</span>
             <span className="text-amber-700 font-medium">Hasta 2 min: {wait1to2} ({((wait1to2 / vehicles.length) * 100).toFixed(0)}%)</span>
             <span className="text-rose-700 font-medium">Más de 2 min: {waitOver2} ({((waitOver2 / vehicles.length) * 100).toFixed(0)}%)</span>
          </div>
        </div>
      </div>

      {/* Vehicle by Vehicle Timeline Bar Chart */}
      <div className="rounded-xl border border-zinc-200 bg-white p-4">
        <div className="mb-3 flex flex-col gap-1 text-xs text-zinc-500 sm:flex-row sm:items-center sm:justify-between">
            <span>Tiempo por vehículo (primeros {displayVehicles.length}) · haga clic para fijar el detalle</span>
          {activeVehicle && (
            <span aria-live="polite" className="font-mono text-zinc-800">
                Vehículo n.º {activeVehicle.number}: Espera: {activeVehicle.wait.toFixed(2)} min · Servicio: {activeVehicle.service.toFixed(2)} min · Total: {activeVehicle.system.toFixed(2)} min
                {selectedVehicleNumber === activeVehicle.number ? " · fijado" : ""}
            </span>
          )}
        </div>

        <div className="relative h-44 w-full flex items-end gap-1 overflow-x-auto pb-6 pt-2">
          {displayVehicles.map((v) => {
            const waitPercent = (v.wait / maxSystemTime) * 100;
            const servicePercent = (v.service / maxSystemTime) * 100;

            return (
              <button
                key={`bar-${v.number}`}
                type="button"
                aria-label={`Vehículo ${v.number}. Espera: ${v.wait.toFixed(2)} minutos. Servicio: ${v.service.toFixed(2)} minutos. Tiempo total: ${v.system.toFixed(2)} minutos.`}
                aria-pressed={selectedVehicleNumber === v.number}
                className={`group relative flex h-full min-w-[12px] flex-1 flex-col items-center justify-end border-0 bg-transparent p-0 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2 ${selectedVehicleNumber === v.number ? "rounded ring-2 ring-emerald-500 ring-offset-2" : ""}`}
                onMouseEnter={() => setHoveredVehicleNumber(v.number)}
                onMouseLeave={() => setHoveredVehicleNumber(null)}
                onFocus={() => setFocusedVehicleNumber(v.number)}
                onBlur={() => setFocusedVehicleNumber(null)}
                onClick={() => setSelectedVehicleNumber((current) => current === v.number ? null : v.number)}
              >
                {/* Stacked bar: Wait (amber) on top of Service (emerald) */}
                <div className="h-full w-full flex flex-col justify-end rounded-t overflow-hidden transition-opacity group-hover:opacity-80">
                   {v.wait > 0 && (
                    <div
                      style={{ height: `${waitPercent}%` }}
                      className="w-full flex-none bg-amber-500"
                    />
                  )}
                   {v.service > 0 && <div
                     style={{ height: `${servicePercent}%` }}
                     className="w-full flex-none bg-emerald-500"
                   />}
                </div>

                {/* Vehicle number label on bottom */}
                <span className="absolute -bottom-5 text-[9px] font-mono text-zinc-400 group-hover:text-zinc-900 group-hover:font-semibold">
                   {v.number % 5 === 0 || v.number === 1 ? v.number : ""}
                </span>
              </button>
            );
          })}
        </div>

        <div className="flex justify-between border-t border-zinc-100 pt-2 text-[11px] text-zinc-400">
            <span>Vehículo 1</span>
            <span>Eje vertical: tiempo en el sistema (min)</span>
            <span>Vehículo {displayVehicles.length}</span>
        </div>
      </div>
    </section>
  );
}
