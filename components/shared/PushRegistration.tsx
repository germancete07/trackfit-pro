"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export function PushRegistration({ userId }: { userId: string }) {
  const router = useRouter();

  useEffect(() => {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) return;

    async function setup() {
      try {
        const reg = await navigator.serviceWorker.register("/sw.js");

        const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
        if (!vapidKey) return;

        const existing = await reg.pushManager.getSubscription();
        if (existing) {
          // Subscription already registered — no need to re-POST on every page load
          return;
        }

        // Only subscribe if permission already granted (don't auto-prompt)
        if (Notification.permission !== "granted") return;

        const sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(vapidKey),
        });
        await saveSub(sub);
      } catch {}
    }

    setup();
  }, [userId]);

  // Handle deep-link navigation from service worker notificationclick
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    function handleMessage(event: MessageEvent) {
      if (event.data?.type === "NOTIFICATION_CLICK" && event.data?.url) {
        router.push(event.data.url);
      }
    }

    navigator.serviceWorker.addEventListener("message", handleMessage);
    return () => navigator.serviceWorker.removeEventListener("message", handleMessage);
  }, [router]);

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
    await saveSub(sub);
    return true;
  }

  return { requestPermission };
}

async function saveSub(sub: PushSubscription) {
  const json = sub.toJSON();
  if (!json.endpoint || !json.keys) return;
  await fetch("/api/push/subscribe", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      // userId is intentionally omitted — the server derives it from the session cookie
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
