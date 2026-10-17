/**
 * main.js
 */

import {
  generateKeyPair,
  exportPublicKeyMath,
  exportPrivateKeyMath,
  importPublicKeyMath,
  encryptFile,
  decryptFile,
} from './crypto.js';

import {
  savePrivateKey,
  loadPrivateKey,
  clearPrivateKey,
} from './storage.js';

import {
  ui,
  setStatus,
  clearStatus,
  setKeysInitialized,
  setKeysNotInitialized,
  updateFileInfo,
  downloadBlob,
} from './ui.js';

const STORE_N = 'tp-crypto-n';
const STORE_D = 'tp-crypto-d';
const STORE_E = 'tp-crypto-e';

function bindDropzone(dropzone, input, infoElement) {
  if (!dropzone || !input) return;
  dropzone.addEventListener('dragover', (e) => { e.preventDefault(); dropzone.classList.add('dragover'); });
  dropzone.addEventListener('dragleave', (e) => { e.preventDefault(); dropzone.classList.remove('dragover'); });
  dropzone.addEventListener('drop', (e) => {
    e.preventDefault(); dropzone.classList.remove('dragover');
    const files = e.dataTransfer?.files;
    if (files && files.length > 0) {
      const dt = new DataTransfer(); dt.items.add(files[0]);
      input.files = dt.files;
      updateFileInfo(dropzone, infoElement, files[0]);
    }
  });
  input.addEventListener('change', () => {
    updateFileInfo(dropzone, infoElement, input.files[0] || null);
  });
}

async function init() {
  try {
    const privateKey = await loadPrivateKey();
    if (privateKey) {
      const n = localStorage.getItem(STORE_N);
      const e = localStorage.getItem(STORE_E);
      const d = localStorage.getItem(STORE_D);
      if (n && e && d) {
        setKeysInitialized({ n, e }, { n, d });
      }
    }
  } catch (error) {
    console.error(error);
  }
  bindDropzone(ui.dropzoneEncrypt, ui.inputFileEncrypt, ui.fileEncryptMeta);
  bindDropzone(ui.dropzoneDecrypt, ui.inputFileDecrypt, ui.fileDecryptMeta);
}

async function handleGenerateKeys() {
  try {
    clearStatus(ui.statusKeys);
    setStatus(ui.statusKeys, 'Génération RSA-2048 en cours…', 'info');
    ui.btnGenerateKeys.disabled = true;

    const keyPair = await generateKeyPair();
    const pubMath = await exportPublicKeyMath(keyPair.publicKey);
    const privMath = await exportPrivateKeyMath(keyPair.privateKey);

    await savePrivateKey(keyPair.privateKey);
    
    // Sauvegarde locale des composants
    localStorage.setItem(STORE_N, pubMath.n);
    localStorage.setItem(STORE_E, pubMath.e);
    localStorage.setItem(STORE_D, privMath.d);

    setKeysInitialized(pubMath, privMath);
    setStatus(ui.statusKeys, 'Paire générée et stockée localement.', 'success');
  } catch (error) {
    setStatus(ui.statusKeys, `Erreur : ${error.message}`, 'error');
  } finally {
    ui.btnGenerateKeys.disabled = false;
  }
}

async function handleResetKeys() {
  if (!window.confirm('Supprimer définitivement votre clé privée ?')) return;
  await clearPrivateKey();
  localStorage.removeItem(STORE_N);
  localStorage.removeItem(STORE_E);
  localStorage.removeItem(STORE_D);
  setKeysNotInitialized();
}

async function handleCopyPublicKey() {
  try {
    const n = ui.txtN.value;
    const e = ui.txtE.value;
    const text = `n = ${n}\ne = ${e}`;
    await navigator.clipboard.writeText(text);
    setStatus(ui.statusKeys, 'Clé publique (n, e) copiée.', 'success');
  } catch {
    setStatus(ui.statusKeys, 'Copie impossible.', 'error');
  }
}

