import React, { useState, useEffect, useMemo, useRef } from 'react';
import { TrendingUp, TrendingDown, Star, Users, Target, Award, Plus, Trash2, BarChart3, MessageSquare, Video, AlertCircle, CheckCircle2, Sparkles, Brush, GraduationCap, DollarSign, ChevronDown, ChevronUp, ExternalLink, Loader2, Wand2, FileDown, Share2, Upload, Download, FileText, Bell, Camera, X, Eye, Edit3, ShoppingBag } from 'lucide-react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts';

const DEFAULT_OBJECTIFS_POLE = { avisGoogleNombre: 50, avisGoogleNote: 4.2, fastInside: 85, oep: 12 };

const moisLabel = (ym) => {
  if (!ym) return '';
  const [y, m] = ym.split('-');
  const noms = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];
  return `${noms[parseInt(m) - 1]} ${y}`;
};

const moisLabelCourt = (ym) => {
  if (!ym) return '';
  const [y, m] = ym.split('-');
  const noms = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc'];
  return `${noms[parseInt(m) - 1]} ${y.slice(2)}`;
};

const moisCourant = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};

const moisPrecedent = () => {
  const d = new Date();
  d.setDate(1);
  d.setMonth(d.getMonth() - 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};

function calculerProgression(valeur, cible) {
  if (valeur === '' || valeur === null || valeur === undefined) return { pct: 0, atteint: false, hasValue: false };
  const v = parseFloat(valeur);
  const c = parseFloat(cible);
  if (isNaN(v) || isNaN(c) || c === 0) return { pct: 0, atteint: false, hasValue: false };
  const pct = Math.max(0, Math.min(100, (v / c) * 100));
  return { pct, atteint: pct >= 95, hasValue: true };
}

const SOUS_CRITERES_HOSPITALITE = [
  { id: 'briefings', nom: 'Briefings équipe hospitalité', poidsDefaut: 35 },
  { id: 'formation', nom: 'Formation des équipiers', poidsDefaut: 35 },
  { id: 'animation', nom: 'Animation / challenges équipe', poidsDefaut: 30 },
];

const AXES_MANAGER = [
  { id: 'oep', nom: 'O&P personnel', icon: DollarSign, poidsDefaut: 30, description: '% O&P du manager sur ses services', type: 'pourcentage', objectifChamp: 'oepObjectifManager' },
  { id: 'avisGoogle', nom: 'Avis Google générés', icon: MessageSquare, poidsDefaut: 25, description: "Nombre d'avis générés sur ses services", type: 'nombre', objectifChamp: 'avisObjectifManager' },
  { id: 'hospitalite', nom: 'Communication hospitalité', icon: GraduationCap, poidsDefaut: 25, description: '3 sous-critères : briefings, formation, animation', type: 'composite' },
  { id: 'lobby', nom: 'Nettoyage lobby', icon: Brush, poidsDefaut: 20, description: 'Exécution tâches lobby', type: 'note' },
];

const DEFAULT_DATA = {
  moisActif: moisCourant(),
  objectifs: DEFAULT_OBJECTIFS_POLE,
  objectifsManager: { oepObjectifManager: 12, avisObjectifManager: 15 },
  poidsAxes: AXES_MANAGER.reduce((acc, a) => ({ ...acc, [a.id]: a.poidsDefaut }), {}),
  poidsHospitalite: SOUS_CRITERES_HOSPITALITE.reduce((acc, c) => ({ ...acc, [c.id]: c.poidsDefaut }), {}),
  managers: [],
  mois: {},
  jours: {}, // v9 : { 'YYYY-MM': { 'JJ': { avisNouveaux, note, fastInside, oep } } }
  tiktok: {},
  uberEats: {}, // v9 : { 'YYYY-MM': { reclamations: [{ id, date, numeroCommande, typeErreur, commentaire }] } }
  rapportsAuto: {},
  rapportsAutoIgnores: [],
};

// === v9 : Helpers données journalières ===
// Nombre de jours dans un mois donné (format 'YYYY-MM')
function joursDansMois(moisYYYYMM) {
  const [annee, mois] = moisYYYYMM.split('-').map(Number);
  return new Date(annee, mois, 0).getDate();
}

// Calcule les moyennes/cumuls mensuels à partir des saisies journalières
// Retourne { avisGoogleNombre, avisGoogleNote, fastInside, oep, joursSaisis, totalJours, joursNote, joursFast, joursOep }
function calculerMoyennesMois(joursDuMois) {
  const jours = joursDuMois || {};
  let cumulAvis = 0;
  const notes = [];
  const fasts = [];
  const oeps = [];
  let joursSaisis = 0;

  Object.values(jours).forEach((j) => {
    const aSaisie = (j.avisNouveaux !== '' && j.avisNouveaux !== undefined && !isNaN(parseFloat(j.avisNouveaux)))
      || (j.note !== '' && j.note !== undefined && !isNaN(parseFloat(j.note)))
      || (j.fastInside !== '' && j.fastInside !== undefined && !isNaN(parseFloat(j.fastInside)))
      || (j.oep !== '' && j.oep !== undefined && !isNaN(parseFloat(j.oep)));
    if (aSaisie) joursSaisis++;

    const av = parseFloat(j.avisNouveaux);
    if (!isNaN(av)) cumulAvis += av;
    const n = parseFloat(j.note);
    if (!isNaN(n)) notes.push(n);
    const f = parseFloat(j.fastInside);
    if (!isNaN(f)) fasts.push(f);
    const o = parseFloat(j.oep);
    if (!isNaN(o)) oeps.push(o);
  });

  const moy = (arr) => arr.length === 0 ? '' : (arr.reduce((s, v) => s + v, 0) / arr.length);
  return {
    avisGoogleNombre: cumulAvis === 0 && Object.keys(jours).length === 0 ? '' : String(cumulAvis),
    avisGoogleNote: notes.length === 0 ? '' : String(Math.round(moy(notes) * 100) / 100),
    fastInside: fasts.length === 0 ? '' : String(Math.round(moy(fasts) * 10) / 10),
    oep: oeps.length === 0 ? '' : String(Math.round(moy(oeps) * 10) / 10),
    joursSaisis,
    joursNote: notes.length,
    joursFast: fasts.length,
    joursOep: oeps.length,
  };
}

// Fusionne les KPIs calculés depuis les jours avec les autres champs du mois (évaluations, avisDetailles, notes...)
function reconstruireMoisData(joursDuMois, moisDataBrut) {
  const moy = calculerMoyennesMois(joursDuMois);
  const base = moisDataBrut || { avisDetailles: [], evaluations: {}, notes: '' };
  // Si pas de jours saisis, on garde les valeurs mensuelles historiques (rétrocompat v8)
  const hasJours = moy.joursSaisis > 0;
  return {
    ...base,
    avisGoogleNombre: hasJours ? moy.avisGoogleNombre : (base.avisGoogleNombre || ''),
    avisGoogleNote: hasJours ? moy.avisGoogleNote : (base.avisGoogleNote || ''),
    fastInside: hasJours ? moy.fastInside : (base.fastInside || ''),
    oep: hasJours ? moy.oep : (base.oep || ''),
    _moy: moy, // métadonnées pour UI
  };
}

async function compresserImage(file, maxSize = 200) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let { width, height } = img;
        if (width > height) {
          if (width > maxSize) { height *= maxSize / width; width = maxSize; }
        } else {
          if (height > maxSize) { width *= maxSize / height; height = maxSize; }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.8));
      };
      img.onerror = reject;
      img.src = e.target.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// === Fonctions de calcul partagées ===
function scoreSousCritereHosp(eval_, sousCritereId) {
  const note = parseFloat(eval_?.sousCriteres?.[sousCritereId]?.note);
  return isNaN(note) ? null : note * 10;
}

function scoreHospitalite(eval_, poidsHospitalite) {
  if (!eval_) return null;
  let total = 0, poidsTotal = 0;
  SOUS_CRITERES_HOSPITALITE.forEach((sc) => {
    const s = scoreSousCritereHosp(eval_, sc.id);
    if (s !== null) {
      const poids = parseFloat(poidsHospitalite[sc.id]) || 0;
      total += s * poids;
      poidsTotal += poids;
    }
  });
  return poidsTotal > 0 ? total / poidsTotal : null;
}

function scoreAxe(managerId, axe, moisD, data) {
  const eval_ = moisD?.evaluations?.[managerId]?.[axe.id];
  if (!eval_) return null;
  if (axe.type === 'pourcentage' || axe.type === 'nombre') {
    const val = parseFloat(eval_.valeur);
    if (isNaN(val)) return null;
    const cible = parseFloat(data.objectifsManager[axe.objectifChamp]);
    return Math.min(100, Math.max(0, (val / cible) * 100));
  }
  if (axe.type === 'note') {
    const val = parseFloat(eval_.note);
    return isNaN(val) ? null : val * 10;
  }
  if (axe.type === 'composite') return scoreHospitalite(eval_, data.poidsHospitalite);
  return null;
}

function scoreGlobal(managerId, moisD, data) {
  let total = 0, poidsTotal = 0;
  AXES_MANAGER.forEach((axe) => {
    const sc = scoreAxe(managerId, axe, moisD, data);
    if (sc !== null) {
      const poids = parseFloat(data.poidsAxes[axe.id]) || 0;
      total += sc * poids;
      poidsTotal += poids;
    }
  });
  return poidsTotal > 0 ? total / poidsTotal : null;
}

