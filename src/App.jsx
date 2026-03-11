// ============================================================
// Cal(cul)ories — Application principale
// Stack : React (JSX unique) + Tailwind CSS + Recharts + API Anthropic
//
// BLOC 1 — Profil utilisateur (✅ terminé)
// BLOC 2 — Journal alimentaire (✅ terminé)
// BLOC 3 — Dashboard visuel (← on est ici)
// ============================================================

import { useState, useEffect, useRef } from "react";

// Recharts : librairie de graphiques React.
// PieChart + Pie + Cell → pour le donut chart de répartition des macros
// LineChart + Line + XAxis + YAxis + Tooltip + ReferenceLine → pour le graphique 7 jours
// ResponsiveContainer → pour que les graphiques s'adaptent à la largeur du parent
import {
  PieChart, Pie, Cell,
  LineChart, Line, XAxis, YAxis, Tooltip, ReferenceLine,
  ResponsiveContainer,
} from "recharts";

// ============================================================
// CONSTANTES — BLOC 1
// ============================================================

const NIVEAUX_ACTIVITE = [
  { label: "Sédentaire", coeff: 1.2, description: "Peu ou pas d'exercice" },
  { label: "Légèrement actif", coeff: 1.375, description: "Exercice léger 1-3j/sem" },
  { label: "Modérément actif", coeff: 1.55, description: "Exercice modéré 3-5j/sem" },
  { label: "Très actif", coeff: 1.725, description: "Exercice intense 6-7j/sem" },
  { label: "Extrêmement actif", coeff: 1.9, description: "Travail physique + sport" },
];

const OBJECTIFS = [
  { label: "Perte de poids", ajustement: -400 },
  { label: "Maintien", ajustement: 0 },
  { label: "Prise de masse", ajustement: 300 },
  { label: "Recomposition corporelle", ajustement: -150 },
];

const REGIMES = ["Végétalien", "Végétarien", "Omnivore", "Autre"];

const PROFIL_DEFAUT = {
  poids: 70, taille: 175, age: 30, sexe: "Homme",
  activite: 2, objectif: 1, regime: 0,
};

// Répartition par défaut des macros (en %).
// Maintenant modifiable grâce aux presets personnalisés !
const MACROS_DEFAUT = { glucides: 45, proteines: 25, lipides: 30 };

// ============================================================
// PRESETS MACROS PRÉ-DÉFINIS
// ============================================================
// Quelques presets de départ pour aider l'utilisateur.
// Il pourra aussi créer les siens depuis la page Profil.
const PRESETS_DEFAUT = [
  { id: "preset-equilibre", nom: "Équilibré", macros: { glucides: 45, proteines: 25, lipides: 30 }, parDefaut: true },
  { id: "preset-seche", nom: "Sèche", macros: { glucides: 35, proteines: 35, lipides: 30 }, parDefaut: true },
  { id: "preset-masse", nom: "Prise de masse", macros: { glucides: 50, proteines: 25, lipides: 25 }, parDefaut: true },
  { id: "preset-keto", nom: "Keto / Low-carb", macros: { glucides: 10, proteines: 30, lipides: 60 }, parDefaut: true },
];

// Seuils d'alerte par défaut (en % de l'objectif)
const SEUIL_ORANGE = 0.85;

// ============================================================
// CONSTANTES — BLOC 2
// ============================================================

const REPAS_DEFAUT = [
  { id: "petit-dejeuner", nom: "Petit-déjeuner" },
  { id: "dejeuner", nom: "Déjeuner" },
  { id: "diner", nom: "Dîner" },
  { id: "collation", nom: "Collation" },
];

// Base d'aliments : vide au départ, tu la construis toi-même via l'onglet Aliments !
// Les aliments ajoutés manuellement sont sauvegardés dans localStorage (clé "food-db-custom").
const FOODS_DB = [];

// ============================================================
// CONSTANTES — BLOC 3 (couleurs des graphiques)
// ============================================================

// Couleurs attribuées à chaque macro pour les graphiques.
const COULEURS_MACROS = {
  proteines: "#10b981", // vert émeraude
  glucides: "#f59e0b",  // orange ambre
  lipides: "#6366f1",   // violet indigo
};

// ============================================================
// FONCTIONS UTILITAIRES
// ============================================================

// normaliserNom : transforme un nom d'aliment pour faciliter la comparaison.
// - met en minuscules
// - supprime les accents (é→e, è→e, etc.) via normalize("NFD") + regex
// - supprime les espaces en trop et trim
// Comme ça "Tofu Ferme", "tofu ferme", "tofü fermé" matchent tous.
function normaliserNom(nom) {
  return nom
    .toLowerCase()
    .normalize("NFD")                     // décompose les accents (é → e + ´)
    .replace(/[\u0300-\u036f]/g, "")      // supprime les marques d'accent
    .replace(/\s+/g, " ")                 // remplace espaces multiples par un seul
    .trim();
}

// chercherAlimentDansBase : cherche un aliment par nom normalisé dans un tableau.
// Retourne l'aliment trouvé ou undefined.
// Essaie d'abord une correspondance exacte, puis vérifie si un nom contient l'autre.
function chercherAlimentDansBase(nomRecherche, listeAliments) {
  const nomNorm = normaliserNom(nomRecherche);
  // 1) Correspondance exacte (après normalisation)
  const exact = listeAliments.find(f => normaliserNom(f.nom) === nomNorm);
  if (exact) return exact;
  // 2) Correspondance partielle : "tofu" matche "tofu ferme" ou inversement
  const partiels = listeAliments.filter(f => {
    const nf = normaliserNom(f.nom);
    return nf.includes(nomNorm) || nomNorm.includes(nf);
  });
  if (partiels.length === 1) return partiels[0];
  if (partiels.length > 1) {
    partiels.sort((a, b) => Math.abs(normaliserNom(a.nom).length - nomNorm.length) - Math.abs(normaliserNom(b.nom).length - nomNorm.length));
    return partiels[0];
  }
  return undefined;
}

function dateAujourdhui() {
  return new Date().toISOString().slice(0, 10);
}

// Renvoie la date d'il y a N jours au format YYYY-MM-DD.
// Utilisée par le graphique 7 jours pour chercher les journaux passés.
function dateIlYA(nJours) {
  const d = new Date();
  d.setDate(d.getDate() - nJours);
  return d.toISOString().slice(0, 10);
}

// Renvoie un label court pour une date ("Lun", "Mar", etc.)
function jourCourt(dateStr) {
  const jours = ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"];
  return jours[new Date(dateStr + "T12:00:00").getDay()];
}

let compteurId = 0;
function genererIdUnique() {
  compteurId++;
  return `item-${Date.now()}-${compteurId}`;
}

function calculerMacrosAliment(aliment, quantiteG) {
  const ratio = quantiteG / 100;
  return {
    calories: Math.round(aliment.pour100g.calories * ratio),
    proteines: +(aliment.pour100g.proteines * ratio).toFixed(1),
    glucides: +(aliment.pour100g.glucides * ratio).toFixed(1),
    lipides: +(aliment.pour100g.lipides * ratio).toFixed(1),
    fibres: +(aliment.pour100g.fibres * ratio).toFixed(1),
  };
}

function calculerTotaux(items) {
  return items.reduce(
    (acc, item) => ({
      calories: acc.calories + item.macros.calories,
      proteines: +(acc.proteines + item.macros.proteines).toFixed(1),
      glucides: +(acc.glucides + item.macros.glucides).toFixed(1),
      lipides: +(acc.lipides + item.macros.lipides).toFixed(1),
    }),
    { calories: 0, proteines: 0, glucides: 0, lipides: 0 }
  );
}

// Calcule les objectifs en grammes pour chaque macro.
// On part des calories cibles et de la répartition en %.
// 1g de protéines = 4 kcal, 1g de glucides = 4 kcal, 1g de lipides = 9 kcal.
function calculerObjectifsMacros(caloriesCibles, repartition) {
  return {
    proteines: Math.round((caloriesCibles * repartition.proteines / 100) / 4),
    glucides: Math.round((caloriesCibles * repartition.glucides / 100) / 4),
    lipides: Math.round((caloriesCibles * repartition.lipides / 100) / 9),
  };
}

// Détermine la couleur selon le pourcentage atteint de l'objectif.
function couleurProgression(ratio) {
  if (ratio > 1) return "#ef4444";       // rouge — dépassement
  if (ratio > SEUIL_ORANGE) return "#f59e0b"; // orange — proche
  return "#10b981";                       // vert — dans la cible
}

// Charge un journal sauvegardé pour une date donnée.
// Renvoie les totaux { calories, proteines, glucides, lipides } ou des zéros.
function chargerTotauxJour(dateStr) {
  try {
    const s = window.storage?.getItem(`journal:${dateStr}`);
    if (s) {
      const journal = JSON.parse(s);
      const items = Object.values(journal).flat();
      return calculerTotaux(items);
    }
  } catch (e) {}
  return { calories: 0, proteines: 0, glucides: 0, lipides: 0 };
}

// ============================================================
// FONCTIONS DE CALCUL — BLOC 1
// ============================================================

function calculerMB(poids, taille, age, sexe) {
  const base = 10 * poids + 6.25 * taille - 5 * age;
  return sexe === "Homme" ? base + 5 : base - 161;
}

function calculerTDEE(mb, indexActivite) {
  return mb * NIVEAUX_ACTIVITE[indexActivite].coeff;
}

function calculerCaloriesCibles(tdee, indexObjectif) {
  return tdee + OBJECTIFS[indexObjectif].ajustement;
}

// ============================================================
// FONCTIONS UTILITAIRES — SEMAINE (pour le tracker d'objectifs)
// ============================================================

// Retourne la date du lundi de la semaine contenant la date donnée.
// getDay() retourne 0=Dimanche, 1=Lundi, ..., 6=Samedi
// On décale pour que Lundi = jour 0 de la semaine.
function lundiDeLaSemaine(dateStr) {
  const d = new Date(dateStr + "T12:00:00");
  const jour = d.getDay();
  const decalage = jour === 0 ? 6 : jour - 1;
  d.setDate(d.getDate() - decalage);
  return d.toISOString().slice(0, 10);
}

