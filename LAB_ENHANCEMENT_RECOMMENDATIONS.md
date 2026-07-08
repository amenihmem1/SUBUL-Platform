# Lab Enhancement Recommendations
**Goal:** Bring labs to Coursera / DataCamp quality  
**Date:** 2026-06-11  
**Diagnosis:** The frontend already supports hints, step instructions, validation notes, progress tracking, and an AI assistant. The gap is entirely in the **content data** — tasks are one-line titles with no instructions, hints are empty, validation notes are missing. Fixing the data is 80% of the work.

---

## How Coursera and DataCamp Work (What to Copy)

| Feature | Coursera | DataCamp | How to add to Subul |
|---|---|---|---|
| Narrative scenario | "You are a data engineer at a retail company…" | "You work at a bank preparing a fraud model…" | Add `scenario` field per lab |
| Step-by-step instructions | Full paragraph with navigation path | Code cell + explanation side by side | Use existing `steps[].instruction` — currently empty |
| Progressive hints | "Get a Hint" button per step | Hint appears inline, costs nothing | Use existing `steps[].hint` — currently empty |
| Immediate verification | "Run & Check" button verifies output | Auto-grade checks variable value | Use existing `steps[].validationNote` |
| Concept-first | "Why does this matter?" callout box before tasks | XP-rewarded concept explanation | Add `conceptBrief` field |
| End-of-lab quiz | 3 graded questions before certificate | 3 multiple-choice after each chapter | Add `postLabQuiz[]` array |
| Sub-steps within tasks | Each task splits into 5–10 small steps | Each exercise has 1 instruction | Use `steps[]` array (replace flat `tasks[]`) |
| Time estimate per step | "~5 min" per task | "~3 min" per exercise | Add `estimatedMinutes` per step |
| Sandbox first | Hosted Jupyter, no setup | In-browser IDE, no setup | Add `simulationUrl` + sandbox warning |
| Completion reward | Certificate + badge | XP + streak | Already implemented on Subul for certs |

---

## The Core Problem in Code

**What exists in `labs-seed.data.ts` today:**
```typescript
// az900-beginner-3 (App Service PaaS lab)
tasks: [
  "Créer un App Service Plan",
  "Déployer une Web App",
  "Configurer les paramètres d'application",
  "Tester l'auto-scaling",
],
steps: [],   // ← EMPTY — the entire step system is unused
metadata: {
  learningObjectives: [],   // ← EMPTY — shown to student as blank
  prerequisites: [],        // ← EMPTY
}
```

**What the frontend can already render (built, waiting for data):**
```typescript
steps: [
  {
    title: "Créer un App Service Plan",
    instruction: "...",         // ← Rendered as Markdown with full formatting
    hint: "...",                // ← Yellow collapsible hint card, toggle button exists
    validationNote: "...",      // ← Green box with ShieldCheck icon, already styled
  }
]
```

**The fix is not code — it is content.** Fill the `steps[]` array for every lab.

---

## Recommendation 1 — Fill `steps[]` with Coursera-quality instructions (CRITICAL)

This single change will have the biggest impact. The frontend is ready. You only need to write the data.

### Template for every step (Coursera style)

```typescript
{
  title: "Action label (same as current task title)",
  
  instruction: `
## Créer un App Service Plan

Un App Service Plan définit la région, la puissance de calcul et le prix. 
Pensez-y comme le "serveur" sur lequel votre application tournera.

**Étapes:**

1. Dans le portail Azure, cliquez **+ Créer une ressource** en haut à gauche
2. Recherchez **App Service Plan** → cliquez **Create**
3. Remplissez les champs:
   - **Subscription:** votre abonnement Free ou Student
   - **Resource Group:** Créez un nouveau → nommez-le \`rg-az900-lab3\`
   - **Name:** \`asp-az900-lab3\`
   - **Region:** West Europe
   - **Pricing tier:** F1 (Free) ← important pour éviter les coûts
4. Cliquez **Review + Create** → **Create**
5. Attendez 30–60 secondes le déploiement
  `,
  
  hint: `
💡 **Indice:** Si vous ne voyez pas le pricing tier F1, 
cliquez "Explore pricing plans" sur la page de sélection du tier. 
Le tier F1 est dans la section "Dev/Test".
  `,
  
  validationNote: `
✅ **Validation:** Dans Notifications (cloche en haut à droite), 
vous devez voir "Deployment succeeded". Cliquez dessus — 
la page App Service Plan s'ouvre avec Status: **Ready**.
  `,
}
```

### Why this matches Coursera

- Explains the concept BEFORE the steps ("Un App Service Plan définit…")
- Navigation path is exact ("cliquez + Créer une ressource en haut à gauche")  
- Shows exact values to enter (not "choose a name" but `rg-az900-lab3`)
- Hint is available without penalty
- Validation tells the student exactly what to look for, not "check it works"

---

## Recommendation 2 — Add a scenario narrative (HIGH)

DataCamp wraps every lab in a story: "You are hired as a data engineer at a fast-growing e-commerce company. Your first task is to…"

This gives purpose to mechanical steps.

### Add `scenario` to `LabMetadata` type and to each lab

```typescript
// In frontend/services/labs.ts — extend LabMetadata:
scenario?: string;

