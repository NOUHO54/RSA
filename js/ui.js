/**
 * ui.js
 */

export const ui = {
  badgeKeys: document.getElementById('badge-keys'),
  badgeKeysText: document.getElementById('badge-keys-text'),
  btnGenerateKeys: document.getElementById('btn-generate-keys'),
  btnResetKeys: document.getElementById('btn-reset-keys'),
  keysBody: document.getElementById('keys-body'),
  btnCopyPublic: document.getElementById('btn-copy-public'),
  btnCopyPrivate: document.getElementById('btn-copy-private'),
  statusKeys: document.getElementById('status-keys'),

  // Nouveaux champs mathématiques
  txtN: document.getElementById('txt-n'),
  txtE: document.getElementById('txt-e'),
  txtD: document.getElementById('txt-d'),

  txtRecipientKey: document.getElementById('txt-recipient-key'),
  dropzoneEncrypt: document.getElementById('dropzone-encrypt'),
  inputFileEncrypt: document.getElementById('input-file-encrypt'),
  fileEncryptMeta: document.getElementById('file-encrypt-meta'),
  btnEncrypt: document.getElementById('btn-encrypt'),
  progressEncrypt: document.getElementById('progress-encrypt'),
  statusEncrypt: document.getElementById('status-encrypt'),

  dropzoneDecrypt: document.getElementById('dropzone-decrypt'),
  inputFileDecrypt: document.getElementById('input-file-decrypt'),
  fileDecryptMeta: document.getElementById('file-decrypt-meta'),
  btnDecrypt: document.getElementById('btn-decrypt'),
  progressDecrypt: document.getElementById('progress-decrypt'),
  statusDecrypt: document.getElementById('status-decrypt'),
};

export function setStatus(element, message, type = 'info') {
  element.textContent = message;
  element.className = `status ${type}`;
  element.hidden = false;
}

export function clearStatus(element) {
  element.hidden = true;
  element.textContent = '';
}

export function setKeysInitialized(pubMath, privMath) {
  ui.badgeKeysText.textContent = 'Initialisée';
  ui.badgeKeys.classList.add('active');
  ui.keysBody.hidden = false;
  
  // Remplissage des champs
  ui.txtN.value = pubMath.n;
  ui.txtE.value = pubMath.e;
  ui.txtD.value = privMath.d;
  
  ui.btnGenerateKeys.hidden = true;
}

export function setKeysNotInitialized() {
  ui.badgeKeysText.textContent = 'Non initialisée';
  ui.badgeKeys.classList.remove('active');
  ui.keysBody.hidden = true;
  ui.txtN.value = '';
  ui.txtE.value = '';
  ui.txtD.value = '';
  ui.btnGenerateKeys.hidden = false;
  clearStatus(ui.statusKeys);
}

export function updateFileInfo(dropzone, infoElement, file) {
  if (!file) {
    dropzone.classList.remove('has-file');
    if (infoElement) infoElement.textContent = '';
    return;
  }
  dropzone.classList.add('has-file');
  const size = file.size < 1024
    ? `${file.size} o`
    : file.size < 1024 * 1024
      ? `${(file.size / 1024).toFixed(1)} Ko`
      : `${(file.size / 1024 / 1024).toFixed(2)} Mo`;
  const span = dropzone.querySelector('.dropzone-text');
  if (span) span.textContent = file.name;
  if (infoElement) infoElement.textContent = size;
}

export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}