export default {
  async fetch(request) {
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET',
          'Access-Control-Allow-Headers': 'Content-Type',
        },
      });
    }

    const url = new URL(request.url);

    if (url.pathname !== '/tatoeba') {
      return new Response('Not found', { status: 404 });
    }

    const q = url.searchParams.get('q');
    const from = url.searchParams.get('from');
    const to = url.searchParams.get('to');

    if (!q || !from || !to) {
      return new Response('Missing required parameters: q, from, to', { status: 400 });
    }

    const tatoebaUrl =
      'https://api.tatoeba.org/v1/sentences' +
      '?lang=' + encodeURIComponent(from) +
      '&q=' + encodeURIComponent(q) +
      '&trans_lang=' + encodeURIComponent(to) +
      '&limit=5';

    const resp = await fetch(tatoebaUrl);
    const body = await resp.text();

    return new Response(body, {
      status: resp.status,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, max-age=86400',
      },
    });
  },
};
