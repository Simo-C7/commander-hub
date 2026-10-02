// =================================================================
//  SERVICE WORKER di Commander Hub
// =================================================================
// Un piccolo programma che il telefono tiene installato insieme all'app.
// Conserva una copia del sito, così l'app si apre anche senza internet,
// e quando c'è rete prende sempre la versione più nuova.

// Cambiando questo nome, i telefoni buttano la vecchia copia e ne fanno una nuova
const VERSIONE = 'commander-hub-v1';

// I file dell'app da tenere sempre pronti
const FILE_APP = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icone/icona-32.png',
  './icone/icona-180.png',
  './icone/icona-192.png',
  './icone/icona-512.png',
];

// Da questi indirizzi esterni teniamo una copia: simboli di mana,
// illustrazioni delle carte e il programma di Firebase (che non cambia mai)
const ESTERNI_DA_CONSERVARE = [
  'https://svgs.scryfall.io/',
  'https://cards.scryfall.io/',
  'https://www.gstatic.com/firebasejs/',
];

self.addEventListener('install', evento => {
  evento.waitUntil(caches.open(VERSIONE).then(cassetto => cassetto.addAll(FILE_APP)));
  self.skipWaiting();   // la nuova versione entra in funzione subito
});

self.addEventListener('activate', evento => {
  // Buttiamo le copie delle versioni precedenti
  evento.waitUntil(
    caches.keys()
      .then(nomi => Promise.all(nomi.filter(nome => nome !== VERSIONE).map(nome => caches.delete(nome))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', evento => {
  const richiesta = evento.request;
  if (richiesta.method !== 'GET') return;
  const url = new URL(richiesta.url);

  // Le pagine dell'app: prima la rete (versione più nuova), se manca la copia salvata
  if (richiesta.mode === 'navigate' || (url.origin === location.origin && url.pathname.endsWith('.html'))) {
    evento.respondWith(
      fetch(richiesta)
        .then(risposta => {
          const copia = risposta.clone();
          caches.open(VERSIONE).then(cassetto => cassetto.put('./index.html', copia));
          return risposta;
        })
        .catch(() => caches.match('./index.html')),
    );
    return;
  }

  // Icone e simili dell'app, simboli di mana, illustrazioni, Firebase:
  // si usa subito la copia salvata e intanto la si aggiorna dalla rete
  const daConservare = url.origin === location.origin
    || ESTERNI_DA_CONSERVARE.some(inizio => richiesta.url.startsWith(inizio));
  if (!daConservare) return;   // tutto il resto (dati di Firebase, ricerche su Scryfall) va diretto in rete

  evento.respondWith(
    caches.open(VERSIONE).then(cassetto => cassetto.match(richiesta).then(salvata => {
      const dallaRete = fetch(richiesta)
        .then(risposta => {
          if (risposta.ok || risposta.type === 'opaque') cassetto.put(richiesta, risposta.clone());
          return risposta;
        })
        .catch(() => salvata);
      return salvata || dallaRete;
    })),
  );
});
