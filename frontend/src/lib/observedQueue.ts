export type Observation = { arrival: number; service: number };

const ARRIVALS = [0, 2, 4, 8, 10, 14, 17, 18, 22, 24, 27, 27, 34, 36, 38, 44, 47, 47, 50, 55, 60, 63, 69, 73, 75, 78, 83, 86, 90, 93, 94, 96, 101, 106, 109, 114, 115, 119, 122, 122];
const SERVICES = [3, 3, 2, 4, 3, 4, 2, 2, 3, 2, 2, 3, 4, 3, 5, 2, 1, 4, 4, 5, 4, 6, 3, 4, 2, 4, 3, 3, 3, 2, 3, 4, 5, 4, 3, 3, 2, 3, 4, 3];

export function originalObservations(): Observation[] {
  return ARRIVALS.map((arrival, index) => ({ arrival, service: SERVICES[index] }));
}

export type ObservedRow = Observation & {
  number: number;
  interval: number;
  start: number;
  wait: number;
  departure: number;
  system: number;
};

export type ObservedSummary = {
  count: number;
  avgWait: number;
  avgService: number;
  avgSystem: number;
  maxWait: number;
  waited: number;
  waitedPercent: number;
  duration: number;
  lambda: number | null;
  mu: number | null;
  utilization: number | null;
  busy: number;
};

export function calculateObservedQueue(observations: Observation[]): { rows: ObservedRow[]; summary: ObservedSummary } {
  let departure = 0;
  const rows = observations.map(({ arrival, service }, index): ObservedRow => {
    if (!Number.isFinite(arrival) || arrival < 0 || !Number.isFinite(service) || service < 0) {
      throw new Error(`Row ${index + 1}: arrival and service must be finite, nonnegative minutes.`);
    }
    if (index === 0 && arrival !== 0) {
      throw new Error("Row 1: arrival must be 0 minutes (16:00). ");
    }
    const previous = index === 0 ? 0 : observations[index - 1].arrival;
    if (arrival < previous) {
      throw new Error(`Row ${index + 1}: arrival must not precede row ${index}.`);
    }
    const start = Math.max(arrival, departure);
    departure = start + service;
    if (!Number.isFinite(departure)) {
      throw new Error(`Row ${index + 1}: calculated departure exceeds the numeric range.`);
    }
    return { number: index + 1, arrival, service, interval: arrival - previous, start, wait: start - arrival, departure, system: departure - arrival };
  });

  const count = rows.length;
  const busy = rows.reduce((sum, row) => sum + row.service, 0);
  const totalWait = rows.reduce((sum, row) => sum + row.wait, 0);
  const totalSystem = rows.reduce((sum, row) => sum + row.system, 0);
  const waited = rows.filter((row) => row.wait > 0).length;
  const arrivalSpan = count > 0 ? rows[count - 1].arrival - rows[0].arrival : 0;
  // Observation ends at the final departure, not at the final arrival.
  const duration = count > 0 ? rows[count - 1].departure - rows[0].arrival : 0;
  return {
    rows,
    summary: {
      count,
      avgWait: count ? totalWait / count : 0,
      avgService: count ? busy / count : 0,
      avgSystem: count ? totalSystem / count : 0,
      maxWait: rows.reduce((max, row) => Math.max(max, row.wait), 0),
      waited,
      waitedPercent: count ? 100 * waited / count : 0,
      duration,
      lambda: count > 1 && arrivalSpan > 0 ? (count - 1) / arrivalSpan : null,
      mu: busy > 0 ? count / busy : null,
      utilization: duration > 0 ? busy / duration : null,
      busy,
    },
  };
}

export type MM1Result = {
  stable: boolean;
  rho: number;
  p0: number | null;
  L: number | null;
  Lq: number | null;
  W: number | null;
  Wq: number | null;
  pn: number | null;
};

export function calculateMM1(lambda: number, mu: number, n: number): MM1Result {
  if (!Number.isFinite(lambda) || lambda < 0 || !Number.isFinite(mu) || mu <= 0) {
    throw new Error("Rates must be finite; λ must be nonnegative and μ must be positive (vehicles/min). ");
  }
  if (!Number.isSafeInteger(n) || n < 0) {
    throw new Error("n must be a nonnegative integer.");
  }
  const rho = lambda / mu;
  if (rho >= 1) {
    return { stable: false, rho, p0: null, L: null, Lq: null, W: null, Wq: null, pn: null };
  }
  const p0 = 1 - rho;
  return {
    stable: true, rho, p0,
    L: lambda / (mu - lambda),
    Lq: lambda * lambda / (mu * (mu - lambda)),
    W: 1 / (mu - lambda),
    Wq: lambda / (mu * (mu - lambda)),
    pn: p0 * rho ** n,
  };
}

export function observedCsv(rows: ObservedRow[]): string {
  const headers = ["Vehicle", "Arrival (min since 16:00)", "Interarrival (min)", "Service (min)", "Service start (min)", "Wait (min)", "Departure (min)", "System time (min)"];
  return "\uFEFF" + [headers.join(","), ...rows.map((row) => [row.number, row.arrival, row.interval, row.service, row.start, row.wait, row.departure, row.system].join(","))].join("\r\n");
}