// In labs-seed.data.ts — add to each lab:
metadata: {
  scenario: `
Vous venez d'être recruté(e) comme Cloud Engineer Junior chez **TechStart**, 
une startup tunisienne qui migre son infrastructure vers Azure. 

Votre responsable vous demande de déployer la première application web 
de l'entreprise sur Azure App Service — sans serveur à gérer, 
juste du code et du scale automatique.

Durée estimée: 45 minutes | Coût estimé: 0 TND (tier F1 gratuit)
  `,
  learningObjectives: [...],
}
```

### Display in `LabDetailExperience.tsx`

Add a scenario intro card at the top of the guide panel, above the tasks list:

```tsx
{lab.metadata?.scenario && (
  <div className="mb-6 rounded-xl border border-violet-200 bg-violet-50 p-4">
    <div className="mb-2 flex items-center gap-2">
      <BookOpen className="h-4 w-4 text-violet-600" />
      <span className="text-sm font-semibold text-violet-800">Contexte du lab</span>
    </div>
    <ReactMarkdown className="prose prose-sm text-violet-900">
      {lab.metadata.scenario}
    </ReactMarkdown>
  </div>
)}
```

---

## Recommendation 3 — Fill `learningObjectives` with measurable outcomes (HIGH)

Currently empty on all 15 AZ-900 labs. The frontend renders them as a list.

### Pattern (copy this for every lab)

```typescript
learningObjectives: [
  'Déployer une application web sur Azure App Service sans gérer de serveurs',
  'Comprendre la différence entre App Service Plan (infrastructure) et Web App (application)',
  'Configurer des variables d\'environnement sécurisées via Application Settings',
  'Identifier ce concept sur l\'examen AZ-900: domaine "Cloud service types"',
],
```

Rule: each objective starts with a verb. The last objective always links to the exam domain.

---

## Recommendation 4 — Add a post-lab quiz (HIGH)

DataCamp and Coursera never let a student leave without answering 2–3 questions. This anchors the knowledge.

### New `postLabQuiz` field in `LabMetadata`

```typescript
// In frontend/services/labs.ts:
postLabQuiz?: Array<{
  question: string;
  options: string[];
  correct: number;    // index into options[]
  explanation: string;
}>;

// In labs-seed.data.ts:
postLabQuiz: [
  {
    question: 'Quel est le rôle principal d\'un App Service Plan sur Azure?',
    options: [
      'Stocker le code source de l\'application',
      'Définir la région, la puissance de calcul et le prix alloués à votre app',
      'Gérer les certificats SSL',
      'Configurer le nom de domaine',
    ],
    correct: 1,
    explanation: 'L\'App Service Plan est le "serveur virtuel" derrière votre app — c\'est lui qui ' +
      'définit combien de CPU/RAM vous avez et combien vous payez. ' +
      'Sur l\'examen AZ-900, cette notion est testée dans le domaine "Cloud service types (PaaS)".',
  },
  {
    question: 'Un étudiant configure une chaîne de connexion en dur dans son code. Quel est le problème?',
    options: [
      'Le code ne compilera pas',
      'Les secrets sont visibles dans le dépôt Git — risque de sécurité',
      'Azure ne supporte pas les chaînes de connexion dans le code',
      'Pas de problème, c\'est une pratique normale',
    ],
    correct: 1,
    explanation: 'Les secrets hardcodés dans le code peuvent être exposés si le repo devient public. ' +
      'La bonne pratique est de les stocker dans App Settings ou Azure Key Vault.',
  },
],
```

### Display in `LabDetailExperience.tsx`

Show the quiz in the completion modal (already exists at lines 262–272). Replace "Bravo!" with "Bravo! Prouvez vos acquis:" followed by the 3 questions before unlocking the completion badge.

---

## Recommendation 5 — Add cost warning + sandbox alternative (HIGH)

Students are scared to start labs because they don't know if it will cost money.

### Add `costWarning` and `sandboxUrl` fields

```typescript
// Extend LabMetadata:
costWarning?: string;
sandboxUrl?: string;    // Free alternative if no billing account
cleanupSteps?: string[];

