import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const packPath = path.resolve(scriptDir, '../seed/subul-certification-pack/interactive-labs.json');

const profiles = {
  AWS: {
    portal: 'Console AWS → barre de recherche → service concerné',
    region: 'eu-west-3 (Paris)',
    command: 'aws sts get-caller-identity && aws resourcegroupstaggingapi get-resources --region eu-west-3',
    identity: 'IAM',
    monitoring: 'CloudWatch et CloudTrail',
    cleanup: 'Console AWS → Resource Groups → Tag Editor, puis supprimez les ressources portant le tag Lab',
  },
  Microsoft: {
    portal: 'Portail Azure → Groupes de ressources → Créer',
    region: 'France Central',
    command: 'az account show -o table && az resource list --tag Environment=lab -o table',
    identity: 'Microsoft Entra ID et Azure RBAC',
    monitoring: 'Azure Monitor et Journal d’activité',
    cleanup: 'Portail Azure → Groupes de ressources → sélectionner le groupe du lab → Supprimer',
  },
  'Google Cloud': {
    portal: 'Console Google Cloud → Sélecteur de projet → Nouveau projet',
    region: 'europe-west1',
    command: 'gcloud config list && gcloud asset search-all-resources --scope=projects/$GOOGLE_CLOUD_PROJECT',
    identity: 'Cloud IAM et comptes de service',
    monitoring: 'Cloud Monitoring et Cloud Logging',
    cleanup: 'Console Google Cloud → IAM et administration → Gérer les ressources → arrêter ou supprimer le projet du lab',
  },
  NVIDIA: {
    portal: 'NGC Catalog → Containers ou Models → sélectionner l’artefact requis',
    region: 'environnement local ou cluster GPU attribué',
    command: 'nvidia-smi && docker ps --format "table {{.Names}}\\t{{.Status}}\\t{{.Image}}"',
    identity: 'clé API NGC et contrôle d’accès au registre',
    monitoring: 'DCGM Exporter, métriques GPU et journaux du conteneur',
    cleanup: 'Arrêtez les conteneurs du lab, supprimez les volumes temporaires et révoquez les clés éphémères',
  },
  CNCF: {
    portal: 'Terminal Linux → contexte Kubernetes du lab',
    region: 'namespace certification-lab',
    command: 'kubectl config current-context && kubectl get all -n certification-lab',
    identity: 'ServiceAccount, Role et RoleBinding Kubernetes',
    monitoring: 'kubectl events, métriques et journaux des Pods',
    cleanup: 'kubectl delete namespace certification-lab --ignore-not-found',
  },
  HashiCorp: {
    portal: 'Terminal du lab → répertoire de travail dédié',
    region: 'workspace certification-lab',
    command: 'terraform version && terraform validate',
    identity: 'variables sensibles, politiques et jetons à durée limitée',
    monitoring: 'sorties de plan, journaux d’exécution et historique du workspace',
    cleanup: 'Exécutez la commande de destruction adaptée, puis révoquez les jetons temporaires',
  },
};

const taskRoles = [
  {
    heading: 'Cadrer la mission et préparer les contrôles',
    action: 'préparer un plan d’exécution vérifiable avant toute création de ressource',
    evidence: 'un plan qui nomme les ressources, l’identité utilisée, le signal de supervision et la méthode de nettoyage',
  },
  {
    heading: 'Implémenter le workflow principal',
    action: 'créer ou simuler les ressources principales avec des noms reproductibles et des paramètres maîtrisés',
    evidence: 'les ressources attendues dans un état opérationnel, avec leurs identifiants et paramètres principaux',
  },
  {
    heading: 'Sécuriser et superviser la solution',
    action: 'appliquer le moindre privilège et activer un signal opérationnel exploitable',
    evidence: 'une preuve d’autorisation limitée et un journal, une métrique ou une alerte visible',
  },
  {
    heading: 'Tester, diagnostiquer et corriger',
    action: 'provoquer ou analyser une panne réaliste, puis démontrer une méthode de diagnostic structurée',
    evidence: 'le symptôme, la cause racine, la correction et un test final réussi',
  },
  {
    heading: 'Nettoyer et relier au référentiel d’examen',
    action: 'supprimer les ressources temporaires et formuler les décisions techniques sous forme de points de révision',
    evidence: 'un environnement propre, une preuve de suppression et une synthèse orientée certification',
  },
];

function certificationCode(lab) {
  return String(lab.title ?? lab.certificationExternalId ?? 'Certification').split(' Lab ')[0];
}