// Retourne un tableau de 7 dates (lundi à dimanche) pour la semaine contenant dateStr
function joursDeLaSemaine(dateStr) {
  const lundi = lundiDeLaSemaine(dateStr);
  const jours = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(lundi + "T12:00:00");
    d.setDate(d.getDate() + i);
    jours.push(d.toISOString().slice(0, 10));
  }
  return jours;
}

const JOURS_SEMAINE_COURTS = ["L", "M", "M", "J", "V", "S", "D"];

// ============================================================
// CLÉ API CLAUDE + PROMPT SYSTÈME
// ============================================================
// La clé API est côté SERVEUR (dans api/analyze.js) en production.
// En mode local (fichier ouvert directement), on garde une clé en fallback.
const CLAUDE_API_KEY = "";

// Prompt système : force Claude à répondre UNIQUEMENT en JSON structuré.
function creerPromptSysteme(alimentsConnus) {
  const listeDetaillee = alimentsConnus.map(a =>
    `- "${a.nom}": ${a.pour100g.calories} kcal, P ${a.pour100g.proteines}g, G ${a.pour100g.glucides}g, L ${a.pour100g.lipides}g, F ${a.pour100g.fibres}g`
  ).join("\n");

  return `Tu es un assistant nutritionnel spécialisé dans l'alimentation végétalienne.
L'utilisateur te décrit ce qu'il a mangé en langage naturel.
Tu dois répondre UNIQUEMENT avec un JSON valide (pas de texte avant ou après).

Format de réponse OBLIGATOIRE :
{
  "repas": "petit-dejeuner" | "dejeuner" | "diner" | "collation",
  "aliments": [
    {
      "nom": "Nom de l'aliment",
      "quantite_g": 150,
      "pour100g": {
        "calories": 100,
        "proteines": 5.0,
        "glucides": 20.0,
        "lipides": 2.0,
        "fibres": 3.0
      }
    }
  ]
}

Règles :
- Déduis le type de repas depuis le contexte (matin = petit-dejeuner, midi = dejeuner, soir = diner, sinon = collation).
- Si l'utilisateur précise le repas, utilise-le.
- Estime les quantités en grammes si l'utilisateur dit "un bol", "une portion", etc.
- Les macros doivent être pour 100g de l'aliment (pas pour la quantité consommée).
- PRIORITÉ ABSOLUE : si un aliment correspond à un aliment de la base ci-dessous, utilise EXACTEMENT le même nom et les MÊMES macros pour 100g.
- Pour les aliments INCONNUS, estime des valeurs nutritionnelles réalistes.
- Réponds UNIQUEMENT avec le JSON, rien d'autre.

Aliments déjà dans la base :
${listeDetaillee || "Aucun aliment enregistré pour le moment."}`;
}

// Appel API Claude — async/await pour attendre la réponse sans bloquer l'interface
// En production (Vercel) → /api/analyze | En local → API Anthropic directement
async function appelerClaudeAPI(texteUtilisateur, alimentsConnus) {
  const systemPrompt = creerPromptSysteme(alimentsConnus);
  let data;

  const enLocal = typeof window !== "undefined" && window.location.protocol === "file:";

  if (enLocal && CLAUDE_API_KEY) {
    const reponse = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": CLAUDE_API_KEY,
        "anthropic-version": "2023-06-01",
        "anthropic-dangerous-direct-browser-access": "true"
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1024,
        system: systemPrompt,
        messages: [{ role: "user", content: texteUtilisateur }]
      })
    });
    if (!reponse.ok) {
      const erreur = await reponse.text();
      throw new Error(`Erreur API (${reponse.status}): ${erreur}`);
    }
    data = await reponse.json();
  } else {
    const reponse = await fetch("/api/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ texte: texteUtilisateur, systemPrompt })
    });
    if (!reponse.ok) {
      const erreur = await reponse.json().catch(() => ({ error: "Erreur inconnue" }));
      throw new Error(erreur.error || `Erreur serveur (${reponse.status})`);
    }
    data = await reponse.json();
  }

  const texteJSON = data.content[0].text;
  try {
    return JSON.parse(texteJSON);
  } catch (e) {
    const match = texteJSON.match(/\{[\s\S]*\}/);
    if (match) return JSON.parse(match[0]);
    throw new Error("Réponse invalide de l'API : " + texteJSON.slice(0, 200));
  }
}

// ============================================================
// COMPOSANT — Barre de progression circulaire (SVG)
// ============================================================
// SVG = Scalable Vector Graphics. C'est un format de dessin intégré au HTML.
// On dessine un cercle de fond + un arc coloré par-dessus qui représente le %.
//
// Comment ça marche techniquement :
// - strokeDasharray : définit la longueur du trait (périmètre du cercle)
// - strokeDashoffset : décale le début du trait (plus c'est grand, moins on voit)
// - En combinant les deux, on crée un arc partiel = notre barre de progression

function BarreCirculaire({ label, valeur, objectif, unite, couleur }) {
  const ratio = objectif > 0 ? valeur / objectif : 0;
  const pourcentage = Math.round(ratio * 100);
  const couleurArc = couleur || couleurProgression(ratio);

  // Paramètres du cercle SVG
  const taille = 90;           // largeur/hauteur du SVG
  const rayon = 35;            // rayon du cercle
  const epaisseur = 6;         // épaisseur du trait
  const centre = taille / 2;   // centre x et y

  // Calcul de l'arc : périmètre du cercle = 2 × π × rayon
  const perimetre = 2 * Math.PI * rayon;
  // L'offset détermine quelle portion du cercle est "cachée"
  // Plus l'offset est petit, plus on voit de l'arc (= plus on a progressé)
  const offset = perimetre - (perimetre * Math.min(ratio, 1));

  return (
    <div className="flex flex-col items-center">
      {/* Le SVG contient deux cercles superposés */}
      <svg width={taille} height={taille} className="transform -rotate-90">
        {/* Cercle de fond (gris clair) */}
        <circle
          cx={centre} cy={centre} r={rayon}
          fill="none" stroke="#e7e5e4" strokeWidth={epaisseur}
        />
        {/* Arc de progression (coloré) */}
        <circle
          cx={centre} cy={centre} r={rayon}
          fill="none" stroke={couleurArc} strokeWidth={epaisseur}
          strokeLinecap="round"
          strokeDasharray={perimetre}
          strokeDashoffset={offset}
          className="transition-all duration-500"
        />
      </svg>
      {/* Texte au centre du cercle (positionné par-dessus avec CSS) */}
      <div className="relative -mt-16 mb-4 text-center">
        <p className="text-lg font-bold text-stone-800">{pourcentage}%</p>
        <p className="text-xs text-stone-500">{valeur} / {objectif}{unite}</p>
      </div>
      <p className="text-xs font-medium text-stone-600">{label}</p>
    </div>
  );
}

// ============================================================
// COMPOSANT — Dashboard (BLOC 3)
// ============================================================
// Il reçoit en props les données calculées par App :
//   - totalJour : { calories, proteines, glucides, lipides }
//   - caloriesCibles : nombre
//   - objectifsMacros : { proteines, glucides, lipides } en grammes
//   - journal : le journal du jour (pour vérifier si des aliments sont saisis)

