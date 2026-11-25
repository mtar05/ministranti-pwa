self.addEventListener("install", () => {
    self.skipWaiting();
});

self.addEventListener("activate", (event) => {
    event.waitUntil(self.clients.claim());
});

self.addEventListener("push", (event) => {
    if (event.data) {
        const data = event.data.json();
        const options = {
            body: data.body,
            icon: "/ikona.png",
            badge: "/ikona.png",
            vibrate: [300, 100, 300, 100, 400],
            tag: "sluzba-upozorneni",
            renotify: true,
            requireInteraction: true,
            data: {
                url: "/",
            },
        };

        event.waitUntil(
            self.registration.showNotification(data.title, options),
        );
    }
});

self.addEventListener("notificationclick", (event) => {
    event.notification.close();
    event.waitUntil(clients.openWindow(event.notification.data.url));
});