// In labs-seed.data.ts:
costWarning: '⚠️ Ce lab crée une Web App (tier F1 GRATUIT). ' +
  'Durée max avant suppression recommandée: fin de session. ' +
  'Supprimer: Resource Group → rg-az900-lab3 → Delete resource group.',
sandboxUrl: 'https://learn.microsoft.com/en-us/training/modules/introduction-to-azure-fundamentals/',
cleanupSteps: [
  'Portail Azure → Resource Groups → rg-az900-lab3 → Delete resource group',
  'Tapez le nom du groupe pour confirmer → Delete',
  '✅ Toutes les ressources sont supprimées — aucun coût en attente',
],
```

### Display

Add a collapsible amber banner at the top of the lab (above the scenario card):

```tsx
{lab.metadata?.costWarning && (
  <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
    {lab.metadata.costWarning}
  </div>
)}
```

---

## Recommendation 6 — Break large labs into chapters of 3–5 steps (MEDIUM)

DataCamp never gives you more than 5 steps at once. The AZ-900 intermediate labs have 10+ tasks — students scroll forever and lose their place.

### Pattern: Group steps into chapters

```typescript
// Add `chapters` to LabMetadata:
chapters?: Array<{
  title: string;
  estimatedMinutes: number;
  stepRange: [number, number];  // indices into steps[]
}>;

// Example for az900-intermediate-6 (VNet + Firewall + NSG, 10 tasks):
chapters: [
  { title: 'Partie 1 — Créer le réseau', estimatedMinutes: 15, stepRange: [0, 2] },
  { title: 'Partie 2 — Configurer la sécurité', estimatedMinutes: 20, stepRange: [3, 6] },
  { title: 'Partie 3 — Tester et nettoyer', estimatedMinutes: 10, stepRange: [7, 9] },
],
```

### Display

Show a chapter progress indicator in the sidebar (like Coursera's week view): "Partie 1/3 — 2 sur 3 étapes complétées".

---

## Recommendation 7 — Fix the `interactive-labs.json` (240 labs) template problem (CRITICAL)

Every one of the 240 certification pack labs uses the same 5 generic tasks. They are shells with no content.

### Before (current — every lab):
```json
{ "title": "Plan the lab", "instructions": "Identify the domain and service being tested..." },
{ "title": "Implement the core workflow", "instructions": "Create or simulate the required IAM/EC2 resources..." }
```

### After (example — `clf-c02-storage-s3-static-website`):
```json
{
  "title": "Créer un bucket S3 pour site statique",
  "instructions": "1. AWS Console → S3 → Create bucket\n2. Bucket name: `subul-static-[yourname]` (doit être globalement unique)\n3. Region: eu-west-1\n4. **Décochez** 'Block all public access' → confirmez\n5. Create bucket\n\n✅ Le bucket apparaît dans la liste avec Region=EU (Ireland).",
  "validationHints": ["Bucket visible dans la liste S3", "Status 'Block public access': Off"]
},
{
  "title": "Activer l'hébergement de site statique",
  "instructions": "1. Cliquez sur votre bucket → onglet **Properties**\n2. Faites défiler jusqu'à **Static website hosting** → Edit\n3. Enable → Index document: `index.html` → Save\n4. Notez l'URL du site (Bucket website endpoint)\n\n✅ L'URL ressemble à: `http://subul-static-[yourname].s3-website-eu-west-1.amazonaws.com`",
  "validationHints": ["Static website hosting affiche 'Enabled'", "Endpoint URL visible dans Properties"]
}
```

**Rule:** Each task instruction must include:
1. Console navigation path (AWS Console → S3 → …)
2. Exact values to enter (not "choose a name" but the exact name with a template)
3. A `✅` expected output at the end
4. Max 6 steps per task

---

## Recommendation 8 — Add `estimatedMinutes` per step (MEDIUM)

DataCamp shows "~3 min" per exercise. It sets expectations and reduces student anxiety.

```typescript
// Extend LabStep:
estimatedMinutes?: number;

