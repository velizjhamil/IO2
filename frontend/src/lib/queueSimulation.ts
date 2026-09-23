/**
 * Módulo de Lógica Matemática y Estadística para Teoría de Colas (M/M/1)
 * y Simulación Montecarlo - Investigación Operativa (UAGRM)
 */

export interface FieldRecord {
  id: number;
  arrivalTime: string;      // "HH:mm" o "HH:mm:ss"
  serviceStartTime: string; // "HH:mm" o "HH:mm:ss"
  departureTime: string;    // "HH:mm" o "HH:mm:ss"
}

export interface ProcessedRecord extends FieldRecord {
  arrivalMin: number;
  serviceStartMin: number;
  departureMin: number;
  interArrivalMin: number; // Tiempo entre llegadas respecto al anterior
  queueWaitMin: number;    // Wq_i = serviceStart - arrival
  serviceTimeMin: number;  // Ts_i = departure - serviceStart
  systemTimeMin: number;   // Ws_i = departure - arrival
  serverIdleMin: number;   // Ocio del servidor antes de atender a este cliente
}

export interface QueueMetrics {
  totalClients: number;
  totalObservationTimeMin: number;
  
  // Promedios empíricos observados (campo)
  avgInterArrivalMin: number;
  avgQueueWaitMin: number;
  avgServiceTimeMin: number;
  avgSystemTimeMin: number;
  totalServerIdleMin: number;
  serverUtilizationEmpirical: number;

  // Tasas
  lambdaPerHour: number; // Tasa de llegadas (clientes/hora)
  lambdaPerMin: number;
  muPerHour: number;     // Tasa de servicio (clientes/hora)
  muPerMin: number;

  // Indicadores M/M/1 Teóricos
  rho: number;           // Factor de utilización / Probabilidad de ocupado (P)
  p0: number;            // Probabilidad de sistema vacío (Po)
  isStable: boolean;     // lambda < mu
  
  // Fórmulas M/M/1
  L: number;             // Ls: Número promedio de clientes en el sistema
  Lq: number;            // Lq: Número promedio de clientes en la cola
  W: number;             // Ws: Tiempo promedio en el sistema (horas)
  WMin: number;          // Ws en minutos
  Wq: number;            // Wq: Tiempo promedio en cola (horas)
  WqMin: number;         // Wq en minutos
  
  // Probabilidad de esperar en cola (en M/M/1 es igual a rho)
  Pw: number;
}

export interface MonteCarloRow {
  value: number;            // Variable X (ej. 1, 2, 3 min)
  frequency: number;        // fi
  probability: number;      // P(x)
  cumulativeProb: number;   // F(x)
  intervalMin: number;      // 0 a 99
  intervalMax: number;      // 0 a 99
  intervalLabel: string;    // "00 - 19"
  decimalInterval: string;  // "[0.000, 0.200)"
}

export interface MonteCarloSimulationRow {
  clientNumber: number;
  randomArrival: number;       // R1 (0 a 99 o 0-1)
  simulatedInterArrival: number;
  simulatedArrivalTime: number;
  serviceStartTime: number;
  randomService: number;       // R2 (0 a 99 o 0-1)
  simulatedServiceTime: number;
  departureTime: number;
  queueTime: number;
  systemTime: number;
  serverIdleTime: number;
}

/**
 * Convierte un string de hora "HH:mm" o "HH:mm:ss" a minutos decimales desde las 00:00:00
 */
export function timeStringToMinutes(timeStr: string): number {
  if (!timeStr || typeof timeStr !== 'string') return 0;
  const parts = timeStr.trim().split(':').map((p) => parseFloat(p) || 0);
  const hours = parts[0] || 0;
  const minutes = parts[1] || 0;
  const seconds = parts[2] || 0;
  return hours * 60 + minutes + seconds / 60;
}

/**
 * Convierte minutos decimales a formato de hora "HH:MM:SS"
 */
export function minutesToTimeString(totalMinutes: number): string {
  if (isNaN(totalMinutes) || totalMinutes < 0) return '00:00:00';
  const totalSeconds = Math.round(totalMinutes * 60);
  const hours = Math.floor(totalSeconds / 3600) % 24;
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
}

/**
 * Formatea minutos a representación legible: ej "3.25 min (3m 15s)"
 */
export function formatMinutesWithSeconds(totalMinutes: number): string {
  if (isNaN(totalMinutes) || totalMinutes === Infinity) return 'N/A';
  const min = Math.floor(totalMinutes);
  const sec = Math.round((totalMinutes - min) * 60);
  return `${totalMinutes.toFixed(2)} min (${min}m ${sec}s)`;
}

