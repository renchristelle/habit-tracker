# Éclosion

Suivi d'habitudes personnel, pensé pour l'iPhone (PWA à installer sur l'écran d'accueil), dans l'univers aquarelle de Mudan.

- **Aujourd'hui** : saisie du jour et de la veille ; chaque habitude est une fleur (à arroser, arrosée, fanée, déshydratée, au repos).
- **Jardin** : un jardin qui pousse au fil du mois (1 arrosage = 1 pétale, 5 pétales = fleur éclose), calendrier en pétales par habitude, zones de sport.
- **Saison** : cycle de 66 jours (enracinement à 80 % → mode entretien), identités, repos planifiés, jours d'application, export CSV.

Stack : React + Vite + TypeScript, Supabase (Postgres + Auth), vite-plugin-pwa. Logique métier dans `src/lib/domain.ts` (testée : `npm test`).

## Mise en route (une seule fois)

### 1. Base de données Supabase
1. Ouvrir le projet Supabase → **SQL Editor** → **New query**.
2. Coller le contenu de [`supabase/schema.sql`](supabase/schema.sql) → **Run**.
3. **Authentication → Sign In / Providers → Email** : désactiver **Confirm email** (plus simple pour un usage perso).

### 2. Hébergement Vercel
1. Créer un compte sur [vercel.com](https://vercel.com) avec GitHub.
2. **Add New → Project** → importer `renchristelle/habit-tracker` (framework détecté : Vite).
3. Dans **Environment Variables**, ajouter :
   - `VITE_SUPABASE_URL` = `https://azydbqvjbfbnrwbhiwer.supabase.co`
   - `VITE_SUPABASE_PUBLISHABLE_KEY` = la clé *publishable* (jamais la `service_role`)
4. **Deploy**. Chaque push sur `main` redéploie automatiquement.

### 3. Sur l'iPhone
1. Ouvrir l'URL Vercel dans **Safari** → **Créer un compte**.
2. Bouton **Partager** → **Sur l'écran d'accueil**.
3. Une fois ton compte créé : Supabase → **Authentication → Sign In / Providers** → désactiver **Allow new users to sign up**, pour que personne d'autre ne puisse s'inscrire.

## Développement local

```bash
cp .env.example .env.local   # puis renseigner la clé
npm install
npm run dev
npm test
```
