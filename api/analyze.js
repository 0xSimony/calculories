// === SERVERLESS FUNCTION : Relais vers l'API Claude ===
// Ce fichier tourne côté SERVEUR (pas dans le navigateur).
// Il reçoit le texte de l'utilisateur + le prompt système depuis le frontend,
// appelle l'API Claude avec la clé secrète, et renvoie la réponse.
//
// Pourquoi ? La clé API reste secrète ici. Le navigateur n'y a jamais accès.
// Sur Vercel, ce fichier devient une "serverless function" accessible via /api/analyze

export default async function handler(req, res) {
  // --- 1. On n'accepte que les requêtes POST ---
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Méthode non autorisée. Utilise POST." });
  }

  // --- 2. On récupère la clé API depuis les variables d'environnement ---
  // process.env = les variables secrètes configurées sur Vercel (ou dans .env en local)
  const apiKey = process.env.CLAUDE_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "Clé API non configurée côté serveur." });
  }

  // --- 3. On récupère les données envoyées par le frontend ---
  const { texte, systemPrompt } = req.body;
  if (!texte || !systemPrompt) {
    return res.status(400).json({ error: "Paramètres manquants : texte et systemPrompt requis." });
  }

  try {
    // --- 4. On appelle l'API Claude ---
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01"
        // Pas besoin du header "dangerous-direct-browser-access" ici
        // car l'appel est fait depuis le serveur, pas depuis le navigateur !
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1024,
        system: systemPrompt,
        messages: [{ role: "user", content: texte }]
      })
    });

    // --- 5. On gère les erreurs de l'API ---
    if (!response.ok) {
      const erreurTexte = await response.text();
      return res.status(response.status).json({
        error: `Erreur API Claude (${response.status}): ${erreurTexte}`
      });
    }

    // --- 6. On renvoie la réponse au frontend ---
    const data = await response.json();
    return res.status(200).json(data);

  } catch (error) {
    return res.status(500).json({ error: "Erreur serveur : " + error.message });
  }
}
