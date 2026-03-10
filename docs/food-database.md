# Spécifications — Base de données alimentaire

## Format

Fichier JSON (`src/data/foods.json`) contenant un tableau d'objets. Chaque objet représente un aliment avec ses valeurs nutritionnelles pour 100g.

## Structure d'un aliment

```json
{
  "id": "identifiant-unique-en-kebab-case",
  "nom": "Nom affiché dans l'interface",
  "categorie": "Catégorie de l'aliment",
  "pour100g": {
    "calories": 0,
    "proteines": 0,
    "glucides": 0,
    "lipides": 0,
    "fibres": 0
  }
}
```

## Champs détaillés

| Champ | Type | Description |
|---|---|---|
| `id` | string | Identifiant unique, en kebab-case (ex: `tofu-ferme`) |
| `nom` | string | Nom de l'aliment tel qu'affiché à l'utilisateur |
| `categorie` | string | Catégorie pour le classement et la recherche |
| `pour100g.calories` | number | Kilocalories pour 100g |
| `pour100g.proteines` | number | Grammes de protéines pour 100g |
| `pour100g.glucides` | number | Grammes de glucides pour 100g |
| `pour100g.lipides` | number | Grammes de lipides pour 100g |
| `pour100g.fibres` | number | Grammes de fibres pour 100g |

## Catégories prévues

- Protéines végétales (tofu, tempeh, seitan, légumineuses…)
- Céréales et féculents (riz, pâtes, pain, quinoa…)
- Fruits et légumes
- Oléagineux et graines (noix, amandes, graines de chia…)
- Produits laitiers végétaux (lait d'avoine, yaourt soja…)
- Huiles et matières grasses
- Autres / Personnalisé

## Comment ajouter un aliment

1. Ouvrir `src/data/foods.json`
2. Ajouter un nouvel objet dans le tableau en respectant la structure ci-dessus
3. Utiliser un `id` unique en kebab-case
4. Renseigner les valeurs nutritionnelles pour 100g (trouver les infos sur l'emballage du produit ou sur un site comme Open Food Facts)

## Calcul dans l'application

Quand l'utilisateur saisit une quantité, le calcul est :
```
valeur = (valeur_pour_100g × quantité_en_grammes) / 100
```

## Aliments personnalisés (runtime)

En plus de cette base JSON statique, l'utilisateur pourra ajouter des aliments personnalisés via l'interface. Ceux-ci seront stockés séparément dans `window.storage` sous la clé `food-db-custom`.
