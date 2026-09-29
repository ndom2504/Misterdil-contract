# Misterdil

Plateforme pour créer, discuter, valider et signer des ententes professionnelles.

## Démarrage

Copier `.env.example` vers `.env` et renseigner `DATABASE_URL` et `DATABASE_URL_UNPOOLED` (PostgreSQL), puis :

```bash
npm install
npm run setup
npm run dev
```

Ouvrir http://localhost:3000

`npm run setup` crée une base vide avec le catalogue. Pour charger aussi la démonstration (`npm run db:seed`), les comptes sont, avec le mot de passe `Misterdil2026` :

- jean.dupont@horizon.ca — modérateur
- marie.lefebvre@novasoft.ca — prestataire
- paul.martin@atelierconseil.ca — consultant

## Intelligence artificielle

Sans `OPENAI_API_KEY`, Misterdil AI s'appuie sur le contexte du document. Avec une clé, les appels partent du serveur vers l'API OpenAI. La clé n'est jamais envoyée au navigateur.

## Base de données

PostgreSQL, hébergé sur Neon et relié à Vercel.

- `DATABASE_URL` : connexion mutualisée (pooler), utilisée par l'application.
- `DATABASE_URL_UNPOOLED` : connexion directe, utilisée par Prisma Migrate.

Les migrations sont dans `prisma/migrations`. Sur Vercel, `npm run vercel-build` applique les migrations en attente, puis synchronise le catalogue (rôles, types de documents, formulaires) avant chaque build. Le catalogue ne touche ni aux comptes ni aux documents.

- Modifier le schéma : `npm run db:migrate -- --name description`
- Appliquer les migrations et le catalogue : `npm run db:deploy`
- Données de démonstration : `npm run db:seed` (efface la base ; refuse si des comptes réels existent, sauf avec `SEED_FORCE=1`)
