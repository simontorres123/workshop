"use client";

import { useEffect } from 'react';

/** Removes the legacy Web Push worker once, without requesting browser permission. */
export default function LegacyServiceWorkerCleanup() {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;
    navigator.serviceWorker.getRegistrations()
      .then(registrations => Promise.all(registrations.filter(registration => new URL(registration.scope).origin === window.location.origin).map(registration => registration.unregister())))
      .catch(() => undefined);
  }, []);
  return null;
}
