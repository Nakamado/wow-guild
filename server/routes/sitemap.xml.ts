import { instances } from '#shared/data/dungeons'

/** Sitemap der öffentlichen Seiten – absolute URLs auf Basis von NUXT_PUBLIC_SITE_URL */
export default defineEventHandler((event) => {
  const base = siteBase(event)
  const paths = [...publicPaths, ...instances.map(instance => `/dungeons/${instance.slug}`)]
  const urls = paths.map(path => `  <url><loc>${base}${path === '/' ? '/' : path}</loc></url>`).join('\n')
  setHeader(event, 'Content-Type', 'application/xml; charset=utf-8')
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`
})
