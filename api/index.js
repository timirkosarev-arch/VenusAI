export const config = { runtime: 'edge' };

const BASE = 'https://openrouter.ai/api/v1/';

export default async function handler(req) {
  const cors = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  };
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });

  const p = new URL(req.url).searchParams.get('p');
  if (p !== 'chat/completions' && p !== 'models') {
    return new Response('bad path', { status: 400, headers: cors });
  }
  const key = process.env.DRAKE_KEY;
  if (!key) {
    return new Response(JSON.stringify({ error: 'DRAKE_KEY не задан в Environment Variables на Vercel' }),
      { status: 500, headers: { ...cors, 'Content-Type': 'application/json' } });
  }

  const upstream = await fetch(BASE + p, {
    method: req.method,
    headers: { Authorization: 'Bearer ' + key, 'Content-Type': 'application/json' },
    body: req.method === 'POST' ? await req.text() : undefined,
  });

  const headers = new Headers(cors);
  headers.set('Content-Type', upstream.headers.get('content-type') || 'application/json');
  headers.set('Cache-Control', 'no-cache, no-transform');
  return new Response(upstream.body, { status: upstream.status, headers });
}