/**
 * Formatea números a 2 o 4 decimales
 */
export function formatDec(num: number, decimals: number = 4): string {
  if (isNaN(num)) return '0';
  if (!isFinite(num)) return '∞';
  return Number(num).toFixed(decimals);
}

/**
 * Procesa la tabla de datos de campo y calcula variables temporales de cada fila
 */
export function processFieldRecords(records: FieldRecord[]): ProcessedRecord[] {
  if (!records || records.length === 0) return [];

  // Ordenar cronológicamente por hora de llegada para consistencia operativa
  const sorted = [...records].sort((a, b) => {
    return timeStringToMinutes(a.arrivalTime) - timeStringToMinutes(b.arrivalTime);
  });

  return sorted.map((rec, index) => {
    const arrMin = timeStringToMinutes(rec.arrivalTime);
    const startMin = timeStringToMinutes(rec.serviceStartTime);
    const depMin = timeStringToMinutes(rec.departureTime);

    // Tiempo entre llegadas
    let interArrival = 0;
    if (index > 0) {
      const prevArrMin = timeStringToMinutes(sorted[index - 1].arrivalTime);
      interArrival = Math.max(0, arrMin - prevArrMin);
    } else {
      interArrival = 0; // Primer cliente registrado
    }

    // Tiempo de espera en cola
    const queueWait = Math.max(0, startMin - arrMin);

    // Tiempo de atención / servicio
    const serviceTime = Math.max(0, depMin - startMin);

    // Tiempo total en el sistema
    const systemTime = Math.max(0, depMin - arrMin);

    // Tiempo de ocio del servidor previo a este cliente
    let serverIdle = 0;
    if (index === 0) {
      serverIdle = 0;
    } else {
      const prevDepMin = timeStringToMinutes(sorted[index - 1].departureTime);
      serverIdle = Math.max(0, startMin - prevDepMin);
    }

    return {
      ...rec,
      arrivalMin: arrMin,
      serviceStartMin: startMin,
      departureMin: depMin,
      interArrivalMin: interArrival,
      queueWaitMin: queueWait,
      serviceTimeMin: serviceTime,
      systemTimeMin: systemTime,
      serverIdleMin: serverIdle,
    };
  });
}

/**
 * Calcula todas las métricas de Teoría de Colas (M/M/1) a partir de los datos procesados
 */
