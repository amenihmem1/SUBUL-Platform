/**
 * Rebuilds backend/api/brochure.html catalogue section from subul-certification-pack JSON.
 * Preserves <head>, hero header (logos), and <footer> (including embedded images).
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const apiDir = path.join(__dirname, '..');
const repoRoot = path.join(apiDir, '..', '..');
const brochurePath = path.join(apiDir, 'brochure.html');
const coursesPath = path.join(repoRoot, 'subul-certification-pack', 'courses-certifications.json');
const labsPath = path.join(repoRoot, 'subul-certification-pack', 'interactive-labs.json');

function loadRows() {
  const coursesJ = JSON.parse(fs.readFileSync(coursesPath, 'utf8'));
  const labsJ = JSON.parse(fs.readFileSync(labsPath, 'utf8'));
  const labsArr = labsJ.labs || [];
  const labCountByCert = {};
  for (const L of labsArr) {
    const cid = String(L.certificationExternalId || '').trim();
    if (!cid) continue;
    labCountByCert[cid] = (labCountByCert[cid] || 0) + 1;
  }
  const rows = [];
  for (const c of coursesJ.certifications || []) {
    const id = String(c.externalId || c.id || c.slug || '').trim();
    let courseCount = 0;
    let embedLabs = 0;
    const courses = Array.isArray(c.courses) ? c.courses : [];
    if (courses.length) {
      courseCount = courses.length;
      for (const co of courses) {
        for (const m of co.modules || []) {
          embedLabs += (m.labs || []).length;
        }
      }
    } else {
      const mods = c.modules || [];
      for (const m of mods) {
        embedLabs += (m.labs || []).length;
      }
      courseCount = mods.length ? 1 : 0;
    }
    const interactiveLabs = labCountByCert[id] || 0;
    const desc = String(c.description || '')
      .replace(/\s+/g, ' ')
      .trim();
    const shortDesc = desc.length > 200 ? `${desc.slice(0, 197)}…` : desc;
    rows.push({
      id,
      code: c.certificationCode || '',
      title: c.title || '',
      provider: c.provider || 'Autre',
      courses: courseCount,
      interactiveLabs,
      embeddedLabs: embedLabs,
      totalLabs: interactiveLabs + embedLabs,
      shortDesc,
    });
  }
  return rows;
}

const PROVIDER_ORDER = ['Microsoft', 'AWS', 'Google Cloud', 'CNCF', 'HashiCorp', 'NVIDIA'];

const PROVIDER_UI = {
  Microsoft: { card: 'azure', name: 'Microsoft Azure' },
  AWS: { card: 'aws', name: 'Amazon Web Services' },
  'Google Cloud': { card: 'gcp', name: 'Google Cloud' },
  CNCF: { card: 'cncf', name: 'Cloud Native (CNCF)' },
  HashiCorp: { card: 'hashicorp', name: 'HashiCorp' },
  NVIDIA: { card: 'nvidia', name: 'NVIDIA' },
};

function esc(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function buildCatalogue(rows) {
  const byProv = new Map();
  for (const r of rows) {
    const k = r.provider;
    if (!byProv.has(k)) byProv.set(k, []);
    byProv.get(k).push(r);
  }
  for (const list of byProv.values()) {
    list.sort((a, b) => a.title.localeCompare(b.title, 'fr'));
  }

  let html = `
  <section class="metrics-strip section">
    <div class="metrics-inner">
      <div class="metric-card">
        <span class="metric-num">${rows.length}</span>
        <span class="metric-label">parcours certification</span>
      </div>
      <div class="metric-card">
        <span class="metric-num">${rows.reduce((a, r) => a + r.courses, 0)}</span>
        <span class="metric-label">cours structurés</span>
      </div>
      <div class="metric-card">
        <span class="metric-num">${rows.reduce((a, r) => a + r.interactiveLabs, 0)}</span>
        <span class="metric-label">labs cloud interactifs</span>
      </div>
      <div class="metric-card accent">
        <span class="metric-num">IA</span>
        <span class="metric-label">tuteur intelligent intégré</span>
      </div>
    </div>
  </section>

  <section class="section catalogue-intro">
    <div class="section-header">
      <div>
        <p class="section-eyebrow">Catalogue Subul Academy</p>
        <h2 class="section-title">Toutes nos certifications<br><span class="grad">en un seul endroit</span></h2>
      </div>
    </div>
    <p class="catalogue-lead">
      Parcours alignés sur les objectifs officiels des éditeurs — contenu pédagogique original, ateliers pratiques,
      examens blancs et accompagnement IA. Les volumes ci-dessous reflètent le contenu chargé dans la plateforme Subul
      (cours segmentés + labs interactifs par certification).
    </p>
  </section>
`;

  for (const prov of PROVIDER_ORDER) {
    const list = byProv.get(prov);
    if (!list?.length) continue;
    const ui = PROVIDER_UI[prov] || { card: 'azure', name: prov };
    const pid = prov.replace(/\s+/g, '-').toLowerCase();
    html += `
  <section class="section provider-block" id="provider-${esc(pid)}">
    <div class="provider-head">
      <span class="provider-pill ${esc(ui.card)}">${esc(ui.name)}</span>
      <h3 class="provider-title">${list.length} certification${list.length > 1 ? 's' : ''}</h3>
    </div>
    <div class="cards-grid catalogue-grid">
`;
    for (const r of list) {
      const labParts = [];
      if (r.interactiveLabs) labParts.push(`${r.interactiveLabs} lab${r.interactiveLabs > 1 ? 's' : ''} pratique${r.interactiveLabs > 1 ? 's' : ''}`);
      if (r.embeddedLabs) labParts.push(`${r.embeddedLabs} atelier${r.embeddedLabs > 1 ? 's' : ''} intégré${r.embeddedLabs > 1 ? 's' : ''}`);
      const labLine = labParts.length ? labParts.join(' · ') : 'Labs — bientôt';
      const desc = r.shortDesc || 'Parcours complet avec modules, évaluations et mise en situation cloud.';
      html += `
      <article class="card ${esc(ui.card)} cert-card">
        <div class="card-icon" aria-hidden="true">📜</div>
        <div class="card-cert">${esc(r.code || '—')} · Subul Academy</div>
        <h3 class="card-title">${esc(r.title)}</h3>
        <p class="card-desc">${esc(desc)}</p>
        <div class="cert-stats">
          <span class="cert-stat"><strong>${r.courses}</strong> cours</span>
          <span class="cert-stat dot">·</span>
          <span class="cert-stat">${esc(labLine)}</span>
        </div>
        <div class="card-tags">
          <span class="tag">Examen officiel</span>
          <span class="tag">Labs</span>
          <span class="tag">IA</span>
        </div>
      </article>
`;
    }
    html += `
    </div>
  </section>
`;
  }

  return html;
}

function buildWhyCta(nCerts) {
  return `
  <section class="why-section section">
    <div class="why-grid">
      <div class="why-copy">
        <p class="section-eyebrow">Pourquoi Subul × Smartovate</p>
        <h2 class="why-heading">Une plateforme pensée pour <span class="grad">décrocher la certification</span></h2>
        <p class="why-text">Alliance entre un studio tech et une académie cloud : vos apprenants suivent des parcours à jour,
        s’exercent sur de vrais environnements, et posent leurs questions à un tuteur IA — sans attendre le prochain cours magistral.</p>
        <ul class="why-bullets">
          <li><strong>Catalogue unique</strong> — AWS, Azure, GCP, Kubernetes, HashiCorp, NVIDIA : un seul abonnement, une expérience fluide.</li>
          <li><strong>Progression mesurable</strong> — cours, labs, quiz et examens blancs suivis dans le tableau de bord.</li>
          <li><strong>Double valeur</strong> — attestation de parcours et préparation sérieuse aux examens certificateurs.</li>
        </ul>
      </div>
      <div class="why-stats">
        <div class="stat-block">
          <div class="stat-num">${nCerts}+</div>
          <div class="stat-label">certifications dans la base</div>
        </div>
        <div class="stat-block">
          <div class="stat-num">24/7</div>
          <div class="stat-label">accès aux contenus &amp; révisions</div>
        </div>
        <div class="stat-block">
          <div class="stat-num">Cloud</div>
          <div class="stat-label">Azure · AWS · GCP &amp; plus</div>
        </div>
      </div>
    </div>
  </section>

  <section class="cta-section">
    <h2 class="cta-title">Prêt à lancer ton<br><span style="background: var(--gradient); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;">parcours certifiant ?</span></h2>
    <p class="cta-sub">Demandez une démo entreprise ou rejoignez la prochaine vague d’apprenants Subul Academy.</p>
    <a class="cta-btn" href="mailto:contact@smartovate.com">Contact commercial</a>
  </section>
`;
}

const EXTRA_CSS = `
  .metrics-strip { padding: 48px 24px; background: linear-gradient(180deg, rgba(123,47,255,0.08) 0%, transparent 100%); border-top: 1px solid rgba(255,255,255,0.06); border-bottom: 1px solid rgba(255,255,255,0.06); }
  .metrics-inner { max-width: 1200px; margin: 0 auto; display: grid; grid-template-columns: repeat(4, 1fr); gap: 20px; }
  @media (max-width: 900px) { .metrics-inner { grid-template-columns: repeat(2, 1fr); } }
  @media (max-width: 520px) { .metrics-inner { grid-template-columns: 1fr; } }
  .metric-card { background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); border-radius: 16px; padding: 24px; text-align: center; }
  .metric-card.accent { border-color: rgba(255,45,120,0.35); background: rgba(255,45,120,0.06); }
  .metric-num { font-family: 'Syne', sans-serif; font-size: clamp(32px, 5vw, 48px); font-weight: 800; display: block; background: var(--gradient); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; }
  .metric-card.accent .metric-num { font-size: clamp(28px, 4vw, 40px); }
  .metric-label { font-size: 12px; letter-spacing: 0.12em; text-transform: uppercase; color: var(--muted); margin-top: 8px; display: block; }
  .catalogue-intro .catalogue-lead { max-width: 820px; color: var(--muted); font-size: 17px; line-height: 1.7; margin-top: 24px; }
  .provider-block { padding-top: 40px; }
  .provider-head { display: flex; flex-wrap: wrap; align-items: center; gap: 16px; margin-bottom: 28px; }
  .provider-pill { display: inline-block; padding: 8px 18px; border-radius: 100px; font-size: 12px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; border: 1px solid rgba(255,255,255,0.12); }
  .provider-pill.azure { color: var(--azure-light); border-color: rgba(0,120,212,0.4); background: rgba(0,120,212,0.1); }
  .provider-pill.aws { color: var(--aws-light); border-color: rgba(255,153,0,0.4); background: rgba(255,153,0,0.1); }
  .provider-pill.gcp { color: #7ee0c3; border-color: rgba(66,133,244,0.4); background: rgba(66,133,244,0.12); }
  .provider-pill.cncf { color: #93c5fd; border-color: rgba(59,130,246,0.4); background: rgba(59,130,246,0.1); }
  .provider-pill.hashicorp { color: #c4b5fd; border-color: rgba(139,92,246,0.45); background: rgba(139,92,246,0.12); }
  .provider-pill.nvidia { color: #86efac; border-color: rgba(34,197,94,0.4); background: rgba(34,197,94,0.1); }
  .provider-title { font-family: 'Syne', sans-serif; font-size: 22px; font-weight: 700; color: var(--text); margin: 0; }
  .catalogue-grid { margin-top: 0; }
  .cert-card .cert-stats { display: flex; flex-wrap: wrap; align-items: center; gap: 6px; font-size: 13px; color: var(--muted); margin-top: 12px; padding-top: 12px; border-top: 1px solid rgba(255,255,255,0.06); }
  .cert-stat strong { color: var(--text); font-weight: 600; }
  .cert-stat.dot { opacity: 0.4; }
  .card.gcp::before { background: linear-gradient(90deg, #4285f4, #34a853); }
  .card.gcp:hover { border-color: rgba(66,133,244,0.35); box-shadow: 0 20px 60px rgba(66,133,244,0.2); }
  .card.gcp .card-icon { background: rgba(66,133,244,0.15); }
  .card.gcp .card-cert { color: #9ecbff; }
  .card.gcp .tag { background: rgba(66,133,244,0.15); color: #9ecbff; }
  .card.cncf::before { background: linear-gradient(90deg, #326ce5, #00d4aa); }
  .card.cncf:hover { border-color: rgba(50,108,229,0.35); }
  .card.cncf .card-icon { background: rgba(50,108,229,0.15); }
  .card.cncf .card-cert { color: #93c5fd; }
  .card.cncf .tag { background: rgba(50,108,229,0.15); color: #93c5fd; }
  .card.hashicorp::before { background: linear-gradient(90deg, #7b2cbf, #c026d3); }
  .card.hashicorp:hover { border-color: rgba(192,38,211,0.35); }
  .card.hashicorp .card-icon { background: rgba(192,38,211,0.12); }
  .card.hashicorp .card-cert { color: #e9d5ff; }
  .card.hashicorp .tag { background: rgba(192,38,211,0.15); color: #e9d5ff; }
  .card.nvidia::before { background: linear-gradient(90deg, #22c55e, #84cc16); }
  .card.nvidia:hover { border-color: rgba(34,197,94,0.35); }
  .card.nvidia .card-icon { background: rgba(34,197,94,0.12); }
  .card.nvidia .card-cert { color: #bbf7d0; }
  .card.nvidia .tag { background: rgba(34,197,94,0.15); color: #bbf7d0; }
  .why-bullets { margin-top: 20px; padding-left: 20px; color: var(--muted); line-height: 1.8; }
  .why-bullets li { margin-bottom: 10px; }
  .cta-sub { color: var(--muted); max-width: 520px; margin: 16px auto 28px; font-size: 17px; }
  .cta-btn { display: inline-block; padding: 16px 36px; border-radius: 100px; font-weight: 600; text-decoration: none; color: white; background: var(--gradient); box-shadow: 0 12px 40px rgba(255,45,120,0.35); transition: transform 0.2s, box-shadow 0.2s; }
  .cta-btn:hover { transform: translateY(-2px); box-shadow: 0 16px 50px rgba(123,47,255,0.4); }
  .section-eyebrow { font-size: 11px; font-weight: 700; letter-spacing: 0.22em; text-transform: uppercase; color: var(--muted); margin-bottom: 12px; }
  .why-heading { font-family: 'Syne', sans-serif; font-size: clamp(28px, 4vw, 52px); font-weight: 800; line-height: 1.1; margin-bottom: 16px; }
  .why-copy { max-width: 580px; }
  .stat-block { background: var(--card); border-radius: 16px; padding: 24px; border: 1px solid rgba(255,255,255,0.06); }
  .catalogue-intro .section-header { margin-bottom: 0; }
`;

function main() {
  const rows = loadRows();
  const html = fs.readFileSync(brochurePath, 'utf8');

  const styleInject = html.indexOf('</style>');
  if (styleInject === -1) throw new Error('Missing </style>');
  let out = html.slice(0, styleInject) + EXTRA_CSS + '\n' + html.slice(styleInject);

  const bodyOpen = out.indexOf('<body');
  const bodyContentStart = out.indexOf('>', bodyOpen) + 1;
  const bodyClose = out.lastIndexOf('</body>');
  const body = out.slice(bodyContentStart, bodyClose);

  const heroContentIdx = body.indexOf('<div class="hero-content">');
  const footerIdx = body.indexOf('<footer');
  if (heroContentIdx === -1 || footerIdx === -1) throw new Error('Could not slice body');

  const headOfBody = body.slice(0, heroContentIdx);
  const footerHtml = body.slice(footerIdx);

  const newHeroInner = `
  <div class="hero-content">
    <div class="eyebrow">Subul Academy × Smartovate</div>
    <h1 class="hero-title">
      La certification cloud<br>
      <span class="grad">sans compromis</span><br>
      sur la qualité
    </h1>
    <p class="hero-subtitle">
      ${rows.length} parcours certification · ${rows.reduce((a, r) => a + r.courses, 0)} cours · ${rows.reduce((a, r) => a + r.interactiveLabs, 0)} labs interactifs — Azure, AWS, Google Cloud, Kubernetes, HashiCorp, NVIDIA.
    </p>
    <div class="hero-pills">
      <span class="pill">☁️ Multi-cloud</span>
      <span class="pill">🧪 Labs réels</span>
      <span class="pill">🤖 Tuteur IA</span>
      <span class="pill">📋 Examens blancs</span>
      <span class="pill">🎯 Aligné éditeurs</span>
    </div>
    <div class="scroll-hint">↓ &nbsp; Voir le catalogue complet</div>
  </div>
</section>
`;

  const newBody =
    headOfBody + newHeroInner + buildCatalogue(rows) + buildWhyCta(rows.length) + footerHtml;

  out = out.slice(0, bodyContentStart) + newBody + out.slice(bodyClose);

  fs.writeFileSync(brochurePath, out, 'utf8');
  console.log(`[rebuild-brochure] Wrote ${brochurePath} (${rows.length} certifications).`);
}

main();