export default function App() {
  const [data, setData] = useState(DEFAULT_DATA);
  const [tab, setTab] = useState('dashboard');
  const [saved, setSaved] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    try {
      const result = localStorage.getItem('mcdo-nyon-data-v8');
      if (result) {
        setData({ ...DEFAULT_DATA, ...JSON.parse(result) });
      } else {
        // Migration depuis v7
        const v7 = localStorage.getItem('mcdo-nyon-data-v7');
        if (v7) setData({ ...DEFAULT_DATA, ...JSON.parse(v7) });
      }
    } catch (e) { console.error(e); }
    setLoaded(true);
  }, []);

  const persist = (newData) => {
    setData(newData);
    try {
      localStorage.setItem('mcdo-nyon-data-v8', JSON.stringify(newData));
      setSaved(true);
      setTimeout(() => setSaved(false), 1500);
    } catch (e) { console.error(e); }
  };

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const moisDataBrut = data.mois[data.moisActif] || { avisGoogleNombre: '', avisGoogleNote: '', fastInside: '', oep: '', avisDetailles: [], evaluations: {}, notes: '' };
  const joursDuMois = data.jours?.[data.moisActif] || {};
  const moisData = reconstruireMoisData(joursDuMois, moisDataBrut);

  const updateMoisData = (patch) => {
    // patch contient des champs comme avisDetailles, evaluations, notes : on les écrit dans data.mois
    // Les KPIs (avisGoogleNombre, etc.) ne sont plus modifiables ici, ils sont calculés depuis jours.
    const { _moy, ...patchClean } = patch;
    persist({ ...data, mois: { ...data.mois, [data.moisActif]: { ...moisDataBrut, ...patchClean } } });
  };

  const updateJour = (jour, patch) => {
    const joursMois = { ...(data.jours?.[data.moisActif] || {}) };
    const jourCle = String(jour).padStart(2, '0');
    joursMois[jourCle] = { ...(joursMois[jourCle] || {}), ...patch };
    persist({ ...data, jours: { ...(data.jours || {}), [data.moisActif]: joursMois } });
  };

  const tiktokData = data.tiktok[data.moisActif] || { videos: [] };
  const updateTiktok = (patch) => {
    persist({ ...data, tiktok: { ...data.tiktok, [data.moisActif]: { ...tiktokData, ...patch } } });
  };

  const uberEatsData = data.uberEats?.[data.moisActif] || { reclamations: [] };
  const updateUberEats = (patch) => {
    persist({ ...data, uberEats: { ...(data.uberEats || {}), [data.moisActif]: { ...uberEatsData, ...patch } } });
  };

  if (!loaded) return <div className="min-h-screen bg-zinc-950 flex items-center justify-center text-zinc-500">Chargement...</div>;

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:wght@500;700&family=Inter:wght@400;500;600;700&display=swap');
        * { font-family: 'Inter', sans-serif; }
        .display { font-family: 'Bricolage Grotesque', sans-serif; letter-spacing: -0.02em; }
        input, textarea, select { color-scheme: dark; }
        input[type="month"]::-webkit-calendar-picker-indicator,
        input[type="date"]::-webkit-calendar-picker-indicator { filter: invert(0.7); cursor: pointer; }
        @media print {
          .no-print { display: none !important; }
          body { background: white; color: black; }
          .bg-zinc-950, .bg-zinc-900, .bg-zinc-800 { background: white !important; }
          .text-zinc-100, .text-zinc-200, .text-zinc-300 { color: #18181b !important; }
        }
      `}</style>

      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-2xl text-sm font-medium border ${toast.type === 'error' ? 'bg-red-950 text-red-200 border-red-800' : 'bg-emerald-950 text-emerald-200 border-emerald-800'}`}>
          {toast.msg}
        </div>
      )}

      <header className="bg-zinc-900/80 backdrop-blur border-b border-zinc-800 sticky top-0 z-10 no-print">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-yellow-400 flex items-center justify-center font-bold text-red-600 text-xl shadow-lg shadow-yellow-400/20">M</div>
            <div>
              <h1 className="display text-xl font-bold text-zinc-50">Pilotage Nyon Gare</h1>
              <p className="text-xs text-zinc-500">McDonald's · Tableau de bord mensuel · v8</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <input type="month" value={data.moisActif} onChange={(e) => persist({ ...data, moisActif: e.target.value })} className="px-3 py-2 border border-zinc-700 rounded-lg text-sm bg-zinc-800 text-zinc-100" />
            {saved && <span className="flex items-center gap-1 text-xs text-emerald-400"><CheckCircle2 className="w-4 h-4" /> Enregistré</span>}
          </div>
        </div>

        <nav className="max-w-7xl mx-auto px-6 flex gap-1 overflow-x-auto">
          {[
            { id: 'dashboard', label: 'Tableau de bord', icon: BarChart3 },
            { id: 'kpis', label: 'Saisie mensuelle', icon: Edit3 },
            { id: 'avis', label: 'Avis Google', icon: MessageSquare },
            { id: 'managers', label: 'Managers', icon: Users },
            { id: 'tiktok', label: 'TikTok', icon: Video },
            { id: 'ubereats', label: 'Uber Eats', icon: ShoppingBag },
            { id: 'rapport', label: 'Rapport mensuel', icon: FileText },
            { id: 'config', label: 'Configuration', icon: Award },
          ].map((t) => {
            const Icon = t.icon;
            return (
              <button key={t.id} onClick={() => setTab(t.id)} className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 whitespace-nowrap transition ${tab === t.id ? 'border-red-500 text-red-400' : 'border-transparent text-zinc-500 hover:text-zinc-200'}`}>
                <Icon className="w-4 h-4" /> {t.label}
              </button>
            );
          })}
        </nav>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        {tab === 'dashboard' && <Dashboard data={data} moisData={moisData} tiktokData={tiktokData} setTab={setTab} persist={persist} />}
        {tab === 'kpis' && <SaisieMensuelle data={data} persist={persist} moisData={moisData} updateMoisData={updateMoisData} updateJour={updateJour} joursDuMois={joursDuMois} showToast={showToast} setTab={setTab} />}
        {tab === 'avis' && <AvisGoogle moisData={moisData} updateMoisData={updateMoisData} />}
        {tab === 'managers' && <ManagersConsultation data={data} moisData={moisData} setTab={setTab} />}
        {tab === 'tiktok' && <TikTokModule tiktokData={tiktokData} updateTiktok={updateTiktok} />}
        {tab === 'ubereats' && <UberEatsModule uberEatsData={uberEatsData} updateUberEats={updateUberEats} moisActif={data.moisActif} />}
        {tab === 'rapport' && <RapportMensuel data={data} persist={persist} showToast={showToast} />}
        {tab === 'config' && <Configuration data={data} persist={persist} showToast={showToast} />}
      </main>
    </div>
  );
}

function ProgressBar({ pct, atteint, hasValue }) {
  if (!hasValue) {
    return <div className="w-full h-2 bg-zinc-800 rounded-full overflow-hidden"><div className="h-full bg-zinc-700" style={{ width: '0%' }} /></div>;
  }
  const couleur = atteint ? 'bg-emerald-500' : pct >= 70 ? 'bg-amber-500' : 'bg-red-500';
  const glow = atteint ? 'shadow-[0_0_8px_rgba(16,185,129,0.5)]' : '';
  return (
    <div className="w-full h-2 bg-zinc-800 rounded-full overflow-hidden relative">
      <div className={`h-full ${couleur} ${glow} transition-all duration-500`} style={{ width: `${pct}%` }} />
      <div className="absolute top-0 bottom-0 border-l-2 border-zinc-500 border-dashed" style={{ left: '95%' }} />
    </div>
  );
}

function KpiCard({ label, value, target, unit = '', icon: Icon }) {
  const { pct, atteint, hasValue } = calculerProgression(value, target);
  return (
    <div className="bg-zinc-900 rounded-xl p-5 border border-zinc-800 hover:border-zinc-700 transition">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2 text-zinc-400 text-sm"><Icon className="w-4 h-4" />{label}</div>
        {hasValue && <span className={`text-xs px-2 py-0.5 rounded-full ${atteint ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' : 'bg-red-950 text-red-300 border border-red-800'}`}>{atteint ? 'Atteint' : 'Sous objectif'}</span>}
      </div>
      <div className="display text-3xl font-bold text-zinc-50 mb-1">{hasValue ? `${value}${unit}` : '—'}</div>
      <div className="text-xs text-zinc-500 mb-3">Objectif : {target}{unit}</div>
      <ProgressBar pct={pct} atteint={atteint} hasValue={hasValue} />
      {hasValue && <div className="flex justify-between text-xs mt-1.5"><span className="text-zinc-600">0%</span><span className={`font-medium ${atteint ? 'text-emerald-400' : 'text-zinc-400'}`}>{pct.toFixed(0)}%</span><span className="text-zinc-600">100%</span></div>}
    </div>
  );
}

function calculerAtteinteGlobale(moisData, objectifs) {
  const progressions = [
    calculerProgression(moisData.avisGoogleNombre, objectifs.avisGoogleNombre),
    calculerProgression(moisData.avisGoogleNote, objectifs.avisGoogleNote),
    calculerProgression(moisData.fastInside, objectifs.fastInside),
    calculerProgression(moisData.oep, objectifs.oep),
  ].filter((p) => p.hasValue);
  if (progressions.length === 0) return { pct: 0, atteint: false, atteints: 0, total: 4 };
  const moyenne = progressions.reduce((s, p) => s + p.pct, 0) / progressions.length;
  const atteints = progressions.filter((p) => p.atteint).length;
  return { pct: moyenne, atteint: moyenne >= 95, atteints, total: 4 };
}

const CHART_GRID = '#27272a';
const CHART_TEXT = '#a1a1aa';
const CHART_TOOLTIP_BG = 'rgba(24, 24, 27, 0.95)';

function Dashboard({ data, moisData, tiktokData, setTab, persist }) {
  const atteinte = calculerAtteinteGlobale(moisData, data.objectifs);
  const moisHisto = Object.keys(data.mois).sort().slice(-6);
  const moisPrec = moisPrecedent();
  const dataMoisPrec = data.mois[moisPrec];
  const aDesDonnees = dataMoisPrec && (dataMoisPrec.avisGoogleNombre || dataMoisPrec.fastInside || dataMoisPrec.oep);
  const rapportIgnore = data.rapportsAutoIgnores?.includes(moisPrec);
  const proposerRapport = aDesDonnees && !rapportIgnore;

  const ignorerRapport = () => persist({ ...data, rapportsAutoIgnores: [...(data.rapportsAutoIgnores || []), moisPrec] });

  return (
    <div className="space-y-6">
      {proposerRapport && (
        <div className="bg-blue-950/50 border border-blue-800 rounded-xl p-4 flex items-start gap-3">
          <Bell className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-semibold text-blue-200">Rapport de {moisLabel(moisPrec)} disponible</p>
            <p className="text-sm text-blue-300/80 mt-1">Le mois précédent est terminé. Consulte le rapport complet avec tous les KPIs, managers et graphiques.</p>
            <div className="flex gap-2 mt-3">
              <button onClick={() => { persist({ ...data, moisActif: moisPrec }); setTab('rapport'); }} className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-medium flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5" /> Voir le rapport
              </button>
              <button onClick={ignorerRapport} className="px-3 py-1.5 bg-zinc-800 border border-zinc-700 hover:bg-zinc-700 text-zinc-300 rounded-lg text-sm">Plus tard</button>
            </div>
          </div>
        </div>
      )}

      <div>
        <h2 className="display text-2xl font-bold text-zinc-50">{moisLabel(data.moisActif)}</h2>
        <p className="text-zinc-500 text-sm">Vue d'ensemble du mois</p>
      </div>

      <div className="bg-gradient-to-br from-red-700 via-red-800 to-red-900 rounded-xl p-6 text-white shadow-xl shadow-red-950/50 border border-red-700/50">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-red-200 text-sm">Atteinte du pôle ce mois</p>
            <div className="display text-5xl font-bold mt-2">{atteinte.pct.toFixed(0)}%</div>
            <p className="text-red-200 text-sm mt-2">{atteinte.atteints}/{atteinte.total} objectifs atteints</p>
          </div>
          <div className="w-24 h-24 rounded-full border-4 border-white/20 flex items-center justify-center bg-red-950/30">
            <Award className="w-12 h-12" />
          </div>
        </div>
        <div className="w-full h-3 bg-red-950/50 rounded-full overflow-hidden relative">
          <div className={`h-full ${atteinte.atteint ? 'bg-emerald-400 shadow-[0_0_12px_rgba(52,211,153,0.7)]' : 'bg-yellow-400'} transition-all duration-500`} style={{ width: `${atteinte.pct}%` }} />
          <div className="absolute top-0 bottom-0 border-l-2 border-white/40 border-dashed" style={{ left: '95%' }} />
        </div>
        <p className="text-xs text-red-200 mt-2">Seuil de validation pôle : 95%</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="Avis Google (nb)" value={moisData.avisGoogleNombre} target={data.objectifs.avisGoogleNombre} icon={MessageSquare} />
        <KpiCard label="Note Google" value={moisData.avisGoogleNote} target={data.objectifs.avisGoogleNote} unit="/5" icon={Star} />
        <KpiCard label="Fast Inside" value={moisData.fastInside} target={data.objectifs.fastInside} unit="%" icon={Target} />
        <KpiCard label="O&P" value={moisData.oep} target={data.objectifs.oep} unit="%" icon={DollarSign} />
      </div>

      {moisHisto.length > 1 && (
        <div className="bg-zinc-900 rounded-xl p-5 border border-zinc-800">
          <h3 className="display text-lg font-bold text-zinc-100 mb-4">Historique 6 derniers mois</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-800 text-zinc-500 text-left">
                  <th className="py-2 font-medium">Mois</th>
                  <th className="py-2 font-medium">Avis (nb)</th>
                  <th className="py-2 font-medium">Note</th>
                  <th className="py-2 font-medium">Fast Inside</th>
                  <th className="py-2 font-medium">O&P</th>
                  <th className="py-2 font-medium">Atteinte</th>
                </tr>
              </thead>
              <tbody>
                {moisHisto.map((m) => {
                  const md = data.mois[m];
                  const att = calculerAtteinteGlobale(md, data.objectifs);
                  return (
                    <tr key={m} className="border-b border-zinc-800/50">
                      <td className="py-2 font-medium text-zinc-200">{moisLabel(m)}</td>
                      <td className="py-2 text-zinc-300">{md.avisGoogleNombre || '—'}</td>
                      <td className="py-2 text-zinc-300">{md.avisGoogleNote || '—'}</td>
                      <td className="py-2 text-zinc-300">{md.fastInside ? `${md.fastInside}%` : '—'}</td>
                      <td className="py-2 text-zinc-300">{md.oep ? `${md.oep}%` : '—'}</td>
                      <td className="py-2"><span className={`font-bold ${att.atteint ? 'text-emerald-400' : 'text-zinc-400'}`}>{att.pct.toFixed(0)}%</span></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({ label, objectif, children }) {
  return (
    <div>
      <div className="flex items-baseline justify-between mb-1.5">
        <label className="text-sm font-medium text-zinc-300">{label}</label>
        {objectif && <span className="text-xs text-zinc-500">{objectif}</span>}
      </div>
      {children}
    </div>
  );
}

const inputClass = "w-full px-3 py-2 border border-zinc-700 bg-zinc-800 text-zinc-100 rounded-lg placeholder:text-zinc-500 focus:border-red-500 focus:outline-none";
const inputClassSm = "w-full px-2 py-1 border border-zinc-700 bg-zinc-800 text-zinc-100 rounded text-sm placeholder:text-zinc-500 focus:border-red-500 focus:outline-none";

// === v9 : Bandeau récap des moyennes du mois (calculées depuis les jours) ===
function SaisieJourneeRecap({ moisData, data }) {
  const moy = moisData._moy || { joursSaisis: 0, joursNote: 0, joursFast: 0, joursOep: 0 };
  const totalJours = joursDansMois(data.moisActif);

  const Cell = ({ label, value, target, unit = '', n }) => {
    const num = parseFloat(value);
    const t = parseFloat(target);
    const ok = !isNaN(num) && !isNaN(t) && num >= t * 0.95;
    const couleur = isNaN(num) ? 'text-zinc-500' : ok ? 'text-emerald-400' : num >= t * 0.7 ? 'text-amber-400' : 'text-red-400';
    return (
      <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-3">
        <div className="text-xs text-zinc-500 mb-1">{label}</div>
        <div className={`text-xl font-bold ${couleur}`}>{isNaN(num) ? '—' : num}{unit}</div>
        <div className="text-[10px] text-zinc-600 mt-1">{n !== undefined ? `${n} jour${n > 1 ? 's' : ''}` : ''} · obj. {target}{unit}</div>
      </div>
    );
  };

  return (
    <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4 mb-4">
      <div className="flex items-center justify-between mb-3">
        <div className="text-sm font-semibold text-zinc-300">Synthèse du mois (auto)</div>
        <div className="text-xs text-zinc-500">{moy.joursSaisis}/{totalJours} jours saisis</div>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        <Cell label="Cumul avis Google" value={moisData.avisGoogleNombre} target={data.objectifs.avisGoogleNombre} />
        <Cell label="Note Google moyenne" value={moisData.avisGoogleNote} target={data.objectifs.avisGoogleNote} unit="/5" n={moy.joursNote} />
        <Cell label="Fast Inside moyen" value={moisData.fastInside} target={data.objectifs.fastInside} unit="%" n={moy.joursFast} />
        <Cell label="O&P moyen" value={moisData.oep} target={data.objectifs.oep} unit="%" n={moy.joursOep} />
      </div>
    </div>
  );
}

// === v9 : Liste verticale des jours du mois, repliables ===
function SaisieJourneeListe({ moisActif, joursDuMois, updateJour }) {
  const totalJours = joursDansMois(moisActif);
  const [annee, mois] = moisActif.split('-').map(Number);
  const [ouverts, setOuverts] = useState({}); // { '01': true, '02': false, ... }
  const aujourdhui = new Date();
  const estAujourdhui = (jour) => aujourdhui.getFullYear() === annee && (aujourdhui.getMonth() + 1) === mois && aujourdhui.getDate() === jour;
  const estFutur = (jour) => {
    const d = new Date(annee, mois - 1, jour);
    const auj = new Date(aujourdhui.getFullYear(), aujourdhui.getMonth(), aujourdhui.getDate());
    return d > auj;
  };
  const nomJour = (jour) => {
    const d = new Date(annee, mois - 1, jour);
    return ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'][d.getDay()];
  };

  const toggleJour = (jourCle) => setOuverts({ ...ouverts, [jourCle]: !ouverts[jourCle] });

  const toggleTous = () => {
    const tousOuverts = Object.keys(ouverts).filter((k) => ouverts[k]).length > totalJours / 2;
    if (tousOuverts) {
      setOuverts({});
    } else {
      const o = {};
      for (let i = 1; i <= totalJours; i++) o[String(i).padStart(2, '0')] = true;
      setOuverts(o);
    }
  };

  const cellClass = "w-full px-2 py-1.5 border border-zinc-700 bg-zinc-800 text-zinc-100 rounded text-sm placeholder:text-zinc-600 focus:border-red-500 focus:outline-none";

  // Résumé condensé pour ligne repliée
  const resume = (j) => {
    const parts = [];
    if (j.avisNouveaux !== undefined && j.avisNouveaux !== '' && !isNaN(parseFloat(j.avisNouveaux))) parts.push(`${j.avisNouveaux} avis`);
    if (j.note !== undefined && j.note !== '' && !isNaN(parseFloat(j.note))) parts.push(`${j.note}/5`);
    if (j.fastInside !== undefined && j.fastInside !== '' && !isNaN(parseFloat(j.fastInside))) parts.push(`Fast ${j.fastInside}%`);
    if (j.oep !== undefined && j.oep !== '' && !isNaN(parseFloat(j.oep))) parts.push(`O&P ${j.oep}%`);
    return parts.length === 0 ? null : parts.join(' · ');
  };

  const aSaisie = (j) =>
    (j.avisNouveaux !== undefined && j.avisNouveaux !== '' && !isNaN(parseFloat(j.avisNouveaux))) ||
    (j.note !== undefined && j.note !== '' && !isNaN(parseFloat(j.note))) ||
    (j.fastInside !== undefined && j.fastInside !== '' && !isNaN(parseFloat(j.fastInside))) ||
    (j.oep !== undefined && j.oep !== '' && !isNaN(parseFloat(j.oep)));

  const nbOuverts = Object.keys(ouverts).filter((k) => ouverts[k]).length;

  return (
    <div className="bg-zinc-900 rounded-xl border border-zinc-800 overflow-hidden">
      {/* En-tête avec bouton "tout déplier" */}
      <div className="flex items-center justify-between px-3 py-2 bg-zinc-950/50 border-b border-zinc-800">
        <div className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">Saisie journalière · clique pour déplier</div>
        <button onClick={toggleTous} className="text-xs text-zinc-400 hover:text-red-400 transition flex items-center gap-1">
          {nbOuverts > totalJours / 2 ? <><ChevronUp className="w-3 h-3" /> Tout replier</> : <><ChevronDown className="w-3 h-3" /> Tout déplier</>}
        </button>
      </div>

      {/* Lignes */}
      <div className="divide-y divide-zinc-800">
        {Array.from({ length: totalJours }, (_, i) => i + 1).map((jour) => {
          const jourCle = String(jour).padStart(2, '0');
          const j = joursDuMois[jourCle] || {};
          const isToday = estAujourdhui(jour);
          const isFutur = estFutur(jour);
          const weekend = ['Sam', 'Dim'].includes(nomJour(jour));
          const isOpen = !!ouverts[jourCle];
          const saisi = aSaisie(j);
          const r = resume(j);

          return (
            <div key={jour} className={`${isToday ? 'bg-red-950/20 border-l-2 border-red-500' : isFutur ? 'opacity-60' : weekend ? 'bg-zinc-950/30' : ''}`}>
              {/* Ligne récap cliquable */}
              <button
                onClick={() => toggleJour(jourCle)}
                className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-zinc-800/40 transition text-left"
              >
                {/* Chevron */}
                <div className="text-zinc-500 w-4 flex-shrink-0">
                  {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </div>
                {/* Indicateur saisi */}
                <div className={`w-2 h-2 rounded-full flex-shrink-0 ${saisi ? 'bg-emerald-500' : 'bg-zinc-700'}`}></div>
                {/* Jour */}
                <div className="flex items-center gap-2 w-20 flex-shrink-0">
                  <div className={`text-sm font-medium ${isToday ? 'text-red-400' : 'text-zinc-300'}`}>{jourCle}</div>
                  <div className="text-[10px] text-zinc-500">{nomJour(jour)}</div>
                  {isToday && <span className="text-[9px] uppercase tracking-wider text-red-400 font-bold">·now</span>}
                </div>
                {/* Résumé condensé */}
                <div className="flex-1 text-xs text-zinc-400 truncate">
                  {r || <span className="text-zinc-600 italic">aucune saisie</span>}
                </div>
              </button>

              {/* Zone de saisie dépliée */}
              {isOpen && (
                <div className="px-3 pb-3 pt-1 grid grid-cols-2 md:grid-cols-4 gap-2 bg-zinc-950/30 border-t border-zinc-800/50">
                  <div>
                    <label className="block text-[10px] text-zinc-500 uppercase tracking-wider mb-1">Nouveaux avis</label>
                    <input
                      type="number"
                      inputMode="numeric"
                      value={j.avisNouveaux ?? ''}
                      onChange={(e) => updateJour(jour, { avisNouveaux: e.target.value })}
                      className={cellClass}
                      placeholder="—"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-zinc-500 uppercase tracking-wider mb-1">Note /5</label>
                    <input
                      type="number"
                      inputMode="decimal"
                      step="0.1"
                      min="0"
                      max="5"
                      value={j.note ?? ''}
                      onChange={(e) => updateJour(jour, { note: e.target.value })}
                      className={cellClass}
                      placeholder="—"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-zinc-500 uppercase tracking-wider mb-1">Fast Inside %</label>
                    <input
                      type="number"
                      inputMode="decimal"
                      step="0.1"
                      value={j.fastInside ?? ''}
                      onChange={(e) => updateJour(jour, { fastInside: e.target.value })}
                      className={cellClass}
                      placeholder="—"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-zinc-500 uppercase tracking-wider mb-1">O&P %</label>
                    <input
                      type="number"
                      inputMode="decimal"
                      step="0.1"
                      value={j.oep ?? ''}
                      onChange={(e) => updateJour(jour, { oep: e.target.value })}
                      className={cellClass}
                      placeholder="—"
                    />
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// === SAISIE MENSUELLE : KPIs + liste des managers à évaluer ===
function SaisieMensuelle({ data, persist, moisData, updateMoisData, updateJour, joursDuMois, showToast, setTab }) {
  const [nouveauNom, setNouveauNom] = useState('');
  const [managerOuvert, setManagerOuvert] = useState(null);

  const ajouterManager = () => {
    if (!nouveauNom.trim()) return;
    const newId = Date.now();
    persist({ ...data, managers: [...data.managers, { id: newId, nom: nouveauNom, photo: null }] });
    setNouveauNom('');
    setManagerOuvert(newId);
  };

  const supprimerManager = (id) => {
    if (!window.confirm('Supprimer ce manager et tout son historique ?')) return;
    persist({ ...data, managers: data.managers.filter((m) => m.id !== id) });
  };

  const updatePhotoManager = (id, photo) => {
    persist({ ...data, managers: data.managers.map((m) => m.id === id ? { ...m, photo } : m) });
    showToast(photo ? 'Photo mise à jour' : 'Photo supprimée');
  };

  const updateAxe = (managerId, axeId, patch) => {
    const evals = moisData.evaluations || {};
    const managerEvals = evals[managerId] || {};
    const axeEvals = managerEvals[axeId] || {};
    updateMoisData({ evaluations: { ...evals, [managerId]: { ...managerEvals, [axeId]: { ...axeEvals, ...patch } } } });
  };

  // Statut d'évaluation par manager (combien d'axes remplis sur 4)
  const statutEvaluation = (managerId) => {
    let remplis = 0;
    AXES_MANAGER.forEach((axe) => {
      const eval_ = moisData.evaluations?.[managerId]?.[axe.id];
      if (!eval_) return;
      if (axe.type === 'pourcentage' || axe.type === 'nombre') {
        if (eval_.valeur !== '' && eval_.valeur !== undefined && !isNaN(parseFloat(eval_.valeur))) remplis++;
      } else if (axe.type === 'note') {
        if (eval_.note !== '' && eval_.note !== undefined && !isNaN(parseFloat(eval_.note))) remplis++;
      } else if (axe.type === 'composite') {
        const tousRemplis = SOUS_CRITERES_HOSPITALITE.every((sc) => {
          const n = eval_.sousCriteres?.[sc.id]?.note;
          return n !== '' && n !== undefined && !isNaN(parseFloat(n));
        });
        if (tousRemplis) remplis++;
      }
    });
    return { remplis, total: AXES_MANAGER.length };
  };

  const noteBtnClass = (selected) => `w-8 h-8 rounded text-xs font-medium border ${selected ? 'bg-red-600 text-white border-red-500' : 'bg-zinc-800 border-zinc-700 text-zinc-400 hover:border-zinc-500 hover:text-zinc-200'}`;

  return (
    <div className="space-y-8">
      <div>
        <h2 className="display text-2xl font-bold text-zinc-50">Saisie mensuelle · {moisLabel(data.moisActif)}</h2>
        <p className="text-zinc-500 text-sm">Renseigne les KPIs du pôle puis évalue chaque manager</p>
      </div>

      {/* === SECTION 1 : KPIs DU PÔLE — SAISIE JOURNALIÈRE === */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <div className="w-1 h-6 bg-red-500 rounded"></div>
          <h3 className="display text-lg font-bold text-zinc-100">KPIs du pôle</h3>
          <span className="text-xs text-zinc-500">— saisie journalière, moyennes calculées automatiquement</span>
        </div>

        {/* Bandeau récap des moyennes du mois */}
        <SaisieJourneeRecap moisData={moisData} data={data} />

        {/* Liste journalière */}
        <SaisieJourneeListe
          moisActif={data.moisActif}
          joursDuMois={joursDuMois}
          updateJour={updateJour}
        />

        {/* Notes & commentaires (toujours mensuels) */}
        <div className="bg-zinc-900 rounded-xl p-6 border border-zinc-800 mt-4">
          <Field label="Notes & commentaires du mois">
            <textarea value={moisData.notes || ''} onChange={(e) => updateMoisData({ notes: e.target.value })} rows={3} className={inputClass} placeholder="Faits marquants, plans d'action, contexte..." />
          </Field>
        </div>
      </div>

      {/* === SECTION 2 : ÉVALUATION DES MANAGERS === */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <div className="w-1 h-6 bg-red-500 rounded"></div>
          <h3 className="display text-lg font-bold text-zinc-100">Évaluation des managers</h3>
          <span className="text-xs text-zinc-500">— clique sur un manager pour l'évaluer</span>
        </div>

        <div className="bg-zinc-900 rounded-xl p-4 border border-zinc-800 mb-3">
          <div className="flex gap-2">
            <input value={nouveauNom} onChange={(e) => setNouveauNom(e.target.value)} placeholder="Ajouter un manager" className={`flex-1 ${inputClassSm}`} onKeyDown={(e) => e.key === 'Enter' && ajouterManager()} />
            <button onClick={ajouterManager} className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg text-sm font-medium flex items-center gap-2"><Plus className="w-4 h-4" /> Ajouter</button>
          </div>
        </div>

        {data.managers.length === 0 && (
          <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-12 text-center">
            <Users className="w-12 h-12 text-zinc-700 mx-auto mb-3" />
            <p className="text-zinc-400 font-medium mb-1">Aucun manager ajouté</p>
            <p className="text-sm text-zinc-500">Ajoute tes managers pour les évaluer chaque mois</p>
          </div>
        )}

        <div className="space-y-2">
          {data.managers.map((m) => {
            const score = scoreGlobal(m.id, moisData, data);
            const statut = statutEvaluation(m.id);
            const ouvert = managerOuvert === m.id;
            const couleur = score === null ? 'text-zinc-500' : score >= 75 ? 'text-emerald-400' : score >= 50 ? 'text-amber-400' : 'text-red-400';
            const statutColor = statut.remplis === 0 ? 'bg-zinc-800 text-zinc-500' : statut.remplis === statut.total ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' : 'bg-amber-950 text-amber-300 border border-amber-800';

            return (
              <div key={m.id} className="bg-zinc-900 rounded-xl border border-zinc-800 overflow-hidden">
                <button
                  onClick={() => setManagerOuvert(ouvert ? null : m.id)}
                  className="w-full p-4 flex items-center gap-4 hover:bg-zinc-800/50 transition text-left"
                >
                  <AvatarManager manager={m} taille={12} onChangePhoto={(photo) => updatePhotoManager(m.id, photo)} onSupprimerPhoto={() => updatePhotoManager(m.id, null)} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold text-zinc-100 truncate">{m.nom}</h3>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${statutColor}`}>
                        {statut.remplis}/{statut.total} axes
                      </span>
                    </div>
                    {score !== null && (
                      <div className="flex items-center gap-2 mt-1">
                        <div className="flex-1 max-w-xs h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                          <div className={`h-full ${score >= 75 ? 'bg-emerald-500' : score >= 50 ? 'bg-amber-500' : 'bg-red-500'}`} style={{ width: `${score}%` }} />
                        </div>
                        <span className={`text-xs font-bold ${couleur}`}>{score.toFixed(0)}/100</span>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    <span onClick={(e) => { e.stopPropagation(); supprimerManager(m.id); }} className="text-zinc-500 hover:text-red-400 p-2 cursor-pointer"><Trash2 className="w-4 h-4" /></span>
                    {ouvert ? <ChevronUp className="w-5 h-5 text-zinc-500" /> : <ChevronDown className="w-5 h-5 text-zinc-500" />}
                  </div>
                </button>

                {ouvert && (
                  <div className="border-t border-zinc-800 p-5 bg-zinc-950 space-y-4">
                    {AXES_MANAGER.map((axe) => {
                      const Icon = axe.icon;
                      const eval_ = moisData.evaluations?.[m.id]?.[axe.id] || {};
                      const sc = scoreAxe(m.id, axe, moisData, data);
                      return (
                        <div key={axe.id} className="bg-zinc-900 rounded-lg p-4 border border-zinc-800">
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex items-center gap-2">
                              <Icon className="w-4 h-4 text-red-400" />
                              <div>
                                <p className="font-semibold text-sm text-zinc-200">{axe.nom} <span className="text-xs text-zinc-600 font-normal">({data.poidsAxes[axe.id]}%)</span></p>
                                <p className="text-xs text-zinc-500">{axe.description}</p>
                              </div>
                            </div>
                            {sc !== null && <span className={`text-sm font-bold ${sc >= 75 ? 'text-emerald-400' : sc >= 50 ? 'text-amber-400' : 'text-red-400'}`}>{sc.toFixed(0)}/100</span>}
                          </div>

                          {axe.type === 'pourcentage' && (
                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <label className="text-xs text-zinc-500">% O&P du manager</label>
                                <input type="number" step="0.1" value={eval_.valeur || ''} onChange={(e) => updateAxe(m.id, axe.id, { valeur: e.target.value })} placeholder={`Cible : ≥ ${data.objectifsManager[axe.objectifChamp]}%`} className={`mt-1 ${inputClassSm}`} />
                              </div>
                              <div>
                                <label className="text-xs text-zinc-500">Commentaire</label>
                                <input type="text" value={eval_.commentaire || ''} onChange={(e) => updateAxe(m.id, axe.id, { commentaire: e.target.value })} className={`mt-1 ${inputClassSm}`} />
                              </div>
                            </div>
                          )}

                          {axe.type === 'nombre' && (
                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <label className="text-xs text-zinc-500">Nombre d'avis générés</label>
                                <input type="number" value={eval_.valeur || ''} onChange={(e) => updateAxe(m.id, axe.id, { valeur: e.target.value })} placeholder={`Cible : ≥ ${data.objectifsManager[axe.objectifChamp]}`} className={`mt-1 ${inputClassSm}`} />
                              </div>
                              <div>
                                <label className="text-xs text-zinc-500">Commentaire</label>
                                <input type="text" value={eval_.commentaire || ''} onChange={(e) => updateAxe(m.id, axe.id, { commentaire: e.target.value })} className={`mt-1 ${inputClassSm}`} />
                              </div>
                            </div>
                          )}

                          {axe.type === 'note' && (
                            <div className="space-y-2">
                              <div>
                                <label className="text-xs text-zinc-500 mb-1 block">Note (0-10)</label>
                                <div className="flex gap-1 flex-wrap">
                                  {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                                    <button key={n} onClick={() => updateAxe(m.id, axe.id, { note: n })} className={noteBtnClass(parseInt(eval_.note) === n)}>{n}</button>
                                  ))}
                                </div>
                              </div>
                              <div>
                                <label className="text-xs text-zinc-500">Actions menées</label>
                                <textarea value={eval_.commentaire || ''} onChange={(e) => updateAxe(m.id, axe.id, { commentaire: e.target.value })} rows={2} className={`mt-1 ${inputClassSm}`} />
                              </div>
                            </div>
                          )}

                          {axe.type === 'composite' && (
                            <SousCriteresHospitalite
                              eval_={eval_}
                              poidsHospitalite={data.poidsHospitalite}
                              onChange={(sousCritereId, patch) => {
                                const sousCriteres = eval_.sousCriteres || {};
                                const sc = sousCriteres[sousCritereId] || {};
                                updateAxe(m.id, axe.id, { sousCriteres: { ...sousCriteres, [sousCritereId]: { ...sc, ...patch } } });
                              }}
                              onChangeCommentaire={(val) => updateAxe(m.id, axe.id, { commentaire: val })}
                            />
                          )}
                        </div>
                      );
                    })}

                    <div className="flex justify-end gap-2 pt-2">
                      <button onClick={() => setTab('managers')} className="px-3 py-2 bg-zinc-800 border border-zinc-700 hover:bg-zinc-700 text-zinc-200 rounded-lg text-sm flex items-center gap-2">
                        <Eye className="w-4 h-4" /> Voir le tableau de bord managers
                      </button>
                      <button onClick={() => setManagerOuvert(null)} className="px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4" /> Fermer
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function SousCriteresHospitalite({ eval_, poidsHospitalite, onChange, onChangeCommentaire }) {
  return (
    <div className="space-y-3">
      <div className="bg-zinc-950 rounded-lg p-3 space-y-3 border border-zinc-800">
        {SOUS_CRITERES_HOSPITALITE.map((sc) => {
          const val = eval_?.sousCriteres?.[sc.id] || {};
          const score = scoreSousCritereHosp(eval_, sc.id);
          return (
            <div key={sc.id} className="bg-zinc-900 rounded p-3 border border-zinc-800">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <p className="text-sm font-medium text-zinc-200">{sc.nom}</p>
                  <p className="text-xs text-zinc-600">Pondération : {poidsHospitalite[sc.id]}%</p>
                </div>
                {score !== null && <span className={`text-xs font-bold ${score >= 75 ? 'text-emerald-400' : score >= 50 ? 'text-amber-400' : 'text-red-400'}`}>{score.toFixed(0)}/100</span>}
              </div>
              <div className="flex gap-1 mb-2 flex-wrap">
                {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                  <button key={n} onClick={() => onChange(sc.id, { note: n })} className={`w-7 h-7 rounded text-xs font-medium border ${parseInt(val.note) === n ? 'bg-red-600 text-white border-red-500' : 'bg-zinc-800 border-zinc-700 text-zinc-400'}`}>{n}</button>
                ))}
              </div>
              <input type="text" value={val.note_commentaire || ''} onChange={(e) => onChange(sc.id, { note_commentaire: e.target.value })} placeholder="Faits marquants..." className="w-full px-2 py-1 border border-zinc-700 bg-zinc-800 text-zinc-200 rounded text-xs placeholder:text-zinc-500" />
            </div>
          );
        })}
      </div>
      <div>
        <label className="text-xs text-zinc-500">Commentaire global hospitalité</label>
        <textarea value={eval_.commentaire || ''} onChange={(e) => onChangeCommentaire(e.target.value)} rows={2} className={`mt-1 ${inputClassSm}`} />
      </div>
    </div>
  );
}

// === MANAGERS : VUE DE CONSULTATION PURE ===
function ManagersConsultation({ data, moisData, setTab }) {
  const [managerDeplie, setManagerDeplie] = useState(null);

  const historiqueManager = (managerId) => {
    const moisAll = Object.keys(data.mois).sort().slice(-6);
    return moisAll.map((m) => ({
      mois: moisLabelCourt(m),
      score: (() => { const sc = scoreGlobal(managerId, data.mois[m], data); return sc !== null ? Math.round(sc) : null; })(),
    })).filter((d) => d.score !== null);
  };

  if (data.managers.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="display text-2xl font-bold text-zinc-50">Tableau de bord managers</h2>
          <p className="text-zinc-500 text-sm">Consultation des évaluations · {moisLabel(data.moisActif)}</p>
        </div>
        <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-12 text-center">
          <Users className="w-12 h-12 text-zinc-700 mx-auto mb-3" />
          <p className="text-zinc-400 font-medium mb-1">Aucun manager</p>
          <p className="text-sm text-zinc-500 mb-6">Va dans la saisie mensuelle pour ajouter et évaluer tes managers</p>
          <button onClick={() => setTab('kpis')} className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg text-sm font-medium inline-flex items-center gap-2">
            <Edit3 className="w-4 h-4" /> Aller à la saisie
          </button>
        </div>
      </div>
    );
  }

  const managersAvecScore = data.managers.map((m) => ({ ...m, score: scoreGlobal(m.id, moisData, data) }));
  const evalues = managersAvecScore.filter((m) => m.score !== null);
  const nonEvalues = managersAvecScore.filter((m) => m.score === null);
  const moyenneEquipe = evalues.length > 0 ? evalues.reduce((s, m) => s + m.score, 0) / evalues.length : null;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h2 className="display text-2xl font-bold text-zinc-50">Tableau de bord managers</h2>
          <p className="text-zinc-500 text-sm">Consultation des évaluations · {moisLabel(data.moisActif)}</p>
        </div>
        <button onClick={() => setTab('kpis')} className="px-3 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg text-sm font-medium flex items-center gap-2">
          <Edit3 className="w-4 h-4" /> Modifier les évaluations
        </button>
      </div>

      {/* Stats globales */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-zinc-900 rounded-xl p-4 border border-zinc-800">
          <p className="text-xs text-zinc-500">Total managers</p>
          <p className="display text-2xl font-bold text-zinc-50">{data.managers.length}</p>
        </div>
        <div className="bg-zinc-900 rounded-xl p-4 border border-zinc-800">
          <p className="text-xs text-zinc-500">Évalués ce mois</p>
          <p className="display text-2xl font-bold text-zinc-50">{evalues.length}/{data.managers.length}</p>
        </div>
        <div className="bg-zinc-900 rounded-xl p-4 border border-zinc-800">
          <p className="text-xs text-zinc-500">Moyenne équipe</p>
          <p className={`display text-2xl font-bold ${moyenneEquipe === null ? 'text-zinc-500' : moyenneEquipe >= 75 ? 'text-emerald-400' : moyenneEquipe >= 50 ? 'text-amber-400' : 'text-red-400'}`}>
            {moyenneEquipe !== null ? `${moyenneEquipe.toFixed(0)}/100` : '—'}
          </p>
        </div>
        <div className="bg-zinc-900 rounded-xl p-4 border border-zinc-800">
          <p className="text-xs text-zinc-500">Top performer</p>
          <p className="display text-sm font-bold text-zinc-100 truncate mt-1">
            {evalues.length > 0 ? [...evalues].sort((a, b) => b.score - a.score)[0].nom : '—'}
          </p>
          <p className="text-xs text-emerald-400 mt-1">
            {evalues.length > 0 ? `${[...evalues].sort((a, b) => b.score - a.score)[0].score.toFixed(0)}/100` : ''}
          </p>
        </div>
      </div>

      {/* Classement */}
      {evalues.length > 0 && (
        <div className="bg-zinc-900 rounded-xl p-5 border border-zinc-800">
          <h3 className="display text-lg font-bold mb-4 text-zinc-100">Classement du mois</h3>
          <div className="space-y-2">
            {[...evalues].sort((a, b) => b.score - a.score).map((m, idx) => (
              <button key={m.id} onClick={() => setManagerDeplie(managerDeplie === m.id ? null : m.id)} className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-zinc-800/50 transition text-left">
                <span className={`display text-lg font-bold w-6 ${idx === 0 ? 'text-yellow-400' : idx === 1 ? 'text-zinc-400' : idx === 2 ? 'text-amber-600' : 'text-zinc-600'}`}>{idx + 1}</span>
                <AvatarManager manager={m} taille={10} />
                <span className="flex-1 font-medium text-zinc-200">{m.nom}</span>
                <div className="flex items-center gap-3 flex-1 max-w-md">
                  <div className="flex-1 h-2 bg-zinc-800 rounded-full overflow-hidden">
                    <div className={`h-full ${m.score >= 75 ? 'bg-emerald-500' : m.score >= 50 ? 'bg-amber-500' : 'bg-red-500'}`} style={{ width: `${m.score}%` }} />
                  </div>
                  <span className={`text-sm font-bold w-12 text-right ${m.score >= 75 ? 'text-emerald-400' : m.score >= 50 ? 'text-amber-400' : 'text-red-400'}`}>{m.score.toFixed(0)}</span>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Détail par manager */}
      <div className="space-y-3">
        <h3 className="display text-lg font-bold text-zinc-100">Détail des évaluations</h3>
        {data.managers.map((m) => {
          const score = scoreGlobal(m.id, moisData, data);
          const histo = historiqueManager(m.id);
          const ouvert = managerDeplie === m.id;
          const couleur = score === null ? 'text-zinc-500' : score >= 75 ? 'text-emerald-400' : score >= 50 ? 'text-amber-400' : 'text-red-400';

          return (
            <div key={m.id} className="bg-zinc-900 rounded-xl border border-zinc-800 overflow-hidden">
              <button onClick={() => setManagerDeplie(ouvert ? null : m.id)} className="w-full p-5 flex items-center gap-4 hover:bg-zinc-800/30 transition text-left">
                <AvatarManager manager={m} taille={16} />
                <div className="flex-1 min-w-0">
                  <h3 className="display text-lg font-bold truncate text-zinc-50">{m.nom}</h3>
                  <div className="flex items-center gap-3 mt-1 flex-wrap">
                    <span className={`text-sm font-bold ${couleur}`}>{score !== null ? `${score.toFixed(0)}/100` : 'Non évalué ce mois'}</span>
                    {histo.length > 1 && (
                      <span className="text-xs text-zinc-500">
                        Tendance : {(() => { const last = histo[histo.length - 1].score; const prev = histo[histo.length - 2].score; const diff = last - prev; return diff > 0 ? `+${diff} pts` : diff < 0 ? `${diff} pts` : 'stable'; })()}
                      </span>
                    )}
                  </div>
                </div>
                {ouvert ? <ChevronUp className="w-5 h-5 text-zinc-500" /> : <ChevronDown className="w-5 h-5 text-zinc-500" />}
              </button>

              {ouvert && (
                <div className="border-t border-zinc-800 p-5 bg-zinc-950 space-y-4">
                  {/* Détail des 4 axes en lecture seule */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {AXES_MANAGER.map((axe) => {
                      const Icon = axe.icon;
                      const eval_ = moisData.evaluations?.[m.id]?.[axe.id] || {};
                      const sc = scoreAxe(m.id, axe, moisData, data);
                      return (
                        <div key={axe.id} className="bg-zinc-900 rounded-lg p-4 border border-zinc-800">
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <Icon className="w-4 h-4 text-red-400" />
                              <p className="font-semibold text-sm text-zinc-200">{axe.nom}</p>
                            </div>
                            {sc !== null ? (
                              <span className={`text-xs font-bold ${sc >= 75 ? 'text-emerald-400' : sc >= 50 ? 'text-amber-400' : 'text-red-400'}`}>{sc.toFixed(0)}/100</span>
                            ) : <span className="text-xs text-zinc-600">Non évalué</span>}
                          </div>
                          {sc !== null && (
                            <>
                              <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden mb-2">
                                <div className={`h-full ${sc >= 75 ? 'bg-emerald-500' : sc >= 50 ? 'bg-amber-500' : 'bg-red-500'}`} style={{ width: `${sc}%` }} />
                              </div>
                              {axe.type === 'pourcentage' && eval_.valeur && <p className="text-xs text-zinc-400">Valeur : <span className="text-zinc-200 font-medium">{eval_.valeur}%</span></p>}
                              {axe.type === 'nombre' && eval_.valeur && <p className="text-xs text-zinc-400">Valeur : <span className="text-zinc-200 font-medium">{eval_.valeur}</span></p>}
                              {axe.type === 'note' && eval_.note !== undefined && <p className="text-xs text-zinc-400">Note : <span className="text-zinc-200 font-medium">{eval_.note}/10</span></p>}
                              {axe.type === 'composite' && (
                                <div className="space-y-1 mt-2">
                                  {SOUS_CRITERES_HOSPITALITE.map((sc2) => {
                                    const note = eval_.sousCriteres?.[sc2.id]?.note;
                                    return (
                                      <div key={sc2.id} className="flex justify-between text-xs">
                                        <span className="text-zinc-500 truncate">{sc2.nom}</span>
                                        <span className="text-zinc-300 font-medium">{note !== undefined ? `${note}/10` : '—'}</span>
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                              {eval_.commentaire && (
                                <p className="text-xs text-zinc-500 mt-2 italic border-l-2 border-zinc-700 pl-2">"{eval_.commentaire}"</p>
                              )}
                            </>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {histo.length > 1 && (
                    <div className="bg-zinc-900 rounded-lg p-4 border border-zinc-800">
                      <p className="text-sm font-semibold mb-3 text-zinc-200">Évolution du score global</p>
                      <ResponsiveContainer width="100%" height={180}>
                        <LineChart data={histo}>
                          <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID} />
                          <XAxis dataKey="mois" tick={{ fontSize: 11, fill: CHART_TEXT }} />
                          <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: CHART_TEXT }} />
                          <Tooltip contentStyle={{ backgroundColor: CHART_TOOLTIP_BG, border: '1px solid #3f3f46', borderRadius: '8px', color: '#e4e4e7' }} />
                          <Line type="monotone" dataKey="score" stroke="#ef4444" strokeWidth={2} dot={{ r: 4, fill: '#ef4444' }} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  )}

                  <div className="flex justify-end">
                    <button onClick={() => setTab('kpis')} className="px-3 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg text-sm flex items-center gap-2">
                      <Edit3 className="w-4 h-4" /> Modifier l'évaluation
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {nonEvalues.length > 0 && (
        <div className="bg-amber-950/30 border border-amber-800/50 rounded-xl p-4">
          <p className="text-sm text-amber-300 font-medium mb-2">{nonEvalues.length} manager{nonEvalues.length > 1 ? 's' : ''} non évalué{nonEvalues.length > 1 ? 's' : ''} ce mois</p>
          <div className="flex flex-wrap gap-2">
            {nonEvalues.map((m) => (
              <span key={m.id} className="text-xs px-2 py-1 bg-amber-950/50 text-amber-200 rounded-full border border-amber-800/50">{m.nom}</span>
            ))}
          </div>
          <button onClick={() => setTab('kpis')} className="mt-3 text-xs text-amber-300 hover:text-amber-200 underline">Aller aux saisies →</button>
        </div>
      )}
    </div>
  );
}

function AvatarManager({ manager, taille = 12, onChangePhoto, onSupprimerPhoto }) {
  const fileInputRef = useRef(null);
  const sizeClass = taille === 12 ? 'w-12 h-12' : taille === 16 ? 'w-16 h-16' : 'w-10 h-10';
  const textSize = taille === 12 ? 'text-base' : taille === 16 ? 'text-xl' : 'text-sm';

  const handleFile = async (e) => {
    e.stopPropagation();
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) return;
    try { const dataUrl = await compresserImage(file, 240); onChangePhoto(dataUrl); } catch (err) { console.error(err); }
    e.target.value = '';
  };

  return (
    <div className="relative group flex-shrink-0" onClick={(e) => onChangePhoto && e.stopPropagation()}>
      {manager.photo ? (
        <img src={manager.photo} alt={manager.nom} className={`${sizeClass} rounded-full object-cover border-2 border-zinc-700 shadow-lg`} />
      ) : (
        <div className={`${sizeClass} rounded-full bg-gradient-to-br from-red-600 to-red-800 flex items-center justify-center font-bold text-white ${textSize} shadow-lg shadow-red-950/50`}>
          {manager.nom.charAt(0).toUpperCase()}
        </div>
      )}
      {onChangePhoto && (
        <>
          <button onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }} className="absolute -bottom-1 -right-1 w-6 h-6 bg-zinc-100 hover:bg-white rounded-full flex items-center justify-center text-zinc-900 shadow-md opacity-0 group-hover:opacity-100 transition-opacity" title="Changer la photo">
            <Camera className="w-3 h-3" />
          </button>
          {manager.photo && onSupprimerPhoto && (
            <button onClick={(e) => { e.stopPropagation(); onSupprimerPhoto(); }} className="absolute -top-1 -right-1 w-5 h-5 bg-red-600 hover:bg-red-500 rounded-full flex items-center justify-center text-white shadow-md opacity-0 group-hover:opacity-100 transition-opacity" title="Supprimer la photo">
              <X className="w-3 h-3" />
            </button>
          )}
          <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFile} className="hidden" />
        </>
      )}
    </div>
  );
}

function AvisGoogle({ moisData, updateMoisData }) {
  const [nouvelAvis, setNouvelAvis] = useState({ auteur: '', note: 5, texte: '', date: '' });

  const ajouter = () => {
    if (!nouvelAvis.texte.trim()) return;
    updateMoisData({ avisDetailles: [...(moisData.avisDetailles || []), { ...nouvelAvis, id: Date.now() }] });
    setNouvelAvis({ auteur: '', note: 5, texte: '', date: '' });
  };
  const supprimer = (id) => updateMoisData({ avisDetailles: moisData.avisDetailles.filter((a) => a.id !== id) });
  const avis = moisData.avisDetailles || [];
  const moyenne = avis.length ? (avis.reduce((s, a) => s + parseInt(a.note), 0) / avis.length).toFixed(2) : 0;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="display text-2xl font-bold text-zinc-50">Avis Google détaillés</h2>
        <p className="text-zinc-500 text-sm">Colle les avis individuels du mois</p>
      </div>
      {avis.length > 0 && (
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-zinc-900 rounded-xl p-4 border border-zinc-800"><p className="text-xs text-zinc-500">Total</p><p className="display text-2xl font-bold text-zinc-50">{avis.length}</p></div>
          <div className="bg-zinc-900 rounded-xl p-4 border border-zinc-800"><p className="text-xs text-zinc-500">Note moyenne</p><p className="display text-2xl font-bold text-zinc-50">{moyenne}/5</p></div>
          <div className="bg-zinc-900 rounded-xl p-4 border border-zinc-800"><p className="text-xs text-zinc-500">Avis ≤3</p><p className="display text-2xl font-bold text-red-400">{avis.filter((a) => parseInt(a.note) <= 3).length}</p></div>
        </div>
      )}
      <div className="bg-zinc-900 rounded-xl p-5 border border-zinc-800">
        <h3 className="font-semibold mb-4 text-zinc-200">Ajouter un avis</h3>
        <div className="grid grid-cols-2 gap-3 mb-3">
          <input value={nouvelAvis.auteur} onChange={(e) => setNouvelAvis({ ...nouvelAvis, auteur: e.target.value })} placeholder="Auteur" className={inputClassSm} />
          <input type="date" value={nouvelAvis.date} onChange={(e) => setNouvelAvis({ ...nouvelAvis, date: e.target.value })} className={inputClassSm} />
        </div>
        <div className="mb-3">
          <label className="text-xs text-zinc-500">Note</label>
          <div className="flex gap-1 mt-1">
            {[1, 2, 3, 4, 5].map((n) => (
              <button key={n} onClick={() => setNouvelAvis({ ...nouvelAvis, note: n })} className={`w-9 h-9 rounded-lg border ${nouvelAvis.note >= n ? 'bg-yellow-500 border-yellow-400 text-zinc-900' : 'bg-zinc-800 border-zinc-700 text-zinc-600'}`}>
                <Star className="w-4 h-4 mx-auto" fill={nouvelAvis.note >= n ? 'currentColor' : 'none'} />
              </button>
            ))}
          </div>
        </div>
        <textarea value={nouvelAvis.texte} onChange={(e) => setNouvelAvis({ ...nouvelAvis, texte: e.target.value })} placeholder="Texte de l'avis..." rows={3} className={`${inputClassSm} mb-3`} />
        <button onClick={ajouter} className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg text-sm font-medium flex items-center gap-2"><Plus className="w-4 h-4" /> Ajouter</button>
      </div>
      <div className="space-y-3">
        {avis.map((a) => (
          <div key={a.id} className="bg-zinc-900 rounded-xl p-4 border border-zinc-800">
            <div className="flex items-start justify-between mb-2">
              <div>
                <div className="flex items-center gap-2"><span className="font-medium text-zinc-200">{a.auteur || 'Anonyme'}</span><span className="text-xs text-zinc-500">{a.date}</span></div>
                <div className="flex gap-0.5 mt-1">{[1, 2, 3, 4, 5].map((n) => <Star key={n} className="w-3 h-3 text-yellow-500" fill={parseInt(a.note) >= n ? 'currentColor' : 'none'} />)}</div>
              </div>
              <button onClick={() => supprimer(a.id)} className="text-zinc-500 hover:text-red-400"><Trash2 className="w-4 h-4" /></button>
            </div>
            <p className="text-sm text-zinc-300">{a.texte}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function UberEatsModule({ uberEatsData, updateUberEats, moisActif }) {
  const reclamations = uberEatsData.reclamations || [];
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [numeroCommande, setNumeroCommande] = useState('');
  const [typeErreur, setTypeErreur] = useState('');
  const [commentaire, setCommentaire] = useState('');

  const ajouter = () => {
    if (!numeroCommande.trim() && !typeErreur.trim()) return;
    const nouvelle = {
      id: Date.now(),
      date: date || new Date().toISOString().slice(0, 10),
      numeroCommande: numeroCommande.trim(),
      typeErreur: typeErreur.trim(),
      commentaire: commentaire.trim(),
    };
    updateUberEats({ reclamations: [nouvelle, ...reclamations] });
    setNumeroCommande('');
    setTypeErreur('');
    setCommentaire('');
    setDate(new Date().toISOString().slice(0, 10));
  };

  const supprimer = (id) => {
    if (!window.confirm('Supprimer cette réclamation ?')) return;
    updateUberEats({ reclamations: reclamations.filter((r) => r.id !== id) });
  };

  // Top 3 des types d'erreurs (statistiques)
  const statsErreurs = (() => {
    const compteur = {};
    reclamations.forEach((r) => {
      if (!r.typeErreur) return;
      const key = r.typeErreur.trim().toLowerCase();
      compteur[key] = (compteur[key] || 0) + 1;
    });
    return Object.entries(compteur)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([type, n]) => ({ type, n }));
  })();

  const reclamationsTriees = [...reclamations].sort((a, b) => (b.date || '').localeCompare(a.date || ''));

  return (
    <div className="space-y-6">
      <div>
        <h2 className="display text-2xl font-bold text-zinc-50">Uber Eats · {moisLabel(moisActif)}</h2>
        <p className="text-zinc-500 text-sm">Suivi des réclamations clients du mois</p>
      </div>

      {/* Stats du mois */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
          <div className="text-xs text-zinc-500 mb-1">Total réclamations</div>
          <div className="text-3xl font-bold text-zinc-100">{reclamations.length}</div>
        </div>
        {statsErreurs.map((s, i) => (
          <div key={s.type} className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
            <div className="text-xs text-zinc-500 mb-1">#{i + 1} type le plus fréquent</div>
            <div className="text-lg font-bold text-zinc-100 capitalize truncate">{s.type}</div>
            <div className="text-xs text-zinc-500 mt-1">{s.n} réclamation{s.n > 1 ? 's' : ''}</div>
          </div>
        ))}
        {statsErreurs.length === 0 && (
          <div className="md:col-span-3 bg-zinc-900 border border-zinc-800 rounded-xl p-4 flex items-center justify-center text-sm text-zinc-500">
            Statistiques disponibles dès la première réclamation
          </div>
        )}
      </div>

      {/* Formulaire d'ajout */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-1 h-6 bg-red-500 rounded"></div>
          <h3 className="display text-lg font-bold text-zinc-100">Nouvelle réclamation</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Date">
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inputClass} />
          </Field>
          <Field label="N° de commande">
            <input type="text" value={numeroCommande} onChange={(e) => setNumeroCommande(e.target.value)} placeholder="Ex : #A1B2C3" className={inputClass} />
          </Field>
          <Field label="Type d'erreur">
            <input type="text" value={typeErreur} onChange={(e) => setTypeErreur(e.target.value)} placeholder="Ex : article manquant, mauvaise sauce..." className={inputClass} />
          </Field>
          <Field label="Commentaire">
            <input type="text" value={commentaire} onChange={(e) => setCommentaire(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && ajouter()} placeholder="Détails, geste commercial..." className={inputClass} />
          </Field>
        </div>
        <button onClick={ajouter} className="mt-4 px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg text-sm font-medium flex items-center gap-2">
          <Plus className="w-4 h-4" /> Ajouter la réclamation
        </button>
      </div>

      {/* Liste des réclamations */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <div className="w-1 h-6 bg-red-500 rounded"></div>
          <h3 className="display text-lg font-bold text-zinc-100">Historique du mois</h3>
          <span className="text-xs text-zinc-500">— {reclamations.length} entrée{reclamations.length > 1 ? 's' : ''}</span>
        </div>

        {reclamations.length === 0 ? (
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-12 text-center">
            <ShoppingBag className="w-12 h-12 text-zinc-700 mx-auto mb-3" />
            <p className="text-zinc-400 font-medium mb-1">Aucune réclamation ce mois-ci</p>
            <p className="text-sm text-zinc-500">Utilise le formulaire au-dessus pour ajouter une entrée</p>
          </div>
        ) : (
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
            <div className="grid grid-cols-12 gap-2 px-4 py-2 bg-zinc-950/50 border-b border-zinc-800 text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">
              <div className="col-span-2">Date</div>
              <div className="col-span-2">N° commande</div>
              <div className="col-span-3">Type d'erreur</div>
              <div className="col-span-4">Commentaire</div>
              <div className="col-span-1"></div>
            </div>
            <div className="divide-y divide-zinc-800">
              {reclamationsTriees.map((r) => (
                <div key={r.id} className="grid grid-cols-12 gap-2 px-4 py-3 items-center text-sm">
                  <div className="col-span-2 text-zinc-300">{r.date ? new Date(r.date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' }) : '—'}</div>
                  <div className="col-span-2 text-zinc-200 font-mono text-xs truncate">{r.numeroCommande || '—'}</div>
                  <div className="col-span-3 text-zinc-200 truncate">{r.typeErreur || '—'}</div>
                  <div className="col-span-4 text-zinc-400 text-xs truncate">{r.commentaire || ''}</div>
                  <div className="col-span-1 flex justify-end">
                    <button onClick={() => supprimer(r.id)} className="p-1.5 text-zinc-500 hover:text-red-400 transition" title="Supprimer">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function TikTokModule({ tiktokData, updateTiktok }) {
  const videos = tiktokData.videos || [];
  const [analysing, setAnalysing] = useState({});

  const ajouterVideo = () => {
    if (videos.length >= 15) return;
    updateTiktok({ videos: [...videos, { id: Date.now(), url: '', titre: '', description: '', date: '', vues: '', likes: '', commentaires: '', partages: '', analyseIA: '' }] });
  };
  const updateVideo = (id, patch) => updateTiktok({ videos: videos.map((v) => (v.id === id ? { ...v, ...patch } : v)) });
  const supprimerVideo = (id) => updateTiktok({ videos: videos.filter((v) => v.id !== id) });

  const stats = useMemo(() => {
    if (videos.length === 0) return null;
    const totalVues = videos.reduce((s, v) => s + (parseInt(v.vues) || 0), 0);
    const totalLikes = videos.reduce((s, v) => s + (parseInt(v.likes) || 0), 0);
    const moyVues = Math.round(totalVues / videos.length);
    const moyLikes = Math.round(totalLikes / videos.length);
    const top = [...videos].sort((a, b) => (parseInt(b.vues) || 0) - (parseInt(a.vues) || 0))[0];
    const flop = [...videos].filter((v) => parseInt(v.vues) > 0).sort((a, b) => (parseInt(a.vues) || 0) - (parseInt(b.vues) || 0))[0];
    return { totalVues, totalLikes, moyVues, moyLikes, top, flop };
  }, [videos]);

  const analyserVideo = async (video) => {
    setAnalysing({ ...analysing, [video.id]: true });
    // Analyse IA désactivée hors environnement Claude.ai (pas de clé API côté client).
    // Pour réactiver : ajouter un proxy serveur (Vercel Function, Cloudflare Worker, etc.)
    // qui relaye l'appel à https://api.anthropic.com/v1/messages avec une clé sécurisée.
    setTimeout(() => {
      updateVideo(video.id, {
        analyseIA: `ℹ️ **Analyse IA indisponible**\n\nL'analyse automatique nécessite un backend avec clé API Anthropic. Cette version statique n'inclut pas de proxy serveur.\n\nPour analyser cette vidéo manuellement, regarde :\n- **Performance** : ${video.vues || 0} vues, ${video.likes || 0} likes\n- **Ratio likes/vues** : ${parseInt(video.vues) > 0 ? ((parseInt(video.likes) || 0) / parseInt(video.vues) * 100).toFixed(2) : '0'}%\n- **vs moyenne du mois** : ${stats && stats.moyVues > 0 ? (((parseInt(video.vues) || 0) - stats.moyVues) / stats.moyVues * 100).toFixed(0) : '0'}%`
      });
      setAnalysing({ ...analysing, [video.id]: false });
    }, 300);
  };

  const chartData = useMemo(() => videos.filter((v) => parseInt(v.vues) > 0 || parseInt(v.likes) > 0).map((v, idx) => ({
    nom: v.titre ? (v.titre.length > 15 ? v.titre.slice(0, 15) + '…' : v.titre) : `V${idx + 1}`,
    vues: parseInt(v.vues) || 0,
    likes: parseInt(v.likes) || 0,
  })), [videos]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="display text-2xl font-bold text-zinc-50">TikTok · @mcdolacote</h2>
        <p className="text-zinc-500 text-sm">15 dernières vidéos · analyse IA</p>
      </div>

      {stats && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-zinc-900 rounded-xl p-4 border border-zinc-800"><p className="text-xs text-zinc-500">Vues totales</p><p className="display text-2xl font-bold text-zinc-50">{stats.totalVues.toLocaleString('fr-CH')}</p><p className="text-xs text-zinc-600 mt-1">Moy : {stats.moyVues.toLocaleString('fr-CH')}</p></div>
            <div className="bg-zinc-900 rounded-xl p-4 border border-zinc-800"><p className="text-xs text-zinc-500">Likes totaux</p><p className="display text-2xl font-bold text-zinc-50">{stats.totalLikes.toLocaleString('fr-CH')}</p><p className="text-xs text-zinc-600 mt-1">Moy : {stats.moyLikes.toLocaleString('fr-CH')}</p></div>
            <div className="bg-emerald-950/40 rounded-xl p-4 border border-emerald-800/50"><div className="flex items-center gap-1 text-xs text-emerald-400"><Sparkles className="w-3 h-3" /> Top</div><p className="display text-sm font-bold truncate mt-1 text-zinc-100">{stats.top?.titre || 'Sans titre'}</p><p className="text-xs text-emerald-400 mt-1">{(parseInt(stats.top?.vues) || 0).toLocaleString('fr-CH')} vues</p></div>
            {stats.flop && <div className="bg-zinc-900 rounded-xl p-4 border border-zinc-800"><p className="text-xs text-zinc-500">Moins vue</p><p className="display text-sm font-bold truncate mt-1 text-zinc-200">{stats.flop?.titre || 'Sans titre'}</p><p className="text-xs text-zinc-500 mt-1">{(parseInt(stats.flop?.vues) || 0).toLocaleString('fr-CH')} vues</p></div>}
          </div>

          {chartData.length > 0 && (
            <div className="bg-zinc-900 rounded-xl p-5 border border-zinc-800">
              <h3 className="display text-lg font-bold mb-4 text-zinc-100">Performance par vidéo</h3>
              <ResponsiveContainer width="100%" height={320}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID} />
                  <XAxis dataKey="nom" tick={{ fontSize: 10, fill: CHART_TEXT }} angle={-25} textAnchor="end" height={60} />
                  <YAxis yAxisId="left" tick={{ fontSize: 11, fill: CHART_TEXT }} />
                  <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11, fill: CHART_TEXT }} />
                  <Tooltip contentStyle={{ backgroundColor: CHART_TOOLTIP_BG, border: '1px solid #3f3f46', borderRadius: '8px', color: '#e4e4e7' }} />
                  <Legend wrapperStyle={{ color: CHART_TEXT }} />
                  <Bar yAxisId="left" dataKey="vues" fill="#ef4444" name="Vues" radius={[4, 4, 0, 0]} />
                  <Bar yAxisId="right" dataKey="likes" fill="#fbbf24" name="Likes" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </>
      )}

      <button onClick={ajouterVideo} disabled={videos.length >= 15} className="w-full py-3 border-2 border-dashed border-zinc-700 hover:border-zinc-600 rounded-xl text-sm text-zinc-400 disabled:opacity-50 flex items-center justify-center gap-2 transition"><Plus className="w-4 h-4" /> Ajouter une vidéo ({videos.length}/15)</button>

      <div className="space-y-4">
        {videos.map((v, idx) => {
          const peutAnalyser = stats && (v.titre || v.description) && parseInt(v.vues) > 0;
          return (
            <div key={v.id} className="bg-zinc-900 rounded-xl border border-zinc-800 overflow-hidden">
              <div className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2 flex-1">
                    <span className="display text-lg font-bold text-zinc-600">#{idx + 1}</span>
                    <input value={v.titre} onChange={(e) => updateVideo(v.id, { titre: e.target.value })} placeholder="Titre / caption" className="flex-1 px-2 py-1 bg-transparent border-b border-transparent hover:border-zinc-700 focus:border-red-500 outline-none font-medium text-zinc-100 placeholder:text-zinc-600" />
                  </div>
                  <button onClick={() => supprimerVideo(v.id)} className="text-zinc-500 hover:text-red-400"><Trash2 className="w-4 h-4" /></button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-3">
                  <div>
                    <label className="text-xs text-zinc-500">Lien TikTok</label>
                    <div className="flex gap-1">
                      <input type="url" value={v.url || ''} onChange={(e) => updateVideo(v.id, { url: e.target.value })} placeholder="https://www.tiktok.com/..." className={`flex-1 ${inputClassSm}`} />
                      {v.url && <a href={v.url} target="_blank" rel="noopener noreferrer" className="px-2 py-1 bg-zinc-800 hover:bg-zinc-700 rounded text-zinc-400"><ExternalLink className="w-4 h-4" /></a>}
                    </div>
                  </div>
                  <div>
                    <label className="text-xs text-zinc-500">Date</label>
                    <input type="date" value={v.date} onChange={(e) => updateVideo(v.id, { date: e.target.value })} className={inputClassSm} />
                  </div>
                </div>

                <div className="mb-3">
                  <label className="text-xs text-zinc-500">Description du contenu</label>
                  <textarea value={v.description || ''} onChange={(e) => updateVideo(v.id, { description: e.target.value })} rows={2} placeholder="Format, sujet, ton... pour l'analyse IA" className={inputClassSm} />
                </div>

                <div className="grid grid-cols-4 gap-2 mb-3">
                  <div><label className="text-xs text-zinc-500">Vues</label><input type="number" value={v.vues} onChange={(e) => updateVideo(v.id, { vues: e.target.value })} className={inputClassSm} /></div>
                  <div><label className="text-xs text-zinc-500">Likes</label><input type="number" value={v.likes} onChange={(e) => updateVideo(v.id, { likes: e.target.value })} className={inputClassSm} /></div>
                  <div><label className="text-xs text-zinc-500">Comm.</label><input type="number" value={v.commentaires} onChange={(e) => updateVideo(v.id, { commentaires: e.target.value })} className={inputClassSm} /></div>
                  <div><label className="text-xs text-zinc-500">Partages</label><input type="number" value={v.partages} onChange={(e) => updateVideo(v.id, { partages: e.target.value })} className={inputClassSm} /></div>
                </div>

                {parseInt(v.vues) > 0 && stats && (
                  <div className="mb-3 text-xs flex gap-4">
                    <span className={`${parseInt(v.vues) >= stats.moyVues ? 'text-emerald-400' : 'text-zinc-500'}`}>{parseInt(v.vues) >= stats.moyVues ? '↑' : '↓'} vs moy : {(((parseInt(v.vues) - stats.moyVues) / stats.moyVues) * 100).toFixed(0)}%</span>
                    <span className="text-zinc-500">Likes/vues : {(((parseInt(v.likes) || 0) / parseInt(v.vues)) * 100).toFixed(1)}%</span>
                  </div>
                )}

                <button onClick={() => analyserVideo(v)} disabled={!peutAnalyser || analysing[v.id]} className="px-3 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-zinc-800 disabled:text-zinc-600 disabled:cursor-not-allowed text-white rounded-lg text-xs font-medium flex items-center gap-2">
                  {analysing[v.id] ? <><Loader2 className="w-3 h-3 animate-spin" /> Analyse en cours...</> : <><Wand2 className="w-3 h-3" /> {v.analyseIA ? 'Régénérer' : 'Analyser avec IA'}</>}
                </button>
              </div>

              {v.analyseIA && (
                <div className="border-t border-zinc-800 bg-blue-950/20 p-4">
                  <div className="flex items-center gap-2 mb-2"><Sparkles className="w-4 h-4 text-blue-400" /><p className="text-sm font-semibold text-blue-300">Analyse IA</p></div>
                  <div className="text-sm text-zinc-300 whitespace-pre-wrap leading-relaxed">{v.analyseIA}</div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function RapportMensuel({ data, persist, showToast }) {
  const moisActif = data.moisActif;
  const moisData = data.mois[moisActif] || {};
  const tiktokData = data.tiktok[moisActif] || { videos: [] };
  const atteinte = calculerAtteinteGlobale(moisData, data.objectifs);

  // Données du mois précédent
  const moisPrec = (() => {
    const [y, m] = moisActif.split('-');
    const d = new Date(parseInt(y), parseInt(m) - 2, 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  })();
  const dataPrec = data.mois[moisPrec];

  // Historique 6 derniers mois pour graphique d'évolution
  const histo6mois = useMemo(() => {
    const moisAll = Object.keys(data.mois).sort().slice(-6);
    return moisAll.map((m) => {
      const md = data.mois[m];
      const att = calculerAtteinteGlobale(md, data.objectifs);
      return {
        mois: moisLabelCourt(m),
        atteinte: Math.round(att.pct),
        avis: parseInt(md.avisGoogleNombre) || 0,
        note: parseFloat(md.avisGoogleNote) || 0,
        fastInside: parseFloat(md.fastInside) || 0,
        oep: parseFloat(md.oep) || 0,
      };
    });
  }, [data.mois, moisActif, data.objectifs]);

  // Comparaison mois actuel vs précédent
  const compareData = useMemo(() => {
    if (!dataPrec) return null;
    return [
      { kpi: 'Avis', actuel: parseInt(moisData.avisGoogleNombre) || 0, precedent: parseInt(dataPrec.avisGoogleNombre) || 0, objectif: data.objectifs.avisGoogleNombre },
      { kpi: 'Note', actuel: parseFloat(moisData.avisGoogleNote) || 0, precedent: parseFloat(dataPrec.avisGoogleNote) || 0, objectif: data.objectifs.avisGoogleNote },
      { kpi: 'Fast Inside', actuel: parseFloat(moisData.fastInside) || 0, precedent: parseFloat(dataPrec.fastInside) || 0, objectif: data.objectifs.fastInside },
      { kpi: 'O&P', actuel: parseFloat(moisData.oep) || 0, precedent: parseFloat(dataPrec.oep) || 0, objectif: data.objectifs.oep },
    ];
  }, [moisData, dataPrec, data.objectifs]);

  // Scores managers triés
  const managersClasses = useMemo(() => {
    return data.managers
      .map((m) => ({ ...m, score: scoreGlobal(m.id, moisData, data) }))
      .filter((m) => m.score !== null)
      .sort((a, b) => b.score - a.score);
  }, [data.managers, moisData, data]);

  // Stats TikTok
  const tiktokStats = useMemo(() => {
    if (tiktokData.videos.length === 0) return null;
    const totalVues = tiktokData.videos.reduce((s, v) => s + (parseInt(v.vues) || 0), 0);
    const totalLikes = tiktokData.videos.reduce((s, v) => s + (parseInt(v.likes) || 0), 0);
    const moyVues = Math.round(totalVues / tiktokData.videos.length);
    const top3 = [...tiktokData.videos].sort((a, b) => (parseInt(b.vues) || 0) - (parseInt(a.vues) || 0)).slice(0, 3);
    return { totalVues, totalLikes, moyVues, top3, total: tiktokData.videos.length };
  }, [tiktokData]);

  const exporterPDF = () => window.print();

  const partagerTexte = async () => {
    const lignes = [
      `📊 Rapport ${moisLabel(moisActif)} — McDonald's Nyon Gare`,
      ``,
      `Atteinte du pôle : ${atteinte.pct.toFixed(0)}% ${atteinte.atteint ? '✅ OBJECTIF ATTEINT' : '⚠️ Sous objectif (seuil 95%)'}`,
      `Objectifs atteints : ${atteinte.atteints}/${atteinte.total}`,
      ``,
      `📈 KPIs du pôle :`,
      `• Avis Google : ${moisData.avisGoogleNombre || 'NR'} (obj ${data.objectifs.avisGoogleNombre})`,
      `• Note Google : ${moisData.avisGoogleNote || 'NR'}/5 (obj ${data.objectifs.avisGoogleNote})`,
      `• Fast Inside : ${moisData.fastInside || 'NR'}% (obj ${data.objectifs.fastInside}%)`,
      `• O&P : ${moisData.oep || 'NR'}% (obj ${data.objectifs.oep}%)`,
    ];

    if (managersClasses.length > 0) {
      lignes.push(``, `👥 Top managers :`);
      managersClasses.slice(0, 3).forEach((m, i) => {
        lignes.push(`${i + 1}. ${m.nom} — ${m.score.toFixed(0)}/100`);
      });
    }

    if (tiktokStats) {
      lignes.push(``, `📱 TikTok @mcdolacote :`);
      lignes.push(`• ${tiktokStats.total} vidéos · ${tiktokStats.totalVues.toLocaleString('fr-CH')} vues totales`);
      lignes.push(`• Top : "${tiktokStats.top3[0]?.titre || 'Sans titre'}" (${tiktokStats.top3[0]?.vues || 0} vues)`);
    }

    try {
      await navigator.clipboard.writeText(lignes.join('\n'));
      showToast('Résumé copié dans le presse-papiers');
    } catch (e) {
      showToast('Impossible de copier', 'error');
    }
  };

  const aDesDonnees = moisData.avisGoogleNombre || moisData.avisGoogleNote || moisData.fastInside || moisData.oep;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-3 no-print">
        <div>
          <h2 className="display text-2xl font-bold text-zinc-50">Rapport mensuel · {moisLabel(moisActif)}</h2>
          <p className="text-zinc-500 text-sm">Synthèse complète du mois avec tous les indicateurs</p>
        </div>
        {aDesDonnees && (
          <div className="flex gap-2 flex-wrap">
            <button onClick={exporterPDF} className="px-3 py-2 bg-zinc-100 hover:bg-white text-zinc-900 rounded-lg text-sm font-medium flex items-center gap-2">
              <FileDown className="w-4 h-4" /> Exporter PDF
            </button>
            <button onClick={partagerTexte} className="px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-medium flex items-center gap-2">
              <Share2 className="w-4 h-4" /> Copier résumé
            </button>
          </div>
        )}
      </div>

      {!aDesDonnees && (
        <div className="bg-zinc-900 rounded-xl p-12 border-2 border-dashed border-zinc-800 text-center">
          <FileText className="w-12 h-12 text-zinc-700 mx-auto mb-3" />
          <p className="text-zinc-300 font-medium mb-1">Aucune donnée pour ce mois</p>
          <p className="text-sm text-zinc-500">Va dans la saisie mensuelle pour renseigner tes KPIs et évaluer tes managers.</p>
        </div>
      )}

      {aDesDonnees && (
        <div className="bg-zinc-900 rounded-xl border border-zinc-800 overflow-hidden">
          {/* En-tête rapport */}
          <div className="bg-gradient-to-br from-red-700 via-red-800 to-red-900 text-white p-6 border-b border-red-700/50">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-lg bg-yellow-400 flex items-center justify-center font-bold text-red-600 text-xl">M</div>
              <div>
                <p className="display text-lg font-bold">McDonald's Nyon Gare</p>
                <p className="text-xs text-red-200">Rapport de pilotage mensuel</p>
              </div>
            </div>
            <h3 className="display text-3xl font-bold mt-4">{moisLabel(moisActif)}</h3>
            <div className="mt-4 flex items-center gap-4 flex-wrap">
              <div>
                <p className="text-xs text-red-200">Atteinte du pôle</p>
                <p className="display text-3xl font-bold">{atteinte.pct.toFixed(0)}%</p>
              </div>
              <div className="text-xs px-3 py-1.5 rounded-full bg-white/10 border border-white/20">
                {atteinte.atteint ? '✓ Objectif atteint' : '⚠ Sous objectif (seuil 95%)'}
              </div>
              <div className="text-xs px-3 py-1.5 rounded-full bg-white/10 border border-white/20">
                {atteinte.atteints}/{atteinte.total} objectifs atteints
              </div>
            </div>

            <div className="w-full h-3 bg-red-950/50 rounded-full overflow-hidden relative mt-4">
              <div className={`h-full ${atteinte.atteint ? 'bg-emerald-400' : 'bg-yellow-400'} transition-all duration-500`} style={{ width: `${atteinte.pct}%` }} />
              <div className="absolute top-0 bottom-0 border-l-2 border-white/40 border-dashed" style={{ left: '95%' }} />
            </div>
          </div>

          {/* Section 1 : KPIs détaillés */}
          <div className="p-6 border-b border-zinc-800">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-1 h-5 bg-red-500 rounded"></div>
              <h4 className="display text-lg font-bold text-zinc-100">KPIs du pôle</h4>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { l: 'Avis Google', v: moisData.avisGoogleNombre, o: data.objectifs.avisGoogleNombre, p: dataPrec?.avisGoogleNombre },
                { l: 'Note Google', v: moisData.avisGoogleNote, o: data.objectifs.avisGoogleNote, u: '/5', p: dataPrec?.avisGoogleNote },
                { l: 'Fast Inside', v: moisData.fastInside, o: data.objectifs.fastInside, u: '%', p: dataPrec?.fastInside },
                { l: 'O&P', v: moisData.oep, o: data.objectifs.oep, u: '%', p: dataPrec?.oep },
              ].map((k, i) => {
                const prog = calculerProgression(k.v, k.o);
                const evolutionPct = k.p && k.v ? ((parseFloat(k.v) - parseFloat(k.p)) / parseFloat(k.p)) * 100 : null;
                return (
                  <div key={i} className="bg-zinc-950 rounded-lg p-3 border border-zinc-800">
                    <p className="text-xs text-zinc-500">{k.l}</p>
                    <p className="display text-xl font-bold text-zinc-100">{k.v || '—'}{k.u || ''}</p>
                    <p className="text-xs text-zinc-600 mb-2">obj {k.o}{k.u || ''}</p>
                    <ProgressBar pct={prog.pct} atteint={prog.atteint} hasValue={prog.hasValue} />
                    <div className="flex justify-between items-center mt-2">
                      <span className={`text-xs font-medium ${prog.atteint ? 'text-emerald-400' : 'text-zinc-400'}`}>
                        {prog.hasValue ? `${prog.pct.toFixed(0)}%` : '—'}
                      </span>
                      {evolutionPct !== null && !isNaN(evolutionPct) && (
                        <span className={`text-xs font-medium ${evolutionPct >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                          {evolutionPct >= 0 ? '+' : ''}{evolutionPct.toFixed(1)}%
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Section 2 : Comparaison mois précédent */}
          {compareData && (
            <div className="p-6 border-b border-zinc-800">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-1 h-5 bg-red-500 rounded"></div>
                <h4 className="display text-lg font-bold text-zinc-100">Comparaison vs {moisLabel(moisPrec)}</h4>
              </div>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={compareData}>
                  <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID} />
                  <XAxis dataKey="kpi" tick={{ fontSize: 11, fill: CHART_TEXT }} />
                  <YAxis tick={{ fontSize: 11, fill: CHART_TEXT }} />
                  <Tooltip contentStyle={{ backgroundColor: CHART_TOOLTIP_BG, border: '1px solid #3f3f46', borderRadius: '8px', color: '#e4e4e7' }} />
                  <Legend wrapperStyle={{ color: CHART_TEXT, fontSize: 12 }} />
                  <Bar dataKey="precedent" fill="#52525b" name={moisLabelCourt(moisPrec)} radius={[4, 4, 0, 0]} />
                  <Bar dataKey="actuel" fill="#ef4444" name={moisLabelCourt(moisActif)} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Section 3 : Évolution 6 mois */}
          {histo6mois.length > 1 && (
            <div className="p-6 border-b border-zinc-800">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-1 h-5 bg-red-500 rounded"></div>
                <h4 className="display text-lg font-bold text-zinc-100">Évolution sur 6 mois</h4>
              </div>
              <ResponsiveContainer width="100%" height={260}>
                <LineChart data={histo6mois}>
                  <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID} />
                  <XAxis dataKey="mois" tick={{ fontSize: 11, fill: CHART_TEXT }} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: CHART_TEXT }} />
                  <Tooltip contentStyle={{ backgroundColor: CHART_TOOLTIP_BG, border: '1px solid #3f3f46', borderRadius: '8px', color: '#e4e4e7' }} />
                  <Legend wrapperStyle={{ color: CHART_TEXT, fontSize: 12 }} />
                  <Line type="monotone" dataKey="atteinte" stroke="#ef4444" strokeWidth={2.5} name="Atteinte du pôle (%)" dot={{ r: 4, fill: '#ef4444' }} />
                </LineChart>
              </ResponsiveContainer>
              <p className="text-xs text-zinc-500 text-center mt-2">Ligne rouge : pourcentage d'atteinte du pôle mois par mois (objectif ≥ 95%)</p>
            </div>
          )}

          {/* Section 4 : Managers */}
          {data.managers.length > 0 && (
            <div className="p-6 border-b border-zinc-800">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-1 h-5 bg-red-500 rounded"></div>
                <h4 className="display text-lg font-bold text-zinc-100">Évaluation des managers</h4>
              </div>

              {managersClasses.length === 0 ? (
                <p className="text-sm text-zinc-500 italic">Aucun manager évalué ce mois.</p>
              ) : (
                <>
                  {/* Stats équipe */}
                  <div className="grid grid-cols-3 gap-3 mb-4">
                    <div className="bg-zinc-950 rounded-lg p-3 border border-zinc-800">
                      <p className="text-xs text-zinc-500">Évalués</p>
                      <p className="display text-xl font-bold text-zinc-100">{managersClasses.length}/{data.managers.length}</p>
                    </div>
                    <div className="bg-zinc-950 rounded-lg p-3 border border-zinc-800">
                      <p className="text-xs text-zinc-500">Moyenne équipe</p>
                      <p className={`display text-xl font-bold ${
                        (managersClasses.reduce((s, m) => s + m.score, 0) / managersClasses.length) >= 75 ? 'text-emerald-400' :
                        (managersClasses.reduce((s, m) => s + m.score, 0) / managersClasses.length) >= 50 ? 'text-amber-400' : 'text-red-400'
                      }`}>
                        {(managersClasses.reduce((s, m) => s + m.score, 0) / managersClasses.length).toFixed(0)}/100
                      </p>
                    </div>
                    <div className="bg-zinc-950 rounded-lg p-3 border border-zinc-800">
                      <p className="text-xs text-zinc-500">Top performer</p>
                      <p className="text-sm font-bold text-zinc-100 truncate">{managersClasses[0].nom}</p>
                      <p className="text-xs text-emerald-400">{managersClasses[0].score.toFixed(0)}/100</p>
                    </div>
                  </div>

                  {/* Graphique classement */}
                  <ResponsiveContainer width="100%" height={Math.max(180, managersClasses.length * 38)}>
                    <BarChart data={managersClasses.map((m) => ({ nom: m.nom, score: Math.round(m.score) }))} layout="vertical" margin={{ left: 70 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID} />
                      <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11, fill: CHART_TEXT }} />
                      <YAxis type="category" dataKey="nom" tick={{ fontSize: 11, fill: CHART_TEXT }} />
                      <Tooltip contentStyle={{ backgroundColor: CHART_TOOLTIP_BG, border: '1px solid #3f3f46', borderRadius: '8px', color: '#e4e4e7' }} />
                      <Bar dataKey="score" fill="#ef4444" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>

                  {/* Liste détaillée */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4">
                    {managersClasses.map((m, idx) => (
                      <div key={m.id} className="flex items-center gap-3 bg-zinc-950 rounded-lg p-3 border border-zinc-800">
                        <span className={`display text-base font-bold w-5 ${idx === 0 ? 'text-yellow-400' : idx === 1 ? 'text-zinc-400' : idx === 2 ? 'text-amber-600' : 'text-zinc-600'}`}>{idx + 1}</span>
                        <AvatarManager manager={m} taille={10} />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate text-zinc-200">{m.nom}</p>
                          <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden mt-1">
                            <div className={`h-full ${m.score >= 75 ? 'bg-emerald-500' : m.score >= 50 ? 'bg-amber-500' : 'bg-red-500'}`} style={{ width: `${m.score}%` }} />
                          </div>
                        </div>
                        <span className={`text-sm font-bold ${m.score >= 75 ? 'text-emerald-400' : m.score >= 50 ? 'text-amber-400' : 'text-red-400'}`}>
                          {m.score.toFixed(0)}
                        </span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}

          {/* Section 5 : TikTok */}
          {tiktokStats && (
            <div className="p-6 border-b border-zinc-800">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-1 h-5 bg-red-500 rounded"></div>
                <h4 className="display text-lg font-bold text-zinc-100">Communication TikTok @mcdolacote</h4>
              </div>
              <div className="grid grid-cols-3 gap-3 mb-4">
                <div className="bg-zinc-950 rounded-lg p-3 border border-zinc-800">
                  <p className="text-xs text-zinc-500">Vidéos publiées</p>
                  <p className="display text-xl font-bold text-zinc-100">{tiktokStats.total}</p>
                </div>
                <div className="bg-zinc-950 rounded-lg p-3 border border-zinc-800">
                  <p className="text-xs text-zinc-500">Vues totales</p>
                  <p className="display text-xl font-bold text-zinc-100">{tiktokStats.totalVues.toLocaleString('fr-CH')}</p>
                </div>
                <div className="bg-zinc-950 rounded-lg p-3 border border-zinc-800">
                  <p className="text-xs text-zinc-500">Likes totaux</p>
                  <p className="display text-xl font-bold text-zinc-100">{tiktokStats.totalLikes.toLocaleString('fr-CH')}</p>
                </div>
              </div>

              <p className="text-xs text-zinc-500 mb-2">Top 3 vidéos du mois</p>
              <div className="space-y-2">
                {tiktokStats.top3.map((v, idx) => (
                  <div key={v.id} className="flex items-center gap-3 bg-zinc-950 rounded-lg p-3 border border-zinc-800">
                    <span className={`display text-base font-bold w-5 ${idx === 0 ? 'text-yellow-400' : idx === 1 ? 'text-zinc-400' : 'text-amber-600'}`}>{idx + 1}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate text-zinc-200">{v.titre || 'Sans titre'}</p>
                      <p className="text-xs text-zinc-500">{(parseInt(v.vues) || 0).toLocaleString('fr-CH')} vues · {(parseInt(v.likes) || 0).toLocaleString('fr-CH')} likes</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Section 6 : Notes libres */}
          {moisData.notes && moisData.notes.trim() && (
            <div className="p-6 border-b border-zinc-800">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-1 h-5 bg-red-500 rounded"></div>
                <h4 className="display text-lg font-bold text-zinc-100">Notes & faits marquants</h4>
              </div>
              <div className="bg-zinc-950 rounded-lg p-4 border border-zinc-800">
                <p className="text-sm text-zinc-300 whitespace-pre-wrap leading-relaxed italic">"{moisData.notes}"</p>
              </div>
            </div>
          )}

          {/* Footer */}
          <div className="px-6 py-3 bg-zinc-950 border-t border-zinc-800 text-xs text-zinc-500 flex justify-between flex-wrap gap-2">
            <span>McDonald's Nyon Gare · Suisse</span>
            <span>Édité le {new Date().toLocaleDateString('fr-CH', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
          </div>
        </div>
      )}
    </div>
  );
}


function Configuration({ data, persist, showToast }) {
  const fileInputRef = useRef(null);
  const updateObjectif = (key, value) => persist({ ...data, objectifs: { ...data.objectifs, [key]: parseFloat(value) || 0 } });
  const updateObjectifManager = (key, value) => persist({ ...data, objectifsManager: { ...data.objectifsManager, [key]: parseFloat(value) || 0 } });
  const updatePoids = (axeId, value) => persist({ ...data, poidsAxes: { ...data.poidsAxes, [axeId]: parseInt(value) || 0 } });
  const updatePoidsHosp = (id, value) => persist({ ...data, poidsHospitalite: { ...data.poidsHospitalite, [id]: parseInt(value) || 0 } });

  const totalPoids = AXES_MANAGER.reduce((s, a) => s + (parseInt(data.poidsAxes[a.id]) || 0), 0);
  const totalPoidsHosp = SOUS_CRITERES_HOSPITALITE.reduce((s, c) => s + (parseInt(data.poidsHospitalite[c.id]) || 0), 0);

  const exporterJSON = () => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `mcdo-nyon-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Données exportées');
  };

  const importerJSON = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const parsed = JSON.parse(ev.target.result);
        if (!parsed.objectifs || !parsed.mois) throw new Error('Fichier invalide');
        if (!window.confirm('Cela va remplacer toutes tes données actuelles. Continuer ?')) return;
        persist({ ...DEFAULT_DATA, ...parsed });
        showToast('Données importées');
      } catch (err) {
        showToast(`Erreur : ${err.message}`, 'error');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="display text-2xl font-bold text-zinc-50">Configuration</h2>
        <p className="text-zinc-500 text-sm">Objectifs, pondérations et sauvegarde</p>
      </div>

      <div className="bg-zinc-900 rounded-xl p-5 border border-zinc-800">
        <h3 className="font-semibold mb-1 text-zinc-200">Sauvegarde / Restauration</h3>
        <p className="text-xs text-zinc-500 mb-4">Exporte un fichier JSON pour backup ou transfert d'appareil.</p>
        <div className="flex gap-2 flex-wrap">
          <button onClick={exporterJSON} className="px-4 py-2 bg-zinc-100 hover:bg-white text-zinc-900 rounded-lg text-sm font-medium flex items-center gap-2"><Download className="w-4 h-4" /> Exporter JSON</button>
          <button onClick={() => fileInputRef.current?.click()} className="px-4 py-2 bg-zinc-800 border border-zinc-700 hover:bg-zinc-700 text-zinc-200 rounded-lg text-sm font-medium flex items-center gap-2"><Upload className="w-4 h-4" /> Importer JSON</button>
          <input ref={fileInputRef} type="file" accept=".json" onChange={importerJSON} className="hidden" />
        </div>
      </div>

      <div className="bg-zinc-900 rounded-xl p-5 border border-zinc-800">
        <h3 className="font-semibold mb-1 text-zinc-200">Objectifs du pôle</h3>
        <p className="text-xs text-zinc-500 mb-4">Tous les KPIs sont des objectifs à atteindre (seuil : 95%)</p>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Avis Google · nb min."><input type="number" value={data.objectifs.avisGoogleNombre} onChange={(e) => updateObjectif('avisGoogleNombre', e.target.value)} className={inputClass} /></Field>
          <Field label="Note Google · min. (/5)"><input type="number" step="0.1" value={data.objectifs.avisGoogleNote} onChange={(e) => updateObjectif('avisGoogleNote', e.target.value)} className={inputClass} /></Field>
          <Field label="Fast Inside · min. (%)"><input type="number" value={data.objectifs.fastInside} onChange={(e) => updateObjectif('fastInside', e.target.value)} className={inputClass} /></Field>
          <Field label="O&P · min. (%)"><input type="number" step="0.1" value={data.objectifs.oep} onChange={(e) => updateObjectif('oep', e.target.value)} className={inputClass} /></Field>
        </div>
      </div>

      <div className="bg-zinc-900 rounded-xl p-5 border border-zinc-800">
        <h3 className="font-semibold mb-4 text-zinc-200">Objectifs managers</h3>
        <div className="grid grid-cols-2 gap-4">
          <Field label="O&P manager · min. (%)"><input type="number" step="0.1" value={data.objectifsManager.oepObjectifManager} onChange={(e) => updateObjectifManager('oepObjectifManager', e.target.value)} className={inputClass} /></Field>
          <Field label="Avis par manager · min."><input type="number" value={data.objectifsManager.avisObjectifManager} onChange={(e) => updateObjectifManager('avisObjectifManager', e.target.value)} className={inputClass} /></Field>
        </div>
      </div>

      <div className="bg-zinc-900 rounded-xl p-5 border border-zinc-800">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-semibold text-zinc-200">Pondération des 4 axes</h3>
            <p className={`text-xs ${totalPoids === 100 ? 'text-emerald-400' : 'text-amber-400'}`}>Total : {totalPoids}%</p>
          </div>
        </div>
        <div className="space-y-3">
          {AXES_MANAGER.map((axe) => {
            const Icon = axe.icon;
            return (
              <div key={axe.id} className="flex items-center gap-3">
                <Icon className="w-4 h-4 text-zinc-500 flex-shrink-0" />
                <div className="flex-1"><p className="text-sm font-medium text-zinc-200">{axe.nom}</p><p className="text-xs text-zinc-500">{axe.description}</p></div>
                <input type="number" value={data.poidsAxes[axe.id]} onChange={(e) => updatePoids(axe.id, e.target.value)} className="w-20 px-3 py-2 border border-zinc-700 bg-zinc-800 text-zinc-100 rounded-lg text-sm text-center" />
                <span className="text-sm text-zinc-500">%</span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="bg-zinc-900 rounded-xl p-5 border border-zinc-800">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-semibold text-zinc-200">Sous-pondérations · Hospitalité</h3>
            <p className={`text-xs ${totalPoidsHosp === 100 ? 'text-emerald-400' : 'text-amber-400'}`}>Total : {totalPoidsHosp}%</p>
          </div>
        </div>
        <div className="space-y-3">
          {SOUS_CRITERES_HOSPITALITE.map((sc) => (
            <div key={sc.id} className="flex items-center gap-3">
              <div className="flex-1"><p className="text-sm font-medium text-zinc-200">{sc.nom}</p></div>
              <input type="number" value={data.poidsHospitalite[sc.id]} onChange={(e) => updatePoidsHosp(sc.id, e.target.value)} className="w-20 px-3 py-2 border border-zinc-700 bg-zinc-800 text-zinc-100 rounded-lg text-sm text-center" />
              <span className="text-sm text-zinc-500">%</span>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-zinc-950 rounded-xl p-5 border border-zinc-800">
        <h3 className="font-semibold mb-2 text-zinc-200">Restaurant</h3>
        <p className="text-sm text-zinc-300">McDonald's Nyon Gare · Suisse</p>
        <p className="text-xs text-zinc-500 mt-1">TikTok suivi : @mcdolacote</p>
      </div>
    </div>
  );
}
