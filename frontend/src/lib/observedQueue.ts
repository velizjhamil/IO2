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
  avgQueueOccupancy: number | null;
  avgSystemOccupancy: number | null;
  lambda: number | null;
  mu: number | null;
  utilization: number | null;
  busy: number;
};

export function calculateObservedQueue(observations: Observation[]): { rows: ObservedRow[]; summary: ObservedSummary } {
  let departure = 0;
  const rows = observations.map(({ arrival, service }, index): ObservedRow => {
    if (!Number.isFinite(arrival) || arrival < 0 || !Number.isFinite(service) || service < 0) {
      throw new Error(`Fila ${index + 1}: la llegada y el servicio deben ser números finitos no negativos en minutos.`);
    }
    const previous = index === 0 ? arrival : observations[index - 1].arrival;
    if (index > 0 && arrival < previous) {
      throw new Error(`Fila ${index + 1}: la llegada no puede ser anterior a la de la fila ${index}.`);
    }
    const start = Math.max(arrival, departure);
    departure = start + service;
    if (!Number.isFinite(departure)) {
      throw new Error(`Fila ${index + 1}: la salida calculada excede el rango numérico.`);
    }
    return { number: index + 1, arrival, service, interval: index === 0 ? 0 : arrival - previous, start, wait: start - arrival, departure, system: departure - arrival };
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
      avgQueueOccupancy: duration > 0 ? totalWait / duration : null,
      avgSystemOccupancy: duration > 0 ? totalSystem / duration : null,
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
    throw new Error("Las tasas deben ser finitas; λ debe ser no negativa y μ debe ser positiva (vehículos/min).");
  }
  if (!Number.isSafeInteger(n) || n < 0) {
    throw new Error("n debe ser un entero no negativo.");
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
  const headers = ["Vehículo", "Llegada (min desde el inicio)", "Entre llegadas (min)", "Servicio (min)", "Inicio de servicio (min)", "Espera (min)", "Salida (min)", "Tiempo en el sistema (min)"];
  return "\uFEFF" + [headers.join(","), ...rows.map((row) => [row.number, row.arrival, row.interval, row.service, row.start, row.wait, row.departure, row.system].join(","))].join("\r\n");
}

function parseCsvRows(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;

  const finishRow = () => {
    row.push(field);
    if (row.length > 1 || row[0].trim() !== "") rows.push(row);
    row = [];
    field = "";
  };

  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    if (quoted) {
      if (character === '"') {
        if (text[index + 1] === '"') {
          field += '"';
          index += 1;
        } else {
          quoted = false;
        }
      } else {
        field += character;
      }
    } else if (character === '"') {
      if (field.length !== 0) throw new Error("El CSV contiene comillas en una posición no válida.");
      quoted = true;
    } else if (character === ",") {
      row.push(field);
      field = "";
    } else if (character === "\r" || character === "\n") {
      finishRow();
      if (character === "\r" && text[index + 1] === "\n") index += 1;
    } else {
      field += character;
    }
  }

  if (quoted) throw new Error("El CSV tiene un campo entre comillas sin cerrar.");
  if (row.length > 0 || field.trim() !== "") finishRow();
  return rows;
}

function normalizedHeader(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, "_").replace(/[()]/g, "");
}

export function parseObservedCsv(text: string): Observation[] {
  const rows = parseCsvRows(text.replace(/^\uFEFF/, ""));
  if (rows.length === 0) throw new Error("El archivo CSV está vacío.");

  const header = rows[0].map(normalizedHeader);
  const arrivalColumn = header.findIndex((value) => value.includes("arrival") || value.includes("llegada"));
  const serviceColumn = header.findIndex((value) => value.includes("service") || value.includes("servicio"));
  const hasHeader = arrivalColumn >= 0 && serviceColumn >= 0;
  const firstDataRow = hasHeader ? 1 : 0;
  const selectedArrivalColumn = hasHeader ? arrivalColumn : 0;
  const selectedServiceColumn = hasHeader ? serviceColumn : 1;

  if (!hasHeader && rows[0].length !== 2) {
    throw new Error("El CSV debe incluir los encabezados arrival_min,service_min o ser una exportación de esta tabla.");
  }

  const observations = rows.slice(firstDataRow).map((cells, index) => {
    const rowNumber = index + firstDataRow + 1;
    if (hasHeader && cells.length !== rows[0].length) {
      throw new Error(`Fila ${rowNumber}: la cantidad de columnas no coincide con el encabezado CSV.`);
    }
    if (cells.length <= Math.max(selectedArrivalColumn, selectedServiceColumn)) {
      throw new Error(`Fila ${rowNumber}: faltan las columnas de llegada o servicio.`);
    }

    const arrivalText = cells[selectedArrivalColumn].trim();
    const serviceText = cells[selectedServiceColumn].trim();
    const arrival = arrivalText === "" ? NaN : Number(arrivalText);
    const service = serviceText === "" ? NaN : Number(serviceText);
    if (!Number.isFinite(arrival) || !Number.isFinite(service) || arrival < 0 || service < 0) {
      throw new Error(`Fila ${rowNumber}: la llegada y el servicio deben ser números finitos no negativos en minutos.`);
    }
    return { arrival, service };
  });

  if (observations.length === 0) throw new Error("El CSV no contiene observaciones para importar.");
  calculateObservedQueue(observations);
  return observations;
}
