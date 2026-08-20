const API_PATHS = ['/api/', '/oauth2/', '/login/', '/logout']

export const onRequest = async (context: any) => {
  const incoming = new URL(context.request.url)
  if (!API_PATHS.some(path => incoming.pathname === path.slice(0, -1) || incoming.pathname.startsWith(path))) {
    return context.next()
  }

  const apiOrigin = String(context.env.API_ORIGIN || '').replace(/\/$/, '')
  if (!apiOrigin) return new Response('API proxy is not configured', {status: 503})

  const target = new URL(incoming.pathname + incoming.search, apiOrigin)
  const headers = new Headers(context.request.headers)
  headers.delete('host')
  headers.set('X-Forwarded-Host', incoming.host)
  headers.set('X-Forwarded-Proto', 'https')

  const upstream = await fetch(target, new Request(context.request, {headers}))
  return new Response(upstream.body, {
    status: upstream.status,
    statusText: upstream.statusText,
    headers: upstream.headers,
  })
}
