# Changelog

## Session 7 — 11 mars 2026
- **Presets macros personnalisés** : 4 presets pré-définis (Équilibré, Sèche, Prise de masse, Keto) + possibilité de créer ses propres presets avec répartition G/P/L personnalisée
- **Système multi-profils** : sauvegarder plusieurs profils (ex: "Sèche été 2026") avec leurs réglages physiques + preset actif. Charger/switcher/supprimer en un clic
- **Dashboard dynamique** : les objectifs macros du dashboard s'adaptent automatiquement au preset sélectionné (remplace l'ancien `MACROS_DEFAUT` statique par `presetActif.macros`)
- **Récap dashboard** : encadré en bas de la page Profil montrant en temps réel les calories cibles, le preset actif et les objectifs macros en grammes
- **Consolidation de App.jsx** : réintégré dans le fichier unique tous les composants qui étaient uniquement dans le preview (JournalSaisie, ObjectifsJournaliers, appelerClaudeAPI, normaliserNom, chercherAlimentDansBase, fonctions semaine)
- **Renommage** : l'app s'appelle désormais **Cal(cul)ories** partout (header, footer, commentaires)
- Créé `preview-session7.html` pour tester tout le code
- Persistance localStorage : clés `presets-custom`, `preset-actif-id`, `profils-sauvegardes`, `profil-actif-id`, `objectifs-liste`, `objectifs-semaine:YYYY-MM-DD`
- Nouveaux concepts : spread operator sur tableaux (`[...PRESETS_DEFAUT, ...presetsCustom]`), `Array.find()` avec fallback (`|| tousLesPresets[0]`), validation formulaire en temps réel (total 100%)
- **IMPORTANT pour la prochaine session** : `App.jsx` contient désormais TOUT le code (Journal IA + Objectifs + Presets + Multi-profils). Ne plus se baser sur `preview-bloc1-2-3.html` qui est une ancienne version.
- TODO : connecter l'API Claude pour le Journal (actuellement "Failed to fetch" en local — fonctionne via Vercel), gérer l'édition/correction des entrées du journal

## Session 6 — 10 mars 2026
- **Nouveau bloc "Journal"** : saisie des repas en langage naturel
- Zone de texte avec placeholder explicatif et raccourci Entrée pour envoyer
- **Saisie vocale** via Web Speech API (bouton micro, transcription en temps réel)
- **Intégration API Claude** : parse le texte naturel en JSON structuré (repas + aliments + macros)
- Prompt système optimisé : force JSON strict, réutilise les noms d'aliments connus, estime les quantités
- **Auto-ajout** des nouveaux aliments dans customFoods (évite les doublons par nom)
- Affichage structuré des repas du jour avec totaux par repas
- Suppression individuelle d'aliments dans le journal
- Navigation à 4 onglets : Dashboard, **Journal**, Aliments, Profil
- États UX : loading spinner, messages d'erreur détaillés, confirmation temporaire (4s)
- Header du Journal avec résumé calories/macros du jour
- Nouveaux concepts : `async/await`, `fetch()`, Web Speech API, `SpeechRecognition`, `animate-pulse`, `animate-spin`, CORS avec header `anthropic-dangerous-direct-browser-access`
- TODO : gérer l'édition/correction des entrées, ajouter un historique multi-jours

## Session 5 — 10 mars 2026
- **Refonte du Journal → onglet "Aliments"** : plus de sections repas (petit-déj, déjeuner, etc.)
- Le Journal est maintenant un **board de gestion de la base d'aliments** personnelle
- Formulaire d'ajout toujours visible avec champs : nom, calories, protéines, glucides, lipides, fibres (pour 100g)
- Liste de tous les aliments enregistrés avec possibilité de supprimer
- Compteur d'aliments dans l'en-tête
- Message de confirmation temporaire après ajout (disparaît après 2s)
- Vidé `FOODS_DB` et `foods.json` : la base se construit 100% manuellement
- Aliments sauvegardés dans localStorage (clé `food-db-custom`)
- Nouveau concept : `setTimeout()` pour un message temporaire, `Array.filter()` pour la suppression
- TODO : démarrer le Bloc 4 (expert IA) ou Bloc 5 (paramètres)

## Session 4 — 10 mars 2026
- Codé le Bloc 3 complet (dashboard visuel)
- 4 barres de progression circulaires en SVG (Calories, Protéines, Glucides, Lipides) avec code couleur dynamique
- Donut chart de répartition des macros (Recharts PieChart)
- Graphique tendance 7 jours (Recharts LineChart) avec ligne objectif pointillée
- Résumé chiffré : calories restantes + macro le plus déficitaire
- Ajouté le calcul des objectifs macros en grammes (calories × % / facteur conversion)
- Navigation 3 onglets : Dashboard / Journal / Profil
- Nouveaux concepts : SVG (strokeDasharray/offset), Recharts (PieChart, LineChart, ResponsiveContainer), conversion kcal→grammes
- Créé preview-bloc1-2-3.html pour tester les 3 blocs
- TODO : démarrer le Bloc 4 (expert IA) ou Bloc 5 (paramètres)

## Session 3 — 10 mars 2026
- Codé le Bloc 2 complet (journal alimentaire)
- 4 repas dépliables : Petit-déjeuner, Déjeuner, Dîner, Collation
- Recherche d'aliments avec autocomplétion (cherche dans foods.json)
- Ajout/suppression d'aliments, modification de quantité
- Calcul automatique des macros par aliment, par repas et total journalier
- Barre de progression calories avec code couleur (vert/orange/rouge)
- Persistance du journal par date (clé journal:YYYY-MM-DD)
- Navigation Journal / Profil dans le header
- Refactorisé Bloc 1 : "lifting state up" (state remonté dans App pour partage entre blocs)
- Nouveaux concepts : useRef, props, composants enfants, .filter(), .map(), .reduce(), immutabilité
- Créé preview-bloc1-2.html pour tester les deux blocs ensemble
- TODO : démarrer le Bloc 3 (dashboard visuel)

## Session 2 — 10 mars 2026
- Codé le Bloc 1 complet (profil utilisateur)
- Formulaire : poids, taille, âge, sexe, activité, objectif, régime
- Calculs automatiques : MB (Mifflin-St Jeor) + TDEE + calories cibles
- Persistance du profil via localStorage
- Créé preview-bloc1.html pour tester dans le navigateur

## Session 1 — 10 mars 2026
- Créé la structure du dossier projet
- Rédigé le README, le brief complet, les specs de la base alimentaire
- Rédigé les prompts système pour l'API Claude
- Initialisé foods.json avec la structure et quelques exemples
