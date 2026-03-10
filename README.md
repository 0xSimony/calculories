# Macro Tracker Végétal

## Checklist avant chaque nouvelle conversation

À chaque nouveau chat, Claude repart de zéro. Pour qu'il retrouve le contexte :

1. **Donne-lui ce fichier** (`README.md`) — il saura où en est le projet
2. **Donne-lui le CHANGELOG** (`CHANGELOG.md`) — il saura ce qui a été fait et ce qu'il reste à faire
3. **Donne-lui le code actuel** (`src/App.jsx`) — seulement si tu veux modifier ou continuer le code
4. **Donne-lui la section du brief concernée** — pas tout le brief, juste le bloc sur lequel tu veux travailler (ex: la section "Bloc 3" de `docs/brief-complet.md`)
5. **Fais une demande claire et unique** — un seul sujet par conversation, c'est plus efficace

## Instructions pour Claude

Quand tu lis ce fichier, tu dois aider Simon (débutant en dev web) à suivre le bon process :

1. **Vérifie ce qu'il t'a donné.** S'il manque le CHANGELOG ou le code actuel et que tu en as besoin pour sa demande, demande-lui de te les fournir avant de commencer.
2. **Situe-toi.** Regarde la section "État actuel" ci-dessous pour savoir quels blocs sont faits ou non. Regarde le CHANGELOG pour connaître les dernières modifications et les TODO en cours.
3. **Confirme ta compréhension.** Résume en 1-2 phrases ce que tu comprends de sa demande et ce que tu vas faire, avant de coder. Laisse-le valider.
4. **Un bloc à la fois.** Ne code jamais plusieurs blocs dans une même session. Suis les priorités de développement en bas de ce fichier.
5. **Explique ce que tu fais.** Simon apprend en même temps. Ajoute des commentaires dans le code et explique brièvement les concepts clés (ex: qu'est-ce qu'un state, pourquoi on utilise useEffect, etc.).
6. **Mets à jour le projet.** À la fin de chaque session, propose à Simon de mettre à jour le CHANGELOG et l'état des blocs dans ce README.

## Quoi
Application React (single-page) de suivi nutritionnel quotidien pour alimentation végétalienne, avec expert IA intégré via l'API Claude (Anthropic).

## Stack
- React (JSX unique) + Tailwind CSS
- Recharts (graphiques)
- API Anthropic (`claude-sonnet-4-20250514`)
- Persistance : `window.storage` (clés hiérarchiques)

## État actuel
- [x] Bloc 1 — Profil utilisateur (Mifflin-St Jeor + TDEE) ✅
- [x] Bloc 2 — Journal alimentaire quotidien ✅
- [x] Bloc 3 — Dashboard visuel (barres + donut + tendance 7j) ✅
- [ ] Bloc 4 — Expert IA (micronutritionniste)
- [ ] Bloc 5 — Paramètres avancés + presets

## Fichiers
- `docs/brief-complet.md` → Cahier des charges détaillé (5 blocs)
- `docs/food-database.md` → Spécifications de la base d'aliments
- `docs/api-prompts.md` → Prompts système pour l'API Claude
- `src/App.jsx` → Code principal (Bloc 1 + 2 + 3 terminés)
- `src/preview-bloc1-2-3.html` → Preview Bloc 1+2+3 (ouvrir dans un navigateur)
- `src/preview-bloc1-2.html` → Preview Bloc 1+2 (archive)
- `src/preview-bloc1.html` → Preview du Bloc 1 seul (archive)
- `src/data/foods.json` → Base alimentaire (ajoutée manuellement au fil du temps)

## Contraintes
- Fichier JSX unique (pas de build complexe)
- Mobile-first (360px → 1440px)
- Régime par défaut : végétalien
- Ton par défaut : bienveillant, zéro culpabilisation

## Priorités de développement
1. **MVP** : Bloc 1 (profil) + Bloc 2 (journal) + calculs macros
2. **V1** : + Bloc 3 (dashboard) + persistance
3. **V2** : + Bloc 4 (expert IA) + Bloc 5 (paramètres)
4. **V3** : + presets, objectif temporel, graphique 7j, suggestions cliquables