function Dashboard({ totalJour, caloriesCibles, objectifsMacros, journal }) {

  // --- COMPOSANT 1 : Barres de progression circulaires ---
  // 4 cercles montrant le % atteint pour chaque macro.

  // --- COMPOSANT 2 : Donut chart ---
  // On prépare les données pour Recharts PieChart.
  // Le donut montre la répartition RÉELLE des macros consommées.
  const totalMacrosG = totalJour.proteines + totalJour.glucides + totalJour.lipides;
  const donneesDonut = totalMacrosG > 0
    ? [
        { name: "Protéines", value: totalJour.proteines, color: COULEURS_MACROS.proteines },
        { name: "Glucides", value: totalJour.glucides, color: COULEURS_MACROS.glucides },
        { name: "Lipides", value: totalJour.lipides, color: COULEURS_MACROS.lipides },
      ]
    : [
        // Si rien n'est saisi, on montre un donut gris vide
        { name: "Vide", value: 1, color: "#d6d3d1" },
      ];

  // --- COMPOSANT 3 : Graphique tendance 7 jours ---
  // On charge les totaux de chaque jour des 7 derniers jours.
  // On construit un tableau que Recharts peut afficher.
  const donnees7Jours = [];
  for (let i = 6; i >= 0; i--) {
    const dateStr = dateIlYA(i);
    const totaux = i === 0 ? totalJour : chargerTotauxJour(dateStr);
    donnees7Jours.push({
      jour: jourCourt(dateStr),     // "Lun", "Mar", etc.
      calories: totaux.calories,
    });
  }

  // --- COMPOSANT 4 : Résumé chiffré ---
  const calRestantes = Math.max(0, caloriesCibles - totalJour.calories);

  // Trouver le macro le plus déficitaire
  const deficits = [
    { nom: "protéines", restant: Math.max(0, objectifsMacros.proteines - totalJour.proteines), unite: "g" },
    { nom: "glucides", restant: Math.max(0, objectifsMacros.glucides - totalJour.glucides), unite: "g" },
    { nom: "lipides", restant: Math.max(0, objectifsMacros.lipides - totalJour.lipides), unite: "g" },
  ];
  const plusDeficitaire = deficits.sort((a, b) => b.restant - a.restant)[0];

  // Vérifier si des aliments ont été saisis
  const aDesAliments = Object.values(journal).flat().length > 0;

  return (
    <div className="space-y-4">

      {/* ---- BARRES DE PROGRESSION CIRCULAIRES ---- */}
      <section className="bg-white rounded-2xl shadow-sm border border-stone-200 p-6">
        <h2 className="text-lg font-semibold text-stone-700 mb-4">Progression du jour</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <BarreCirculaire
            label="Calories"
            valeur={totalJour.calories}
            objectif={caloriesCibles}
            unite=" kcal"
          />
          <BarreCirculaire
            label="Protéines"
            valeur={totalJour.proteines}
            objectif={objectifsMacros.proteines}
            unite="g"
            couleur={COULEURS_MACROS.proteines}
          />
          <BarreCirculaire
            label="Glucides"
            valeur={totalJour.glucides}
            objectif={objectifsMacros.glucides}
            unite="g"
            couleur={COULEURS_MACROS.glucides}
          />
          <BarreCirculaire
            label="Lipides"
            valeur={totalJour.lipides}
            objectif={objectifsMacros.lipides}
            unite="g"
            couleur={COULEURS_MACROS.lipides}
          />
        </div>
      </section>

      {/* ---- DONUT CHART + RÉSUMÉ ---- */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

        {/* Donut de répartition réelle */}
        <section className="bg-white rounded-2xl shadow-sm border border-stone-200 p-6">
          <h3 className="text-sm font-semibold text-stone-500 uppercase tracking-wide mb-3">Répartition macros</h3>
          <div className="flex justify-center">
            {/* ResponsiveContainer adapte le graphique à la largeur disponible */}
            <ResponsiveContainer width="100%" height={160}>
              <PieChart>
                {/* Pie avec innerRadius crée un "donut" (anneau) au lieu d'un camembert plein */}
                <Pie
                  data={donneesDonut}
                  dataKey="value"
                  cx="50%" cy="50%"
                  innerRadius={45} outerRadius={65}
                  paddingAngle={2}
                  strokeWidth={0}
                >
                  {/* Cell colorie chaque tranche individuellement */}
                  {donneesDonut.map((d, i) => (
                    <Cell key={i} fill={d.color} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          </div>
          {/* Légende sous le donut */}
          {totalMacrosG > 0 && (
            <div className="flex justify-center gap-4 mt-2 text-xs">
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COULEURS_MACROS.proteines }} />
                P {Math.round(totalJour.proteines / totalMacrosG * 100)}%
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COULEURS_MACROS.glucides }} />
                G {Math.round(totalJour.glucides / totalMacrosG * 100)}%
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COULEURS_MACROS.lipides }} />
                L {Math.round(totalJour.lipides / totalMacrosG * 100)}%
              </span>
            </div>
          )}
        </section>

        {/* Résumé chiffré */}
        <section className="bg-white rounded-2xl shadow-sm border border-stone-200 p-6">
          <h3 className="text-sm font-semibold text-stone-500 uppercase tracking-wide mb-3">Résumé</h3>
          <div className="space-y-4">
            {/* Calories restantes */}
            <div>
              <p className="text-3xl font-bold text-emerald-700">{calRestantes}</p>
              <p className="text-sm text-stone-500">kcal restantes</p>
            </div>
            {/* Macro le plus déficitaire */}
            {aDesAliments && plusDeficitaire.restant > 0 && (
              <div className="bg-stone-50 rounded-xl p-3">
                <p className="text-sm text-stone-600">
                  Il te reste <span className="font-semibold">{Math.round(plusDeficitaire.restant)}g de {plusDeficitaire.nom}</span> à atteindre
                </p>
              </div>
            )}
            {/* Message si rien n'est saisi */}
            {!aDesAliments && (
              <div className="bg-stone-50 rounded-xl p-3">
                <p className="text-sm text-stone-400">Ajoute des aliments dans le journal pour voir ton résumé ici.</p>
              </div>
            )}
          </div>
        </section>
      </div>

      {/* ---- GRAPHIQUE TENDANCE 7 JOURS ---- */}
      <section className="bg-white rounded-2xl shadow-sm border border-stone-200 p-6">
        <h3 className="text-sm font-semibold text-stone-500 uppercase tracking-wide mb-3">Tendance 7 jours — Calories</h3>
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={donnees7Jours} margin={{ top: 5, right: 10, bottom: 5, left: -10 }}>
            {/* XAxis = l'axe horizontal (les jours) */}
            <XAxis dataKey="jour" tick={{ fontSize: 12, fill: "#78716c" }} />
            {/* YAxis = l'axe vertical (les calories). hide=false pour l'afficher */}
            <YAxis tick={{ fontSize: 11, fill: "#a8a29e" }} />
            {/* Tooltip = le petit encart qui s'affiche au survol d'un point */}
            <Tooltip
              formatter={(val) => [`${val} kcal`, "Calories"]}
              contentStyle={{ borderRadius: "8px", border: "1px solid #e7e5e4", fontSize: "13px" }}
            />
            {/* ReferenceLine = la ligne pointillée horizontale de l'objectif */}
            <ReferenceLine
              y={caloriesCibles}
              stroke="#10b981"
              strokeDasharray="6 4"
              label={{ value: `Objectif ${caloriesCibles}`, fill: "#10b981", fontSize: 11, position: "right" }}
            />
            {/* Line = la courbe des calories réelles */}
            <Line
              type="monotone"
              dataKey="calories"
              stroke="#059669"
              strokeWidth={2}
              dot={{ fill: "#059669", r: 4 }}
              activeDot={{ r: 6 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </section>

      {/* ---- OBJECTIFS JOURNALIERS + TRACKER SEMAINE ---- */}
      <ObjectifsJournaliers />
    </div>
  );
}

// ============================================================
// COMPOSANT — Objectifs journaliers avec tracker semaine
// ============================================================
// Ce composant gère :
// 1. Une liste d'objectifs personnalisés que l'utilisateur peut ajouter/supprimer
// 2. Des cases à cocher pour valider chaque objectif chaque jour
// 3. Un tracker visuel sur la semaine (lundi→dimanche) : vert = réussi, rouge = raté
// 4. Reset automatique chaque lundi (nouvelle semaine = nouvelles cases)
//
// Structure localStorage :
// - "objectifs-liste" : tableau des objectifs [{id, texte}]
// - "objectifs-semaine:YYYY-MM-DD" : { objectifId: { "YYYY-MM-DD": true/false, ... } }

