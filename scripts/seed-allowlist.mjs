// Autoriza un correo en la lista de acceso del EMULADOR (nunca en la nube): escribe
// `allowlist/<correo>` por la API REST del emulador de Firestore con el token `owner`, que salta
// las reglas (el cliente no puede escribir en la lista). La comparación de la app es literal y el
// proveedor entrega los correos en minúsculas: se escribe recortado y en minúsculas.
//
// Uso: npm run seed:allowlist -- correo@ejemplo.com   (con `npm run emulators` corriendo)

const EMULATOR = 'http://127.0.0.1:8080';
const DOCUMENTS = '/v1/projects/demo-cadence/databases/(default)/documents/allowlist/';

const email = process.argv[2]?.trim().toLowerCase();
if (!email) {
  console.error('Falta el correo. Uso: npm run seed:allowlist -- correo@ejemplo.com');
  process.exit(1);
}

let response;
try {
  response = await fetch(`${EMULATOR}${DOCUMENTS}${encodeURIComponent(email)}`, {
    method: 'PATCH',
    headers: { Authorization: 'Bearer owner', 'Content-Type': 'application/json' },
    body: JSON.stringify({ fields: { addedAt: { stringValue: new Date().toISOString() } } }),
  });
} catch (error) {
  console.error(
    `El emulador de Firestore no responde en ${EMULATOR}. Arráncalo con "npm run emulators".`,
    error.message,
  );
  process.exit(1);
}

if (!response.ok) {
  console.error(`El emulador rechazó la escritura (${response.status}):`, await response.text());
  process.exit(1);
}
console.log(`Autorizado en el emulador: ${email}`);
