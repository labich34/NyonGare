# Setup — Déploiement sur GitHub Pages

Guide pas à pas pour mettre l'application en ligne via GitHub Pages.

---

## Prérequis

- [Node.js](https://nodejs.org/) installé (version 18 ou 20)
- [Git](https://git-scm.com/) installé
- Un compte GitHub

---

## Étape 1 — Préparer le projet en local

```bash
# Décompresser le ZIP, puis :
cd mcdo-nyon-pilotage

# Installer les dépendances
npm install

# Tester en local
npm start
```

L'app s'ouvre sur http://localhost:3000. Vérifie que tout fonctionne avant de continuer.

---

## Étape 2 — Créer le repo sur GitHub

1. Va sur https://github.com/new
2. **Repository name** : `mcdo-nyon-pilotage`
3. **Description** : `Application de pilotage McDonald's Nyon Gare`
4. Coche **Public**
5. ⚠️ **Ne pas** cocher "Add a README" (déjà inclus)
6. Clique **Create repository**

---

## Étape 3 — Configurer le homepage dans package.json

Ouvre `package.json` et remplace la ligne :

```json
"homepage": "https://VOTRE-USER-GITHUB.github.io/mcdo-nyon-pilotage",
```

par ton vrai nom d'utilisateur GitHub. Par exemple si ton user est `fabienmcdo` :

```json
"homepage": "https://fabienmcdo.github.io/mcdo-nyon-pilotage",
```

⚠️ **Cette étape est obligatoire**, sinon les fichiers CSS/JS ne se chargeront pas après déploiement.

---

## Étape 4 — Pousser le code sur GitHub

```bash
git init
git add .
git commit -m "Initial commit — v8"
git branch -M main
git remote add origin https://github.com/VOTRE-USER-GITHUB/mcdo-nyon-pilotage.git
git push -u origin main
```

(Remplace `VOTRE-USER-GITHUB` par ton vrai user.)

---

## Étape 5 — Déployer sur GitHub Pages

Une seule commande :

```bash
npm run deploy
```

Ça fait automatiquement :
1. `npm run build` (créé le dossier `build/` optimisé)
2. `gh-pages -d build` (push le contenu sur la branche `gh-pages` du repo)

---

## Étape 6 — Activer GitHub Pages dans les settings

1. Va sur ton repo sur GitHub
2. **Settings** (en haut à droite) → **Pages** (menu gauche)
3. Sous **Build and deployment** :
   - **Source** : `Deploy from a branch`
   - **Branch** : `gh-pages` / `(root)`
   - Clique **Save**
4. Attends 1-2 minutes
5. L'URL apparaît en haut : `https://VOTRE-USER.github.io/mcdo-nyon-pilotage/`

---

## Workflow pour les futures mises à jour

```bash
# Modifier le code
# ... éditer src/App.js ...

# Tester en local
npm start

# Quand prêt, commit + push
git add .
git commit -m "Description du changement"
git push

# Redéployer en ligne
npm run deploy
```

Le redéploiement prend 1-2 minutes pour être visible.

---

## Notes importantes

### Données et stockage
L'app utilise le **localStorage du navigateur**. Chaque utilisateur (= chaque navigateur) a ses propres données isolées. Donc :
- Les données de Fabien restent privées sur son navigateur
- Aucune donnée n'est exposée publiquement
- ⚠️ Si Fabien efface l'historique du navigateur ou change d'appareil, les données sont perdues
- **Bien penser à utiliser l'export JSON régulièrement** (onglet Configuration) pour faire des backups

### Analyse IA TikTok désactivée
L'analyse IA des vidéos TikTok est désactivée dans cette version (elle nécessite une clé API Anthropic côté serveur). Le bouton affiche désormais un message informatif avec les stats de la vidéo.

Pour la réactiver plus tard, il faudrait :
- Soit migrer vers Vercel/Netlify avec une serverless function comme proxy
- Soit créer un petit backend (Node.js, Cloudflare Worker, etc.)

### Sécurité — repo public
Comme le repo est public :
- **Ne jamais commit de données réelles** (avis Google nominatifs, photos managers, exports JSON)
- Le fichier `.gitignore` exclut déjà `backups/` et `*.backup.json`
- N'expose pas l'URL publique inutilement

---

## Dépannage

### Erreur "Module not found" au build
```bash
rm -rf node_modules package-lock.json
npm install
```

### Page blanche après déploiement
Vérifie que `homepage` dans `package.json` correspond bien à ton URL GitHub Pages.

### "404 — Page not found" sur GitHub Pages
- Vérifie que la branche `gh-pages` existe bien (Settings → Pages)
- Attends 2-3 minutes après le premier déploiement
- Force-refresh avec Ctrl+Shift+R / Cmd+Shift+R
