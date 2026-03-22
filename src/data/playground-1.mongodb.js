// // CONFIGURACIÓN
// use('mbot'); // 👈 cambia esto si tu base de datos se llama diferente
// const TOTAL = 5000000; // 👈 cambia esto (X registros)
// const COMMANDS = [
//   "menu","akinator","dog","cat","mydogs","mycats","apk","tts","xnx","tiktok",
//   "fb","xdl","news","feedback","help","img","mail","play","lyrics","ipinfo",
//   "whois","dns","qr","quiz","roman","settings","ssweb","md5","password",
//   "myid","mayus","minus","reverse","capitalize","shorten","t","ttt","wiki",
//   "alerta","dalert","listalert"
// ];

// // helpers
// function randomFrom(arr) {
//   return arr[Math.floor(Math.random() * arr.length)];
// }

// function randomUserId() {
//   // simula telegram user ids
//   return Math.floor(6000000000 + Math.random() * 1000000000);
// }

// function randomRating() {
//   return Math.floor(Math.random() * 5) + 1;
// }

// function maybe(prob = 0.5) {
//   return Math.random() < prob;
// }

// function randomFeedback() {
//   return randomFrom(["useful", "not_useful"]);
// }

// function randomReason() {
//   return randomFrom(["confusing", "slow", "buggy", "not_working"]);
// }

// // generar docs
// const docs = [];

// for (let i = 0; i < TOTAL; i++) {
//   const now = Date.now();

//   const doc = {
//     command: randomFrom(COMMANDS),
//     userId: NumberLong(String(randomUserId())),
//     createdAt: NumberLong(String(now - Math.floor(Math.random() * 1000000000))),
//     updatedAt: NumberLong(String(now)),
//   };

//   // rating (80% prob)
//   if (maybe(0.8)) {
//     doc.rating = randomRating();
//   }

//   // feedback (50% prob)
//   if (maybe(0.5)) {
//     doc.feedback = randomFeedback();
//   }

//   // reason solo si not_useful
//   if (doc.feedback === "not_useful") {
//     doc.reason = randomReason();
//   }

//   docs.push(doc);
// }

// // insert masivo
// db.getCollection('command_ratings').insertMany(docs);
// print(`✅ Insertados ${docs.length} registros en command_ratings`);

// CONFIG
const USERS = 500000;              // 👈 cantidad de usuarios
const MAX_EVENTS_PER_USER = 1; // 👈 historial por usuario

const COMMANDS = [
  "menu","akinator","dog","cat","mydogs","mycats","apk","tts","xnx","tiktok",
  "fb","xdl","news","feedback","help","img","mail","play","lyrics","ipinfo",
  "whois","dns","qr","quiz","roman","settings","ssweb","md5","password",
  "myid","mayus","minus","reverse","capitalize","shorten","t","ttt","wiki",
  "alerta","dalert","listalert"
];

const ACHIEVEMENTS = [
  "First Command",
  "Night Owl",
  "Power User",
  "Explorer",
  "Mision Diaria"
];

// helpers
function randomFrom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomUserId() {
  return 779612292
  //  NumberLong(String(7000000000 + Math.floor(Math.random() * 1000000000)));
}

function maybe(p = 0.3) {
  return Math.random() < p;
}

function randomArgs(command) {
  switch (command) {
    case "apk": return maybe() ? "com.whatsapp" : "";
    case "ipinfo": return maybe() ? "8.8.8.8" : "";
    case "ssweb": return maybe() ? "https://google.com" : "";
    case "qr": return maybe() ? "Hola mundo" : "";
    case "t": return maybe() ? "en hola" : "";
    case "play": return maybe() ? "Imagine Dragons" : "";
    default: return "";
  }
}

// generar docs
const docs = [];

for (let i = 0; i < USERS; i++) {
  const userId = randomUserId();

  let currentTime = Date.now() - Math.floor(Math.random() * 1000 * 60 * 60 * 24 * 7); // hasta 7 días atrás

  const events = Math.floor(Math.random() * MAX_EVENTS_PER_USER) + 10;

  for (let j = 0; j < events; j++) {
    
    // avanzar tiempo (simula uso real)
    currentTime += Math.floor(Math.random() * 1000 * 60 * 10); // + hasta 10 min

    if (maybe(0.15)) {
      // 🎯 achievement
      docs.push({
        userId,
        type: "achievement",
        achievementName: randomFrom(ACHIEVEMENTS),
        timestamp: NumberLong(String(currentTime)),
        date: new Date(currentTime)
      });
    } else {
      // 💻 command
      const command = randomFrom(COMMANDS);

      docs.push({
        userId,
        type: "command",
        command,
        args: randomArgs(command),
        timestamp: NumberLong(String(currentTime)),
        date: new Date(currentTime)
      });
    }
  }
}

use('mbot');
db.getCollection('histories').insertMany(docs);

print(`✅ Usuarios: ${USERS}`);
print(`✅ Eventos generados: ${docs.length}`);