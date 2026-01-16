# CLAUDE.md — ModernWeb.fr

## 1. Présentation générale

ModernWeb.fr est un site web en production, accessible à l’adresse :
https://modernweb.fr/

Le site est **fonctionnel, stable et volontairement simple**.
Il sert principalement de vitrine professionnelle autour du développement web et des services associés.

⚠️ Toute intervention sur le projet doit **conserver strictement** :
- les fonctionnalités existantes
- le comportement utilisateur
- le rendu visuel global
- la logique métier

Aucun redesign, aucune nouvelle feature, aucune suppression implicite.

---

## 2. Objectif de ce dépôt

Ce dépôt a pour but :
- d’héberger le code source du site ModernWeb.fr
- de permettre son amélioration **technique et architecturale**
- sans modifier son fonctionnement visible

L’objectif prioritaire est la **qualité interne** :
- architecture claire
- code maintenable
- structure compréhensible
- base saine pour évolutions futures

---

## 3. Philosophie du projet

Le site privilégie :
- la clarté plutôt que la sur-ingénierie
- la lisibilité plutôt que l’optimisation prématurée
- des choix techniques simples et robustes

Toute refonte doit :
- simplifier, pas complexifier
- clarifier les responsabilités
- réduire la dette technique
- éviter toute abstraction inutile

---

## 4. Règles absolues (non négociables)

❌ Ne pas ajouter de nouvelles fonctionnalités  
❌ Ne pas modifier le comportement existant  
❌ Ne pas changer le design ou l’identité visuelle  
❌ Ne pas introduire de dépendances inutiles  

✅ Refactoring interne autorisé  
✅ Réorganisation des fichiers autorisée  
✅ Nettoyage du code autorisé  
✅ Harmonisation des conventions autorisée  

Le site final doit se comporter **exactement comme la version actuellement en ligne**.

---

## 5. Architecture du projet

### Structure des dossiers

```
/
├── index.html              # Page d'accueil
├── manifest.json           # PWA manifest
├── claude.md               # Ce fichier
├── css/
│   ├── style.css           # Styles globaux (navbar, footer, sections, responsive)
│   ├── premium-cards.css   # Cartes 3D des services (effet flip)
│   ├── featured-projects.css # Variantes de couleur des cartes projets
│   ├── avis.css            # Page des avis clients
│   └── cookie-consent.css  # Bannière RGPD cookies
├── js/
│   ├── script.js           # Script principal (menu mobile, reviews home, portfolio)
│   ├── config.js           # Configuration (clés API Supabase/EmailJS)
│   ├── supabase-client.js  # Client Supabase initialisé
│   ├── cookie-consent.js   # Gestion consentement cookies
│   ├── avis.js             # Page avis (affichage + formulaire)
│   ├── hero-3d.js          # Animation 3D du hero (Three.js)
│   ├── qcm.js              # Quiz définition projet
│   ├── project-wizard.js   # Wizard multi-étapes projets
│   ├── keepAlive.js        # Keep-alive backend (Render)
│   └── utils/
│       └── review-helpers.js # Fonctions partagées pour les avis
├── pages/
│   ├── realisations.html   # Portfolio des projets
│   ├── avis.html           # Avis clients
│   ├── contact.html        # Formulaire de contact
│   ├── services.html       # Détail des services
│   ├── apropos.html        # À propos
│   ├── definir-mon-projet.html # Wizard définition projet
│   ├── mentions-legales.html
│   └── confidentialite.html
├── images/                 # Assets images
├── email_templates/        # Templates EmailJS
└── python/                 # Scripts utilitaires
```

### Services externes

| Service   | Usage                          | Configuration        |
|-----------|--------------------------------|----------------------|
| Supabase  | Base de données avis clients   | `js/config.js`       |
| EmailJS   | Envoi emails (contact, avis)   | `js/config.js`       |
| Google Fonts | Police Outfit              | CDN dans `<head>`    |
| Font Awesome | Icônes                      | CDN dans `<head>`    |

### Responsabilités des fichiers JS

- **script.js** : Initialisation globale (menu mobile, reviews homepage, filtres portfolio, modal projets)
- **avis.js** : Chargement temps réel des avis, soumission du formulaire
- **cookie-consent.js** : Bannière RGPD, stockage consentement localStorage
- **supabase-client.js** : Instance unique du client Supabase
- **utils/review-helpers.js** : Fonctions réutilisables (avatar, étoiles, formatage date)

### Conventions de nommage

- Fichiers : kebab-case (`cookie-consent.js`, `featured-projects.css`)
- Classes CSS : kebab-case (`.project-card`, `.footer-links`)
- Fonctions JS : camelCase (`initMobileMenu()`, `loadHomeReviews()`)
- Constantes JS : SCREAMING_SNAKE_CASE (`SUPABASE_URL`)

---

## 6. CSS et mise en page

- Le CSS doit être cohérent et lisible
- Éviter les règles globales dangereuses
- Réduire les duplications de styles
- Corriger les incohérences structurelles si elles viennent du HTML/CSS

⚠️ Ne pas modifier le design volontairement.

---

## 7. Lisibilité et commentaires

- Le code doit être compréhensible par un développeur externe
- Les commentaires doivent expliquer le *pourquoi*, pas le *quoi*
- Pas de commentaires évidents ou inutiles

---

## 8. Référence visuelle

Le site en production est la **référence absolue** :
https://modernweb.fr/

Si une décision technique impacte le rendu ou le comportement,
elle est **incorrecte**.

---

## 9. État d’esprit attendu

Travailler sur ce projet comme si :
- il devait être maintenu plusieurs années
- par une équipe professionnelle
- avec des évolutions futures probables

La priorité est la **solidité**, pas l’esbroufe.

---

Fin du document.
