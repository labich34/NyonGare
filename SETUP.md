# Setup GitHub — pas à pas

## 1. Préparer le projet en local

```bash
# Décompresser l'archive téléchargée
unzip mcdo-nyon-pilotage.zip
cd mcdo-nyon-pilotage

# Copier ton fichier v8 dans src/App.js
# (remplacer le placeholder)
cp ~/Downloads/mcdo-nyon-pilotage-v8.jsx src/App.js

# Adapter l'export en bas du fichier si besoin :
#   export default function App() { ... }

# Installer les dépendances
npm install

# Tester que ça démarre
npm start
```

L'app s'ouvre sur http://localhost:3000.

## 2. Créer le repo sur GitHub

1. Aller sur https://github.com/new
2. Repository name : `mcdo-nyon-pilotage`
3. Description : `Application de pilotage KPIs et évaluation managers — McDonald's Nyon Gare`
4. **Public**
5. ⚠️ **Ne pas** cocher "Add a README" (déjà inclus)
6. Cliquer "Create repository"

## 3. Pousser le code

```bash
# Initialiser git
git init
git add .
git commit -m "Initial commit — v8"

# Lier au repo GitHub (remplace <ton-user>)
git branch -M main
git remote add origin https://github.com/<ton-user>/mcdo-nyon-pilotage.git
git push -u origin main
```

## 4. (Optionnel) Déploiement gratuit

### GitHub Pages
```bash
npm install --save-dev gh-pages
```

Ajouter dans `package.json` :
```json
"homepage": "https://<ton-user>.github.io/mcdo-nyon-pilotage",
"scripts": {
  "predeploy": "npm run build",
  "deploy": "gh-pages -d build"
}
```

Puis :
```bash
npm run deploy
```

### Vercel (plus simple)
1. Aller sur https://vercel.com
2. "Import Git Repository"
3. Sélectionner ton repo
4. Deploy (détection auto de CRA)

## 5. Workflow Git pour les futures versions

```bash
# Pour chaque nouvelle version (v9, v10...)
git checkout -b feature/v9-vue-annuelle
# ... modifs ...
git add .
git commit -m "v9 — Vue annuelle 12 mois"
git push origin feature/v9-vue-annuelle

# Puis créer une Pull Request sur GitHub, merger dans main
# Tagger la version :
git checkout main
git pull
git tag -a v9.0.0 -m "Version 9 — Vue annuelle"
git push origin v9.0.0
```

## ⚠️ Sécurité — repo public

Comme le repo est public :
- **Ne jamais commit de données réelles** (avis Google nominatifs, photos managers, exports JSON contenant des données)
- Le fichier `.gitignore` exclut déjà `backups/` et `*.backup.json`
- Si tu as besoin de stocker des secrets (clés API), utilise un `.env.local` (déjà ignoré)
- Pour des données sensibles, envisage un repo privé à terme
