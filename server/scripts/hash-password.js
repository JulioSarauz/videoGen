// Utilidad de un solo uso: genera el hash bcrypt para AUTH_PASSWORD_HASH.
// Uso: node server/scripts/hash-password.js "mi-password-compartida"
import bcrypt from "bcryptjs";

const password = process.argv[2];
if (!password) {
  console.error('Uso: node server/scripts/hash-password.js "tu-password"');
  process.exit(1);
}

const hash = bcrypt.hashSync(password, 12);
console.log(hash);
