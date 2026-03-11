# Cal(cul)ories

## Checklist avant chaque nouvelle conversation

A chaque nouveau chat, Claude repart de zéro. Pour qu'il retrouve le contexte :

1. **Donne-lui ce fichier** (`README.md`) — il saura où en est le projet
2. **Donne-lui le CHANGELOG** (`CHANGELOG.md`) — il saura ce qui a été fait et ce qu'il reste à faire
3. **Donne-lui le code actuel** (`src/App.jsx`) — seulement si tu veux modifier ou continuer le code
4. **Donne-lui la section du brief concernée** — pas tout le brief, juste le bloc sur lequel tu veux travailler (ex: la section "Bloc 4" de `docs/brief-complet.md`)
5. **Fais une demande claire et unique** — un seul sujet par conversation, c'est plus efficace

## Instructions pour Claude

Quand tu lis ce fichier, tu dois aider Simon (débutant en dev web) à suivre le bon process :

1. **Vérifie ce qu'il t'a donné.** S'il manque le CHANGELOG ou le code actuel et que tu en as besoin pour sa demande, demande-lui de te les fournir avant de commencer.
2. **Situe-toi.** Regarde la section "État actuel" ci-dessous pour savoir quels blocs sont faits ou non. Regarde le CHANGELOG pour connaître les dernières modifications et les TODO en cours.
3. **Confirme ta compréhension.** Résume en 1-2 phrases ce que tu comprends de sa demande et ce que tu vas faire, avant de coder. Laisse-le valider.
4. **Un bloc à la fois.** Ne code jamais plusieurs blocs dans une même session. Suis les priorités de développement en bas de ce fichier.
5. **Explique ce que tu fais.** Simon apprend en même temps. Ajoute des commentaires dans le code et explique brièvement les concepts clés (ex: qu'est-ce qu'un state, pourquoi on utilise useEffect, etc.).
6. **Mets à jour le projet.** À la fin de chaque session, propose à Simon de mettre à jour le CHANGELOG et l'état des blocs dans ce README.

## IMPORTANT — Cohérence du code

**`src/App.jsx` est LA source de vérité.** Depuis la session 7, il contient TOUT le code de l'app :
- Blocs 1-2-3 (profil, journal alimentaire, dashboard)
- Journal IA (saisie en langage naturel + vocal + API Claude)
- Objectifs journaliers avec tracker semaine
- Presets macros personnalisés
- Système multi-profils
- Toutes les fonctions utilitaires (normaliserNom, chercherAlimentDansBase, appelerClaudeAPI, semaine, etc.)

**Ne JAMAIS se baser sur `preview-bloc1-2-3.html`** — c'est une ancienne version qui n'a pas les presets ni les multi-profils. Le preview à jour est `preview-session7.html`.

## Quoi
Application React (single-page) de suivi nutritionnel quotidien pour alimentation végétalienne, avec expert IA intégré via l'API Claude (Anthropic).

## Stack
- React (JSX unique) + Tailwind CSS
- Recharts (graphiques)
- API Anthropic (`claude-sonnet-4-20250514`)
- Persistance : `window.storage` (clés hiérarchiques) / `localStorage` en preview

## État actuel
- [x] Bloc 1 — Profil utilisateur (Mifflin-St Jeor + TDEE) ✅
- [x] Bloc 2 — Journal alimentaire quotidien ✅
- [x] Bloc 3 — Dashboard visuel (barres + donut + tendance 7j + objectifs semaine) ✅
- [x] Bloc 4 — Journal IA (saisie naturelle + vocal + API Claude) ✅ (API non connectée en local, fonctionne via Vercel)
- [x] Bloc 5 — Paramètres : presets macros + multi-profils ✅
- [ ] Bloc 4b — Expert IA (micronutritionniste conversationnel)

## Fonctionnalités par onglet

### Dashboard
- 4 barres de progression circulaires SVG (Calories, Protéines, Glucides, Lipides)
- Donut chart de répartition des macros (Recharts)
- Graphique tendance 7 jours (Recharts LineChart)
- Résumé chiffré (calories restantes, macro le plus déficitaire)
- Objectifs journaliers avec tracker semaine (L→D, checkbox, reset auto le lundi)

### Journal
- Saisie en langage naturel (texte ou vocal via Web Speech API)
- Analyse par API Claude → JSON structuré (repas + aliments + macros)
- Correspondance locale des aliments (normaliserNom, chercherAlimentDansBase)
- Auto-ajout des nouveaux aliments dans customFoods
- Navigation multi-jours (← →) avec sauvegarde par date
- Suppression individuelle d'aliments

### Aliments
- Formulaire d'ajout manuel (nom + macros pour 100g)
- Liste de tous les aliments perso avec suppression
- Compteur d'aliments

### Profil
- Mes profils : sauvegarder/charger/supprimer des profils complets (données physiques + preset)
- Formulaire profil : poids, taille, âge, sexe, activité, objectif, régime
- Besoins estimés : MB, TDEE, objectif calorique
- Presets macros : 4 pré-définis + création de presets perso (G/P/L en %, validation 100%)
- Récap dashboard : résumé en temps réel de ce qui s'applique au dashboard

## Fichiers
- `docs/brief-complet.md` → Cahier des charges détaillé
- `docs/food-database.md` → Spécifications de la base d'aliments
- `docs/api-prompts.md` → Prompts système pour l'API Claude
- `src/App.jsx` → **Code principal complet** (tous les blocs, ~1950 lignes)
- `src/preview-session7.html` → **Preview à jour** (ouvrir dans un navigateur pour tester)
- `src/preview-bloc1-2-3.html` → Archive session 6 (NE PAS UTILISER comme base)
- `src/preview-bloc1-2.html` → Archive (ne pas utiliser)
- `src/preview-bloc1.html` → Archive (ne pas utiliser)
- `src/data/foods.json` → Base alimentaire (vide, tout est dans localStorage)
- `api/analyze.js` → Backend Vercel (relais API Claude avec clé secrète)

## Clés localStorage
- `profile` → données profil actif
- `journal:YYYY-MM-DD` → journal alimentaire par date
- `food-db-custom` → base d'aliments personnalisés
- `presets-custom` → presets macros créés par l'utilisateur
- `preset-actif-id` → ID du preset macros sélectionné
- `profils-sauvegardes` → liste des profils sauvegardés
- `profil-actif-id` → ID du profil chargé
- `objectifs-liste` → objectifs journaliers [{id, texte}]
- `objectifs-semaine:YYYY-MM-DD` → résultats cochés par semaine (clé = lundi)

## Contraintes
- Fichier JSX unique (pas de build complexe)
- Mobile-first (360px → 1440px)
- Régime par défaut : végétalien
- Ton par défaut : bienveillant, zéro culpabilisation

## TODO prochaines sessions
1. Connecter l'API Claude pour le Journal en local (clé API ou proxy local)
2. Édition/correction des entrées du journal
3. Bloc 4b — Expert IA conversationnel (micronutritionniste)
4. Améliorations UX : animations, transitions, onboarding