export function calculateQueueMetrics(records: ProcessedRecord[]): QueueMetrics | null {
  if (!records || records.length === 0) return null;

  const N = records.length;

  // Cálculo de promedios observados
  // Tiempos entre llegadas (excluyendo el primero o dividiendo por N-1 intervalos)
  const interArrivals = records.slice(1).map((r) => r.interArrivalMin);
  const sumInterArrivals = interArrivals.reduce((a, b) => a + b, 0);
  const avgInterArrivalMin = interArrivals.length > 0 ? sumInterArrivals / interArrivals.length : 0;

  const totalServiceTimeMin = records.reduce((acc, r) => acc + r.serviceTimeMin, 0);
  const avgServiceTimeMin = totalServiceTimeMin / N;

  const totalQueueWaitMin = records.reduce((acc, r) => acc + r.queueWaitMin, 0);
  const avgQueueWaitMin = totalQueueWaitMin / N;

  const totalSystemTimeMin = records.reduce((acc, r) => acc + r.systemTimeMin, 0);
  const avgSystemTimeMin = totalSystemTimeMin / N;

  const totalServerIdleMin = records.reduce((acc, r) => acc + r.serverIdleMin, 0);

  // Tiempo total de observación del estudio
  const firstArrival = records[0].arrivalMin;
  const lastDeparture = records[records.length - 1].departureMin;
  const totalObservationTimeMin = Math.max(1, lastDeparture - firstArrival);

  // Utilización empírica
  const serverUtilizationEmpirical = Math.min(1, totalServiceTimeMin / totalObservationTimeMin);

  // Tasa de llegada (Lambda)
  // En IO: si el tiempo promedio entre llegadas es E(t), lambda = 1 / E(t) en clientes/minuto, o 60 / avgInterArrival
  let lambdaPerMin = 0;
  let lambdaPerHour = 0;
  if (avgInterArrivalMin > 0) {
    lambdaPerMin = 1 / avgInterArrivalMin;
    lambdaPerHour = lambdaPerMin * 60;
  } else {
    // Si no hay suficientes llegadas consecutivas, usar N / tiempo de observación
    lambdaPerMin = N / totalObservationTimeMin;
    lambdaPerHour = lambdaPerMin * 60;
  }

  // Tasa de servicio (Mu)
  // Si el tiempo promedio de servicio es E(s), mu = 1 / E(s) clientes/minuto, o 60 / avgServiceTime
  let muPerMin = 0;
  let muPerHour = 0;
  if (avgServiceTimeMin > 0) {
    muPerMin = 1 / avgServiceTimeMin;
    muPerHour = muPerMin * 60;
  }

  // Factor de utilización / Probabilidad de sistema ocupado (rho = P = lambda / mu)
  const rho = muPerHour > 0 ? lambdaPerHour / muPerHour : 0;
  const p0 = Math.max(0, 1 - rho);
  const isStable = rho < 1;

  // Fórmulas M/M/1 teóricas
  let L = 0;
  let Lq = 0;
  let W = 0;    // en horas
  let WMin = 0; // en minutos
  let Wq = 0;   // en horas
  let WqMin = 0;// en minutos

  if (isStable && muPerHour > lambdaPerHour) {
    // Ls = lambda / (mu - lambda)
    L = lambdaPerHour / (muPerHour - lambdaPerHour);

    // Lq = lambda^2 / (mu * (mu - lambda)) = L - rho
    Lq = Math.pow(lambdaPerHour, 2) / (muPerHour * (muPerHour - lambdaPerHour));

    // Ws = 1 / (mu - lambda) [horas]
    W = 1 / (muPerHour - lambdaPerHour);
    WMin = W * 60;

    // Wq = lambda / (mu * (mu - lambda)) [horas]
    Wq = lambdaPerHour / (muPerHour * (muPerHour - lambdaPerHour));
    WqMin = Wq * 60;
  } else {
    L = Infinity;
    Lq = Infinity;
    W = Infinity;
    WMin = Infinity;
    Wq = Infinity;
    WqMin = Infinity;
  }

  return {
    totalClients: N,
    totalObservationTimeMin,
    avgInterArrivalMin,
    avgQueueWaitMin,
    avgServiceTimeMin,
    avgSystemTimeMin,
    totalServerIdleMin,
    serverUtilizationEmpirical,
    lambdaPerHour,
    lambdaPerMin,
    muPerHour,
    muPerMin,
    rho,
    p0,
    isStable,
    L,
    Lq,
    W,
    WMin,
    Wq,
    WqMin,
    Pw: rho,
  };
}

/**
 * Calcula la probabilidad de que haya exactamente n clientes en el sistema M/M/1:
 * P_n = (1 - rho) * (rho)^n
 */
export function calculatePn(rho: number, n: number): number {
  if (rho >= 1 || n < 0) return 0;
  return (1 - rho) * Math.pow(rho, n);
}

/**
 * Genera la tabla de frecuencias y números aleatorios Montecarlo
 * a partir de un arreglo de valores continuos redondeados o discretos (ej. minutos enteros)
 */
export function buildMonteCarloTable(values: number[]): MonteCarloRow[] {
  if (!values || values.length === 0) return [];

  // Redondear a minutos enteros o clasificar en categorías discretas
  const roundedValues = values.map((v) => Math.max(1, Math.round(v)));

  // Contar frecuencias
  const freqMap = new Map<number, number>();
  for (const v of roundedValues) {
    freqMap.set(v, (freqMap.get(v) || 0) + 1);
  }

  // Ordenar valores de menor a mayor
  const distinctValues = Array.from(freqMap.keys()).sort((a, b) => a - b);
  const total = roundedValues.length;

  let cumulativeProb = 0;
  let currentStartInt = 0;

  const rows: MonteCarloRow[] = [];

  for (let i = 0; i < distinctValues.length; i++) {
    const val = distinctValues[i];
    const freq = freqMap.get(val)!;
    const prob = freq / total;
    cumulativeProb += prob;

    // Asegurar que el último sume exactamente 1.00 por redondeo flotante
    const cumProbClean = i === distinctValues.length - 1 ? 1.0 : cumulativeProb;

    // Intervalo de Números Aleatorios en rango 00 a 99 (estilo clásico IO UAGRM)
    // El límite superior se calcula multiplicando cumProb por 100 - 1
    const endInt = i === distinctValues.length - 1 ? 99 : Math.min(99, Math.round(cumProbClean * 100) - 1);
    const startInt = currentStartInt;

    const pad = (n: number) => n.toString().padStart(2, '0');
    const intervalLabel = `${pad(startInt)} - ${pad(endInt)}`;

    const prevDecimal = (currentStartInt / 100).toFixed(2);
    const nextDecimal = ((endInt + 1) / 100).toFixed(2);
    const decimalInterval = `[${prevDecimal}, ${nextDecimal})`;

    rows.push({
      value: val,
      frequency: freq,
      probability: prob,
      cumulativeProb: cumProbClean,
      intervalMin: startInt,
      intervalMax: endInt,
      intervalLabel,
      decimalInterval,
    });

    currentStartInt = endInt + 1;
  }

  return rows;
}

