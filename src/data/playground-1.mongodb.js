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
// const USERS = 500000;              // 👈 cantidad de usuarios
// const MAX_EVENTS_PER_USER = 1; // 👈 historial por usuario

// const COMMANDS = [
//   "menu","akinator","dog","cat","mydogs","mycats","apk","tts","xnx","tiktok",
//   "fb","xdl","news","feedback","help","img","mail","play","lyrics","ipinfo",
//   "whois","dns","qr","quiz","roman","settings","ssweb","md5","password",
//   "myid","mayus","minus","reverse","capitalize","shorten","t","ttt","wiki",
//   "alerta","dalert","listalert"
// ];

// const ACHIEVEMENTS = [
//   "First Command",
//   "Night Owl",
//   "Power User",
//   "Explorer",
//   "Mision Diaria"
// ];

// // helpers
// function randomFrom(arr) {
//   return arr[Math.floor(Math.random() * arr.length)];
// }

// function randomUserId() {
//   return 779612292
//   //  NumberLong(String(7000000000 + Math.floor(Math.random() * 1000000000)));
// }

// function maybe(p = 0.3) {
//   return Math.random() < p;
// }

// function randomArgs(command) {
//   switch (command) {
//     case "apk": return maybe() ? "com.whatsapp" : "";
//     case "ipinfo": return maybe() ? "8.8.8.8" : "";
//     case "ssweb": return maybe() ? "https://google.com" : "";
//     case "qr": return maybe() ? "Hola mundo" : "";
//     case "t": return maybe() ? "en hola" : "";
//     case "play": return maybe() ? "Imagine Dragons" : "";
//     default: return "";
//   }
// }

// // generar docs
// const docs = [];

// for (let i = 0; i < USERS; i++) {
//   const userId = randomUserId();

//   let currentTime = Date.now() - Math.floor(Math.random() * 1000 * 60 * 60 * 24 * 7); // hasta 7 días atrás

//   const events = Math.floor(Math.random() * MAX_EVENTS_PER_USER) + 10;

//   for (let j = 0; j < events; j++) {
    
//     // avanzar tiempo (simula uso real)
//     currentTime += Math.floor(Math.random() * 1000 * 60 * 10); // + hasta 10 min

//     if (maybe(0.15)) {
//       // 🎯 achievement
//       docs.push({
//         userId,
//         type: "achievement",
//         achievementName: randomFrom(ACHIEVEMENTS),
//         timestamp: NumberLong(String(currentTime)),
//         date: new Date(currentTime)
//       });
//     } else {
//       // 💻 command
//       const command = randomFrom(COMMANDS);

//       docs.push({
//         userId,
//         type: "command",
//         command,
//         args: randomArgs(command),
//         timestamp: NumberLong(String(currentTime)),
//         date: new Date(currentTime)
//       });
//     }
//   }
// }

// use('mbot');
// db.getCollection('histories').insertMany(docs);

// print(`✅ Usuarios: ${USERS}`);
// print(`✅ Eventos generados: ${docs.length}`);

// use('mbot');
// const reviews = [];
// const userId = 779612292;
// const baseTime = 1774289283851;

// function randomFrom(arr) {
//   return arr[Math.floor(Math.random() * arr.length)];
// }

// function randomUserId() {
//   // genera un userId aleatorio (simulando Telegram)
//   return Math.floor(6000000000 + Math.random() * 1000000000);
// }

// for (let i = 0; i < 100; i++) {
//   reviews.push({
//     command: "reverse",
//     userId: randomUserId(),
//     badge: "power_user",
//     // Incrementamos el tiempo un poco en cada registro para que no sean idénticos
//     createdAt: baseTime + (i * 1000), 
//     helpfulCount: 0,
//     isEdited: false,
//     isSuspicious: false,
//     isVerified: true,
//     rating: Math.floor(Math.random() * 5) + 1, // rating aleatorio entre 1 y 5
//     repliesCount: 0,
//     review: `Reseña de prueba número ${i + 1}: Este es un texto aleatorio para el comando reverse.`,
//     spamScore: Math.floor(Math.random() * 100), // spam score aleatorio entre 0 y 100
//     trustScoreSnapshot: Math.floor(Math.random() * 100), // trust score aleatorio entre 0 y 100
//     updatedAt: baseTime + (i * 1000)
//   });
// }

