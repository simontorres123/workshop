import { useState, useEffect, useCallback } from 'react';

interface PushSubscription {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

interface NotificationPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  image?: string;
  data?: any;
  actions?: Array<{
    action: string;
    title: string;
    icon?: string;
  }>;
  tag?: string;
  requireInteraction?: boolean;
  silent?: boolean;
  vibrate?: number[];
}

export function usePushNotifications() {
  const [isSupported, setIsSupported] = useState(false);
  const [subscription, setSubscription] = useState<PushSubscription | null>(null);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Verificar soporte del navegador
  useEffect(() => {
    const checkSupport = () => {
      // Detectar iOS
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
      const isSafari = /Safari/.test(navigator.userAgent) && /Apple Computer/.test(navigator.vendor);
      const isStandalone = (window.navigator as any).standalone || window.matchMedia('(display-mode: standalone)').matches;
      
      // Debug logs para iOS
      console.log('🔍 iOS Debug Info:', {
        isIOS,
        isSafari,
        isStandalone,
        userAgent: navigator.userAgent,
        vendor: navigator.vendor,
        standaloneProperty: (window.navigator as any).standalone,
        displayMode: window.matchMedia('(display-mode: standalone)').matches
      });
      
      const basicSupport = 
        'serviceWorker' in navigator &&
        'PushManager' in window &&
        'Notification' in window;
      
      console.log('🔍 Basic Support Check:', {
        serviceWorker: 'serviceWorker' in navigator,
        pushManager: 'PushManager' in window,
        notification: 'Notification' in window,
        basicSupport
      });
      
      // En iOS Safari, las notificaciones push solo funcionan si:
      // 1. La app está instalada como PWA (Add to Home Screen)
      // 2. iOS 16.4+ (marzo 2023)
      // 3. El usuario debe agregar la app a la pantalla de inicio
      if (isIOS) {
        console.log('📱 iOS detected, checking PWA mode...');
        
        if (!isStandalone) {
          console.log('❌ Not in standalone mode');
          setIsSupported(false);
          setError('En iPhone, las notificaciones push requieren agregar la app a la pantalla de inicio primero. Ve a Safari → Compartir → "Agregar a pantalla de inicio"');
          return;
        }
        
        console.log('✅ Running in standalone mode');
        
        // Verificar versión de iOS (aproximada)
        const match = navigator.userAgent.match(/OS (\d+)_(\d+)/);
        if (match) {
          const majorVersion = parseInt(match[1]);
          const minorVersion = parseInt(match[2]);
          
          console.log('📱 iOS Version:', `${majorVersion}.${minorVersion}`);
          
          if (majorVersion < 16 || (majorVersion === 16 && minorVersion < 4)) {
            console.log('❌ iOS version too old');
            setIsSupported(false);
            setError('Las notificaciones push en iPhone requieren iOS 16.4 o superior');
            return;
          }
        }
        
        // Para iOS en modo standalone, verificar si las APIs están realmente disponibles
        if (!basicSupport) {
          console.log('❌ Basic APIs not available on iOS');
          setIsSupported(false);
          setError('Las APIs de notificación no están disponibles en esta versión de iOS');
          return;
        }
      }
      
      setIsSupported(basicSupport);
      
      if (!basicSupport) {
        if (isIOS) {
          setError('Notificaciones push no disponibles. Asegúrate de usar iOS 16.4+ y agregar la app a la pantalla de inicio');
        } else {
          setError('Tu navegador no soporta notificaciones push');
        }
      } else {
        console.log('✅ Push notifications supported!');
      }
    };

    checkSupport();
  }, []);

  // Registrar Service Worker
  const registerServiceWorker = useCallback(async () => {
    if (!isSupported) return null;

    try {
      const registration = await navigator.serviceWorker.register('/sw.js');
      console.log('✅ Service Worker registered:', registration);
      
      // Esperar a que esté activo
      await navigator.serviceWorker.ready;
      
      return registration;
    } catch (error) {
      console.error('❌ Service Worker registration failed:', error);
      setError('Error registrando Service Worker');
      return null;
    }
  }, [isSupported]);

  // Obtener suscripción existente
  const getExistingSubscription = useCallback(async () => {
    if (!isSupported) return null;

    try {
      const registration = await navigator.serviceWorker.ready;
      const existingSub = await registration.pushManager.getSubscription();
      
      if (existingSub) {
        const subData = {
          endpoint: existingSub.endpoint,
          keys: {
            p256dh: btoa(String.fromCharCode(...new Uint8Array(existingSub.getKey('p256dh')!))),
            auth: btoa(String.fromCharCode(...new Uint8Array(existingSub.getKey('auth')!)))
          }
        };
        
        setSubscription(subData);
        setIsSubscribed(true);
        return subData;
      }
      
      return null;
    } catch (error) {
      console.error('❌ Error getting existing subscription:', error);
      return null;
    }
  }, [isSupported]);

  // Subscribirse a notificaciones
  const subscribe = useCallback(async () => {
    console.log('🔄 Starting subscription process...');
    
    if (!isSupported) {
      console.log('❌ Notifications not supported');
      setError('Notificaciones no soportadas');
      return false;
    }

    setLoading(true);
    setError(null);

    try {
      console.log('📋 Requesting notification permission...');
      // Verificar permisos
      const permission = await Notification.requestPermission();
      console.log('🔐 Permission result:', permission);
      
      if (permission !== 'granted') {
        console.log('❌ Permission denied');
        setError('Permisos de notificación denegados');
        setLoading(false);
        return false;
      }

      console.log('🔧 Registering Service Worker...');
      // Registrar Service Worker
      const registration = await registerServiceWorker();
      if (!registration) {
        console.log('❌ Service Worker registration failed');
        setLoading(false);
        return false;
      }
      console.log('✅ Service Worker registered');

      console.log('🔍 Checking for existing subscription...');
      // Verificar si ya hay suscripción
      const existingSub = await getExistingSubscription();
      if (existingSub) {
        console.log('✅ Existing subscription found');
        setLoading(false);
        return true;
      }
      console.log('📝 No existing subscription, creating new one...');

      // Obtener VAPID public key
      const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      console.log('🔑 VAPID public key:', vapidPublicKey ? `${vapidPublicKey.substring(0, 20)}...` : 'NOT SET');
      
      if (!vapidPublicKey) {
        console.log('❌ VAPID public key not configured');
        setError('VAPID public key no configurada');
        setLoading(false);
        return false;
      }

      console.log('🔐 Converting VAPID key...');
      // Convertir VAPID key
      const applicationServerKey = urlBase64ToUint8Array(vapidPublicKey);
      console.log('✅ VAPID key converted');

      console.log('📱 Creating push subscription...');
      // Crear nueva suscripción
      const newSubscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey
      });
      console.log('✅ Push subscription created');

      const subData = {
        endpoint: newSubscription.endpoint,
        keys: {
          p256dh: btoa(String.fromCharCode(...new Uint8Array(newSubscription.getKey('p256dh')!))),
          auth: btoa(String.fromCharCode(...new Uint8Array(newSubscription.getKey('auth')!)))
        }
      };
      console.log('📦 Subscription data prepared:', { 
        endpoint: subData.endpoint.substring(0, 50) + '...', 
        hasKeys: true 
      });

      console.log('🌐 Sending subscription to server...');
      // Enviar suscripción al servidor
      const response = await fetch('/api/push-notifications/web-subscription', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(subData)
      });

      console.log('📡 Server response status:', response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.log('❌ Server error response:', errorText);
        throw new Error(`Error guardando suscripción en servidor: ${response.status} ${errorText}`);
      }

      const responseData = await response.json();
      console.log('✅ Server response:', responseData);

      setSubscription(subData);
      setIsSubscribed(true);
      setLoading(false);
      
      console.log('✅ Push subscription successful:', subData);
      return true;

    } catch (error) {
      console.error('❌ Push subscription failed:', error);
      setError(error instanceof Error ? error.message : 'Error en suscripción');
      setLoading(false);
      return false;
    }
  }, [isSupported, registerServiceWorker, getExistingSubscription]);

  // Desuscribirse
  const unsubscribe = useCallback(async () => {
    if (!isSupported || !isSubscribed) return false;

    setLoading(true);
    setError(null);

    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      
      if (subscription) {
        await subscription.unsubscribe();
        
        // Notificar al servidor
        await fetch('/api/push-notifications/web-subscription', {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ endpoint: subscription.endpoint })
        });
      }

      setSubscription(null);
      setIsSubscribed(false);
      setLoading(false);
      
      console.log('✅ Push unsubscription successful');
      return true;

    } catch (error) {
      console.error('❌ Push unsubscription failed:', error);
      setError(error instanceof Error ? error.message : 'Error en desuscripción');
      setLoading(false);
      return false;
    }
  }, [isSupported, isSubscribed]);

  // Enviar notificación de prueba
  const sendTestNotification = useCallback(async (payload?: Partial<NotificationPayload>) => {
    console.log('🎯 sendTestNotification llamado con payload:', payload);
    console.log('🔍 Estado actual:', { isSubscribed, subscription });
    
    if (!isSubscribed) {
      console.log('❌ Usuario no está suscrito');
      setError('No estás suscrito a notificaciones');
      return false;
    }

    try {
      console.log('📤 Enviando petición al servidor...');
      const requestPayload = {
        title: payload?.title || 'Notificación de Prueba',
        body: payload?.body || 'Esta es una notificación de prueba desde Workshop Pro',
        icon: payload?.icon || '/favicon.ico',
        data: payload?.data || { url: '/dashboard' },
        tag: payload?.tag,
        ...payload
      };
      
      console.log('📦 Request payload:', requestPayload);
      
      const response = await fetch('/api/push-notifications/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestPayload)
      });

      console.log('📡 Response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.log('❌ Response error:', errorText);
        throw new Error('Error enviando notificación');
      }

      const result = await response.json();
      console.log('✅ Server response:', result);

      // Si el servidor indica que debemos mostrar la notificación localmente
      if (result.action === 'show_notification' && result.payload) {
        console.log('📱 Showing notification locally...');
        
        // Reproducir sonido antes de mostrar la notificación
        if (result.payload.playSound !== false) {
          try {
            playNotificationSound(result.payload.sound || 'default');
            console.log('🔊 Playing notification sound:', result.payload.sound || 'default');
          } catch (error) {
            console.log('🔇 Audio not supported or failed:', error);
          }
        }

        // Mostrar notificación usando la API nativa del navegador
        if ('Notification' in window && Notification.permission === 'granted') {
          const notification = new Notification(result.payload.title, {
            body: result.payload.body,
            icon: result.payload.icon,
            badge: result.payload.badge,
            tag: result.payload.tag,
            data: result.payload.data,
            requireInteraction: result.payload.requireInteraction,
            timestamp: result.payload.timestamp,
            silent: result.payload.silent || false // Controlar si la notificación es silenciosa
          });

          // Manejar click en la notificación
          notification.onclick = function(event) {
            event.preventDefault();
            if (result.payload.data?.url) {
              window.open(result.payload.data.url, '_blank');
            }
            notification.close();
          };

          console.log('✅ Local notification displayed');
        } else {
          console.log('⚠️ Notification API not available or permission not granted');
        }
      }

      return true;

    } catch (error) {
      console.error('❌ Error sending test notification:', error);
      setError(error instanceof Error ? error.message : 'Error enviando notificación');
      return false;
    }
  }, [isSubscribed]);

  // Verificar estado al montar
  useEffect(() => {
    if (isSupported) {
      getExistingSubscription();
    }
  }, [isSupported, getExistingSubscription]);

  return {
    isSupported,
    isSubscribed,
    subscription,
    loading,
    error,
    subscribe,
    unsubscribe,
    sendTestNotification,
    clearError: () => setError(null)
  };
}

