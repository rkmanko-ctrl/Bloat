/**
 * Small, dependency-free statistics helpers used by the pattern engine.
 *
 * We deliberately avoid pulling in a stats library: the methods here are
 * simple enough to implement directly, and keeping them in-house makes it
 * easy to explain exactly what "stronger pattern" means (section 21 of the
 * product spec: "favor understandable statistics over fake AI precision").
 */

/** Sum of ln(1..n). Exact (up to floating point rounding), no gamma
 * approximation — accurate for the small-to-moderate sample sizes a single
 * user will produce (tens to low thousands of meals). */
function logFactorial(n: number): number {
  if (n <= 1) return 0;
  let sum = 0;
  for (let i = 2; i <= n; i++) sum += Math.log(i);
  return sum;
}

function logChoose(n: number, k: number): number {
  if (k < 0 || k > n || n < 0) return -Infinity;
  return logFactorial(n) - logFactorial(k) - logFactorial(n - k);
}

/** P(X = k) for X ~ Hypergeometric(N, K, n): drawing n items without
 * replacement from a population of N containing K "successes". */
function hypergeomPmf(k: number, K: number, n: number, N: number): number {
  const logP = logChoose(K, k) + logChoose(N - K, n - k) - logChoose(N, n);
  return Math.exp(logP);
}

/**
 * One-sided Fisher's exact test p-value for a 2x2 contingency table:
 *
 *                symptom   no symptom
 *   exposed         a           b
 *   unexposed       c           d
 *
 * Tests the alternative hypothesis "exposed has a higher symptom rate than
 * unexposed" (the only direction we ever care about for a bloat trigger).
 * Returns a value in [0, 1], or null if either margin is degenerate.
 */
export function fisherExactOneSidedGreater(a: number, b: number, c: number, d: number): number | null {
  const exposedTotal = a + b;
  const unexposedTotal = c + d;
  const symptomTotal = a + c;
  const total = exposedTotal + unexposedTotal;

  if (exposedTotal === 0 || unexposedTotal === 0 || total === 0) return null;

  const K = symptomTotal; // total "successes" in the population
  const n = exposedTotal; // sample size drawn (exposed group)
  const N = total;

  const kMax = Math.min(n, K);
  let p = 0;
  for (let k = a; k <= kMax; k++) {
    p += hypergeomPmf(k, K, n, N);
  }
  // Guard against floating point drift pushing us slightly outside [0,1].
  return Math.min(1, Math.max(0, p));
}

export function mean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

export function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

export function percentile(values: number[], p: number): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const idx = (sorted.length - 1) * p;
  const lower = Math.floor(idx);
  const upper = Math.ceil(idx);
  if (lower === upper) return sorted[lower];
  return sorted[lower] + (sorted[upper] - sorted[lower]) * (idx - lower);
}
