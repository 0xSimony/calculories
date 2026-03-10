# Guide de déploiement — Cal(cul)ories

## Ce que tu vas faire
Mettre ton app en ligne pour que ta famille puisse y accéder via une URL (genre `calculories.vercel.app`).

## Prérequis
- Un compte GitHub (gratuit) → https://github.com
- Un compte Vercel (gratuit) → https://vercel.com (connecte-toi avec GitHub)
- Node.js installé sur ton PC → https://nodejs.org (version LTS)

---

## Étape 1 : Créer un repo GitHub

1. Va sur https://github.com/new
2. Nom du repo : `calculories`
3. Coche **Private** (repo privé — important pour la sécurité)
4. Clique "Create repository"
5. GitHub te donne des commandes. Ouvre un terminal dans le dossier `Macro tracker` et tape :

```bash
git init
git add .
git commit -m "Premier déploiement Cal(cul)ories"
git branch -M main
git remote add origin https://github.com/TON-USERNAME/calculories.git
git push -u origin main
```

⚠️ Vérifie que `.env` N'EST PAS dans les fichiers commités (le `.gitignore` s'en charge).

---

## Étape 2 : Déployer sur Vercel

1. Va sur https://vercel.com/new
2. Clique "Import Git Repository"
3. Sélectionne ton repo `calculories`
4. Dans les settings avant de déployer :
   - **Framework Preset** : Other
   - **Root Directory** : `.` (la racine)
   - **Output Directory** : `public`
5. Clique "Deploy"

---

## Étape 3 : Configurer la clé API (CRUCIAL)

1. Dans Vercel, va dans ton projet → **Settings** → **Environment Variables**
2. Ajoute une variable :
   - **Name** : `CLAUDE_API_KEY`
   - **Value** : colle ta clé API Anthropic (celle qui commence par `sk-ant-api03-...`). Tu la trouveras dans ton fichier `.env` local.
   - **Environment** : coche Production, Preview, Development
3. Clique "Save"
4. Redéploie : va dans **Deployments** → clique "..." sur le dernier → **Redeploy**

---

## Étape 4 : Tester

1. Vercel te donne une URL (ex: `calculories.vercel.app`)
2. Ouvre-la dans ton navigateur
3. Va dans l'onglet Journal, tape "j'ai mangé une banane" → ça doit fonctionner !
4. Partage l'URL à ta famille

---

## Structure du projet

```
Macro tracker/
├── api/
│   └── analyze.js        ← Backend (serverless function, clé API secrète)
├── public/
│   └── index.html         ← Frontend (l'app React)
├── src/
│   └── preview-bloc1-2-3.html  ← Version de développement
├── .env                   ← Ta clé API locale (JAMAIS sur GitHub)
├── .env.example           ← Exemple pour d'autres développeurs
├── .gitignore             ← Empêche .env d'aller sur GitHub
├── package.json           ← Config du projet Node.js
├── vercel.json            ← Config de déploiement Vercel
└── DEPLOIEMENT.md         ← Ce fichier !
```

---

## Comment ça marche (schéma simplifié)

```
Utilisateur (navigateur)
    │
    │  "j'ai mangé 200g de tofu"
    │
    ▼
/api/analyze (backend Vercel)
    │
    │  + clé API secrète
    │
    ▼
API Claude (Anthropic)
    │
    │  JSON structuré
    │
    ▼
Retour au navigateur → affichage
```

La clé API ne quitte jamais le serveur. L'utilisateur ne la voit jamais.

---

## Mises à jour futures

Pour mettre à jour l'app :
1. Modifie `public/index.html` (ou `src/preview-bloc1-2-3.html` puis copie dans public)
2. Commit et push :
```bash
git add .
git commit -m "Description de la modification"
git push
```
3. Vercel redéploie automatiquement en 30 secondes !

---

## FAQ

**Q: Chaque personne aura ses propres données ?**
R: Oui ! Les données sont dans le localStorage de chaque navigateur. Si ta sœur ouvre l'URL sur son téléphone, elle a ses propres données séparées.

**Q: Et si quelqu'un vide son cache ?**
R: Il perd ses données. Pour l'instant c'est le seul risque. Plus tard on pourra ajouter Supabase pour sauvegarder en ligne.

**Q: C'est gratuit ?**
R: Oui ! Vercel offre un plan gratuit largement suffisant. L'API Claude a un coût par utilisation mais c'est très faible (~0.01€ par analyse de repas).

**Q: Je peux avoir un nom de domaine custom ?**
R: Oui ! Dans Vercel → Settings → Domains, tu peux ajouter un domaine perso (ex: calculories.fr).
