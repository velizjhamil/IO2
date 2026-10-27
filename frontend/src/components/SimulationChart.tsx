"use client";

import { useState } from "react";
import type { ObservedRow, ObservedSummary } from "@/lib/observedQueue";

type Props = {
  vehicles: ObservedRow[];
  summary: ObservedSummary;
};

export default function SimulationChart({ vehicles, summary }: Props) {
  const [hoveredVehicle, setHoveredVehicle] = useState<ObservedRow | null>(null);

  if (vehicles.length === 0) return null;

  // Take first 50 vehicles or full list for visualization
  const displayVehicles = vehicles.slice(0, 50);
  const maxSystemTime = Math.max(...displayVehicles.map((v) => v.system), 1);

  // Groupings for wait time distribution
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
            Observed waiting and service times
          </h2>
        </div>
        <div className="flex items-center gap-4 text-xs">
          <div className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm bg-amber-500" />
            <span className="text-zinc-600">Queue wait</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm bg-emerald-500" />
            <span className="text-zinc-600">Service time</span>
          </div>
        </div>
      </header>

      {/* Breakdown summary bars */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Server Utilization Bar */}
        <div className="rounded-xl border border-zinc-200 bg-zinc-50/60 p-4">
          <div className="flex justify-between text-xs font-medium text-zinc-700 mb-2">
            <span>Server utilization</span>
            <span className="font-mono text-emerald-700 font-semibold">
              {summary.utilization === null ? "Unavailable" : `${(summary.utilization * 100).toFixed(1)}% busy`}
            </span>
          </div>
          <div className="h-3 w-full overflow-hidden rounded-full bg-zinc-200 flex">
            <div
              style={{ width: `${(summary.utilization ?? 0) * 100}%` }}
              className="bg-emerald-500 transition-all duration-500"
              title={`Service: ${summary.busy.toFixed(1)} min`}
            />
            <div
              style={{ width: `${100 - (summary.utilization ?? 0) * 100}%` }}
              className="bg-zinc-300 transition-all duration-500"
              title={`Idle: ${(summary.duration - summary.busy).toFixed(1)} min`}
            />
          </div>
          <div className="mt-2 flex justify-between text-[11px] text-zinc-500">
            <span>Service: {summary.busy.toFixed(1)} min</span>
            <span>Idle: {(summary.duration - summary.busy).toFixed(1)} min</span>
          </div>
        </div>

        {/* Observed wait categories */}
        <div className="rounded-xl border border-zinc-200 bg-zinc-50/60 p-4 lg:col-span-2">
          <div className="flex justify-between text-xs font-medium text-zinc-700 mb-2">
            <span>Observed wait categories</span>
            <span className="font-mono text-zinc-500">
              {summary.waited} waited / {summary.count - summary.waited} immediate
            </span>
          </div>
          <div className="h-3 w-full overflow-hidden rounded-full bg-zinc-200 flex">
            <div
              style={{ width: `${(waitZero / vehicles.length) * 100}%` }}
              className="bg-emerald-500"
              title={`No wait (0 min): ${waitZero} vehicles`}
            />
            <div
              style={{ width: `${(wait1to2 / vehicles.length) * 100}%` }}
              className="bg-amber-400"
              title={`Wait up to 2 min: ${wait1to2} vehicles`}
            />
            <div
              style={{ width: `${(waitOver2 / vehicles.length) * 100}%` }}
              className="bg-rose-500"
              title={`Wait over 2 min: ${waitOver2} vehicles`}
            />
          </div>
          <div className="mt-2 flex flex-wrap justify-between text-[11px] text-zinc-500">
            <span className="text-emerald-700 font-medium">No wait: {waitZero} ({((waitZero / vehicles.length) * 100).toFixed(0)}%)</span>
            <span className="text-amber-700 font-medium">Up to 2 min: {wait1to2} ({((wait1to2 / vehicles.length) * 100).toFixed(0)}%)</span>
            <span className="text-rose-700 font-medium">Over 2 min: {waitOver2} ({((waitOver2 / vehicles.length) * 100).toFixed(0)}%)</span>
          </div>
        </div>
      </div>

      {/* Vehicle by Vehicle Timeline Bar Chart */}
      <div className="rounded-xl border border-zinc-200 bg-white p-4">
        <div className="mb-3 flex items-center justify-between text-xs text-zinc-500">
           <span>Time per vehicle (first {displayVehicles.length})</span>
          {hoveredVehicle && (
            <span className="font-mono text-zinc-800">
               Vehicle #{hoveredVehicle.number}: Wait: {hoveredVehicle.wait.toFixed(2)}m · Service: {hoveredVehicle.service.toFixed(2)}m · Total: {hoveredVehicle.system.toFixed(2)}m
            </span>
          )}
        </div>

        <div className="relative h-44 w-full flex items-end gap-1 overflow-x-auto pb-6 pt-2">
          {displayVehicles.map((v) => {
            const waitPercent = (v.wait / maxSystemTime) * 100;
            const servicePercent = (v.service / maxSystemTime) * 100;

            return (
              <div
                 key={`bar-${v.number}`}
                className="group relative flex-1 min-w-[12px] h-full flex flex-col justify-end items-center cursor-pointer"
                onMouseEnter={() => setHoveredVehicle(v)}
                onMouseLeave={() => setHoveredVehicle(null)}
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
              </div>
            );
          })}
        </div>

        <div className="flex justify-between border-t border-zinc-100 pt-2 text-[11px] text-zinc-400">
           <span>Vehicle 1</span>
           <span>Vertical axis: time in system (min)</span>
           <span>Vehicle {displayVehicles.length}</span>
        </div>
      </div>
    </section>
  );
}
