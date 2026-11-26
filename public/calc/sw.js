const CACHE_NAME = "calcios-shell-beda6627";
const PRECACHE_PATHS = ["./","./index.html","./manifest.webmanifest","./icon.svg","./assets/calcios-lcd-large-v56iGlnN.ttf","./assets/calcios-lcd-small-DR7TOiTs.ttf","./assets/ibm-plex-mono-cyrillic-400-normal-BSMlKf0J.woff2","./assets/ibm-plex-mono-cyrillic-400-normal-CEL4l2ZJ.woff","./assets/ibm-plex-mono-cyrillic-600-normal-CTOM6hUh.woff2","./assets/ibm-plex-mono-cyrillic-600-normal-fLZuRloM.woff","./assets/ibm-plex-mono-cyrillic-700-normal-Bp80XfeI.woff2","./assets/ibm-plex-mono-cyrillic-700-normal-O_YjL27c.woff","./assets/ibm-plex-mono-cyrillic-ext-400-normal-DMdlQ8Kv.woff","./assets/ibm-plex-mono-cyrillic-ext-400-normal-xuaO2J-f.woff2","./assets/ibm-plex-mono-cyrillic-ext-600-normal-9HEixskS.woff","./assets/ibm-plex-mono-cyrillic-ext-600-normal-V-xxqcpd.woff2","./assets/ibm-plex-mono-cyrillic-ext-700-normal-BDQ-w_bc.woff2","./assets/ibm-plex-mono-cyrillic-ext-700-normal-CtgKGIh5.woff","./assets/ibm-plex-mono-latin-400-normal-CvHOgSBP.woff","./assets/ibm-plex-mono-latin-400-normal-DMJ8VG8y.woff2","./assets/ibm-plex-mono-latin-600-normal-BgSNZQsw.woff2","./assets/ibm-plex-mono-latin-600-normal-DWFSQ4vo.woff","./assets/ibm-plex-mono-latin-700-normal-7sUh57Bg.woff2","./assets/ibm-plex-mono-latin-700-normal-CNHXzs6v.woff","./assets/ibm-plex-mono-latin-ext-400-normal-BmRBH3aV.woff2","./assets/ibm-plex-mono-latin-ext-400-normal-D3D2R8hC.woff","./assets/ibm-plex-mono-latin-ext-600-normal-D38SheWl.woff2","./assets/ibm-plex-mono-latin-ext-600-normal-DmB0ttJJ.woff","./assets/ibm-plex-mono-latin-ext-700-normal-Cwsjk1Jb.woff","./assets/ibm-plex-mono-latin-ext-700-normal-Dhimjc7-.woff2","./assets/ibm-plex-mono-vietnamese-400-normal-BulugwFq.woff2","./assets/ibm-plex-mono-vietnamese-400-normal-DDuiU_S-.woff","./assets/ibm-plex-mono-vietnamese-600-normal-D2EvbN8M.woff2","./assets/ibm-plex-mono-vietnamese-600-normal-iLQfcSjf.woff","./assets/ibm-plex-mono-vietnamese-700-normal-Bs14ezHR.woff","./assets/ibm-plex-mono-vietnamese-700-normal-apsD3J7v.woff2","./assets/index-C8Oz1eik.js","./assets/index-qt7IoXnZ.css"];

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      const scope = self.registration.scope;
      await Promise.all(
        PRECACHE_PATHS.map(async (relPath) => {
          try {
            const url = new URL(relPath, scope).toString();
            const res = await fetch(url, { cache: 'reload' });
            if (res && res.ok) {
              await cache.put(url, res);
            }
          } catch {
            // Ignore transient precache miss for individual asset
          }
        })
      );
      await self.skipWaiting();
    })()
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((k) => k.startsWith('calcios-shell-') && k !== CACHE_NAME)
          .map((k) => caches.delete(k))
      );
      await self.clients.claim();
    })()
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  const scope = self.registration.scope;
  if (!url.href.startsWith(scope)) return;

  const accept = req.headers.get('accept') || '';
  const isNavigation = req.mode === 'navigate' || accept.includes('text/html');

  if (isNavigation) {
    event.respondWith(
      (async () => {
        const cache = await caches.open(CACHE_NAME);
        const indexUrl = new URL('./index.html', scope).toString();
        const rootUrl = new URL('./', scope).toString();

        try {
          const controller = new AbortController();
          const timer = setTimeout(() => controller.abort(), 3500);
          const netRes = await fetch(req, { signal: controller.signal });
          clearTimeout(timer);

          if (netRes && netRes.ok) {
            const text = await netRes.clone().text();
            if (text.includes('id="root"')) {
              await cache.put(indexUrl, netRes.clone());
              return netRes;
            }
          }
        } catch {
          // Network offline, tab woke up without radio, or preview host asleep
        }

        const cached =
          (await cache.match(req, { ignoreSearch: true })) ||
          (await cache.match(indexUrl)) ||
          (await cache.match(rootUrl));
        if (cached) return cached;

        return fetch(req);
      })()
    );
    return;
  }

  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      const cached = await cache.match(req, { ignoreSearch: true });
      if (cached) return cached;

      try {
        const netRes = await fetch(req);
        if (netRes && netRes.ok) {
          await cache.put(req, netRes.clone());
        }
        return netRes;
      } catch {
        const fallback = await caches.match(req, { ignoreSearch: true });
        if (fallback) return fallback;
        throw new Error('Offline asset unavailable');
      }
    })()
  );
});
