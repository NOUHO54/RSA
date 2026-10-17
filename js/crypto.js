/**
 * crypto.js
 * Primitives cryptographiques : génération RSA, chiffrement hybride.
 */

const RSA_ALGORITHM = {
  name: 'RSA-OAEP',
  modulusLength: 2048,
  publicExponent: new Uint8Array([1, 0, 1]),
  hash: 'SHA-256',
};

const AES_ALGORITHM = { name: 'AES-GCM', length: 256 };
const IV_LENGTH = 12;

/* ---------- Conversions ---------- */

function arrayBufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function base64ToArrayBuffer(b64) {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

function base64UrlToBigInt(b64url) {
  const b64 = b64url.replace(/-/g, '+').replace(/_/g, '/');
  const binary = atob(b64);
  let hex = '';
  for (let i = 0; i < binary.length; i++) {
    hex += binary.charCodeAt(i).toString(16).padStart(2, '0');
  }
  return BigInt('0x' + hex).toString(10);
}

function bigIntToBase64Url(decString) {
  let hex = BigInt(decString).toString(16);
  if (hex.length % 2 !== 0) hex = '0' + hex;
  let binary = '';
  for (let i = 0; i < hex.length; i += 2) {
    binary += String.fromCharCode(parseInt(hex.substr(i, 2), 16));
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/* ---------- Génération de clés ---------- */

export async function generateKeyPair() {
  // On passe extractable à TRUE pour pouvoir lire n, e et d
  return crypto.subtle.generateKey(
    RSA_ALGORITHM,
    true, 
    ['encrypt', 'decrypt']
  );
}

// Extrait n et e de la clé publique
export async function exportPublicKeyMath(publicKey) {
  const jwk = await crypto.subtle.exportKey('jwk', publicKey);
  return {
    n: base64UrlToBigInt(jwk.n),
    e: base64UrlToBigInt(jwk.e)
  };
}

// Extrait n et d de la clé privée
export async function exportPrivateKeyMath(privateKey) {
  const jwk = await crypto.subtle.exportKey('jwk', privateKey);
  return {
    n: base64UrlToBigInt(jwk.n),
    d: base64UrlToBigInt(jwk.d)
  };
}

// Reconstruit une clé publique à partir de n et e (pour chiffrer)
export async function importPublicKeyMath(nStr, eStr) {
  const jwk = {
    kty: 'RSA',
    alg: 'RSA-OAEP-256',
    ext: true,
    key_ops: ['encrypt'],
    n: bigIntToBase64Url(nStr),
    e: bigIntToBase64Url(eStr)
  };
  return crypto.subtle.importKey(
    'jwk',
    jwk,
    { name: 'RSA-OAEP', hash: 'SHA-256' },
    true,
    ['encrypt']
  );
}

/* ---------- Chiffrement hybride ---------- */

export async function encryptFile(file, recipientPublicKey) {
  const aesKey = await crypto.subtle.generateKey(AES_ALGORITHM, true, ['encrypt', 'decrypt']);
  const fileData = await file.arrayBuffer();
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));

  const encryptedContent = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, aesKey, fileData);
  const rawAesKey = await crypto.subtle.exportKey('raw', aesKey);
  const encryptedAesKey = await crypto.subtle.encrypt({ name: 'RSA-OAEP' }, recipientPublicKey, rawAesKey);

  const encAesKeyBytes = new Uint8Array(encryptedAesKey);
  const encContentBytes = new Uint8Array(encryptedContent);

  const totalLength = 1 + IV_LENGTH + 4 + encAesKeyBytes.length + encContentBytes.length;
  const out = new Uint8Array(totalLength);
  const view = new DataView(out.buffer);

  let offset = 0;
  out[offset++] = IV_LENGTH;
  out.set(iv, offset); offset += IV_LENGTH;
  view.setUint32(offset, encAesKeyBytes.length, false); offset += 4;
  out.set(encAesKeyBytes, offset); offset += encAesKeyBytes.length;
  out.set(encContentBytes, offset);

  return new Blob([out], { type: 'application/octet-stream' });
}

export async function decryptFile(encryptedBlob, privateKey) {
  const buf = new Uint8Array(await encryptedBlob.arrayBuffer());
  const view = new DataView(buf.buffer);
  let offset = 0;

  const ivLength = buf[offset++];
  if (ivLength !== IV_LENGTH) throw new Error('Fichier .enc invalide : IV corrompu.');
  const iv = buf.slice(offset, offset + ivLength); offset += ivLength;

  const aesKeyLength = view.getUint32(offset, false); offset += 4;
  const encryptedAesKey = buf.slice(offset, offset + aesKeyLength); offset += aesKeyLength;
  const encryptedContent = buf.slice(offset);

  const rawAesKey = await crypto.subtle.decrypt({ name: 'RSA-OAEP' }, privateKey, encryptedAesKey);
  const aesKey = await crypto.subtle.importKey('raw', rawAesKey, AES_ALGORITHM, false, ['decrypt']);
  const decryptedContent = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, aesKey, encryptedContent);

  return new Blob([decryptedContent]);
}