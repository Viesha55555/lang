const REMINDER_ALARM_KEY = 'spoken-flashcards.reminder';

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));

// Main app posts { type: 'SCHEDULE_REMINDER', dueAt: <ISO string> }
self.addEventListener('message', (event) => {
  if (event.data?.type === 'SCHEDULE_REMINDER') {
    scheduleReminder(event.data.dueAt);
  }

  if (event.data?.type === 'CANCEL_REMINDER') {
    clearScheduled();
  }
});

// Periodic background sync fires the SW periodically (Chrome 80+)
self.addEventListener('periodicsync', (event) => {
  if (event.tag === REMINDER_ALARM_KEY) {
    event.waitUntil(maybeNotify());
  }
});

// Also check on fetch so the SW stays alive while the app is open
self.addEventListener('fetch', () => {
  maybeNotify();
});

let scheduledTimer = null;

function scheduleReminder(dueAtIso) {
  clearScheduled();

  const msUntilDue = new Date(dueAtIso).getTime() - Date.now();

  if (msUntilDue <= 0) {
    showReminder();
    return;
  }

  // Cap at 24 hours so browsers don't kill the timer silently
  const delay = Math.min(msUntilDue, 24 * 60 * 60 * 1000);

  scheduledTimer = setTimeout(() => showReminder(), delay);
}

function clearScheduled() {
  if (scheduledTimer !== null) {
    clearTimeout(scheduledTimer);
    scheduledTimer = null;
  }
}

async function maybeNotify() {
  const clients = await self.clients.matchAll();
  // Don't notify if the app is in the foreground — the app handles that itself
  if (clients.some((c) => c.visibilityState === 'visible')) {
    return;
  }

  showReminder();
}

function showReminder() {
  self.registration.showNotification('Time to practice Dutch 🇳🇱', {
    body: 'You have words due for review. Open Spoken to keep your streak going.',
    icon: '/favicon.ico',
    badge: '/favicon.ico',
    tag: 'spoken-reminder',
    renotify: false,
  });
}

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: 'window' }).then((clientList) => {
      for (const client of clientList) {
        if (client.url && 'focus' in client) {
          return client.focus();
        }
      }

      if (self.clients.openWindow) {
        return self.clients.openWindow('/');
      }
    }),
  );
});
