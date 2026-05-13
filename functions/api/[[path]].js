// Cloudflare Pages Function — proxies /api/* to the NeuronX backend.
// Runs at the edge so POST /api/search/v2/search reaches the API instead of the SPA fallback.
const UPSTREAM = 'https://neuronx.jagatab.uk'

export async function onRequest(context) {
  const { request, params } = context
  const url = new URL(request.url)

  const path = params.path ? (Array.isArray(params.path) ? params.path.join('/') : params.path) : ''
  const target = `${UPSTREAM}/api/${path}${url.search}`

  const headers = new Headers(request.headers)
  headers.set('Host', 'neuronx.jagatab.uk')

  const upstream = new Request(target, {
    method: request.method,
    headers,
    body: ['GET', 'HEAD'].includes(request.method) ? undefined : request.body,
    redirect: 'follow',
  })

  try {
    const resp = await fetch(upstream)
    const respHeaders = new Headers(resp.headers)
    respHeaders.set('Access-Control-Allow-Origin', '*')
    return new Response(resp.body, {
      status: resp.status,
      statusText: resp.statusText,
      headers: respHeaders,
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: 'upstream unavailable', detail: String(err) }), {
      status: 502,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}
