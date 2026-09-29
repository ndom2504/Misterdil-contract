# Misterdil — application mobile (Android et iOS)

Application Expo (SDK 57, expo-router) qui parle à la plateforme web via les routes `/api/mobile/*`, authentifiées par un jeton `Authorization: Bearer`.

## Fonctionnalités

- Connexion et inscription par courriel, ou avec Microsoft (PKCE, retour via `misterdil://auth`).
- Liste des ententes, lecture, progression, participants et activité.
- Édition des sections avec synchronisation en direct (toutes les 3,5 s), bulles de présence, indication « X modifie cette section » et détection des conflits.
- Création d'une entente (équipe, type, envoi aux membres) et partage des liens d'invitation.
- Acceptation d'une invitation par lien profond `misterdil://invitation/<jeton>`.
- Notifications dans l'app et notifications push (Expo Push).

## Démarrer

```bash
cd mobile
npm install
npx expo start
```

Par défaut, l'app utilise le serveur de production (`extra.apiUrl` dans `app.json`). Pour pointer vers le serveur de dev local, utilisez l'adresse IP de votre ordinateur sur le réseau (pas `localhost`, qui désigne le téléphone) :

```bash
# PowerShell
$env:EXPO_PUBLIC_API_URL="http://192.168.x.x:3000"; npx expo start
```

## Ce qui demande un build de développement

Expo Go suffit pour la connexion par courriel, les ententes, l'édition et la synchronisation. Il faut en revanche un build de développement (`npx expo run:android`, `npx expo run:ios` ou `eas build --profile development`) pour :

- **Les notifications push** : il faut un projet EAS (`eas init`, qui ajoute `extra.eas.projectId`) et un vrai appareil. Côté serveur, `EXPO_ACCESS_TOKEN` est optionnel.
- **Microsoft en production** : le serveur n'accepte que les retours vers `misterdil://`. Les adresses `exp://` d'Expo Go ne sont acceptées que si le serveur ne tourne pas en production.

## Publier

```bash
npm install -g eas-cli
eas login
eas init
eas build --platform all
eas submit --platform all
```

Identifiants d'application : `ca.misterdil.app` (iOS et Android).