// // Insertar en la colección 'command_ratings' (cambia el nombre si es necesario)
// db.getCollection('command_ratings').insertMany(reviews);

// // Mostrar el conteo final para confirmar
// print(`Se han insertado ${db.getCollection('command_ratings').countDocuments({ userId: userId })} registros para el usuario ${userId}`);
use('mbot');

// 25 frases con tono más humano y variado
const reviewsPool = [
  "El comando /start explica todo súper claro desde el inicio.",
  "Los comandos responden rápido, no hay lag en Telegram.",
  "Configurar el bot en mi grupo fue muy fácil con /setup.",
  "A veces /start tarda un poco, pero en general funciona bien.",
  "Perfecto para moderar grupos grandes sin complicarse.",
  "El comando /help podría tener ejemplos más claros.",
  "Me gusta que los comandos no sean invasivos en el chat.",
  "Falta integración con otros bots, pero cumple bien su función.",
  "El mejor bot que he usado para gestionar usuarios en Telegram.",
  "Debería tener más opciones de personalización en /settings.",
  "Las respuestas del bot se sienten naturales, no robóticas.",
  "Uso /stats todos los días, súper útil para ver actividad.",
  "El sistema de roles y permisos está muy bien logrado.",
  "Tuve un problema con /login pero lo solucioné rápido.",
  "Se nota que el bot está bien optimizado en el backend.",
  "El modo silencioso del bot en grupos es un gran plus.",
  "Funciona perfecto en móvil, cero problemas.",
  "Al inicio cuesta entender todos los comandos, pero luego fluye.",
  "Las respuestas automáticas ayudan mucho en soporte.",
  "No sabía que necesitaba este bot hasta que lo probé.",
  "Muy completo para administración de comunidades.",
  "El soporte del bot responde bastante rápido.",
  "A veces las notificaciones llegan con delay.",
  "La seguridad con verificación es un buen detalle.",
  "Hace exactamente lo que promete, sin complicaciones."
];

function generateRealisticDoc(index) {
  // Selección secuencial usando el índice del bucle
  const reviewText = reviewsPool[index % reviewsPool.length];
  const rating = randomInt(3, 5); // Calificaciones más realistas para reviews de calidad

  return {
    command: "start",
    userId: Math.floor(Math.random() * 900000000) + 100000000,
    badge: ["new_user", "power_user", "vip"][Math.floor(Math.random() * 3)],
    createdAt: Date.now() - Math.floor(Math.random() * 100000000),
    helpfulCount: Math.floor(Math.random() * 20),
    isEdited: Math.random() < 0.1,
    isFlagged: false,
    isSuspicious: false,
    isVerified: true,
    moderationScore: Number(Math.random().toFixed(3)),
    rating: rating,
    repliesCount: Math.floor(Math.random() * 3),
    review: reviewText,
    status: "approved",
    trustScoreSnapshot: Math.floor(Math.random() * (100 - 70 + 1)) + 70,
    updatedAt: Date.now()
  };
}

// Helpers mínimos (se mantienen los que ya tenías)
function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

async function insertRandomDocs() {
  try {
    const collection = db.getCollection("command_ratings");
    const docs = [];
    
    // Generamos 25 documentos (recorrerá el pool de 25 frases exactamente 1 vez)
    for (let i = 0; i < 25; i++) {
      docs.push(generateRealisticDoc(i));
    }

    await collection.insertMany(docs);
    console.log("✅ 25 reviews con frases originales insertadas secuencialmente");
  } catch (err) {
    console.error("❌ Error:", err);
  }
}

insertRandomDocs();