# Brief Développeur — Macro Tracker Végétal avec Expert IA

## Contexte du projet

Créer une application web React (single-page) de suivi nutritionnel quotidien, pensée pour une alimentation **végétalienne**. L'outil doit être à la fois un tracker de macronutriments classique ET un assistant intelligent grâce à l'intégration de l'API Claude (Anthropic).

**Stack technique imposée :** React (JSX), Tailwind CSS, Recharts pour les graphiques, API Anthropic (`claude-sonnet-4-20250514`) pour l'expert IA.

**Philosophie UX :** interface épurée, mobile-first, zéro culpabilisation. Le ton est motivant et bienveillant par défaut.

---

## Architecture générale

L'application se compose de **5 blocs fonctionnels** décrits ci-dessous, tous interconnectés par un état global (React Context ou équivalent). Toute modification dans un bloc se répercute en temps réel sur les autres.

---

## Bloc 1 — Profil utilisateur dynamique

### Objectif
Collecter les données personnelles de l'utilisateur pour calculer automatiquement ses besoins caloriques et sa répartition en macronutriments.

### Interface
Un panneau latéral (desktop) ou un écran dédié (mobile) avec un formulaire éditable à tout moment.

### Champs requis

| Champ | Type | Valeurs / Contraintes |
|---|---|---|
| Poids actuel | Nombre (kg) | Min 30, max 250 |
| Taille | Nombre (cm) | Min 100, max 250 |
| Âge | Nombre (années) | Min 14, max 100 |
| Sexe biologique | Sélecteur | Homme / Femme |
| Niveau d'activité | Sélecteur | Sédentaire (×1.2) / Légèrement actif (×1.375) / Modérément actif (×1.55) / Très actif (×1.725) / Extrêmement actif (×1.9) |
| Objectif principal | Sélecteur | Perte de poids / Maintien / Prise de masse / Recomposition corporelle |
| Régime alimentaire | Sélecteur | Végétalien (par défaut) / Végétarien / Omnivore / Autre |

### Calculs automatiques

**Métabolisme de base (MB)** — Formule de Mifflin-St Jeor :
- Homme : `MB = (10 × poids en kg) + (6.25 × taille en cm) - (5 × âge) + 5`
- Femme : `MB = (10 × poids en kg) + (6.25 × taille en cm) - (5 × âge) - 161`

**Dépense énergétique totale (TDEE)** :
- `TDEE = MB × coefficient d'activité`

**Ajustement selon l'objectif** :
- Perte de poids : `TDEE - 300 à 500 kcal` (déficit modéré)
- Maintien : `TDEE`
- Prise de masse : `TDEE + 200 à 400 kcal` (surplus modéré)
- Recomposition : `TDEE - 100 à 200 kcal` (léger déficit)

### Fonctionnalité bonus — Mode objectif temporel

Sous-formulaire optionnel : poids cible (kg) + durée souhaitée (semaines).
L'outil calcule le déficit/surplus quotidien nécessaire.

**Règle de sécurité :** si le déficit dépasse 700 kcal/jour → alerte orange. Si > 1000 kcal/jour → alerte rouge et refus de valider.

---

## Bloc 2 — Journal alimentaire quotidien

### Objectif
Permettre à l'utilisateur de saisir ses repas et calculer automatiquement les macronutriments.

### Structure des repas (par défaut, modifiable)
1. Petit-déjeuner
2. Déjeuner
3. Dîner
4. Collation(s)

### Saisie d'un aliment

| Champ | Type | Détails |
|---|---|---|
| Nom de l'aliment | Texte libre avec autocomplétion | Recherche dans la base locale JSON |
| Quantité | Nombre | En grammes par défaut |
| Unité | Sélecteur | g / ml / portion / cuillère à soupe / pièce |

### Calcul automatique
`valeur = (valeur_pour_100g × quantité_en_g) / 100`

Afficher les totaux par repas et le total journalier.

### Interactions
- Bouton "+" pour ajouter un aliment à un repas
- Bouton "×" pour supprimer un aliment
- Modification de la quantité après saisie
- Bouton "Dupliquer le repas" pour copier un repas d'un jour précédent

---

## Bloc 3 — Dashboard visuel en temps réel

### Composant 1 — Barres de progression (vue journée)
4 barres (circulaires recommandées) : Calories, Protéines, Glucides, Lipides.
Affichage : `consommé / objectif` + pourcentage.

**Code couleur :** Vert (0-85%) → Orange (85-100%) → Rouge (>100%)

### Composant 2 — Donut chart de répartition
Graphique en anneau (Recharts `PieChart` + `innerRadius`) montrant % Glucides / Protéines / Lipides réels vs cible.

### Composant 3 — Graphique tendance 7 jours
Recharts `LineChart` : axe X = 7 derniers jours, axe Y = calories. Ligne consommées + ligne pointillée objectif. Option : onglets pour basculer entre macros.

### Composant 4 — Résumé chiffré
Calories restantes, macro le plus déficitaire, streak de jours dans la cible.

---

## Bloc 4 — Expert micronutritionniste IA

### Déclenchement
Bouton "Analyser ma journée" (désactivé si aucun aliment saisi).

### Appel API
- Endpoint : `POST https://api.anthropic.com/v1/messages`
- Modèle : `claude-sonnet-4-20250514`
- Prompt système et message utilisateur : voir `docs/api-prompts.md`

### Affichage du résultat
1. Score global sur 100 (cercle de progression)
2. Trois sous-scores : macro / diversité / cohérence
3. Analyse détaillée des macros
4. Carences identifiées (liste avec icônes)
5. Suggestions d'aliments (cliquables pour ajouter au journal)
6. Conseil du jour / message motivation

### Gestion d'erreur
Message élégant si l'API ne répond pas.

---

## Bloc 5 — Paramètres avancés

### Répartition des macros
3 sliders liés (somme = 100%) : Glucides (45%), Protéines (25%), Lipides (30%).

### Structure des repas
Nombre de repas (2 à 6), noms personnalisables.

### Seuils d'alerte
Seuil orange : slider 75-95% (défaut 85%). Seuil rouge : fixé à 100%.

### Ton de l'expert IA
Bienveillant / Direct / Scientifique.

### Presets d'objectifs

| Preset | G | P | L | TDEE | Focus IA |
|---|---|---|---|---|---|
| Endurance GR20 | 55% | 20% | 25% | +500 à 800 | Énergie longue durée, sodium |
| Sèche | 40% | 35% | 25% | -400 | Préservation musculaire, satiété |
| Prise de masse végétale | 45% | 30% | 25% | +300 | Protéines complètes, leucine |
| Longévité | 45% | 20% | 35% | = TDEE | Anti-inflammatoire, oméga-3 |
| Personnalisé | Libre | Libre | Libre | Libre | Adaptatif |

---

## Spécifications techniques transversales

### Persistance des données
`window.storage` avec clés hiérarchiques :
- `profile` : données du profil
- `settings` : paramètres avancés
- `journal:{YYYY-MM-DD}` : journal par date
- `food-db-custom` : aliments personnalisés

### Responsive design
Mobile (360px) → Desktop (1440px). Tailwind CSS (`sm:`, `md:`, `lg:`).

### Performance
Calculs côté client en temps réel. Seul le Bloc 4 nécessite un appel API.

### Accessibilité
Contraste WCAG AA, labels sur tous les champs, navigation clavier.
