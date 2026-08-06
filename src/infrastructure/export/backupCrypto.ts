import { createCipheriv, createDecipheriv, pbkdf2Sync, randomBytes } from 'crypto';

/**
 * Cifrado del respaldo: AES-256-GCM (autenticado — una contraseña incorrecta
 * o un archivo alterado fallan al descifrar en vez de devolver basura
 * silenciosamente) con clave derivada por PBKDF2-SHA256 (210k iteraciones,
 * recomendación OWASP 2023 para SHA256) a partir de la contraseña del
 * usuario + una sal aleatoria por archivo. Todo corre en el runtime Node del
 * Server Action — la contraseña nunca se persiste, solo se usa en memoria
 * para derivar la clave.
 */
const PBKDF2_ITERATIONS = 210_000;
const KEY_LENGTH = 32;

interface EncryptedEnvelope {
  version: 1;
  salt: string;
  iv: string;
  authTag: string;
  ciphertext: string;
}

function deriveKey(passphrase: string, salt: Buffer): Buffer {
  return pbkdf2Sync(passphrase, salt, PBKDF2_ITERATIONS, KEY_LENGTH, 'sha256');
}

export function encryptJson(data: unknown, passphrase: string): string {
  const salt = randomBytes(16);
  const iv = randomBytes(12);
  const key = deriveKey(passphrase, salt);

  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const plaintext = Buffer.from(JSON.stringify(data), 'utf-8');
  const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const authTag = cipher.getAuthTag();

  const envelope: EncryptedEnvelope = {
    version: 1,
    salt: salt.toString('base64'),
    iv: iv.toString('base64'),
    authTag: authTag.toString('base64'),
    ciphertext: ciphertext.toString('base64'),
  };
  return JSON.stringify(envelope);
}

export function decryptJson<T>(fileContent: string, passphrase: string): T {
  let envelope: Partial<EncryptedEnvelope>;
  try {
    envelope = JSON.parse(fileContent) as Partial<EncryptedEnvelope>;
  } catch {
    throw new Error('El archivo no es un respaldo válido.');
  }

  if (envelope.version !== 1 || !envelope.salt || !envelope.iv || !envelope.authTag || !envelope.ciphertext) {
    throw new Error('El archivo no es un respaldo válido.');
  }

  const salt = Buffer.from(envelope.salt, 'base64');
  const iv = Buffer.from(envelope.iv, 'base64');
  const authTag = Buffer.from(envelope.authTag, 'base64');
  const ciphertext = Buffer.from(envelope.ciphertext, 'base64');
  const key = deriveKey(passphrase, salt);

  const decipher = createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(authTag);

  try {
    const plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
    return JSON.parse(plaintext.toString('utf-8')) as T;
  } catch {
    throw new Error('Contraseña incorrecta o archivo dañado.');
  }
}
