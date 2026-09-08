export type SaveStatus = "saved" | "pending" | "saving" | "error";
export type SaveStamp = { session: number; revision: number };

// One queue per mounted user session. Revisions invalidate outcomes immediately,
// while serialization prevents an older network write from landing after a retry.
export class UserPreferenceSaveQueue {
  private session = 0;
  private revision = 0;
  private active = true;
  private tail: Promise<unknown> = Promise.resolve();

  activate() {
    this.active = true;
  }

  dispose() {
    this.active = false;
    this.session += 1;
  }

  edit(): SaveStamp {
    this.revision += 1;
    return this.stamp();
  }

  stamp(): SaveStamp {
    return { session: this.session, revision: this.revision };
  }

  isCurrent(stamp: SaveStamp) {
    return (
      this.active &&
      stamp.session === this.session &&
      stamp.revision === this.revision
    );
  }

  enqueue<T>(stamp: SaveStamp, send: () => Promise<T>) {
    const result = this.tail
      .catch(() => undefined)
      .then(async () => {
        if (!this.isCurrent(stamp)) return { kind: "obsolete" as const };
        try {
          const value = await send();
          return this.isCurrent(stamp)
            ? { kind: "saved" as const, value }
            : { kind: "obsolete" as const };
        } catch {
          return this.isCurrent(stamp)
            ? { kind: "error" as const }
            : { kind: "obsolete" as const };
        }
      });
    this.tail = result;
    return result;
  }
}
