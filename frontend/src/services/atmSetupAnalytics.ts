/** Transfer the setup attempt to ATM practice without finishing or duplicating it. */
export function createAtmSetupAnalytics(start: () => Promise<string | null>, abandon: (id: string) => Promise<unknown>) {
  let session: Promise<string | null> | null = null;
  let claimed = false;
  let finished = false;
  const begin = () => session ??= start().catch(() => null);
  return {
    start: begin,
    getSessionId: () => session,
    claim() {
      if (claimed) return start().catch(() => null);
      claimed = true;
      return begin();
    },
    finish() {
      if (finished || claimed || !session) return;
      finished = true;
      void session.then((id) => id ? abandon(id) : undefined).catch(() => {});
    },
  };
}
