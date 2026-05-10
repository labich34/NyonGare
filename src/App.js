// =============================================================================
// McDonald's Nyon Gare — Application de pilotage
// Version: v8
// =============================================================================
//
// ⚠️  COLLE ICI LE CONTENU DE TON FICHIER mcdo-nyon-pilotage-v8.jsx
//
// Le composant doit être exporté en default :
//     export default function App() { ... }
//
// Si ton fichier exporte sous un autre nom (ex: McDoNyonPilotage),
// renomme-le en App ou ajoute en bas du fichier :
//     export default McDoNyonPilotage;
//
// =============================================================================

import React from 'react';

export default function App() {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex items-center justify-center p-8">
      <div className="max-w-md text-center">
        <h1 className="text-2xl font-bold mb-4 text-mcdo-yellow">
          McDo Nyon — Pilotage v8
        </h1>
        <p className="text-zinc-400 mb-2">
          Placeholder. Remplace le contenu de <code className="text-mcdo-yellow">src/App.js</code> par ton fichier{' '}
          <code className="text-mcdo-yellow">mcdo-nyon-pilotage-v8.jsx</code>.
        </p>
        <p className="text-zinc-500 text-sm">
          Pense à exporter en <code>export default function App()</code>.
        </p>
      </div>
    </div>
  );
}
