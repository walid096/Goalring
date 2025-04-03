importScripts('https://www.gstatic.com/firebasejs/9.22.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.22.0/firebase-messaging-compat.js');

firebase.initializeApp({
    apiKey: "AIzaSyAmwdBZ5-JY67irSlw5mYnwZUwCbw2LAbM",
    authDomain: "goalring-5ceca.firebaseapp.com",
    projectId: "goalring-5ceca",
    storageBucket: "goalring-5ceca.firebasestorage.app",
    messagingSenderId: "126401292396",
    appId: "1:126401292396:web:60341f9ea8cb040c219049",
    measurementId: "G-E1CYRZXRKE"
});

const messaging = firebase.messaging();

// Handle background messages
messaging.onBackgroundMessage((payload) => {
    console.log('Received background message:', payload);

    const notificationTitle = payload.notification.title;
    const notificationOptions = {
        body: payload.notification.body,
        icon: '/logo192.png',
        badge: '/logo192.png',
        data: payload.data,
        actions: [
            {
                action: 'open',
                title: 'Open'
            },
            {
                action: 'close',
                title: 'Close'
            }
        ]
    };

    self.registration.showNotification(notificationTitle, notificationOptions);
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
    console.log('Notification clicked:', event);

    event.notification.close();

    if (event.action === 'open') {
        // Handle open action
        event.waitUntil(
            clients.openWindow('/')
        );
    }
}); 