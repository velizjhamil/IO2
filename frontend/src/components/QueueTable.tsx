/**
 * QueueTable — tabla presentacional con la secuencia del sistema unicanal.
 * Recibe los registros ya PROCESADOS (ProcessedRecord[]) desde el padre.
 * La lógica de cálculo de esperas vive en page.tsx + queueSimulation.ts.
 */
import type { ProcessedRecord } from "@/lib/queueSimulation";

type Props = {
  records: ProcessedRecord[];
  onRemove?: (id: number) => void;
};

function fmt(min: number, digits = 2): string {
  if (!isFinite(min)) return "—";
  return min.toFixed(digits);
}

function fmtTime(min: number): string {
  if (!isFinite(min) || min < 0) return "—";
  const totalSeconds = Math.round(min * 60);
  const hours = Math.floor(totalSeconds / 3600) % 24;
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
}

export default function QueueTable({ records, onRemove }: Props) {
  if (records.length === 0) {
    return (
      <section className="rounded-2xl border border-dashed border-zinc-300 bg-white p-10 text-center">
        <p className="text-sm text-zinc-500">
          Aún no cargaste clientes. Agregá uno desde el formulario de arriba, o usá
          <span className="text-emerald-600"> Cargar muestra</span> para ver un ejemplo
          de simulación de colas.
        </p>
      </section>
    );
  }

  return (
    <section className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm shadow-zinc-200/50">
      <header className="flex items-center justify-between border-b border-zinc-200 px-5 py-3">
        <h2 className="text-sm font-semibold tracking-tight text-zinc-900">
          Secuencia de atención
        </h2>
        <span className="text-xs text-zinc-500">
          {records.length} {records.length === 1 ? "cliente" : "clientes"}
        </span>
      </header>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[860px] text-left text-sm">
          <thead>
            <tr className="border-b border-zinc-200 bg-zinc-50/60 text-xs uppercase tracking-wide text-zinc-500">
              <Th className="w-14">N°</Th>
              <Th>Hora de llegada</Th>
              <Th align="right">T. espera</Th>
              <Th>Ingreso servidor</Th>
              <Th align="right">T. servidor</Th>
              <Th>Hora de salida</Th>
              <Th align="right">T. en sistema</Th>
              {onRemove && <Th className="w-10" />}
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {records.map((r) => (
              <tr
                key={r.id}
                className="text-zinc-800 transition hover:bg-zinc-50"
              >
                <Td className="font-mono text-zinc-400">{r.id}</Td>
                <Td className="font-mono">{fmtTime(r.arrivalMin)}</Td>
                <TdNum highlight={r.queueWaitMin > 0}>
                  {fmt(r.queueWaitMin)} min
                </TdNum>
                <Td className="font-mono">{fmtTime(r.serviceStartMin)}</Td>
                <TdNum>{fmt(r.serviceTimeMin)} min</TdNum>
                <Td className="font-mono">{fmtTime(r.departureMin)}</Td>
                <TdNum>{fmt(r.systemTimeMin)} min</TdNum>
                {onRemove && (
                  <Td className="text-right">
                    <button
                      type="button"
                      onClick={() => onRemove(r.id)}
                      aria-label={`Eliminar cliente ${r.id}`}
                      className="inline-flex h-7 w-7 items-center justify-center rounded-md text-zinc-400 transition hover:bg-rose-50 hover:text-rose-600"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="h-4 w-4"
                      >
                        <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                      </svg>
                    </button>
                  </Td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

type ThProps = {
  children?: React.ReactNode;
  align?: "right";
  className?: string;
};

function Th({ children, align, className = "" }: ThProps) {
  return (
    <th
      scope="col"
      className={`px-4 py-3 font-medium ${align === "right" ? "text-right" : ""} ${className}`}
    >
      {children}
    </th>
  );
}

type TdProps = {
  children?: React.ReactNode;
  className?: string;
};

function Td({ children, className = "" }: TdProps) {
  return <td className={`px-4 py-2.5 ${className}`}>{children}</td>;
}

function TdNum({
  children,
  highlight = false,
}: {
  children: React.ReactNode;
  highlight?: boolean;
}) {
  return (
    <Td
      className={`text-right font-mono tabular-nums ${
        highlight ? "text-amber-600" : "text-zinc-800"
      }`}
    >
      {children}
    </Td>
  );
}
