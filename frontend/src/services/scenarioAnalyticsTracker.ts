type Post = (path: string, body: object) => Promise<{ session_id?: string | null }>;
/** Shared queued events and final flush, following the bill-analytics lifecycle. */
export function createScenarioAnalyticsTracker<Event extends { client_event_id: string }>(post: Post, startBody: object) {
  let session: Promise<string | null> | null = null;
  let sessionId: string | null = null;
  let queue = Promise.resolve();
  let finished = false;
  const pending = new Map<string, Event>();
  const start = () => session ??= post("start", startBody).then((result) => sessionId = result.session_id ?? null).catch(() => null);
  const send = async (path: string, body: object) => { try { await post(path, body); } catch { await post(path, body); } };
  return {
    start, getSessionId: () => sessionId ?? session,
    event(event: Event) {
      if (finished) return;
      pending.set(event.client_event_id, event);
      const ready = start();
      queue = queue.then(async () => {
        const id = await ready;
        if (!id || finished) return;
        await send(`${id}/events`, event);
        pending.delete(event.client_event_id);
      }).catch(() => {});
    },
    finish(body: object) {
      if (finished || !session) return;
      finished = true;
      const payload = { ...body, pending_events: [...pending.values()] };
      const flush = (id: string | null) => id ? send(`${id}/finish`, payload).catch(() => {}) : Promise.resolve();
      return sessionId ? flush(sessionId) : session.then(flush);
    },
  };
}
