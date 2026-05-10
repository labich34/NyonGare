# McDonald's Nyon Gare — Application de pilotage

Application web de pilotage des KPIs mensuels et d'évaluation des managers pour le McDonald's de Nyon Gare.

**Version actuelle :** v8

## Fonctionnalités

### 7 onglets principaux
1. **Tableau de bord** — vue d'ensemble du mois en cours
2. **Saisie mensuelle** — KPIs du pôle + évaluation managers
3. **Avis Google** — saisie manuelle des avis individuels
4. **Managers** — consultation (classement, graphiques, historique)
5. **TikTok** — 15 dernières vidéos avec analyse IA optionnelle
6. **Rapport mensuel** — synthèse statique avec graphiques (export PDF)
7. **Configuration** — objectifs, pondérations, sauvegarde JSON

### KPIs du pôle
- Nombre d'avis Google
- Note Google /5
- Fast Inside %
- O&P %

### Évaluation managers (4 axes pondérés)
1. O&P personnel (30% par défaut)
2. Avis Google générés (25%)
3. Communication hospitalité (25%) — composite : briefings, formation, animation
4. Nettoyage lobby (20%)

### Logique de progression
- Plafonnée à 100%
- 🟢 Vert ≥ 95% (seuil prime)
- 🟠 Orange 70-95%
- 🔴 Rouge < 70%

## Installation

```bash
# Cloner le repo
git clone https://github.com/<ton-user>/mcdo-nyon-pilotage.git
cd mcdo-nyon-pilotage

# Installer les dépendances
npm install

# Lancer en dev
npm start
```

L'application sera accessible sur `http://localhost:3000`.

## Build production

```bash
npm run build
```

Les fichiers buildés sont dans `build/`.

## Stack technique
- React 18 (Create React App)
- Tailwind CSS 3
- Recharts (graphiques)
- Lucide React (icônes)
- localStorage (persistance)

## Stockage des données
Toutes les données sont stockées localement dans le navigateur (clé `mcdo-nyon-data-v8`). Migration automatique depuis v7.

**⚠️ Important :** sauvegarde régulièrement via l'export JSON dans l'onglet Configuration.

## Historique des versions
- **v1-v3** : structure de base + évaluation hospitalité éclatée
- **v4** : rapport IA + exports + import JSON
- **v5** : correction logique O&P + photos managers
- **v6** : passage en thème dark
- **v7** : centralisation saisie KPIs + managers
- **v8** : rapport statique avec graphiques (sans IA)

## Licence
Usage interne — McDonald's Nyon Gare.
