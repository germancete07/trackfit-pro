self.addEventListener("push", (event) => {
  if (!event.data) return;
  const { title, body, url } = event.data.json();
  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon: "/icons/icon-192x192.png",
      badge: "/icons/icon-192x192.png",
      data: { url: url || "/dashboard/notifications" },
      vibrate: [200, 100, 200],
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "/dashboard";
  event.waitUntil(
    clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((list) => {
        // If the app is already open, focus it AND navigate to the target URL
        for (const client of list) {
          if ("focus" in client) {
            return client.focus().then(() => {
              // postMessage so the app can handle navigation
              client.postMessage({ type: "NOTIFICATION_CLICK", url });
            });
          }
        }
        // If the app is closed, open a new window at the target URL
        return clients.openWindow(url);
      })
  );
});
