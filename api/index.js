export const config = { runtime: 'edge' };

// Настройки берутся из Environment Variables на Vercel:
//   API_BASE - адрес API (по умолчанию OpenRouter)
//   API_KEY  - ключ
//   MODEL    - если задано, подставляется в каждый запрос вместо модели с сайта
// убираем пробелы, переносы строк, кавычки и слово Bearer, если их случайно вставили вместе с ключом
const clean = k => k.trim().replace(/^["']|["']$/g, '').replace(/^Bearer\s+/i, '').trim();

export default async function handler(req) {
  const cors = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  };
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });

  const p = new URL(req.url).searchParams.get('p');
  if (p === 'whoami') {
    const k = clean(process.env.API_KEY || process.env.OPENROUTER_KEY || process.env.ANYMODEL_KEY || process.env.DRAKE_KEY || '');
    return new Response(JSON.stringify({
      base: process.env.API_BASE || 'https://openrouter.ai/api/v1 (по умолчанию)',
      model: process.env.MODEL || '(не задана, берётся с сайта)',
      key_set: !!k, key_start: k.slice(0, 6), key_length: k.length,
    }, null, 2), { headers: { ...cors, 'Content-Type': 'application/json' } });
  }
  if (p !== 'chat/completions' && p !== 'models') {
    return new Response('bad path', { status: 400, headers: cors });
  }

  const key = clean(process.env.API_KEY || process.env.OPENROUTER_KEY || process.env.ANYMODEL_KEY || process.env.DRAKE_KEY || '');
  if (!key) {
    return new Response(JSON.stringify({ error: 'API_KEY не задан в Environment Variables на Vercel' }),
      { status: 500, headers: { ...cors, 'Content-Type': 'application/json' } });
  }
  const base = (process.env.API_BASE || 'https://openrouter.ai/api/v1').replace(/\/+$/, '') + '/';

  let body;
  if (req.method === 'POST') {
    body = await req.text();
    if (process.env.MODEL) {
      try {
        const j = JSON.parse(body);
        j.model = process.env.MODEL;
        delete j.models;
        delete j.provider;
        body = JSON.stringify(j);
      } catch (e) {}
    }
  }

  const upstream = await fetch(base + p, {
    method: req.method,
    headers: {
      Authorization: 'Bearer ' + key,
      'Content-Type': 'application/json',
      'X-Title': 'Venus AI',
    },
    body,
  });

  const headers = new Headers(cors);
  headers.set('Content-Type', upstream.headers.get('content-type') || 'application/json');
  headers.set('Cache-Control', 'no-cache, no-transform');
  return new Response(upstream.body, { status: upstream.status, headers });
}
