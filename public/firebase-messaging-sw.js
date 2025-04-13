// Give the service worker access to Firebase Messaging.
// Note that you can only use Firebase Messaging here. Other Firebase libraries
// are not available in the service worker.
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-messaging-compat.js');

// Initialize the Firebase app in the service worker by passing in
// your app's Firebase config object.
firebase.initializeApp({
    apiKey: "AIzaSyAmwdBZ5-JY67irSlw5mYnwZUwCbw2LAbM",
    authDomain: "goalring-5ceca.firebaseapp.com",
    projectId: "goalring-5ceca",
    storageBucket: "goalring-5ceca.appspot.com",
    messagingSenderId: "126401292396",
    appId: "1:126401292396:web:60341f9ea8cb040c219049",
    measurementId: "G-E1CYRZXRKE"
});

// Retrieve an instance of Firebase Messaging so that it can handle background messages.
const messaging = firebase.messaging();

// Handle background messages
messaging.onBackgroundMessage((payload) => {
    console.log('[firebase-messaging-sw.js] Received background message ', payload);

    // Customize notification here
    const notificationTitle = payload.notification.title;
    const notificationOptions = {
        body: payload.notification.body,
        icon: '/logo192.png',
        badge: '/logo192.png',
        requireInteraction: true
    };

    self.registration.showNotification(notificationTitle, notificationOptions);
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
    console.log('Notification clicked:', event);

    // Close the notification
    event.notification.close();

    // Get all windows with our origin
    event.waitUntil(
        clients.matchAll({
            type: 'window',
            includeUncontrolled: true
        }).then(function (clientList) {
            // If we have a window already open, focus it
            for (let i = 0; i < clientList.length; i++) {
                const client = clientList[i];
                if (client.url.includes(self.registration.scope) && 'focus' in client) {
                    return client.focus();
                }
            }
            // If no window is open, open a new one
            if (clients.openWindow) {
                return clients.openWindow('/');
            }
        })
    );
});

// Handle notification close
self.addEventListener('notificationclose', (event) => {
    console.log('Notification closed:', event);

    // You could track notification dismissals here
    const dismissedNotification = event.notification;
    const dismissedAt = Date.now();

    // Log notification dismissal (could be sent to analytics)
    console.log('Notification dismissed:', {
        title: dismissedNotification.title,
        body: dismissedNotification.body,
        dismissedAt: new Date(dismissedAt).toISOString()
    });
}); 