/**
 * Busca el valor simulado correspondiente a un número aleatorio R (0 a 99)
 */
export function lookupMonteCarloValue(r: number, table: MonteCarloRow[]): number {
  if (!table || table.length === 0) return 1;
  for (const row of table) {
    if (r >= row.intervalMin && r <= row.intervalMax) {
      return row.value;
    }
  }
  // Por defecto retornar el último o primero
  return table[table.length - 1].value;
}

/**
 * Ejecuta una simulación Montecarlo para N clientes simulados basándose
 * en las tablas de probabilidad empíricas de llegada y servicio
 */
export function runMonteCarloSimulation(
  arrivalTable: MonteCarloRow[],
  serviceTable: MonteCarloRow[],
  simCount: number = 10,
  startMinute: number = 480 // 08:00 AM (480 min)
): MonteCarloSimulationRow[] {
  if (arrivalTable.length === 0 || serviceTable.length === 0) return [];

  const results: MonteCarloSimulationRow[] = [];
  let currentClock = startMinute;
  let serverAvailableAt = startMinute;

  for (let i = 1; i <= simCount; i++) {
    // Generar números aleatorios entre 0 y 99
    const r1 = Math.floor(Math.random() * 100);
    const interArrival = i === 1 ? 0 : lookupMonteCarloValue(r1, arrivalTable);

    currentClock += interArrival;
    const arrivalTime = currentClock;

    // Hora de inicio de servicio: cuando el servidor se libere o cuando llegue el cliente
    const serviceStartTime = Math.max(arrivalTime, serverAvailableAt);

    // Ocio del servidor antes de atender a este cliente
    const serverIdleTime = Math.max(0, serviceStartTime - serverAvailableAt);

    // Tiempo de espera en cola
    const queueTime = serviceStartTime - arrivalTime;

    // Generar número aleatorio para servicio
    const r2 = Math.floor(Math.random() * 100);
    const serviceTime = lookupMonteCarloValue(r2, serviceTable);

    const departureTime = serviceStartTime + serviceTime;
    const systemTime = departureTime - arrivalTime;

    // El servidor queda libre a la hora de salida
    serverAvailableAt = departureTime;

    results.push({
      clientNumber: i,
      randomArrival: r1,
      simulatedInterArrival: interArrival,
      simulatedArrivalTime: arrivalTime,
      serviceStartTime,
      randomService: r2,
      simulatedServiceTime: serviceTime,
      departureTime,
      queueTime,
      systemTime,
      serverIdleTime,
    });
  }

  return results;
}

/**
 * Datos de muestra realistas de una observación de campo en el
 * Surtidor UAGRM (Santa Cruz de la Sierra) en horario pico (08:00 - 08:35)
 */
export const SAMPLE_FIELD_DATA: FieldRecord[] = [
  { id: 1,  arrivalTime: '08:00:00', serviceStartTime: '08:00:00', departureTime: '08:02:30' },
  { id: 2,  arrivalTime: '08:02:00', serviceStartTime: '08:02:30', departureTime: '08:05:00' },
  { id: 3,  arrivalTime: '08:04:30', serviceStartTime: '08:05:00', departureTime: '08:08:15' },
  { id: 4,  arrivalTime: '08:06:00', serviceStartTime: '08:08:15', departureTime: '08:11:00' },
  { id: 5,  arrivalTime: '08:10:00', serviceStartTime: '08:11:00', departureTime: '08:13:30' },
  { id: 6,  arrivalTime: '08:12:30', serviceStartTime: '08:13:30', departureTime: '08:16:00' },
  { id: 7,  arrivalTime: '08:17:00', serviceStartTime: '08:17:00', departureTime: '08:19:45' },
  { id: 8,  arrivalTime: '08:18:15', serviceStartTime: '08:19:45', departureTime: '08:22:30' },
  { id: 9,  arrivalTime: '08:21:00', serviceStartTime: '08:22:30', departureTime: '08:25:00' },
  { id: 10, arrivalTime: '08:24:00', serviceStartTime: '08:25:00', departureTime: '08:28:30' },
  { id: 11, arrivalTime: '08:27:30', serviceStartTime: '08:28:30', departureTime: '08:31:00' },
  { id: 12, arrivalTime: '08:30:00', serviceStartTime: '08:31:00', departureTime: '08:34:15' },
];
