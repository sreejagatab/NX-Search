// Cloudflare Pages Function — proxies /v1/* (LLM SSE streaming) to the NeuronX backend.
const UPSTREAM = 'https://neuronx.jagatab.uk'

export async function onRequest(context) {
  const { request, params } = context
  const url = new URL(request.url)

  const path = params.path ? (Array.isArray(params.path) ? params.path.join('/') : params.path) : ''
  const target = `${UPSTREAM}/v1/${path}${url.search}`

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
    // Keep streaming headers for SSE
    respHeaders.set('X-Accel-Buffering', 'no')
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
