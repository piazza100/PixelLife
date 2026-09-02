const API_PATHS = ['/api/', '/oauth2/', '/login/', '/logout']

export const onRequest = async (context: any) => {
  const incoming = new URL(context.request.url)
  const publicPaths = ['/', '/guide', '/how-to-create-a-board', '/how-to-record', '/board-statistics', '/rewards-guide', '/plans', '/garden', '/privacy', '/terms']

  if (incoming.pathname === '/sitemap.xml') {
    const urls = publicPaths.map(path => `<url><loc>${incoming.origin}${path}</loc></url>`).join('')
    return new Response(`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls}</urlset>`, {
      headers: {'content-type': 'application/xml; charset=UTF-8'},
    })
  }
  if (incoming.pathname === '/robots.txt') {
    return new Response(`User-agent: *\nAllow: /\nSitemap: ${incoming.origin}/sitemap.xml\n`, {
      headers: {'content-type': 'text/plain; charset=UTF-8'},
    })
  }
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
