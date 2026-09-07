export class BookingTakeover {
  private key: string | null = null;
  request(key: string) {
    this.key = key || null;
  }
  clear() {
    this.key = null;
  }
  keepOnly(key: string) {
    if (this.key !== key) this.clear();
  }
  consume(key: string) {
    const requested = Boolean(key) && this.key === key;
    this.clear();
    return requested;
  }
}
