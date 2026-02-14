// Give the service worker access to Firebase Messaging.
// Note that you can only use Firebase Messaging here, other Firebase libraries are not available in the service worker.
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js');

// Initialize the Firebase app in the service worker by passing in
// your app's Firebase config object.
// https://firebase.google.com/docs/web/setup#config-object
firebase.initializeApp({
    apiKey: "AIzaSyC6d6LoUDUWNy56sXi4xlYgDJkhIigxyc0",
    authDomain: "ttr-manager-pgh1g.firebaseapp.com",
    databaseURL: "https://ttr-manager-pgh1g-default-rtdb.europe-west1.firebasedatabase.app",
    projectId: "ttr-manager-pgh1g",
    storageBucket: "ttr-manager-pgh1g.firebasestorage.app",
    messagingSenderId: "491869040436",
    appId: "1:491869040436:web:5ba51c0c2fb61b68367f61"
});

// Retrieve an instance of Firebase Messaging so that it can handle background messages.
const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
    console.log('[firebase-messaging-sw.js] Received background message ', payload);
    // Customize notification here
    const notificationTitle = payload.notification.title;
    const notificationOptions = {
        body: payload.notification.body,
        icon: '/logo.png'
    };

    self.registration.showNotification(notificationTitle, notificationOptions);
});