function labName(lab) {
  return `lab-${String(lab.metadata?.sequence ?? 1).padStart(2, '0')}-${certificationCode(lab).toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
}

function instructionFor(lab, taskIndex) {
  const profile = profiles[lab.provider] ?? profiles.AWS;
  const role = taskRoles[taskIndex] ?? taskRoles[0];
  const cert = certificationCode(lab);
  const name = labName(lab);
  const domain = lab.domainAlignment ?? 'domaine principal de la certification';
  const scenario = lab.scenario ?? `Vous accompagnez une équipe qui prépare la certification ${cert}.`;

  return `## ${role.heading}

**Scénario professionnel :** ${scenario} Votre rôle consiste à ${role.action}. Travaillez comme si vos décisions devaient être relues par un Cloud Engineer senior et auditées le lendemain.

### Paramètres imposés

| Paramètre | Valeur à utiliser |
|---|---|
| Préfixe de nommage | \`${name}\` |
| Zone ou environnement | **${profile.region}** |
| Domaine de certification | **${domain}** |
| Étiquette obligatoire | \`Environment=lab\` |
| Preuve attendue | ${role.evidence} |

### Procédure guidée

1. Ouvrez **${profile.portal}**. Vérifiez d’abord que vous utilisez le compte, projet, abonnement, cluster ou workspace prévu pour le lab. Ne travaillez jamais avec un compte administrateur permanent si une identité limitée suffit.
2. Créez un espace logique nommé \`${name}\` ou appliquez ce préfixe à chaque ressource. Ajoutez les étiquettes \`Environment=lab\`, \`Certification=${cert}\` et \`Owner=<votre-identifiant>\`.
3. Réalisez la tâche **${lab.tasks[taskIndex]?.title ?? role.heading}** en suivant le scénario. Notez les paramètres choisis et expliquez en une phrase pourquoi ils répondent au domaine **${domain}**.
4. Contrôlez les accès avec **${profile.identity}**. L’identité du lab doit disposer uniquement des actions nécessaires. Documentez tout droit large temporaire et retirez-le avant la validation.
5. Activez ou consultez **${profile.monitoring}**. Recherchez au moins un signal confirmant le succès et un signal permettant de diagnostiquer un échec.

### Vérification en ligne de commande

\`\`\`bash
${profile.command}
\`\`\`

Comparez la sortie avec la console. Une validation réussie doit montrer les ressources du lab, leur état attendu et les étiquettes demandées. Si la commande échoue, vérifiez successivement le contexte actif, l’identité, la zone, le nom exact et les autorisations. Consignez le symptôme, la cause racine et la correction appliquée.

### Sécurité, coût et nettoyage

N’exposez aucun secret dans les captures ou les notes. Utilisez des ressources de petite taille et arrêtez toute ressource facturable dès que la validation est terminée. Pour nettoyer : **${profile.cleanup}**. Avant de valider l’étape, confirmez qu’aucune ressource temporaire, adresse publique, volume, jeton ou règle d’accès inutile ne subsiste.`;
}

function hintsFor(lab, taskIndex) {
  const profile = profiles[lab.provider] ?? profiles.AWS;
  const role = taskRoles[taskIndex] ?? taskRoles[0];
  const name = labName(lab);
  return [
    `Dans l’environnement ${profile.region}, les ressources ou preuves portant le préfixe "${name}" sont visibles et correspondent à la tâche demandée.`,
    `Le contrôle via ${profile.identity} confirme un accès limité, et ${profile.monitoring} contient un signal exploitable lié au lab.`,
    `La preuve finale contient ${role.evidence}; les ressources temporaires et accès inutiles ont été supprimés ou explicitement documentés.`,
  ];
}

const payload = JSON.parse(fs.readFileSync(packPath, 'utf8'));
const labs = Array.isArray(payload) ? payload : payload.labs;

for (const lab of labs) {
  lab.tasks = lab.tasks.map((task, taskIndex) => ({
    ...task,
    instructions: instructionFor(lab, taskIndex),
    validationHints: hintsFor(lab, taskIndex),
  }));
}

const wordCounts = labs.flatMap((lab) =>
  lab.tasks.map((task) => task.instructions.trim().split(/\s+/).length),
);
const invalid = labs.flatMap((lab) =>
  lab.tasks.filter(
    (task) =>
      task.instructions.trim().split(/\s+/).length < 200 ||
      !task.instructions.includes('## ') ||
      !task.instructions.includes('```bash') ||
      task.validationHints.length < 3,
  ),
);

if (invalid.length > 0) {
  throw new Error(`${invalid.length} tâches ne respectent pas le standard de contenu.`);
}

if (!process.argv.includes('--check')) {
  fs.writeFileSync(packPath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
}

console.log(
  JSON.stringify({
    labs: labs.length,
    tasks: wordCounts.length,
    minWords: Math.min(...wordCounts),
    maxWords: Math.max(...wordCounts),
    mode: process.argv.includes('--check') ? 'check' : 'write',
  }),
);
