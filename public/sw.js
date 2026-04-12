// Service Worker para notificaciones push
const CACHE_NAME = 'workshop-v3';

// Instalar service worker
self.addEventListener('install', (event) => {
  console.log('🔧 Service Worker installing...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('📦 Service Worker ready - skipping cache for simplicity');
        // Solo cachear el favicon que sabemos que existe
        return cache.add('/favicon.ico').catch(() => {
          console.log('ℹ️ Favicon not cached, continuing anyway');
          return Promise.resolve();
        });
      })
      .catch((error) => {
        console.error('❌ Cache setup failed:', error);
        // Continuar instalación sin cache si falla
        return Promise.resolve();
      })
  );
  
  // Forzar activación inmediata
  self.skipWaiting();
});

// Activar service worker
self.addEventListener('activate', (event) => {
  console.log('✅ Service Worker activating...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('🗑️ Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      console.log('🎯 Service Worker activated and ready for push notifications');
      // Tomar control inmediato de todas las pestañas
      return self.clients.claim();
    })
  );
});

// Interceptar requests para cache
self.addEventListener('fetch', (event) => {
  // Solo manejar GET requests
  if (event.request.method !== 'GET') {
    return;
  }
  
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Devolver desde cache si existe, sino fetch desde red
        if (response) {
          return response;
        }
        return fetch(event.request).catch((error) => {
          console.log('🌐 Fetch failed for:', event.request.url, error);
          // Devolver una respuesta básica en caso de error de red
          if (event.request.url.includes('.html') || event.request.mode === 'navigate') {
            return new Response('Offline', { status: 200, statusText: 'OK' });
          }
        });
      })
  );
});

// Manejar notificaciones push mejorado
self.addEventListener('push', (event) => {
  console.log('📨 Push notification received:', event);

  if (!event.data) {
    console.log('❌ No data in push event');
    return;
  }

  let notificationData;
  try {
    notificationData = event.data.json();
  } catch (error) {
    console.error('❌ Error parsing push data:', error);
    notificationData = {
      title: 'Workshop Pro',
      body: event.data.text() || 'Nueva notificación',
      icon: '/favicon.ico',
    };
  }

  const options = {
    body: notificationData.body,
    icon: notificationData.icon || '/favicon.ico',
    badge: '/favicon.ico',
    vibrate: notificationData.vibrate || [100, 50, 100],
    data: notificationData.data || { url: '/dashboard' },
    tag: notificationData.tag || 'workshop-notification',
    renotify: true,
    requireInteraction: notificationData.requireInteraction || false,
    timestamp: notificationData.timestamp || Date.now(),
    actions: notificationData.actions || [
      {
        action: 'view',
        title: 'Ver detalles',
        icon: '/favicon.ico'
      },
      {
        action: 'dismiss',
        title: 'Descartar',
        icon: '/favicon.ico'
      }
    ]
  };

  // Agregar imagen si está disponible
  if (notificationData.image) {
    options.image = notificationData.image;
  }

  event.waitUntil(
    self.registration.showNotification(
      notificationData.title || 'Workshop Pro',
      options
    )
  );
});

// Manejar clicks en notificaciones
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'explore') {
    // Abrir URL específica basada en los datos de la notificación
    const urlToOpen = event.notification.data?.url || '/dashboard';
    
    event.waitUntil(
      clients.matchAll({ type: 'window' }).then((clientList) => {
        // Si ya hay una ventana abierta, enfocarla
        for (let i = 0; i < clientList.length; i++) {
          const client = clientList[i];
          if (client.url === urlToOpen && 'focus' in client) {
            return client.focus();
          }
        }
        
        // Si no hay ventana abierta, abrir una nueva
        if (clients.openWindow) {
          return clients.openWindow(urlToOpen);
        }
      })
    );
  } else if (event.action === 'close') {
    // Solo cerrar la notificación (ya se cerró arriba)
    return;
  } else {
    // Click en el cuerpo de la notificación (sin action específica)
    const urlToOpen = event.notification.data?.url || '/dashboard';
    
    event.waitUntil(
      clients.matchAll({ type: 'window' }).then((clientList) => {
        for (let i = 0; i < clientList.length; i++) {
          const client = clientList[i];
          if (client.url.includes(new URL(urlToOpen).pathname) && 'focus' in client) {
            return client.focus();
          }
        }
        
        if (clients.openWindow) {
          return clients.openWindow(urlToOpen);
        }
      })
    );
  }
});

// Manejar cierre de notificaciones
self.addEventListener('notificationclose', (event) => {
  console.log('Notification closed:', event.notification.tag);
  
  // Opcional: enviar analytics sobre notificaciones cerradas
  // fetch('/api/analytics/notification-closed', {
  //   method: 'POST',
  //   headers: { 'Content-Type': 'application/json' },
  //   body: JSON.stringify({
  //     tag: event.notification.tag,
  //     timestamp: Date.now()
  //   })
  // });
});

// Sincronización en background
self.addEventListener('sync', (event) => {
  if (event.tag === 'background-sync') {
    event.waitUntil(doBackgroundSync());
  }
});

async function doBackgroundSync() {
  try {
    // Sincronizar datos pendientes cuando hay conexión
    console.log('Performing background sync');
    
    // Aquí se pueden sincronizar datos offline, como:
    // - Órdenes de reparación creadas offline
    // - Estados actualizados offline
    // - Notificaciones pendientes de envío
    
  } catch (error) {
    console.error('Background sync failed:', error);
  }
}