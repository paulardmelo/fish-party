import { getStore } from '@netlify/blobs';

const headers = { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' };
const reply = (data, status = 200) => new Response(JSON.stringify(data), { status, headers });

export default async function handler(request) {
  try {
    const store = getStore('fish-party-rsvps');
    if (request.method === 'POST') {
      let data;
      try { data = await request.json(); } catch { return reply({ error: 'Invalid JSON' }, 400); }
      const id = data?.id;
      const name = typeof data?.name === 'string' ? data.name.trim().slice(0, 40) : '';
      const vote = data?.vote;
      if (!/^[a-f0-9-]{36}$/i.test(id || '') || !name || !['yes', 'no'].includes(vote)) {
        return reply({ error: 'Invalid RSVP' }, 400);
      }
      await store.set('guest-' + id, JSON.stringify({ name, vote }));
      return reply({ ok: true });
    }
    if (request.method === 'GET') {
      const entries = [];
      let cursor;
      do {
        const page = await store.list({ prefix: 'guest-', ...(cursor ? { cursor } : {}) });
        const batch = await Promise.all(page.blobs.map(async ({ key }) => {
          try { return await store.get(key, { type: 'json' }); } catch { return null; }
        }));
        entries.push(...batch.filter(x => x && typeof x.name === 'string' && ['yes', 'no'].includes(x.vote)));
        cursor = page.cursor;
      } while (cursor);
      return reply(entries);
    }
    return reply({ error: 'Method not allowed' }, 405);
  } catch (error) {
    console.error('RSVP backend error:', error);
    return reply({ error: 'RSVP service unavailable' }, 500);
  }
}