// In each step:
{ title: 'Créer le bucket S3', instruction: '...', estimatedMinutes: 8 }
{ title: 'Configurer les permissions', instruction: '...', estimatedMinutes: 12 }
{ title: 'Uploader les fichiers', instruction: '...', estimatedMinutes: 5 }
```

### Display in sidebar

Show the estimate next to each task: `○ Créer le bucket S3  · 8 min`

This is a 2-line frontend change + data addition per step.

---

## Recommendation 9 — Language: standardize to French with English CLI commands (MEDIUM)

DataCamp uses one language consistently. Subul mixes French Azure labs and English AWS labs.

### Rule:
- All **explanations, headings, context** → French  
- All **console UI labels, CLI commands, resource names** → keep in English (they appear in English in the actual console)

```typescript
// DO:
instruction: `
## Configurer le pare-feu

Azure Firewall protège votre réseau contre les menaces externes.
Contrairement à un NSG (niveau subnet), il inspecte le trafic au niveau applicatif.

1. Portail Azure → **Firewall** → **+ Create**
2. Choisissez votre Resource Group: \`rg-az900-lab6\`
3. **Firewall name:** \`fw-az900-lab6\`
4. **Region:** West Europe
5. **Firewall tier:** Standard
`

// DON'T:
instruction: 'Create a Firewall in the Azure portal...' // English in Azure lab
instruction: 'Créer un Firewall dans le portail...'    // French but no path
```

---

## Recommendation 10 — Add a real-world career connection per lab (MEDIUM)

Coursera's guided projects always say "This skill is used by cloud architects at Netflix, Spotify…". Students need to know why this matters for their career.

### Add `careerConnection` field

```typescript
careerConnection?: string;

// Example:
careerConnection: 'Les Cloud Engineers qui maîtrisent App Service et les environnements ' +
  'de déploiement sont demandés dans les équipes DevOps. Compétences reliées sur LinkedIn: ' +
  '"Azure App Service", "PaaS deployment", "CI/CD pipelines". ' +
  'Salaire moyen Cloud Engineer Junior en France: 38 000–48 000 EUR/an.',
```

Show it in a small callout at the bottom of the completed lab screen — after the quiz, before the next lab link.

---

## Priority Matrix

| # | Recommendation | Files to edit | Effort | Student impact |
|---|---|---|---|---|
| 1 | Fill `steps[].instruction` with navigation + expected output | `labs-seed.data.ts` | High (1 lab = 30 min) | **Critical** |
| 2 | Fill `steps[].hint` with helpful hints | `labs-seed.data.ts` | Medium | **Critical** |
| 3 | Fill `steps[].validationNote` with exact checks | `labs-seed.data.ts` | Medium | **Critical** |
| 4 | Add `scenario` narrative (story context) | `labs-seed.data.ts` + 10 lines in `LabDetailExperience.tsx` | Low–Medium | High |
| 5 | Fill `learningObjectives` | `labs-seed.data.ts` | Low | High |
| 6 | Add `postLabQuiz` with 2–3 questions per lab | `labs-seed.data.ts` + quiz modal in `LabDetailExperience.tsx` | Medium | High |
| 7 | Add `costWarning` + `cleanupSteps` + `sandboxUrl` | `labs-seed.data.ts` + banner in `LabDetailExperience.tsx` | Low | High |
| 8 | Fix `interactive-labs.json` templates (240 labs) | `interactive-labs.json` | Very High | **Critical** |
| 9 | Add `chapters` grouping for 10+ step labs | `labs-seed.data.ts` + sidebar in `LabDetailExperience.tsx` | Medium | Medium |
| 10 | Add `estimatedMinutes` per step | `labs-seed.data.ts` + sidebar | Low | Medium |
| 11 | Language consistency (French throughout) | `labs-seed.data.ts` | Medium | Medium |
| 12 | Add `careerConnection` field | `labs-seed.data.ts` + completion screen | Low | Medium |

---

## Quick Start: Rewrite One Lab in 30 Minutes

Start with **`az900-beginner-2`** (Deploy VM) — it is the most-used lab and the best pilot.

Replace the current data:
```typescript
// CURRENT (bad):
tasks: [
  "Déployer une VM Windows Server",
  "Configurer les ports réseau",
  "Se connecter via RDP",
  "Analyser les coûts",
],
steps: [],

