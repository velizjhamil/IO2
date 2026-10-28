/**
 * ResultsCard — tasas estimadas, promedios observados y tiempos teóricos M/M/1.
 * Presentacional: recibe QueueMetrics y renderiza.
 */
import type { QueueMetrics } from "@/lib/queueSimulation";

type Props = {
  metrics: QueueMetrics;
};

type Card = {
  key: keyof QueueMetrics;
  symbol: string;
  label: string;
  value: number;
  unit: string;
  decimals: number;
  description: string;
};

const CARDS: Card[] = [
  {
    key: "lambdaPerHour",
    symbol: "λ",
    label: "Tasa de llegada",
    value: 0,
    unit: "clientes/h",
    decimals: 2,
    description: "Clientes que llegan, en promedio, por hora.",
  },
  {
    key: "muPerHour",
    symbol: "μ",
    label: "Tasa de servicio",
    value: 0,
    unit: "clientes/h",
    decimals: 2,
    description: "Clientes que el servidor atiende, en promedio, por hora.",
  },
  {
    key: "avgQueueWaitMin",
    symbol: "Wq",
    label: "Espera observada",
    value: 0,
    unit: "min",
    decimals: 4,
    description: "Promedio de espera en cola de los clientes registrados.",
  },
  {
    key: "avgSystemTimeMin",
    symbol: "Ws",
    label: "Tiempo observado en el sistema",
    value: 0,
    unit: "min",
    decimals: 4,
    description: "Promedio de tiempo total, desde la llegada hasta la salida.",
  },
];

const THEORETICAL_CARDS: Card[] = [
  {
    key: "WqMin",
    symbol: "Wq",
    label: "Espera teórica M/M/1",
    value: 0,
    unit: "min",
    decimals: 4,
    description: "Tiempo esperado en cola según el modelo M/M/1, no el promedio registrado.",
  },
  {
    key: "WMin",
    symbol: "Ws",
    label: "Tiempo teórico M/M/1 en el sistema",
    value: 0,
    unit: "min",
    decimals: 4,
    description: "Tiempo esperado en el sistema según el modelo M/M/1, no el promedio registrado.",
  },
];

function format(raw: number, decimals: number): string {
  if (!Number.isFinite(raw)) return "—";
  return raw.toFixed(decimals);
}

export default function ResultsCard({ metrics }: Props) {
  const hasArrivalRate = metrics.totalClients > 1 && metrics.avgInterArrivalMin > 0 && Number.isFinite(metrics.lambdaPerHour);
  const hasServiceRate = metrics.avgServiceTimeMin > 0 && Number.isFinite(metrics.muPerHour);
  const hasRates = hasArrivalRate && hasServiceRate;
  const isUnstable = hasRates && !metrics.isStable;

  return (
    <section id="resultados" className="space-y-4">
      <header className="flex items-baseline justify-between">
        <h2 className="text-base font-semibold tracking-tight text-zinc-900">
          Indicadores del sistema
        </h2>
        <span
          className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium ${
            !hasRates
              ? "border-zinc-200 bg-zinc-50 text-zinc-600"
              : isUnstable
              ? "border-rose-200 bg-rose-50 text-rose-700"
              : "border-emerald-200 bg-emerald-50 text-emerald-700"
          }`}
        >
          <span
            className={`h-1.5 w-1.5 rounded-full ${
              !hasRates ? "bg-zinc-400" : isUnstable ? "bg-rose-500" : "bg-emerald-500"
            }`}
          />
          {!hasRates ? "Tasas no disponibles" : isUnstable ? "ρ ≥ 1 · inestable" : "ρ < 1 · estable"}
        </span>
      </header>

      {[
        { title: "Tasas estimadas y promedios observados", cards: CARDS },
        { title: "Tiempos teóricos M/M/1", cards: THEORETICAL_CARDS },
      ].map(({ title, cards }) => (
        <div key={title} className="space-y-3">
          <h3 className="text-sm font-medium text-zinc-700">{title}</h3>
          {cards === THEORETICAL_CARDS && !hasRates && (
            <p className="text-xs text-zinc-500">Se necesitan al menos dos llegadas distintas y una tasa de servicio positiva para calcular el modelo M/M/1.</p>
          )}
          {cards === THEORETICAL_CARDS && isUnstable && (
            <p className="text-xs text-zinc-500">El modelo M/M/1 no tiene tiempos estacionarios cuando λ ≥ μ; los promedios observados siguen siendo válidos para los registros cargados.</p>
          )}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {cards.map((card) => {
              const raw = metrics[card.key];
              const isTheoretical = cards === THEORETICAL_CARDS;
              const unavailable = (card.key === "lambdaPerHour" && !hasArrivalRate) ||
                (card.key === "muPerHour" && !hasServiceRate) || (isTheoretical && !hasRates);
              const value = unavailable ? "—" : isTheoretical && isUnstable ? "No aplica" :
                typeof raw === "number" ? format(raw, card.decimals) : "—";
              return (
                <article
                  key={card.key}
                  className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm shadow-zinc-200/40 transition hover:border-zinc-300 hover:shadow"
                >
                  <div className="flex items-center justify-between">
                    <span
                      aria-hidden
                      className="inline-flex h-7 min-w-7 items-center justify-center rounded-md bg-zinc-100 px-2 font-mono text-xs text-zinc-700"
                    >
                      {card.symbol}
                    </span>
                  </div>
                  <div className="mt-3 flex items-baseline gap-1">
                    <span className="text-xl font-semibold tabular-nums tracking-tight text-zinc-900">
                      {value}
                    </span>
                    {value !== "—" && value !== "No aplica" && <span className="text-xs text-zinc-500">{card.unit}</span>}
                  </div>
                  <p className="mt-1 text-xs font-medium text-zinc-700">{card.label}</p>
                  <p className="mt-2 text-[11px] leading-snug text-zinc-500">
                    {card.description}
                  </p>
                </article>
              );
            })}
          </div>
        </div>
      ))}
    </section>
  );
}