function ObjectifsJournaliers() {
  // Liste des objectifs
  const [objectifs, setObjectifs] = useState(() => {
    try { const s = window.storage?.getItem("objectifs-liste"); if (s) return JSON.parse(s); } catch (e) {}
    return [];
  });

  // Résultats de la semaine en cours
  const lundiCourant = lundiDeLaSemaine(dateAujourdhui());
  const [resultats, setResultats] = useState(() => {
    try { const s = window.storage?.getItem("objectifs-semaine:" + lundiCourant); if (s) return JSON.parse(s); } catch (e) {}
    return {};
  });

  const [nouveauTexte, setNouveauTexte] = useState("");
  const [modeEdition, setModeEdition] = useState(false);

  // Sauvegarde automatique
  useEffect(() => {
    try { window.storage?.setItem("objectifs-liste", JSON.stringify(objectifs)); } catch (e) {}
  }, [objectifs]);
  useEffect(() => {
    try { window.storage?.setItem("objectifs-semaine:" + lundiCourant, JSON.stringify(resultats)); } catch (e) {}
  }, [resultats]);

  const joursSemaine = joursDeLaSemaine(dateAujourdhui());
  const aujourdhui = dateAujourdhui();

  function ajouterObjectif(e) {
    e.preventDefault();
    if (!nouveauTexte.trim()) return;
    setObjectifs([...objectifs, { id: "obj-" + Date.now(), texte: nouveauTexte.trim() }]);
    setNouveauTexte("");
  }

  function supprimerObjectif(id) {
    setObjectifs(objectifs.filter(o => o.id !== id));
    setResultats(prev => { const copie = { ...prev }; delete copie[id]; return copie; });
  }

  // Cocher/décocher un objectif pour aujourd'hui
  function toggleObjectif(objectifId) {
    setResultats(prev => {
      const copie = { ...prev };
      if (!copie[objectifId]) copie[objectifId] = {};
      copie[objectifId][aujourdhui] = !copie[objectifId][aujourdhui];
      return copie;
    });
  }

  function estCoche(objectifId, dateStr) {
    return resultats[objectifId] && resultats[objectifId][dateStr] === true;
  }

  // Statut d'un jour : "reussi" si tous cochés, "rate" si jour passé et pas tout coché
  function statutJour(dateStr) {
    if (objectifs.length === 0) return "neutre";
    if (dateStr > aujourdhui) return "futur";
    const tousCoches = objectifs.every(o => estCoche(o.id, dateStr));
    if (tousCoches) return "reussi";
    if (dateStr === aujourdhui) return "en-cours";
    return "rate";
  }

  function couleurCase(statut) {
    if (statut === "reussi") return "bg-emerald-500";
    if (statut === "rate") return "bg-red-400";
    if (statut === "en-cours") return "bg-amber-300";
    return "bg-stone-100";
  }

  return (
    <section className="bg-white rounded-2xl shadow-sm border border-stone-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-stone-500 uppercase tracking-wide">Objectifs du jour</h3>
        {objectifs.length > 0 && (
          <button onClick={() => setModeEdition(!modeEdition)}
            className="text-xs text-stone-400 hover:text-stone-600 transition-colors">
            {modeEdition ? "Terminé" : "Modifier"}
          </button>
        )}
      </div>

      {/* Liste des objectifs avec checkbox */}
      {objectifs.length > 0 ? (
        <div className="space-y-2 mb-4">
          {objectifs.map(obj => (
            <div key={obj.id} className="flex items-center gap-3 group">
              <button onClick={() => toggleObjectif(obj.id)}
                className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                  estCoche(obj.id, aujourdhui)
                    ? "bg-emerald-500 border-emerald-500 text-white"
                    : "border-stone-300 hover:border-emerald-400"
                }`}>
                {estCoche(obj.id, aujourdhui) && <span className="text-xs">✓</span>}
              </button>
              <span className={`text-sm flex-1 ${
                estCoche(obj.id, aujourdhui) ? "text-stone-400 line-through" : "text-stone-700"
              }`}>
                {obj.texte}
              </span>
              {modeEdition && (
                <button onClick={() => supprimerObjectif(obj.id)}
                  className="text-stone-300 hover:text-red-500 transition-colors text-sm">✕</button>
              )}
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-stone-400 mb-4">Aucun objectif. Ajoute-en un ci-dessous !</p>
      )}

      {/* Formulaire d'ajout */}
      <form onSubmit={ajouterObjectif} className="flex gap-2 mb-5">
        <input type="text" value={nouveauTexte} onChange={e => setNouveauTexte(e.target.value)}
          placeholder="Ex: Pas de sucre ajouté"
          className="flex-1 rounded-lg border border-stone-300 px-3 py-1.5 text-sm text-stone-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent" />
        <button type="submit" disabled={!nouveauTexte.trim()}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
            nouveauTexte.trim() ? "bg-emerald-600 text-white hover:bg-emerald-700" : "bg-stone-200 text-stone-400 cursor-not-allowed"
          }`}>+</button>
      </form>

      {/* Tracker semaine : 7 cases lundi → dimanche */}
      {objectifs.length > 0 && (
        <div>
          <p className="text-xs text-stone-400 mb-2">
            Semaine du {new Date(lundiCourant + "T12:00:00").toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}
          </p>
          <div className="flex gap-1.5">
            {joursSemaine.map((jour, i) => {
              const statut = statutJour(jour);
              return (
                <div key={jour} className="flex-1 flex flex-col items-center gap-1">
                  <span className="text-xs text-stone-400">{JOURS_SEMAINE_COURTS[i]}</span>
                  <div className={`w-full aspect-square rounded-lg ${couleurCase(statut)} transition-colors ${
                    jour === aujourdhui ? "ring-2 ring-emerald-500 ring-offset-1" : ""
                  }`} />
                </div>
              );
            })}
          </div>
          {/* Légende */}
          <div className="flex gap-3 mt-2 justify-center text-xs text-stone-400">
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded bg-emerald-500" /> Réussi</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded bg-red-400" /> Raté</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded bg-amber-300" /> En cours</span>
          </div>
        </div>
      )}
    </section>
  );
}

// ============================================================
// COMPOSANT — Champ de recherche avec autocomplétion (BLOC 2)
// ============================================================

// Amélioré : cherche dans FOODS_DB + customFoods (aliments créés manuellement)
function RechercheAliment({ onSelect, customFoods }) {
  const [recherche, setRecherche] = useState("");
  const [resultats, setResultats] = useState([]);
  const [ouvert, setOuvert] = useState(false);
  const refContainer = useRef(null);

  useEffect(() => {
    if (recherche.length < 1) { setResultats([]); setOuvert(false); return; }
    const terme = recherche.toLowerCase();
    // On fusionne FOODS_DB (les aliments de base) avec customFoods (les aliments ajoutés manuellement)
    // .concat() crée un nouveau tableau avec les éléments des deux tableaux
    const tousLesAliments = FOODS_DB.concat(customFoods || []);
    const filtres = tousLesAliments.filter(
      (a) => a.nom.toLowerCase().includes(terme) || (a.categorie && a.categorie.toLowerCase().includes(terme))
    ).slice(0, 8);
    setResultats(filtres);
    setOuvert(filtres.length > 0);
  }, [recherche, customFoods]);

  useEffect(() => {
    function handleClickDehors(e) {
      if (refContainer.current && !refContainer.current.contains(e.target)) setOuvert(false);
    }
    document.addEventListener("mousedown", handleClickDehors);
    return () => document.removeEventListener("mousedown", handleClickDehors);
  }, []);

  function selectionner(aliment) { onSelect(aliment); setRecherche(""); setOuvert(false); }

  return (
    <div ref={refContainer} className="relative">
      <input type="text" placeholder="Rechercher un aliment..." value={recherche}
        onChange={(e) => setRecherche(e.target.value)}
        className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm text-stone-800
                   focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent" />
      {ouvert && (
        <ul className="absolute z-10 w-full mt-1 bg-white border border-stone-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
          {resultats.map((aliment) => (
            <li key={aliment.id} onClick={() => selectionner(aliment)}
              className="px-3 py-2 cursor-pointer hover:bg-emerald-50 transition-colors">
              <span className="text-sm font-medium text-stone-700">{aliment.nom}</span>
              {/* Badge "Perso" pour les aliments custom */}
              {aliment.custom && <span className="text-xs bg-violet-100 text-violet-600 px-1.5 py-0.5 rounded ml-2">Perso</span>}
              <span className="text-xs text-stone-400 ml-2">{aliment.pour100g.calories} kcal/100g</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ============================================================
// COMPOSANT — Formulaire d'ajout manuel d'aliment
// ============================================================
// Ce composant permet de créer un aliment "custom" en saisissant ses macros pour 100g.
// L'aliment est ensuite sauvegardé dans customFoods (localStorage) ET ajouté au repas.

// Mode standalone : le formulaire reste visible après soumission et se vide pour un nouvel ajout.
function FormulaireAlimentManuel({ onAjouterCustom }) {
  const [nom, setNom] = useState("");
  const [calories, setCalories] = useState("");
  const [proteines, setProteines] = useState("");
  const [glucides, setGlucides] = useState("");
  const [lipides, setLipides] = useState("");
  const [fibres, setFibres] = useState("");
  const [confirmation, setConfirmation] = useState(false);

  function soumettreFormulaire(e) {
    e.preventDefault();
    if (!nom.trim()) return;

    const nouvelAliment = {
      id: "custom-" + Date.now(),
      nom: nom.trim(),
      categorie: "Aliment personnalisé",
      custom: true,
      pour100g: {
        calories: Math.round(parseFloat(calories) || 0),
        proteines: +(parseFloat(proteines) || 0).toFixed(1),
        glucides: +(parseFloat(glucides) || 0).toFixed(1),
        lipides: +(parseFloat(lipides) || 0).toFixed(1),
        fibres: +(parseFloat(fibres) || 0).toFixed(1),
      }
    };

    onAjouterCustom(nouvelAliment);
    // On vide le formulaire pour un nouvel ajout
    setNom(""); setCalories(""); setProteines(""); setGlucides(""); setLipides(""); setFibres("");
    // Message de confirmation temporaire
    setConfirmation(true);
    setTimeout(() => setConfirmation(false), 2000);
  }

  const inputClass = "w-full rounded-lg border border-stone-300 px-3 py-2 text-sm text-stone-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent";

  return (
    <form onSubmit={soumettreFormulaire} className="bg-white rounded-2xl shadow-sm border border-stone-200 p-6 space-y-3">
      <h3 className="text-sm font-semibold text-stone-500 uppercase tracking-wide">Ajouter un aliment</h3>
      <div>
        <input type="text" placeholder="Nom de l'aliment *" value={nom} onChange={(e) => setNom(e.target.value)}
          className={inputClass} required />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="block text-xs text-stone-500 mb-0.5">Calories (kcal)</label>
          <input type="number" min={0} step="any" placeholder="0" value={calories} onChange={(e) => setCalories(e.target.value)} className={inputClass} />
        </div>
        <div>
          <label className="block text-xs text-stone-500 mb-0.5">Protéines (g)</label>
          <input type="number" min={0} step="any" placeholder="0" value={proteines} onChange={(e) => setProteines(e.target.value)} className={inputClass} />
        </div>
        <div>
          <label className="block text-xs text-stone-500 mb-0.5">Glucides (g)</label>
          <input type="number" min={0} step="any" placeholder="0" value={glucides} onChange={(e) => setGlucides(e.target.value)} className={inputClass} />
        </div>
        <div>
          <label className="block text-xs text-stone-500 mb-0.5">Lipides (g)</label>
          <input type="number" min={0} step="any" placeholder="0" value={lipides} onChange={(e) => setLipides(e.target.value)} className={inputClass} />
        </div>
        <div>
          <label className="block text-xs text-stone-500 mb-0.5">Fibres (g)</label>
          <input type="number" min={0} step="any" placeholder="0" value={fibres} onChange={(e) => setFibres(e.target.value)} className={inputClass} />
        </div>
      </div>
      <button type="submit"
        className="w-full bg-emerald-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-emerald-700 transition-colors">
        Ajouter à ma base
      </button>
      {confirmation && (
        <p className="text-sm text-emerald-600 text-center font-medium">Aliment ajouté !</p>
      )}
    </form>
  );
}

// ============================================================
// COMPOSANT — Section d'un repas (BLOC 2)
// ============================================================

// Amélioré : ajout d'un bouton bascule pour passer de la recherche à l'ajout manuel
function SectionRepas({ repas, items, onAjouterAliment, onSupprimerAliment, onModifierQuantite, onAjouterAlimentCustom, customFoods }) {
  const [deplie, setDeplie] = useState(true);
  // Nouveau state : "mode" contrôle quel formulaire est visible (recherche ou manuel)
  const [mode, setMode] = useState("recherche"); // "recherche" ou "manuel"
  const totaux = calculerTotaux(items);

  return (
    <section className="bg-white rounded-2xl shadow-sm border border-stone-200 overflow-hidden">
      <button onClick={() => setDeplie(!deplie)}
        className="w-full flex items-center justify-between p-4 hover:bg-stone-50 transition-colors">
        <div className="flex items-center gap-3">
          <span className={`text-stone-400 transition-transform ${deplie ? "rotate-90" : ""}`}>▶</span>
          <h3 className="font-semibold text-stone-700">{repas.nom}</h3>
          {items.length > 0 && (
            <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">
              {items.length} aliment{items.length > 1 ? "s" : ""}
            </span>
          )}
        </div>
        {items.length > 0 && <span className="text-sm font-medium text-stone-500">{totaux.calories} kcal</span>}
      </button>
      {deplie && (
        <div className="px-4 pb-4 space-y-3">
          {/* Bascule Recherche / Ajout manuel */}
          <div className="flex gap-2">
            <button onClick={() => setMode("recherche")}
              className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                mode === "recherche" ? "bg-emerald-100 text-emerald-700" : "bg-stone-100 text-stone-500 hover:bg-stone-200"}`}>
              Rechercher
            </button>
            <button onClick={() => setMode("manuel")}
              className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                mode === "manuel" ? "bg-violet-100 text-violet-700" : "bg-stone-100 text-stone-500 hover:bg-stone-200"}`}>
              Ajout manuel
            </button>
          </div>

          {/* Affichage conditionnel selon le mode choisi */}
          {mode === "recherche" && <RechercheAliment onSelect={(aliment) => onAjouterAliment(repas.id, aliment)} customFoods={customFoods} />}
          {mode === "manuel" && <FormulaireAlimentManuel
            onAjouterCustom={(aliment) => onAjouterAlimentCustom(repas.id, aliment)}
            onFermer={() => setMode("recherche")} />}

          {items.length === 0 ? (
            <p className="text-sm text-stone-400 text-center py-3">Aucun aliment ajouté.</p>
          ) : (
            <div className="space-y-2">
              {items.map((item) => (
                <div key={item.uid} className="flex items-center gap-2 p-3 bg-stone-50 rounded-xl">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-stone-700 truncate">
                      {item.nom}
                      {item.aliment && item.aliment.custom && <span className="text-xs bg-violet-100 text-violet-600 px-1.5 py-0.5 rounded ml-2">Perso</span>}
                    </p>
                    <p className="text-xs text-stone-400">
                      {item.macros.calories} kcal · P {item.macros.proteines}g · G {item.macros.glucides}g · L {item.macros.lipides}g
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <input type="number" min={1} value={item.quantite}
                      onChange={(e) => onModifierQuantite(repas.id, item.uid, Number(e.target.value))}
                      className="w-16 text-center text-sm rounded-lg border border-stone-300 py-1
                                 focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                    <span className="text-xs text-stone-400">g</span>
                  </div>
                  <button onClick={() => onSupprimerAliment(repas.id, item.uid)}
                    className="text-stone-400 hover:text-red-500 transition-colors p-1" title="Supprimer">✕</button>
                </div>
              ))}
              <div className="flex justify-end gap-4 pt-2 border-t border-stone-100 text-xs text-stone-500">
                <span>P {totaux.proteines}g</span>
                <span>G {totaux.glucides}g</span>
                <span>L {totaux.lipides}g</span>
                <span className="font-semibold text-stone-700">{totaux.calories} kcal</span>
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  );
}

// ============================================================
// COMPOSANT — Journal de saisie (BLOC 4 / Session 6)
// ============================================================
// Permet de décrire ses repas en langage naturel (texte ou vocal).
// L'API Claude analyse le texte et retourne les aliments structurés avec leurs macros.
// Les nouveaux aliments sont automatiquement ajoutés à la base customFoods.

function JournalSaisie({ journal, setJournal, customFoods, onAjouterCustom, caloriesCibles, objectifsMacros, dateJournal, onValider, onJourPrecedent }) {
  const [texte, setTexte] = useState("");
  const [chargement, setChargement] = useState(false);
  const [erreur, setErreur] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [enEcoute, setEnEcoute] = useState(false);
  const reconnaissanceRef = useRef(null);
  const champTexteRef = useRef(null);

  // Web Speech API : vérifie si le navigateur supporte la reconnaissance vocale
  const speechDisponible = typeof window !== "undefined" &&
    (window.SpeechRecognition || window.webkitSpeechRecognition);

  function demarrerVocal() {
    if (!speechDisponible) {
      setErreur("La reconnaissance vocale n'est pas supportée par ton navigateur. Utilise Chrome.");
      return;
    }
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const reco = new SpeechRecognition();
    reco.lang = "fr-FR";
    reco.continuous = false;
    reco.interimResults = true;

    reco.onresult = (event) => {
      let transcription = "";
      for (let i = 0; i < event.results.length; i++) {
        transcription += event.results[i][0].transcript;
      }
      setTexte(transcription);
    };
    reco.onend = () => setEnEcoute(false);
    reco.onerror = (event) => {
      setEnEcoute(false);
      if (event.error === "no-speech") setErreur("Aucune parole détectée. Réessaie en parlant plus fort.");
      else if (event.error === "not-allowed") setErreur("Accès au micro refusé. Autorise-le dans les paramètres du navigateur.");
    };

    reconnaissanceRef.current = reco;
    reco.start();
    setEnEcoute(true);
    setErreur("");
  }

  function arreterVocal() {
    if (reconnaissanceRef.current) {
      reconnaissanceRef.current.stop();
      setEnEcoute(false);
    }
  }

  // Envoi du texte à l'API Claude pour analyse
  async function analyserTexte() {
    if (!texte.trim()) return;
    setChargement(true);
    setErreur("");
    setConfirmation("");

    try {
      const tousAliments = FOODS_DB.concat(customFoods || []);
      const resultat = await appelerClaudeAPI(texte, tousAliments);

      if (!resultat.repas || !Array.isArray(resultat.aliments)) {
        throw new Error("Format de réponse inattendu");
      }

      // Correspondance locale : on réutilise les macros de la base si l'aliment existe
      const nouvellesEntrees = resultat.aliments.map(a => {
        const alimentConnu = chercherAlimentDansBase(a.nom, tousAliments);
        const macros100g = alimentConnu ? alimentConnu.pour100g : a.pour100g;
        const nomFinal = alimentConnu ? alimentConnu.nom : a.nom;

        return {
          uid: genererIdUnique(),
          nom: nomFinal,
          quantite: a.quantite_g,
          aliment: alimentConnu || {
            id: "api-" + Date.now() + "-" + Math.random().toString(36).slice(2, 6),
            nom: nomFinal, categorie: "Via API", custom: true, pour100g: macros100g
          },
          macros: calculerMacrosAliment({ pour100g: macros100g }, a.quantite_g)
        };
      });

      const repasId = resultat.repas;
      setJournal(prev => {
        const nvJournal = { ...prev };
        if (!nvJournal[repasId]) nvJournal[repasId] = [];
        nvJournal[repasId] = nvJournal[repasId].concat(nouvellesEntrees);
        return nvJournal;
      });

      // Auto-ajout des nouveaux aliments à la base customFoods
      resultat.aliments.forEach(a => {
        const existe = chercherAlimentDansBase(a.nom, customFoods);
        if (!existe) {
          onAjouterCustom({
            id: "api-" + Date.now() + "-" + Math.random().toString(36).slice(2, 6),
            nom: a.nom, categorie: "Via API", custom: true, pour100g: a.pour100g
          });
        }
      });

      const nbAliments = resultat.aliments.length;
      const nomRepas = REPAS_DEFAUT.find(r => r.id === repasId)?.nom || repasId;
      setConfirmation(`${nbAliments} aliment${nbAliments > 1 ? "s" : ""} ajouté${nbAliments > 1 ? "s" : ""} au ${nomRepas} !`);
      setTexte("");
      setTimeout(() => setConfirmation(""), 4000);

    } catch (e) {
      console.error("Erreur analyse:", e);
      setErreur(e.message || "Une erreur est survenue lors de l'analyse.");
    } finally {
      setChargement(false);
    }
  }

  function gererTouche(e) {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); analyserTexte(); }
  }

  const totalJour = calculerTotaux(Object.values(journal).flat());

  return (
    <div className="space-y-4">
      {/* En-tête avec date et résumé */}
      <section className="bg-emerald-700 text-white rounded-2xl p-4 shadow-sm">
        <div className="flex items-center justify-between mb-2">
          <button onClick={onJourPrecedent}
            className="px-2 py-1 rounded-lg text-emerald-200 hover:text-white hover:bg-white/10 transition-colors text-lg">
            ←
          </button>
          <div className="text-center">
            <h2 className="text-lg font-bold">
              {dateJournal === dateAujourdhui() ? "Aujourd'hui" :
               new Date(dateJournal + "T12:00:00").toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })}
            </h2>
            <p className="text-emerald-200 text-xs">{dateJournal}</p>
          </div>
          <button onClick={onValider}
            disabled={dateJournal >= dateAujourdhui()}
            className={`px-2 py-1 rounded-lg text-lg transition-colors ${
              dateJournal >= dateAujourdhui()
                ? "text-emerald-400/30 cursor-not-allowed"
                : "text-emerald-200 hover:text-white hover:bg-white/10"
            }`}>
            →
          </button>
        </div>
        <p className="text-emerald-200 text-sm text-center">Décris ce que tu as mangé, je m'occupe du reste</p>
        <div className="flex justify-center gap-4 mt-3 text-sm">
          <span>{totalJour.calories} / {caloriesCibles} kcal</span>
          <span>P {totalJour.proteines}g</span>
          <span>G {totalJour.glucides}g</span>
          <span>L {totalJour.lipides}g</span>
        </div>
      </section>

      {/* Zone de saisie texte + bouton micro */}
      <section className="bg-white rounded-2xl shadow-sm border border-stone-200 p-4 space-y-3">
        <h3 className="text-sm font-semibold text-stone-500 uppercase tracking-wide">Que viens-tu de manger ?</h3>
        <div className="relative">
          <textarea ref={champTexteRef} value={texte} onChange={e => setTexte(e.target.value)}
            onKeyDown={gererTouche}
            placeholder="Ex: Ce midi j'ai mangé 200g de riz complet avec 150g de tofu grillé et une salade verte"
            rows={3}
            className="w-full rounded-lg border border-stone-300 px-3 py-2 pr-12 text-sm text-stone-800 resize-none focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            disabled={chargement} />
          {speechDisponible && (
            <button onClick={enEcoute ? arreterVocal : demarrerVocal} disabled={chargement}
              className={`absolute top-2 right-2 w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                enEcoute ? "bg-red-500 text-white animate-pulse" : "bg-stone-100 text-stone-500 hover:bg-emerald-100 hover:text-emerald-600"
              }`}
              title={enEcoute ? "Arrêter l'écoute" : "Dicter (vocal)"}>
              {enEcoute ? "⏹" : "🎤"}
            </button>
          )}
        </div>
        {enEcoute && <p className="text-xs text-red-500 animate-pulse">Écoute en cours... Parle maintenant !</p>}
        <button onClick={analyserTexte} disabled={chargement || !texte.trim()}
          className={`w-full py-2.5 rounded-lg text-sm font-medium transition-colors ${
            chargement || !texte.trim() ? "bg-stone-200 text-stone-400 cursor-not-allowed" : "bg-emerald-600 text-white hover:bg-emerald-700"
          }`}>
          {chargement ? (
            <span className="flex items-center justify-center gap-2">
              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
              Analyse en cours...
            </span>
          ) : "Analyser et ajouter"}
        </button>
        {erreur && <div className="bg-red-50 border border-red-200 rounded-lg p-3"><p className="text-sm text-red-600">{erreur}</p></div>}
        {confirmation && <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3"><p className="text-sm text-emerald-600 font-medium">{confirmation}</p></div>}
      </section>

      {/* Affichage des repas du jour */}
      {REPAS_DEFAUT.map(repas => {
        const items = journal[repas.id] || [];
        if (items.length === 0) return null;
        const totaux = calculerTotaux(items);
        return (
          <section key={repas.id} className="bg-white rounded-2xl shadow-sm border border-stone-200 overflow-hidden">
            <div className="flex items-center justify-between p-4 bg-stone-50 border-b border-stone-100">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-stone-700">{repas.nom}</h3>
                <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">
                  {items.length} aliment{items.length > 1 ? "s" : ""}
                </span>
              </div>
              <span className="text-sm font-medium text-stone-500">{totaux.calories} kcal</span>
            </div>
            <div className="p-4 space-y-2">
              {items.map(item => (
                <div key={item.uid} className="flex items-center gap-2 p-3 bg-stone-50 rounded-xl">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-stone-700 truncate">{item.nom}</p>
                    <p className="text-xs text-stone-400">
                      {item.quantite}g — {item.macros.calories} kcal · P {item.macros.proteines}g · G {item.macros.glucides}g · L {item.macros.lipides}g
                    </p>
                  </div>
                  <button onClick={() => {
                    setJournal(prev => ({ ...prev, [repas.id]: prev[repas.id].filter(i => i.uid !== item.uid) }));
                  }} className="text-stone-400 hover:text-red-500 transition-colors p-1" title="Supprimer">✕</button>
                </div>
              ))}
              <div className="flex justify-end gap-4 pt-2 border-t border-stone-100 text-xs text-stone-500">
                <span>P {totaux.proteines}g</span>
                <span>G {totaux.glucides}g</span>
                <span>L {totaux.lipides}g</span>
                <span className="font-semibold text-stone-700">{totaux.calories} kcal</span>
              </div>
            </div>
          </section>
        );
      })}

      {Object.values(journal).flat().length === 0 && (
        <div className="text-center py-8">
          <p className="text-stone-400 text-sm">Aucun repas enregistré aujourd'hui.</p>
          <p className="text-stone-300 text-xs mt-1">Décris ce que tu as mangé dans la zone ci-dessus !</p>
        </div>
      )}
    </div>
  );
}

// ============================================================
// COMPOSANT — Gestion des presets macros
// ============================================================
// Ce composant permet de :
// - Voir la liste des presets (pré-définis + personnalisés)
// - Sélectionner le preset actif (celui qui s'applique au dashboard)
// - Créer un nouveau preset personnalisé
// - Supprimer un preset personnalisé (pas les pré-définis)
//
// Props :
// - presets : tableau de tous les presets disponibles
// - presetActifId : l'ID du preset actuellement sélectionné
// - onSelectPreset : fonction appelée quand on clique sur un preset
// - onAjouterPreset : fonction pour ajouter un nouveau preset custom
// - onSupprimerPreset : fonction pour supprimer un preset custom

function GestionPresets({ presets, presetActifId, onSelectPreset, onAjouterPreset, onSupprimerPreset }) {
  // State local pour le formulaire de création de preset
  const [creation, setCreation] = useState(false);
  const [nom, setNom] = useState("");
  const [glucides, setGlucides] = useState(40);
  const [proteines, setProteines] = useState(30);
  const [lipides, setLipides] = useState(30);

  // Calcul du total pour la validation (doit faire 100%)
  const total = glucides + proteines + lipides;
  const totalOk = total === 100;

  function creerPreset(e) {
    e.preventDefault();
    if (!nom.trim() || !totalOk) return;
    onAjouterPreset({
      id: "preset-custom-" + Date.now(),
      nom: nom.trim(),
      macros: { glucides, proteines, lipides },
      parDefaut: false, // C'est un preset custom, pas pré-défini
    });
    // Reset du formulaire
    setNom(""); setGlucides(40); setProteines(30); setLipides(30);
    setCreation(false);
  }

  const inputClass = "w-full rounded-lg border border-stone-300 px-3 py-2 text-sm text-stone-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent";

  return (
    <section className="bg-white rounded-2xl shadow-sm border border-stone-200 p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-stone-700">Presets macros</h2>
        <button
          onClick={() => setCreation(!creation)}
          className="text-sm font-medium text-emerald-600 hover:text-emerald-700 transition-colors"
        >
          {creation ? "Annuler" : "+ Créer"}
        </button>
      </div>
      <p className="text-xs text-stone-400">
        Choisis un preset pour définir la répartition de tes macros. Le dashboard s'adapte automatiquement.
      </p>

      {/* Liste des presets */}
      <div className="space-y-2">
        {presets.map((preset) => {
          const actif = preset.id === presetActifId;
          return (
            <div
              key={preset.id}
              onClick={() => onSelectPreset(preset.id)}
              className={`flex items-center justify-between p-3 rounded-xl cursor-pointer transition-all
                ${actif
                  ? "bg-emerald-50 border-2 border-emerald-500 shadow-sm"
                  : "bg-stone-50 border-2 border-transparent hover:border-stone-200"
                }`}
            >
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <p className={`text-sm font-medium ${actif ? "text-emerald-700" : "text-stone-700"}`}>
                    {preset.nom}
                  </p>
                  {/* Badge pour distinguer pré-défini vs personnalisé */}
                  {preset.parDefaut
                    ? <span className="text-xs bg-stone-100 text-stone-400 px-1.5 py-0.5 rounded">Défaut</span>
                    : <span className="text-xs bg-violet-100 text-violet-600 px-1.5 py-0.5 rounded">Perso</span>
                  }
                  {actif && <span className="text-xs bg-emerald-500 text-white px-1.5 py-0.5 rounded">Actif</span>}
                </div>
                <p className="text-xs text-stone-400 mt-0.5">
                  G {preset.macros.glucides}% · P {preset.macros.proteines}% · L {preset.macros.lipides}%
                </p>
              </div>
              {/* Bouton supprimer (seulement pour les presets custom) */}
              {!preset.parDefaut && (
                <button
                  onClick={(e) => {
                    e.stopPropagation(); // Empêche le clic de sélectionner le preset
                    onSupprimerPreset(preset.id);
                  }}
                  className="text-stone-400 hover:text-red-500 transition-colors p-1 ml-2"
                  title="Supprimer ce preset"
                >
                  ✕
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Formulaire de création de preset */}
      {creation && (
        <form onSubmit={creerPreset} className="bg-stone-50 rounded-xl p-4 space-y-3 border border-stone-200">
          <h3 className="text-sm font-semibold text-stone-600">Nouveau preset</h3>
          <input
            type="text"
            placeholder="Nom du preset (ex: Ma sèche été)"
            value={nom}
            onChange={(e) => setNom(e.target.value)}
            className={inputClass}
            required
          />
          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="block text-xs text-stone-500 mb-0.5">Glucides %</label>
              <input type="number" min={0} max={100} value={glucides}
                onChange={(e) => setGlucides(Number(e.target.value))} className={inputClass} />
            </div>
            <div>
              <label className="block text-xs text-stone-500 mb-0.5">Protéines %</label>
              <input type="number" min={0} max={100} value={proteines}
                onChange={(e) => setProteines(Number(e.target.value))} className={inputClass} />
            </div>
            <div>
              <label className="block text-xs text-stone-500 mb-0.5">Lipides %</label>
              <input type="number" min={0} max={100} value={lipides}
                onChange={(e) => setLipides(Number(e.target.value))} className={inputClass} />
            </div>
          </div>
          {/* Indicateur du total — doit faire 100% */}
          <p className={`text-xs font-medium text-center ${totalOk ? "text-emerald-600" : "text-red-500"}`}>
            Total : {total}% {totalOk ? "✓" : "(doit faire 100%)"}
          </p>
          <button
            type="submit"
            disabled={!nom.trim() || !totalOk}
            className={`w-full py-2 rounded-lg text-sm font-medium transition-colors
              ${nom.trim() && totalOk
                ? "bg-emerald-600 text-white hover:bg-emerald-700"
                : "bg-stone-200 text-stone-400 cursor-not-allowed"
              }`}
          >
            Créer le preset
          </button>
        </form>
      )}
    </section>
  );
}

// ============================================================
// COMPOSANT — Sélecteur de profils sauvegardés
// ============================================================
// Permet de :
// - Voir la liste de tous les profils sauvegardés
// - Charger un profil existant (restaure toutes ses données)
// - Sauvegarder le profil actuel sous un nom
// - Supprimer un profil sauvegardé
//
// Un "profil sauvegardé" = snapshot complet : données physiques + preset actif

function SelecteurProfils({ profilsSauvegardes, profilActifId, onChargerProfil, onSauvegarderProfil, onSupprimerProfil }) {
  const [sauvegarde, setSauvegarde] = useState(false);
  const [nomProfil, setNomProfil] = useState("");

  function sauvegarder(e) {
    e.preventDefault();
    if (!nomProfil.trim()) return;
    onSauvegarderProfil(nomProfil.trim());
    setNomProfil("");
    setSauvegarde(false);
  }

  const inputClass = "w-full rounded-lg border border-stone-300 px-3 py-2 text-sm text-stone-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent";

  return (
    <section className="bg-white rounded-2xl shadow-sm border border-stone-200 p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-stone-700">Mes profils</h2>
        <button
          onClick={() => setSauvegarde(!sauvegarde)}
          className="text-sm font-medium text-emerald-600 hover:text-emerald-700 transition-colors"
        >
          {sauvegarde ? "Annuler" : "💾 Sauvegarder"}
        </button>
      </div>
      <p className="text-xs text-stone-400">
        Sauvegarde ton profil actuel avec ses réglages et son preset. Tu pourras switcher entre tes profils à tout moment.
      </p>

      {/* Formulaire de sauvegarde */}
      {sauvegarde && (
        <form onSubmit={sauvegarder} className="flex gap-2">
          <input
            type="text"
            placeholder="Nom du profil (ex: Sèche été 2026)"
            value={nomProfil}
            onChange={(e) => setNomProfil(e.target.value)}
            className={inputClass}
            required
          />
          <button
            type="submit"
            disabled={!nomProfil.trim()}
            className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors
              ${nomProfil.trim()
                ? "bg-emerald-600 text-white hover:bg-emerald-700"
                : "bg-stone-200 text-stone-400 cursor-not-allowed"
              }`}
          >
            OK
          </button>
        </form>
      )}

      {/* Liste des profils sauvegardés */}
      {profilsSauvegardes.length === 0 ? (
        <div className="bg-stone-50 rounded-xl p-4 text-center">
          <p className="text-sm text-stone-400">Aucun profil sauvegardé.</p>
          <p className="text-xs text-stone-300 mt-1">Clique sur "Sauvegarder" pour enregistrer tes réglages actuels.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {profilsSauvegardes.map((p) => {
            const actif = p.id === profilActifId;
            return (
              <div
                key={p.id}
                className={`flex items-center justify-between p-3 rounded-xl transition-all
                  ${actif
                    ? "bg-emerald-50 border-2 border-emerald-500"
                    : "bg-stone-50 border-2 border-transparent"
                  }`}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className={`text-sm font-medium truncate ${actif ? "text-emerald-700" : "text-stone-700"}`}>
                      {p.nom}
                    </p>
                    {actif && <span className="text-xs bg-emerald-500 text-white px-1.5 py-0.5 rounded">Actif</span>}
                  </div>
                  <p className="text-xs text-stone-400 mt-0.5">
                    {p.profil.poids}kg · {OBJECTIFS[p.profil.objectif].label} · Preset: {p.presetNom || "Équilibré"}
                  </p>
                </div>
                <div className="flex items-center gap-1 ml-2">
                  {!actif && (
                    <button
                      onClick={() => onChargerProfil(p.id)}
                      className="text-xs bg-emerald-100 text-emerald-700 px-3 py-1.5 rounded-lg font-medium
                                 hover:bg-emerald-200 transition-colors"
                    >
                      Charger
                    </button>
                  )}
                  <button
                    onClick={() => onSupprimerProfil(p.id)}
                    className="text-stone-400 hover:text-red-500 transition-colors p-1"
                    title="Supprimer"
                  >
                    ✕
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

// ============================================================
// COMPOSANT — Profil utilisateur (BLOC 1)
// ============================================================

function ProfileForm({ profil, majProfil, mb, tdee, caloriesCibles }) {
  const inputClass = "w-full rounded-lg border border-stone-300 px-3 py-2 text-stone-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent";
  const selectClass = inputClass + " bg-white";

  return (
    <section className="bg-white rounded-2xl shadow-sm border border-stone-200 p-6">
      <h2 className="text-lg font-semibold text-stone-700 mb-4">Mon profil</h2>
      <div className="space-y-4">
        <div>
          <label htmlFor="poids" className="block text-sm font-medium text-stone-600 mb-1">Poids (kg)</label>
          <input id="poids" type="number" min={30} max={250} value={profil.poids} onChange={(e) => majProfil("poids", Number(e.target.value))} className={inputClass} />
        </div>
        <div>
          <label htmlFor="taille" className="block text-sm font-medium text-stone-600 mb-1">Taille (cm)</label>
          <input id="taille" type="number" min={100} max={250} value={profil.taille} onChange={(e) => majProfil("taille", Number(e.target.value))} className={inputClass} />
        </div>
        <div>
          <label htmlFor="age" className="block text-sm font-medium text-stone-600 mb-1">Âge (années)</label>
          <input id="age" type="number" min={14} max={100} value={profil.age} onChange={(e) => majProfil("age", Number(e.target.value))} className={inputClass} />
        </div>
        <div>
          <label htmlFor="sexe" className="block text-sm font-medium text-stone-600 mb-1">Sexe biologique</label>
          <select id="sexe" value={profil.sexe} onChange={(e) => majProfil("sexe", e.target.value)} className={selectClass}>
            <option value="Homme">Homme</option><option value="Femme">Femme</option>
          </select>
        </div>
        <div>
          <label htmlFor="activite" className="block text-sm font-medium text-stone-600 mb-1">Niveau d'activité</label>
          <select id="activite" value={profil.activite} onChange={(e) => majProfil("activite", Number(e.target.value))} className={selectClass}>
            {NIVEAUX_ACTIVITE.map((n, i) => <option key={i} value={i}>{n.label} — {n.description}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="objectif" className="block text-sm font-medium text-stone-600 mb-1">Objectif</label>
          <select id="objectif" value={profil.objectif} onChange={(e) => majProfil("objectif", Number(e.target.value))} className={selectClass}>
            {OBJECTIFS.map((o, i) => <option key={i} value={i}>{o.label} ({o.ajustement > 0 ? "+" : ""}{o.ajustement} kcal)</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="regime" className="block text-sm font-medium text-stone-600 mb-1">Régime alimentaire</label>
          <select id="regime" value={profil.regime} onChange={(e) => majProfil("regime", Number(e.target.value))} className={selectClass}>
            {REGIMES.map((r, i) => <option key={i} value={i}>{r}</option>)}
          </select>
        </div>
      </div>
      <div className="mt-6 pt-4 border-t border-stone-100 space-y-3">
        <h3 className="text-sm font-semibold text-stone-500 uppercase tracking-wide">Tes besoins estimés</h3>
        <div className="flex justify-between items-center py-2 border-b border-stone-100">
          <div><p className="text-sm font-medium text-stone-600">Métabolisme de base</p><p className="text-xs text-stone-400">Énergie au repos</p></div>
          <span className="text-lg font-bold text-stone-800">{mb} kcal</span>
        </div>
        <div className="flex justify-between items-center py-2 border-b border-stone-100">
          <div><p className="text-sm font-medium text-stone-600">Dépense totale (TDEE)</p><p className="text-xs text-stone-400">MB × {NIVEAUX_ACTIVITE[profil.activite].coeff}</p></div>
          <span className="text-lg font-bold text-stone-800">{tdee} kcal</span>
        </div>
        <div className="flex justify-between items-center py-2">
          <div><p className="text-sm font-medium text-emerald-700">Objectif calorique</p><p className="text-xs text-stone-400">{OBJECTIFS[profil.objectif].label}</p></div>
          <span className="text-xl font-bold text-emerald-700">{caloriesCibles} kcal</span>
        </div>
      </div>
    </section>
  );
}

// ============================================================
// COMPOSANT PRINCIPAL — App
// ============================================================

export default function App() {
  // --- NAVIGATION ---
  // On ajoute "dashboard" comme page possible.
  const [page, setPage] = useState("dashboard");

  // --- STATE BLOC 1 : PROFIL ---
  const [profil, setProfil] = useState(() => {
    try { const s = window.storage?.getItem("profile"); if (s) return JSON.parse(s); } catch (e) {}
    return PROFIL_DEFAUT;
  });

  const [mb, setMB] = useState(0);
  const [tdee, setTDEE] = useState(0);
  const [caloriesCibles, setCaloriesCibles] = useState(0);

  useEffect(() => {
    const nouveauMB = calculerMB(profil.poids, profil.taille, profil.age, profil.sexe);
    const nouveauTDEE = calculerTDEE(nouveauMB, profil.activite);
    const nouvellesCalories = calculerCaloriesCibles(nouveauTDEE, profil.objectif);
    setMB(Math.round(nouveauMB)); setTDEE(Math.round(nouveauTDEE)); setCaloriesCibles(Math.round(nouvellesCalories));
  }, [profil]);

  useEffect(() => {
    try { window.storage?.setItem("profile", JSON.stringify(profil)); } catch (e) {}
  }, [profil]);

  function majProfil(champ, valeur) { setProfil({ ...profil, [champ]: valeur }); }

  // --- STATE : DATE DU JOURNAL ---
  // dateJournal : la date actuellement affichée dans le Journal (par défaut : aujourd'hui)
  const [dateJournal, setDateJournal] = useState(dateAujourdhui);

  // --- STATE : PRESETS MACROS ---
  // On charge les presets custom depuis localStorage, puis on fusionne avec les pré-définis.
  // Les presets pré-définis sont toujours présents (PRESETS_DEFAUT), les custom s'ajoutent après.
  const [presetsCustom, setPresetsCustom] = useState(() => {
    try { const s = window.storage?.getItem("presets-custom"); if (s) return JSON.parse(s); } catch (e) {}
    return [];
  });
  // L'ID du preset actif. Par défaut = le premier preset ("Équilibré").
  const [presetActifId, setPresetActifId] = useState(() => {
    try { const s = window.storage?.getItem("preset-actif-id"); if (s) return s; } catch (e) {}
    return PRESETS_DEFAUT[0].id;
  });

  // Sauvegarde automatique des presets custom et du preset actif
  useEffect(() => {
    try { window.storage?.setItem("presets-custom", JSON.stringify(presetsCustom)); } catch (e) {}
  }, [presetsCustom]);
  useEffect(() => {
    try { window.storage?.setItem("preset-actif-id", presetActifId); } catch (e) {}
  }, [presetActifId]);

  // Fusion : pré-définis + personnalisés = tous les presets disponibles
  const tousLesPresets = [...PRESETS_DEFAUT, ...presetsCustom];

  // On retrouve le preset actif dans la liste. S'il n'existe plus, on prend le premier.
  const presetActif = tousLesPresets.find(p => p.id === presetActifId) || tousLesPresets[0];

  function ajouterPreset(preset) {
    setPresetsCustom([...presetsCustom, preset]);
  }
  function supprimerPreset(id) {
    setPresetsCustom(presetsCustom.filter(p => p.id !== id));
    // Si on supprime le preset actif, on revient au premier
    if (presetActifId === id) setPresetActifId(PRESETS_DEFAUT[0].id);
  }

  // --- STATE : PROFILS SAUVEGARDÉS (MULTI-PROFILS) ---
  // Chaque profil sauvegardé contient : id, nom, profil (données physiques), presetActifId, presetNom
  const [profilsSauvegardes, setProfilsSauvegardes] = useState(() => {
    try { const s = window.storage?.getItem("profils-sauvegardes"); if (s) return JSON.parse(s); } catch (e) {}
    return [];
  });
  // L'ID du profil actif (null si on utilise le profil "courant" non sauvegardé)
  const [profilActifId, setProfilActifId] = useState(() => {
    try { const s = window.storage?.getItem("profil-actif-id"); if (s) return s; } catch (e) {}
    return null;
  });

  useEffect(() => {
    try { window.storage?.setItem("profils-sauvegardes", JSON.stringify(profilsSauvegardes)); } catch (e) {}
  }, [profilsSauvegardes]);
  useEffect(() => {
    try { window.storage?.setItem("profil-actif-id", profilActifId); } catch (e) {}
  }, [profilActifId]);

  // Sauvegarder le profil actuel sous un nom
  function sauvegarderProfil(nom) {
    const nouveau = {
      id: "profil-" + Date.now(),
      nom,
      profil: { ...profil }, // Copie des données physiques actuelles
      presetActifId,
      presetNom: presetActif.nom,
    };
    setProfilsSauvegardes([...profilsSauvegardes, nouveau]);
    setProfilActifId(nouveau.id);
  }

  // Charger un profil sauvegardé → restaure toutes ses données
  function chargerProfil(id) {
    const p = profilsSauvegardes.find(x => x.id === id);
    if (!p) return;
    setProfil({ ...p.profil });            // Restaure les données physiques
    setPresetActifId(p.presetActifId);      // Restaure le preset
    setProfilActifId(id);                   // Marque ce profil comme actif
  }

  // Supprimer un profil sauvegardé
  function supprimerProfil(id) {
    setProfilsSauvegardes(profilsSauvegardes.filter(x => x.id !== id));
    if (profilActifId === id) setProfilActifId(null);
  }

  // --- STATE BLOC 2 : JOURNAL ---
  // Le journal est chargé en fonction de dateJournal (pas toujours aujourd'hui)
  function chargerJournalPourDate(d) {
    try { const s = window.storage?.getItem(`journal:${d}`); if (s) return JSON.parse(s); } catch (e) {}
    const vide = {}; REPAS_DEFAUT.forEach((r) => { vide[r.id] = []; }); return vide;
  }

  const [journal, setJournal] = useState(() => chargerJournalPourDate(dateAujourdhui()));

  // Sauvegarde automatique du journal quand il change (liée à dateJournal)
  useEffect(() => {
    try { window.storage?.setItem(`journal:${dateJournal}`, JSON.stringify(journal)); } catch (e) {}
  }, [journal, dateJournal]);

  // Valider la journée et passer au jour suivant
  function validerEtJourSuivant() {
    const d = new Date(dateJournal + "T12:00:00");
    d.setDate(d.getDate() + 1);
    const nouvDate = d.toISOString().slice(0, 10);
    setDateJournal(nouvDate);
    setJournal(chargerJournalPourDate(nouvDate));
  }

  // Revenir au jour précédent
  function jourPrecedent() {
    const d = new Date(dateJournal + "T12:00:00");
    d.setDate(d.getDate() - 1);
    const nouvDate = d.toISOString().slice(0, 10);
    setDateJournal(nouvDate);
    setJournal(chargerJournalPourDate(nouvDate));
  }

  // --- STATE : ALIMENTS PERSONNALISÉS ---
  // On charge depuis localStorage au démarrage (même principe que profil et journal)
  const [customFoods, setCustomFoods] = useState(() => {
    try { const s = window.storage?.getItem("food-db-custom"); if (s) return JSON.parse(s); } catch (e) {}
    return [];
  });
  // Sauvegarde automatique quand customFoods change
  useEffect(() => {
    try { window.storage?.setItem("food-db-custom", JSON.stringify(customFoods)); } catch (e) {}
  }, [customFoods]);

  // --- Fonctions de gestion de la base d'aliments ---
  function ajouterAlimentCustom(aliment) {
    const dejaExiste = customFoods.some(f => f.nom.toLowerCase() === aliment.nom.toLowerCase());
    if (!dejaExiste) {
      setCustomFoods([...customFoods, aliment]);
    }
  }
  function supprimerAlimentCustom(id) {
    setCustomFoods(customFoods.filter(f => f.id !== id));
  }

  const tousLesItems = Object.values(journal).flat();
  const totalJour = calculerTotaux(tousLesItems);

  // --- BLOC 3 : objectifs macros en grammes ---
  // IMPORTANT : on utilise le preset actif au lieu de MACROS_DEFAUT !
  // C'est ça qui fait que le dashboard reflète le preset choisi.
  const objectifsMacros = calculerObjectifsMacros(caloriesCibles, presetActif.macros);

  // --- RENDU ---
  return (
    <div className="min-h-screen bg-stone-50 text-stone-800">

      {/* ---- EN-TÊTE ---- */}
      <header className="bg-emerald-700 text-white sticky top-0 z-20 shadow-md">
        <div className="max-w-xl mx-auto pt-4 pb-2 px-4 text-center">
          <h1 className="text-xl font-bold tracking-tight">Cal(cul)ories</h1>
          <p className="text-emerald-200 text-xs">Suivi nutritionnel intelligent</p>
        </div>
        <nav className="max-w-xl mx-auto px-4 pb-3 flex justify-center gap-2">
          {[
            { id: "dashboard", label: "Dashboard" },
            { id: "saisie", label: "Journal" },
            { id: "journal", label: "Aliments" },
            { id: "profil", label: "Profil" },
          ].map((p) => (
            <button
              key={p.id}
              onClick={() => setPage(p.id)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors
                ${page === p.id
                  ? "bg-white text-emerald-700"
                  : "text-emerald-200 hover:text-white hover:bg-white/10"
                }`}
            >
              {p.label}
            </button>
          ))}
        </nav>
      </header>

      <main className="max-w-xl mx-auto p-4 space-y-4">

        {/* ---- PAGE DASHBOARD ---- */}
        {page === "dashboard" && (
          <Dashboard
            totalJour={totalJour}
            caloriesCibles={caloriesCibles}
            objectifsMacros={objectifsMacros}
            journal={journal}
          />
        )}

        {/* ---- PAGE JOURNAL (saisie en langage naturel) ---- */}
        {page === "saisie" && (
          <JournalSaisie
            journal={journal} setJournal={setJournal}
            customFoods={customFoods} onAjouterCustom={ajouterAlimentCustom}
            caloriesCibles={caloriesCibles} objectifsMacros={objectifsMacros}
            dateJournal={dateJournal} onValider={validerEtJourSuivant} onJourPrecedent={jourPrecedent}
          />
        )}

        {/* ---- PAGE ALIMENTS (ex-Journal) ---- */}
        {page === "journal" && (
          <>
            {/* En-tête : compteur d'aliments dans ta base */}
            <section className="bg-emerald-700 text-white rounded-2xl p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold">Ma base d'aliments</h2>
                  <p className="text-emerald-200 text-sm">Construis ta base perso, aliment par aliment</p>
                </div>
                <div className="text-right">
                  <p className="text-3xl font-bold">{customFoods.length}</p>
                  <p className="text-xs text-emerald-200">aliment{customFoods.length > 1 ? "s" : ""}</p>
                </div>
              </div>
            </section>

            {/* Formulaire d'ajout (toujours visible) */}
            <FormulaireAlimentManuel onAjouterCustom={ajouterAlimentCustom} />

            {/* Liste des aliments enregistrés */}
            <section className="bg-white rounded-2xl shadow-sm border border-stone-200 p-6">
              <h3 className="text-sm font-semibold text-stone-500 uppercase tracking-wide mb-3">
                Aliments enregistrés
              </h3>
              {customFoods.length === 0 ? (
                <p className="text-sm text-stone-400 text-center py-6">
                  Aucun aliment pour l'instant. Utilise le formulaire ci-dessus pour en ajouter !
                </p>
              ) : (
                <div className="space-y-2">
                  {customFoods.map((food) => (
                    <div key={food.id} className="flex items-center gap-3 p-3 bg-stone-50 rounded-xl">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-stone-700 truncate">{food.nom}</p>
                        <p className="text-xs text-stone-400">
                          {food.pour100g.calories} kcal · P {food.pour100g.proteines}g · G {food.pour100g.glucides}g · L {food.pour100g.lipides}g · F {food.pour100g.fibres}g
                        </p>
                      </div>
                      <span className="text-xs text-stone-300 hidden sm:block">pour 100g</span>
                      <button onClick={() => supprimerAlimentCustom(food.id)}
                        className="text-stone-400 hover:text-red-500 transition-colors p-1" title="Supprimer">✕</button>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </>
        )}

        {/* ---- PAGE PROFIL ---- */}
        {page === "profil" && (
          <>
            {/* Sélecteur de profils sauvegardés (multi-profils) */}
            <SelecteurProfils
              profilsSauvegardes={profilsSauvegardes}
              profilActifId={profilActifId}
              onChargerProfil={chargerProfil}
              onSauvegarderProfil={sauvegarderProfil}
              onSupprimerProfil={supprimerProfil}
            />

            {/* Formulaire du profil (données physiques) */}
            <ProfileForm profil={profil} majProfil={majProfil} mb={mb} tdee={tdee} caloriesCibles={caloriesCibles} />

            {/* Gestion des presets macros */}
            <GestionPresets
              presets={tousLesPresets}
              presetActifId={presetActifId}
              onSelectPreset={setPresetActifId}
              onAjouterPreset={ajouterPreset}
              onSupprimerPreset={supprimerPreset}
            />

            {/* Résumé : rappel de ce qui est appliqué au dashboard */}
            <section className="bg-emerald-50 rounded-2xl border border-emerald-200 p-4">
              <h3 className="text-sm font-semibold text-emerald-700 mb-2">Récap dashboard</h3>
              <p className="text-xs text-emerald-600">
                Objectif : <span className="font-semibold">{caloriesCibles} kcal/jour</span> ({OBJECTIFS[profil.objectif].label})
              </p>
              <p className="text-xs text-emerald-600">
                Preset : <span className="font-semibold">{presetActif.nom}</span> — G {presetActif.macros.glucides}% · P {presetActif.macros.proteines}% · L {presetActif.macros.lipides}%
              </p>
              <p className="text-xs text-emerald-600">
                Objectifs macros : P {objectifsMacros.proteines}g · G {objectifsMacros.glucides}g · L {objectifsMacros.lipides}g
              </p>
            </section>
          </>
        )}

        <p className="text-xs text-stone-400 text-center pb-4">
          Cal(cul)ories — Calculs basés sur Mifflin-St Jeor
        </p>
      </main>
    </div>
  );
}
