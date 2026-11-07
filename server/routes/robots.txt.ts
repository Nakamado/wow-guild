/** robots.txt: Hauptdomain indexierbar (mit Sitemap), alle anderen Adressen (Vorschau, *.vercel.app) nicht */
export default defineEventHandler((event) => {
  setHeader(event, 'Content-Type', 'text/plain; charset=utf-8')
  if (!isCanonicalHost(event)) return 'User-agent: *\nDisallow: /\n'
  return [
    'User-agent: *',
    'Disallow: /api/',
    'Disallow: /auth/',
    'Disallow: /admin/',
    'Disallow: /einstellungen',
    '',
    `Sitemap: ${siteBase(event)}/sitemap.xml`,
    '',
  ].join('\n')
})
