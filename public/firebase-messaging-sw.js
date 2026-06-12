/* eslint-disable */
importScripts('https://www.gstatic.com/firebasejs/12.13.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/12.13.0/firebase-messaging-compat.js');

firebase.initializeApp({
  messagingSenderId: "371947652181",
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);
  const notificationTitle = payload.notification ? payload.notification.title : 'FMC Mobile Alert';
  
  // Extract custom target URL or action from data payload
  let urlToOpen = '/';
  if (payload.data) {
    if (payload.data.url) {
      urlToOpen = payload.data.url;
    } else if (payload.data.click_action) {
      urlToOpen = payload.data.click_action;
    } else if (payload.data.requestId) {
      urlToOpen = `/services?id=${payload.data.requestId}`;
    }
  }

  const notificationOptions = {
    body: payload.notification ? payload.notification.body : (payload.data ? payload.data.body : ''),
    icon: '/pwa-512x512.png',
    badge: '/pwa-512x512.png',
    // Strong vibrating sequence to wake screen and capture user attention on mobile sleep
    vibrate: [300, 110, 300, 110, 450, 110, 600],
    tag: 'fmc-alert-urgent',
    renotify: true,
    // requireInteraction guarantees the pop-up notification stays visual and doesn't self-minimize
    requireInteraction: true,
    data: {
      url: urlToOpen
    }
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});

// Event listener for clicking PWA background push notifications
self.addEventListener('notificationclick', function(event) {
  event.notification.close();

  // Default to root URL if none provided
  const urlToOpen = (event.notification.data && event.notification.data.url) || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(clientList) {
      // Search for any existing active tab inside our same origin
      for (var i = 0; i < clientList.length; i++) {
        var client = clientList[i];
        if (client.url && 'focus' in client) {
          const clientUrl = new URL(client.url, self.location.href);
          
          if (clientUrl.origin === self.location.origin) {
            // Focus and optionally navigate to the deep-linked page
            if ('navigate' in client && urlToOpen !== '/') {
              client.navigate(urlToOpen);
            }
            return client.focus();
          }
        }
      }
      
      // Fallback: If no window is found, open a fresh tab
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});
