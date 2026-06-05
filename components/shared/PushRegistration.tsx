"use client";

import { useEffect } from "react";

export function PushRegistration({ userId }: { userId: string }) {
  useEffect(() => {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) return;

    async function setup() {
      try {
        const reg = await navigator.serviceWorker.register("/sw.js");

        const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
        if (!vapidKey) return;

        const existing = await reg.pushManager.getSubscription();
        if (existing) {
          // Already subscribed, make sure it's saved
          await saveSub(existing, userId);
          return;
        }

        // Only subscribe if permission already granted (don't auto-prompt)
        if (Notification.permission !== "granted") return;

        const sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(vapidKey),
        });
        await saveSub(sub, userId);
      } catch {}
    }

    setup();
  }, [userId]);

  return null;
}

export function usePushPermission() {
  async function requestPermission(userId: string) {
    if (!("Notification" in window) || !("serviceWorker" in navigator)) return false;

    const permission = await Notification.requestPermission();
    if (permission !== "granted") return false;

    const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    if (!vapidKey) return false;

    const reg = await navigator.serviceWorker.register("/sw.js");
    const sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidKey),
    });
    await saveSub(sub, userId);
    return true;
  }

  return { requestPermission };
}

async function saveSub(sub: PushSubscription, userId: string) {
  const json = sub.toJSON();
  if (!json.endpoint || !json.keys) return;
  await fetch("/api/push/subscribe", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      userId,
      endpoint: json.endpoint,
      p256dh: json.keys.p256dh,
      auth: json.keys.auth,
    }),
  });
}

function urlBase64ToUint8Array(base64: string) {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(b64);
  return Uint8Array.from(Array.from(raw).map((c) => c.charCodeAt(0)));
}
