/**
 * ResultsCard — panel con los 4 indicadores clave: λ, μ, Wq, Ws.
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
    key: "WqMin",
    symbol: "Wq",
    label: "Promedio de espera",
    value: 0,
    unit: "min",
    decimals: 4,
    description: "Tiempo medio que un cliente pasa en cola antes de ser atendido.",
  },
  {
    key: "WMin",
    symbol: "Ws",
    label: "Promedio en sistema",
    value: 0,
    unit: "min",
    decimals: 4,
    description: "Tiempo medio total: cola + servicio.",
  },
];

function format(raw: number, decimals: number): string {
  if (!isFinite(raw)) return "∞";
  return raw.toFixed(decimals);
}

export default function ResultsCard({ metrics }: Props) {
  const isUnstable = !metrics.isStable;

  return (
    <section id="resultados" className="space-y-4">
      <header className="flex items-baseline justify-between">
        <h2 className="text-base font-semibold tracking-tight text-zinc-900">
          Indicadores del sistema
        </h2>
        <span
          className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium ${
            isUnstable
              ? "border-rose-200 bg-rose-50 text-rose-700"
              : "border-emerald-200 bg-emerald-50 text-emerald-700"
          }`}
        >
          <span
            className={`h-1.5 w-1.5 rounded-full ${
              isUnstable ? "bg-rose-500" : "bg-emerald-500"
            }`}
          />
          {isUnstable ? "ρ ≥ 1 · inestable" : "ρ < 1 · estable"}
        </span>
      </header>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {CARDS.map((card) => {
          const raw = metrics[card.key];
          const value = typeof raw === "number" ? raw : 0;
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
                  {format(value, card.decimals)}
                </span>
                <span className="text-xs text-zinc-500">{card.unit}</span>
              </div>
              <p className="mt-1 text-xs font-medium text-zinc-700">{card.label}</p>
              <p className="mt-2 text-[11px] leading-snug text-zinc-500">
                {card.description}
              </p>
            </article>
          );
        })}
      </div>
    </section>
  );
}
