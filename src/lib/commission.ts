/** GETTABLE's commission in basis points (1500 = 15%). Override with PLATFORM_COMMISSION_BPS. */
export function commissionBps(): number {
  const v = Number(process.env.PLATFORM_COMMISSION_BPS ?? 1500);
  return Number.isInteger(v) && v >= 0 && v <= 5000 ? v : 1500;
}

/** Split a price in pence. Commission rounds to the nearest penny; the business gets the rest, so the two always add up. */
export function splitPayment(totalPence: number, bps = commissionBps()) {
  const commission = Math.round((totalPence * bps) / 10_000);
  return { commission, businessAmount: totalPence - commission };
}
