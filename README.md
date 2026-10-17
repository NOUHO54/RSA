# TP Cryptographie - Chiffrement Hybride RSA + AES

Application web permettant de chiffrer un fichier avec un schema
hybride (AES-256-GCM + RSA-OAEP 2048) et de le dechiffrer cote
destinataire, sans jamais transmettre la cle privee.

## Contexte

RSA ne peut chiffrer que des blocs de taille limitee (environ 190 octets
avec une cle 2048 bits et le padding OAEP-SHA256). Pour chiffrer des
fichiers de taille arbitraire, on utilise un schema hybride :

1. Une cle de session AES-256 est generee aleatoirement.
2. Le fichier est chiffre avec AES-256-GCM (rapide, authentifie).
3. La cle AES est chiffree avec la cle publique RSA du destinataire.
4. Le destinataire dechiffre la cle AES avec sa cle privee RSA,
   puis dechiffre le fichier avec cette cle AES.

Ce schema est celui utilise par TLS, PGP et S/MIME.

## Architecture

    RSA/
      index.html          Structure de la page
      css/style.css       Feuille de style unique
      js/storage.js       Persistance IndexedDB (cle privee)
      js/crypto.js        Primitives cryptographiques
      js/ui.js            Manipulation du DOM
      js/main.js          Coordination / point d entree
      README.md

## Securite

- Cle privee non-extractible : generee avec extractable: false.
- Stockage local uniquement (IndexedDB), jamais transmise.
- AES-GCM authentifie : detection de toute modification.
- IV aleatoire par fichier (12 octets).
- RSA-OAEP avec SHA-256.

## Format du fichier .enc

    [1 octet]  longueur IV
    [12 octets] IV (AES-GCM)
    [4 octets] taille cle AES chiffree (uint32 big-endian)
    [256 octets] cle AES chiffree RSA-OAEP
    [reste]    contenu chiffre AES-GCM (inclut tag 16 octets)

## Lancement

Ouvrir un terminal dans le dossier RSA/ puis :

    python -m http.server 8000

Puis ouvrir http://localhost:8000 dans le navigateur.

## Procedure de test

1. Chaque personne genere sa paire de cles.
2. Chacun copie sa cle publique et l envoie a son binome.
3. Pour chiffrer : coller la cle publique du binome, choisir un
   fichier, cliquer sur Chiffrer et telecharger.
4. Transmettre le fichier .enc.
5. Pour dechiffrer : selectionner le .enc recu et cliquer sur
   Dechiffrer et telecharger.