// Pure order-book allocation: starting backlog first, then accepted orders in acceptance order,
// each filling week slots of `capacity` machine-hours sequentially.
export interface OrderHours { id: string; hours: number }
export interface Slice { orderId: string; week: number; hours: number }

const r2 = (n: number) => Math.round(n * 100) / 100;

export function allocate(backlog: number, capacity: number, orders: OrderHours[]): { backlog: Slice[]; orders: Slice[] } {
  const place = (orderId: string, start: number, hours: number): Slice[] => {
    const out: Slice[] = [];
    let cur = start;
    const end = start + hours;
    while (cur < end - 1e-9) {
      const week = Math.floor(cur / capacity + 1e-9);
      const weekEnd = (week + 1) * capacity;
      const take = Math.min(end, weekEnd) - cur;
      out.push({ orderId, week, hours: r2(take) });
      cur += take;
    }
    return out;
  };
  const b = place("BACKLOG", 0, backlog);
  const o: Slice[] = [];
  let cursor = backlog;
  for (const ord of orders) {
    o.push(...place(ord.id, cursor, ord.hours));
    cursor += ord.hours;
  }
  return { backlog: b, orders: o };
}

/** Total committed load ahead of a new quote. */
export const committedLoad = (backlog: number, orders: OrderHours[]) => backlog + orders.reduce((s, o) => s + o.hours, 0);