// TARGET (Coursera quality):
tasks: [],   // leave empty — steps[] replaces it
steps: [
  {
    title: "Créer et déployer la VM",
    instruction: `
## Déployer votre première VM Azure

Une **Virtual Machine** (VM) est un service IaaS: Microsoft gère le hardware,
vous gérez tout le reste (OS, logiciels, sécurité). C'est différent d'App Service
où Microsoft gère aussi l'OS.

**Étapes:**

1. Portail Azure → **+ Create a resource** → recherchez **Virtual Machine** → Create
2. Onglet **Basics** — remplissez exactement:
   - Resource Group: **Créez nouveau** → \`rg-az900-vm-lab\`
   - Virtual machine name: \`vm-az900-lab\`
   - Region: **(Europe) West Europe**
   - Image: **Windows Server 2022 Datacenter - Gen2**
   - Size: cliquez **See all sizes** → cherchez **B1s** → Select
   - Administrator username: \`labadmin\`
   - Password: \`Az900Lab@2024!\` (notez-le)
3. Onglet **Networking** — laissez les valeurs par défaut (un VNet sera créé automatiquement)
4. **Review + Create** → vérifiez que le coût estimé affiche ~0.012 USD/hour → **Create**
5. Attendez 2–3 minutes
    `,
    hint: `
💡 Si vous ne trouvez pas la taille B1s, elle est parfois masquée.
Cliquez "See all sizes", puis filtrez par "B-series" dans le panneau gauche.
Ou tapez directement "B1s" dans la barre de recherche des tailles.
    `,
    validationNote: `
✅ Dans **Notifications** (icône cloche en haut à droite): 
"Deployment succeeded — vm-az900-lab". 
Cliquez **Go to resource** — vous voyez la page de votre VM avec Status: **Running**.
    `,
  },
  {
    title: "Ouvrir le port RDP et se connecter",
    instruction: `
## Accéder à la VM via Bureau à distance

RDP (Remote Desktop Protocol) vous permet de voir le bureau Windows de la VM
depuis votre ordinateur — comme si vous étiez physiquement devant elle.

**Étapes:**

1. Sur la page de votre VM → menu gauche **Networking** → **Add inbound port rule**
2. Destination port: **3389** | Protocol: **TCP** | Name: \`allow-rdp\` → Add
3. Retournez à **Overview** → cliquez **Connect** → **RDP** → **Download RDP File**
4. Ouvrez le fichier .rdp téléchargé
5. Connexion Bureau à distance → Entrez: \`labadmin\` / \`Az900Lab@2024!\`
6. Acceptez le certificat SSL si demandé → **Connect**
    `,
    hint: `
💡 Sur Mac: installez **Microsoft Remote Desktop** depuis l'App Store (gratuit).
Sur Windows: l'application RDP est déjà installée (cherchez "Remote Desktop Connection").
    `,
    validationNote: `
✅ Vous voyez le bureau Windows Server 2022 dans une fenêtre.
La barre de titre indique \`vm-az900-lab - Remote Desktop Connection\`.
    `,
  },
  {
    title: "Explorer le modèle de responsabilité partagée",
    instruction: `
## Comprendre ce que Microsoft gère vs ce que vous gérez

C'est un concept-clé de l'examen AZ-900.

**Dans votre VM, essayez:**

1. Ouvrez le **Gestionnaire de serveur** (Server Manager) dans la VM
2. Regardez les mises à jour Windows disponibles — *vous* devez les gérer
3. Fermez la session RDP

**Comparez avec App Service (PaaS):**
- VM (IaaS): vous gérez OS, patches, runtime, application, données
- App Service (PaaS): Microsoft gère OS + runtime, vous gérez seulement l'app + données

**Notez dans vos révisions:**
> "IaaS = je gère l'OS. PaaS = je gère seulement mon code."
    `,
    hint: `
💡 Pour l'examen, mémorisez le tableau de responsabilité partagée:
- On-premises: vous gérez TOUT
- IaaS: vous gérez OS → application
- PaaS: vous gérez application + données
- SaaS: vous gérez seulement les données/config
    `,
    validationNote: `
✅ Vous avez identifié au moins 2 éléments que vous gérez dans une VM
et qui sont gérés par Microsoft dans App Service.
    `,
  },
  {
    title: "Analyser les coûts et SUPPRIMER les ressources",
    instruction: `
## Nettoyer pour éviter les frais

⚠️ **Important:** Une VM B1s coûte ~0.012 USD/heure même à l'arrêt (coût de stockage).
Supprimez toujours les ressources après un lab.

**Étapes:**

1. Portail Azure → **Resource Groups** → \`rg-az900-vm-lab\`
2. Cliquez **Delete resource group**
3. Tapez \`rg-az900-vm-lab\` dans le champ de confirmation → **Delete**
4. Attendez 1–2 minutes — toutes les ressources (VM, VNet, disk, IP) seront supprimées

**Explorez les coûts avant de supprimer:**
- Menu gauche de la VM → **Cost Management** → regardez le coût de la session
    `,
    hint: `
💡 Supprimer le Resource Group est l'option "nucléaire" qui supprime TOUT en une fois.
C'est la méthode recommandée en lab pour être sûr de ne rien oublier.
    `,
    validationNote: `
✅ Resource Groups ne contient plus \`rg-az900-vm-lab\`.
Dans Cost Management: le coût du lab est visible (quelques centimes au maximum).
    `,
  },
],
metadata: {
  scenario: `
Vous êtes Cloud Engineer en stage chez **CloudFirst Tunisia**, une ESN spécialisée 
dans la migration cloud. Votre superviseur vous demande de vous familiariser avec 
Azure avant votre première mission client la semaine prochaine.

Objectif de la journée: déployer une VM Windows, vous y connecter à distance, 
et comprendre le modèle de responsabilité partagée — un concept central de l'examen AZ-900.

⏱️ Durée estimée: 45 minutes | 💰 Coût: ~0.05 USD (moins d'un café)
  `,
  learningObjectives: [
    'Déployer une VM Windows Server depuis le portail Azure',
    'Se connecter à une VM distante via RDP',
    'Expliquer le modèle de responsabilité partagée IaaS vs PaaS',
    'Nettoyer les ressources pour éviter les frais — compétence critique en prod',
  ],
  postLabQuiz: [
    {
      question: 'Dans le modèle IaaS, qui est responsable des patches du système d\'exploitation?',
      options: ['Microsoft', 'Le client (vous)', 'Les deux à 50/50', 'Personne — c\'est automatique'],
      correct: 1,
      explanation: 'En IaaS, Microsoft gère le hardware et la virtualisation. Vous êtes responsable de l\'OS, des patches, du runtime et de l\'application. C\'est exactement ce que vous venez de voir en gérant les mises à jour Windows dans la VM.',
    },
    {
      question: 'Vous devez déployer une app web sans gérer de serveurs ni d\'OS. Quel service Azure choisissez-vous?',
      options: ['Virtual Machine', 'Azure App Service', 'Azure Kubernetes Service', 'Azure Functions'],
      correct: 1,
      explanation: 'App Service est un service PaaS — Microsoft gère l\'OS et le runtime. Vous déployez uniquement votre code. AKS gère des containers (plus complexe). Functions est serverless (event-driven).',
    },
  ],
  costWarning: '⚠️ VM B1s ≈ 0.012 USD/heure. Supprimez le Resource Group à la fin du lab.',
  prerequisites: ['Compte Azure (Free Tier) — carte bancaire requise pour vérification, pas de débit'],
  level: 'beginner',
  levelLabel: 'Débutant',
},
```

**This is what Coursera quality looks like for cloud labs.** Apply this pattern to all 23 live labs.

---

## What Changes in the Frontend (Small additions)

The heavy lifting is data. The frontend needs only 3 small additions:

### 1. Scenario intro card (20 lines)

Above the tasks checklist in `LabDetailExperience.tsx`, add a collapsible scenario card. Import `BookOpen` is already imported.

### 2. Post-lab quiz in the completion modal (50 lines)

The completion modal already exists. Before showing the "Bravo!" celebration, show the `postLabQuiz` questions one by one. Only unlock the completion badge after answering all.

### 3. Cost warning banner (5 lines)

Amber callout at the top of the lab guide area, shown if `metadata.costWarning` is set.

---

## Roadmap: Lab by Lab

Do these labs first — they are the most-visited:

| Order | Lab slug | Reason |
|---|---|---|
| 1 | `az900-beginner-2` | Most used, VM is the #1 AZ-900 topic |
| 2 | `aws-ec2-beginner-1` | Most used AWS lab |
| 3 | `az900-intermediate-6` | VNet/NSG — students most lost here |
| 4 | `az900-beginner-3` | App Service PaaS — exam favorite |
| 5 | `az900-intermediate-9` | Azure SQL — databases are always confusing |
| 6 | `aws-ec2-intermediate-1` | IAM — security section of CLF-C02 |

One rewritten lab per day = 6 days to transform the most critical labs.
