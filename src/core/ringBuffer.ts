/** Ringpuffer fester Kapazität: push in O(1), älteste Werte werden überschrieben. */
export class RingBuffer<T> {
  private readonly items: (T | undefined)[];
  private start = 0;
  private size = 0;

  constructor(readonly capacity: number) {
    if (!Number.isSafeInteger(capacity) || capacity < 1) throw new RangeError(`capacity muss ≥ 1 sein, war ${capacity}`);
    this.items = new Array<T | undefined>(capacity);
  }

  get length(): number {
    return this.size;
  }

  push(value: T): void {
    const index = (this.start + this.size) % this.capacity;
    this.items[index] = value;
    if (this.size < this.capacity) this.size += 1;
    else this.start = (this.start + 1) % this.capacity;
  }

  /** Älteste zuerst. */
  toArray(): T[] {
    const out: T[] = [];
    for (let i = 0; i < this.size; i += 1) out.push(this.items[(this.start + i) % this.capacity] as T);
    return out;
  }
}
