/// <reference lib="webworker" />
// Service worker MASO : cache hors ligne de l'application + réception des partages (Web Share Target).
import { clientsClaim } from 'workbox-core'
import { cleanupOutdatedCaches, createHandlerBoundToURL, precacheAndRoute } from 'workbox-precaching'
import { NavigationRoute, registerRoute } from 'workbox-routing'

declare const self: ServiceWorkerGlobalScope

export const SHARE_CACHE = 'maso-share'
export const SHARED_FILE_KEY = '/__maso/shared-file'

self.skipWaiting()
clientsClaim()
cleanupOutdatedCaches()
precacheAndRoute(self.__WB_MANIFEST)
registerRoute(new NavigationRoute(createHandlerBoundToURL('/index.html')))

/** Un contenu partagé depuis Facebook, WhatsApp ou la galerie arrive ici (POST /partage). */
async function receiveShare(request: Request): Promise<Response> {
  const form = await request.formData()
  const cache = await caches.open(SHARE_CACHE)
  await cache.delete(SHARED_FILE_KEY)
  const media = form.get('media')
  if (media instanceof File && media.size > 0) {
    await cache.put(
      SHARED_FILE_KEY,
      new Response(media, { headers: { 'Content-Type': media.type, 'X-File-Name': encodeURIComponent(media.name) } }),
    )
  }
  const params = new URLSearchParams()
  for (const key of ['title', 'text', 'url']) {
    const value = form.get(key)
    if (typeof value === 'string' && value) params.set(key, value)
  }
  return Response.redirect(`/verifier/partage?${params}`, 303)
}

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url)
  if (event.request.method === 'POST' && url.origin === self.location.origin && url.pathname === '/partage') {
    event.respondWith(receiveShare(event.request))
  }
})
