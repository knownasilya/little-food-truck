// Minimal service worker whose only job is to receive Web Push events and
// show a notification — no offline caching / asset strategy here.

self.addEventListener("push", (event) => {
	if (!event.data) return;
	const data = event.data.json();
	event.waitUntil(
		self.registration.showNotification(data.title ?? "Little Food Truck", {
			body: data.body,
			icon: "/images/logo-icon.png",
			badge: "/images/logo-icon.png",
			data: { url: data.url ?? "/" }
		})
	);
});

self.addEventListener("notificationclick", (event) => {
	event.notification.close();
	const url = event.notification.data?.url ?? "/";
	event.waitUntil(
		self.clients.matchAll({ type: "window" }).then((clientList) => {
			for (const c of clientList) {
				if (c.url.includes(url) && "focus" in c) return c.focus();
			}
			if (self.clients.openWindow) return self.clients.openWindow(url);
		})
	);
});
