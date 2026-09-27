# Misterdil

Plateforme pour créer, discuter, valider et signer des ententes professionnelles.

## Démarrage

```bash
npm install
npm run setup
npm run dev
```

Ouvrir http://localhost:3000

Comptes de démonstration, mot de passe `Misterdil2026` :

- jean.dupont@horizon.ca — modérateur
- marie.lefebvre@novasoft.ca — prestataire
- paul.martin@atelierconseil.ca — consultant

## Intelligence artificielle

Sans `OPENAI_API_KEY`, Misterdil AI s'appuie sur le contexte du document. Avec une clé, les appels partent du serveur vers l'API OpenAI. La clé n'est jamais envoyée au navigateur.

## Base de données

Le développement utilise SQLite pour que l'application démarre sans installation. Le schéma Prisma est prévu pour passer à PostgreSQL : changer le provider et `DATABASE_URL`.