async function handleCopyPrivateKey() {
  try {
    const n = ui.txtN.value;
    const d = ui.txtD.value;
    const text = `n = ${n}\nd = ${d}`;
    await navigator.clipboard.writeText(text);
    setStatus(ui.statusKeys, 'Clé privée (n, d) copiée.', 'success');
  } catch {
    setStatus(ui.statusKeys, 'Copie impossible.', 'error');
  }
}

async function handleEncrypt() {
  try {
    clearStatus(ui.statusEncrypt);
    const recipientText = ui.txtRecipientKey.value.trim();
    const file = ui.inputFileEncrypt.files[0];

    if (!recipientText) return setStatus(ui.statusEncrypt, 'Clé publique du destinataire manquante.', 'error');
    if (!file) return setStatus(ui.statusEncrypt, 'Aucun fichier sélectionné.', 'error');

    // Parser les valeurs n et e depuis le texte collé (ex: "n = 12345\ne = 65537")
    let nStr, eStr;
    const lines = recipientText.split('\n');
    for (const line of lines) {
      if (line.startsWith('n =')) nStr = line.replace('n =', '').trim();
      if (line.startsWith('e =')) eStr = line.replace('e =', '').trim();
    }
    // Si le format n'est pas respecté, on essaie de lire les deux premières lignes
    if (!nStr || !eStr) {
      const parts = recipientText.split('\n').map(s => s.trim()).filter(Boolean);
      if (parts.length >= 2) {
        nStr = parts[0].replace(/\D/g, ''); // garde seulement les chiffres
        eStr = parts[1].replace(/\D/g, '');
      }
    }

    if (!nStr || !eStr) throw new Error('Format de clé invalide. Attendu : "n = ..." et "e = ..."');

    setStatus(ui.statusEncrypt, 'Chiffrement en cours…', 'info');
    ui.btnEncrypt.disabled = true;
    ui.progressEncrypt.hidden = false;

    const recipientKey = await importPublicKeyMath(nStr, eStr);
    const encryptedBlob = await encryptFile(file, recipientKey);
    const outputName = `${file.name}.enc`;
    downloadBlob(encryptedBlob, outputName);

    setStatus(ui.statusEncrypt, `Téléchargé : ${outputName}`, 'success');
  } catch (error) {
    setStatus(ui.statusEncrypt, `Erreur : ${error.message}`, 'error');
  } finally {
    ui.btnEncrypt.disabled = false;
    ui.progressEncrypt.hidden = true;
  }
}

async function handleDecrypt() {
  try {
    clearStatus(ui.statusDecrypt);
    const file = ui.inputFileDecrypt.files[0];
    if (!file) return setStatus(ui.statusDecrypt, 'Aucun fichier sélectionné.', 'error');

    const privateKey = await loadPrivateKey();
    if (!privateKey) return setStatus(ui.statusDecrypt, 'Aucune clé privée dans ce navigateur.', 'error');

    setStatus(ui.statusDecrypt, 'Déchiffrement en cours…', 'info');
    ui.btnDecrypt.disabled = true;
    ui.progressDecrypt.hidden = false;

    const decryptedBlob = await decryptFile(file, privateKey);
    const outputName = file.name.replace(/\.enc$/, '');
    downloadBlob(decryptedBlob, outputName);

    setStatus(ui.statusDecrypt, `Téléchargé : ${outputName}`, 'success');
  } catch (error) {
    setStatus(ui.statusDecrypt, `Erreur : ${error.message}`, 'error');
  } finally {
    ui.btnDecrypt.disabled = false;
    ui.progressDecrypt.hidden = true;
  }
}

/* Écouteurs */
ui.btnGenerateKeys.addEventListener('click', handleGenerateKeys);
ui.btnResetKeys.addEventListener('click', handleResetKeys);
ui.btnCopyPublic.addEventListener('click', handleCopyPublicKey);
if (ui.btnCopyPrivate) ui.btnCopyPrivate.addEventListener('click', handleCopyPrivateKey);
ui.btnEncrypt.addEventListener('click', handleEncrypt);
ui.btnDecrypt.addEventListener('click', handleDecrypt);

init();