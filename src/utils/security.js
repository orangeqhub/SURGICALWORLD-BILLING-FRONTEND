/**
 * Lightweight string hash used only to avoid persisting raw passwords in the
 * local mock user table. This is NOT cryptographically secure - a real
 * backend must perform proper password hashing (bcrypt/argon2) server-side.
 * It exists purely so the offline mock layer never stores plaintext.
 */
export function hashPassword(value) {
  const input = String(value || '');
  let hash = 5381;
  for (let i = 0; i < input.length; i += 1) {
    hash = (hash * 33) ^ input.charCodeAt(i);
  }
  return `h${(hash >>> 0).toString(16)}`;
}

export function verifyPassword(value, hash) {
  return hashPassword(value) === hash;
}

export default { hashPassword, verifyPassword };