// Utility function para convertir VAPID key
function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

// Función para reproducir sonidos de notificación sintéticos
function playNotificationSound(soundType: string) {
  if (typeof window === 'undefined' || !window.AudioContext) {
    console.log('🔇 Web Audio API not supported');
    return;
  }

  try {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    // Configurar el sonido según el tipo
    switch (soundType) {
      case '/notification-warning.mp3':
      case 'warning':
        // Sonido de advertencia: dos tonos ascendentes
        oscillator.frequency.setValueAtTime(400, audioContext.currentTime);
        oscillator.frequency.setValueAtTime(600, audioContext.currentTime + 0.1);
        break;
      
      case '/notification-success.mp3':
      case 'success':
        // Sonido de éxito: tono ascendente suave
        oscillator.frequency.setValueAtTime(500, audioContext.currentTime);
        oscillator.frequency.setValueAtTime(700, audioContext.currentTime + 0.15);
        break;
      
      case '/notification-error.mp3':
      case 'error':
        // Sonido de error: tono descendente fuerte
        oscillator.frequency.setValueAtTime(600, audioContext.currentTime);
        oscillator.frequency.setValueAtTime(300, audioContext.currentTime + 0.2);
        break;
      
      case '/notification-sound.mp3':
      case 'default':
      default:
        // Sonido por defecto: tono simple y agradable
        oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
        oscillator.frequency.setValueAtTime(600, audioContext.currentTime + 0.1);
        break;
    }

    // Configurar el volumen con fade in/out
    gainNode.gain.setValueAtTime(0, audioContext.currentTime);
    gainNode.gain.linearRampToValueAtTime(0.3, audioContext.currentTime + 0.05);
    gainNode.gain.linearRampToValueAtTime(0, audioContext.currentTime + 0.25);

    // Tipo de onda
    oscillator.type = 'sine';

    // Reproducir el sonido
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.25);

    // Cerrar el contexto después de usar
    setTimeout(() => {
      audioContext.close();
    }, 300);

  } catch (error) {
    console.log('🔇 Error playing synthetic sound:', error);
  }
}