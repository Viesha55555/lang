const REMINDER_ALARM_KEY = 'spoken-flashcards.reminder';
const STATE_CACHE = 'spoken-reminders-v1';
const stateUrl = new URL('reminder-state', self.registration.scope).href;
let timer;

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', event => event.waitUntil(self.clients.claim()));
self.addEventListener('message', event => {
  if (event.data?.type === 'SCHEDULE_REMINDER') {
    event.waitUntil(saveReminder(event.data));
  } else if (event.data?.type === 'CANCEL_REMINDER') {
    clearTimeout(timer);
    event.waitUntil(caches.open(STATE_CACHE).then(cache => cache.delete(stateUrl)));
  }
});
async function saveReminder(data) {
  clearTimeout(timer);
  const cache = await caches.open(STATE_CACHE);
  await cache.put(stateUrl, new Response(JSON.stringify(data)));
  const delay = Math.min(Math.max(0, Date.parse(data.dueAt) - Date.now()), 2147483647);
  timer = setTimeout(() => maybeNotify(), delay);
}
self.addEventListener('periodicsync', event => {
  if (event.tag === REMINDER_ALARM_KEY) event.waitUntil(maybeNotify());
});
self.addEventListener('fetch', event => event.waitUntil(maybeNotify()));
let checking = false;
async function maybeNotify() {
  if (checking) return;
  checking = true;
  try {
    const cache = await caches.open(STATE_CACHE);
    const response = await cache.match(stateUrl);
    if (!response) return;
    const reminder = await response.json();
    if (Date.parse(reminder.dueAt) > Date.now()) return;
    const clients = await self.clients.matchAll({ type: 'window' });
    if (clients.some(client => client.visibilityState === 'visible')) return;
    await self.registration.showNotification('Practise your focus words', {
      body: reminder.word + ' is ready to review. Take a moment to practise your selected words.',
      tag: 'spoken-reminder',
      data: { url: new URL('?practice=focus', self.registration.scope).href },
    });
    await cache.delete(stateUrl);
  } finally {
    checking = false;
  }
}
self.addEventListener('notificationclick', event => {
  event.notification.close();
  const url = new URL('?practice=focus', self.registration.scope).href;
  event.waitUntil(self.clients.matchAll({ type: 'window' }).then(async clients => {
    const client = clients.find(client => client.url.startsWith(self.registration.scope));
    if (client) {
      await client.navigate(url);
      return client.focus();
    }
    return self.clients.openWindow(url);
  }));
});
