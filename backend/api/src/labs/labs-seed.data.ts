/**
 * Seed rows for public `labs` table — slugs align with frontend routes:
 * - Azure: az900-{beginner|intermediate}-{id}
 * - AWS EC2: aws-ec2-{beginner|intermediate}-{labId}
 */

export type SeedLabStep = {
  title: string;
  instruction: string;
  hint?: string;
  validationNote?: string;
  estimatedMinutes?: number;
};

export type SeedLabQuizItem = {
  question: string;
  options: string[];
  correct: number;
  explanation: string;
};

export type SeedLabRow = {
  slug: string;
  title: string;
  description: string;
  provider: 'azure' | 'aws' | 'gcp';
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  estimatedTime: string;
  moduleTitle: string;
  tasks: string[];
  steps?: SeedLabStep[];
  metadata: {
    level: string;
    levelLabel: string;
    index: number;
    totalInLevel: number;
    prevSlug?: string;
    nextSlug?: string;
    providerLoginUrl: string;
    logo: string;
    tags: string[];
    learningObjectives: string[];
    prerequisites: string[];
    scenario?: string;
    costWarning?: string;
    sandboxUrl?: string;
    cleanupSteps?: string[];
    postLabQuiz?: SeedLabQuizItem[];
    careerConnection?: string;
  };
  status: 'published';
};

/** Lab row before prev/next chaining is applied */
export type SeedLabRowUnchained = Omit<SeedLabRow, 'metadata'> & {
  metadata: Omit<SeedLabRow['metadata'], 'prevSlug' | 'nextSlug'>;
};

function chainLevel(labs: SeedLabRowUnchained[]): SeedLabRow[] {
  return labs.map((lab, i) => ({
    ...lab,
    metadata: {
      ...lab.metadata,
      prevSlug: i > 0 ? labs[i - 1].slug : undefined,
      nextSlug: i < labs.length - 1 ? labs[i + 1].slug : undefined,
    },
  }));
}

const AZURE_LOGO = '/azure-training-in-chennai.png';
const AWS_LOGO = '/AWS.png';
const GCP_LOGO = '/gcp.png';

/** Hub cards */
export const HUB_LABS: SeedLabRow[] = [
  {
    slug: 'azure-az900',
    title: 'Azure AZ-900',
    description:
      'Parcours de labs pratiques pour la certification Microsoft Azure Fundamentals (AZ-900). Débutant et Intermédiaire.',
    provider: 'azure',
    difficulty: 'beginner',
    estimatedTime: 'Variable',
    moduleTitle: 'Azure Fundamentals',
    tasks: [
      'Labs pratiques par niveau (Débutant / Intermédiaire)',
      'Accès au portail Azure',
      'Exercices guidés alignés sur la certification',
    ],
    steps: [
      {
        title: 'Bienvenue dans le parcours Azure AZ-900',
        instruction: `## Votre parcours de certification Azure Fundamentals

Ce lab est le point de départ du parcours **AZ-900 — Microsoft Azure Fundamentals**.

### Structure du parcours

Le parcours est divisé en deux niveaux progressifs :

**Niveau Débutant (4 labs)**
- Lab 1 : Introduction au portail Azure et aux services cloud
- Lab 2 : Déploiement d'une Machine Virtuelle (IaaS)
- Lab 3 : Création d'un réseau virtuel et sous-réseaux (VNet)
- Lab 4 : Stockage Azure — Blob, Files et Access Tiers

**Niveau Intermédiaire (11 labs)**
- Lab 5–15 : Azure AD, RBAC, Cost Management, App Services, Containers, et bien plus

### Comment démarrer

Cliquez sur **"Lab suivant →"** en bas de cette page pour commencer par le Lab 1, ou utilisez le bouton **"Naviguer"** pour choisir un lab spécifique.

### Prérequis
- Compte Azure actif (compte gratuit accepté — [azure.microsoft.com/free](https://azure.microsoft.com/fr-fr/free/))
- Navigateur moderne (Chrome ou Edge recommandé)`,
        hint: '💡 Commencez toujours par le Lab 1 si c\'est votre première fois. Les labs s\'enchaînent progressivement.',
        validationNote: '✅ Vous êtes prêt(e) à démarrer quand vous avez un compte Azure actif et un navigateur ouvert sur portal.azure.com.',
        estimatedMinutes: 5,
      },
      {
        title: 'Se connecter au portail Azure',
        instruction: `## Connexion au portail Azure

Avant de commencer les labs individuels, assurez-vous de pouvoir accéder au portail Azure.

### Étapes de connexion

1. Ouvrez un nouvel onglet et naviguez vers **[portal.azure.com](https://portal.azure.com)**
2. Cliquez sur **"Sign in"**
3. Entrez votre adresse email Microsoft/Azure
4. Entrez votre mot de passe
5. Si demandé, complétez l'authentification multi-facteurs (MFA)

### Vérifiez votre accès

Une fois connecté, vous devriez voir :
- Le **tableau de bord Azure** avec les ressources récentes
- La barre de recherche en haut : tapez "Virtual Machines" pour tester
- Votre **nom d'utilisateur** en haut à droite

### Compte gratuit ?
Si vous n'avez pas encore de compte Azure, créez-en un gratuitement :
- 200 USD de crédits pendant 30 jours
- Services populaires gratuits pendant 12 mois
- URL : [azure.microsoft.com/free](https://azure.microsoft.com/fr-fr/free/)`,
        hint: '💡 Si vous avez un compte Microsoft (Outlook, Teams, Xbox), vous pouvez l\'utiliser directement sur portal.azure.com.',
        validationNote: '✅ Succès si vous voyez le tableau de bord Azure avec "Microsoft Azure" en haut à gauche.',
        estimatedMinutes: 5,
      },
      {
        title: 'Choisir votre premier lab',
        instruction: `## Démarrer le parcours AZ-900

Vous êtes maintenant prêt(e) à commencer ! Voici comment naviguer entre les labs.

### Navigation dans le parcours

Utilisez les boutons **"← Lab précédent"** et **"Lab suivant →"** en bas de chaque page pour avancer progressivement dans le parcours.

### Ordre recommandé pour les débutants complets

| Lab | Titre | Durée estimée |
|-----|-------|---------------|
| 1 | Introduction au portail Azure | 30 min |
| 2 | Déployer une Machine Virtuelle | 45 min |
| 3 | Créer un réseau virtuel (VNet) | 40 min |
| 4 | Stockage Azure Blob | 35 min |
| 5+ | Labs intermédiaires (RBAC, AD, etc.) | 40–60 min chacun |

### Conseil : gérez vos coûts
- Après chaque lab, **supprimez le Resource Group** créé pour éviter des frais inutiles
- Utilisez la vue **"Cost Management"** pour surveiller votre consommation
- Les labs utilisent des services de faible coût (< 0,05 USD par lab)

Cliquez sur **"Lab suivant →"** pour commencer le Lab 1 !`,
        hint: '💡 Vous pouvez revenir à ce lab à tout moment pour revoir la structure du parcours.',
        validationNote: '✅ Prêt(e) à partir ! Cliquez sur "Lab suivant →" pour démarrer le Lab 1.',
        estimatedMinutes: 3,
      },
    ],
    metadata: {
      level: 'beginner',
      levelLabel: 'Niveau Débutant',
      index: 0,
      totalInLevel: 1,
      providerLoginUrl: 'https://portal.azure.com/',
      logo: AZURE_LOGO,
      tags: ['azure', 'az900', 'fundamentals', 'certification'],
      learningObjectives: ['Pratiquer les concepts AZ-900', 'Explorer le portail Azure'],
      prerequisites: [],
      scenario: `Vous êtes sur le point de commencer votre préparation à la certification **Microsoft Azure Fundamentals (AZ-900)**. Ce parcours vous guidera à travers des labs pratiques conçus pour vous donner une expérience réelle sur la plateforme Azure, exactement comme vous en aurez besoin le jour de l'examen.`,
      careerConnection: `La certification AZ-900 est le point de départ de toutes les certifications Azure. Elle est reconnue par des milliers d'entreprises et prouve votre compréhension fondamentale du cloud Microsoft Azure — une compétence recherchée dans tous les secteurs.`,
    },
    status: 'published',
  },
  {
    slug: 'aws-ec2',
    title: 'AWS EC2 Basics',
    description: "Parcours de labs pratiques pour maîtriser Amazon EC2. Débutant et Intermédiaire.",
    provider: 'aws',
    difficulty: 'beginner',
    estimatedTime: 'Variable',
    moduleTitle: 'AWS EC2',
    tasks: [
      'Labs pratiques par niveau (Débutant / Intermédiaire)',
      "Création et gestion d'instances EC2",
      'Exercices guidés',
    ],
    steps: [
      {
        title: 'Bienvenue dans le parcours AWS EC2',
        instruction: `## Votre parcours Amazon EC2

Ce lab est le point de départ du parcours **AWS EC2 — Amazon Elastic Compute Cloud**.

### Structure du parcours

**Niveau Débutant (4 labs)**
- Lab 1 : Configuration du compte AWS et CLI
- Lab 2 : Lancer et gérer des instances EC2
- Lab 3 : Volumes EBS et stockage EC2
- Lab 4 : Groupes de sécurité et accès réseau

**Niveau Intermédiaire (4 labs)**
- Lab 5 : Load Balancing avec ALB
- Lab 6 : Auto Scaling Groups
- Lab 7 : Types d'instances et optimisation coûts
- Lab 8 : Monitoring avec CloudWatch

### Prérequis
- Compte AWS actif ([aws.amazon.com/free](https://aws.amazon.com/free/))
- AWS CLI installé sur votre machine (optionnel pour les premiers labs)
- Navigateur moderne`,
        hint: '💡 AWS propose un Free Tier (niveau gratuit) pour la plupart des services utilisés dans ce parcours. Vérifiez les limites avant de commencer.',
        validationNote: '✅ Prêt(e) si vous avez accès à la console AWS sur console.aws.amazon.com.',
        estimatedMinutes: 5,
      },
      {
        title: 'Se connecter à la console AWS',
        instruction: `## Connexion à la console AWS

### Étapes de connexion

1. Naviguez vers **[console.aws.amazon.com](https://console.aws.amazon.com)**
2. Cliquez sur **"Sign in to the Console"**
3. Choisissez **"Root user"** (si c'est votre compte personnel) ou **"IAM user"** (si c'est un compte d'entreprise)
4. Entrez votre email et mot de passe
5. Complétez le MFA si configuré

### Après connexion
- Vérifiez que vous êtes dans la **bonne région** (en haut à droite) — recommandé : **eu-west-3 (Paris)** ou **us-east-1 (N. Virginia)**
- Tapez "EC2" dans la barre de recherche pour accéder au service

### Compte gratuit AWS Free Tier
- 750 heures/mois d'instances t2.micro ou t3.micro (Linux/Windows)
- Valable 12 mois après création du compte
- Attention aux instances **au-delà** du free tier — elles sont facturées`,
        hint: '💡 Sélectionnez toujours la région la plus proche de vous pour de meilleures performances et pour respecter les réglementations RGPD si nécessaire.',
        validationNote: '✅ Succès si vous voyez le tableau de bord AWS avec la barre de recherche de services en haut.',
        estimatedMinutes: 5,
      },
      {
        title: 'Explorer EC2 et démarrer le Lab 1',
        instruction: `## Découvrir Amazon EC2

Avant de commencer les labs, voici un aperçu rapide d'EC2.

### Qu'est-ce qu'Amazon EC2 ?

EC2 (**Elastic Compute Cloud**) est le service de serveurs virtuels d'AWS. Il vous permet de :
- Lancer des serveurs (instances) en quelques minutes
- Choisir le système d'exploitation (Linux, Windows)
- Sélectionner la puissance de calcul selon vos besoins
- Payer uniquement pour le temps d'utilisation (à la seconde)

### Concepts clés à connaître

| Terme | Définition |
|-------|-----------|
| **Instance** | Un serveur virtuel EC2 en cours d'exécution |
| **AMI** | Image machine — le "modèle" de l'instance |
| **Type d'instance** | La configuration CPU/RAM (ex: t3.micro) |
| **Security Group** | Pare-feu virtuel contrôlant le trafic |
| **Key Pair** | Clé SSH pour se connecter à l'instance |
| **EBS** | Elastic Block Store — disque dur virtuel |

### Démarrer

Cliquez sur **"Lab suivant →"** pour commencer le Lab 1 : Configuration du compte AWS et de la CLI.`,
        hint: '💡 Gardez un œil sur votre console de facturation AWS (Billing Dashboard) pendant les labs pour éviter les surprises.',
        validationNote: '✅ Prêt(e) ! Utilisez "Lab suivant →" pour accéder au Lab 1.',
        estimatedMinutes: 5,
      },
    ],
    metadata: {
      level: 'beginner',
      levelLabel: 'Niveau Débutant',
      index: 0,
      totalInLevel: 1,
      providerLoginUrl: 'https://aws.amazon.com/console/',
      logo: AWS_LOGO,
      tags: ['aws', 'ec2', 'instances', 'certification'],
      learningObjectives: ['Pratiquer EC2', 'Explorer la console AWS'],
      prerequisites: [],
      scenario: `Vous démarrez votre apprentissage d'**Amazon EC2**, le service de calcul cloud le plus utilisé au monde. Ce parcours vous donnera une expérience pratique réelle sur la console AWS, de la création de votre première instance jusqu'à la configuration d'architectures scalables.`,
      careerConnection: `La maîtrise d'Amazon EC2 est une compétence fondamentale pour tout rôle Cloud Engineer, DevOps ou SysAdmin. AWS est le leader du marché cloud avec 31% de parts de marché mondial, et EC2 est au cœur de presque toutes les architectures AWS.`,
    },
    status: 'published',
  },
];

const AZ900_BEGINNER_RAW: SeedLabRowUnchained[] = [
  {
    slug: 'az900-beginner-1',
    title: 'Explore Azure Portal',
    description: 'Découvrez le portail Azure, créez votre premier Resource Group et maîtrisez la navigation — base de tout travail Azure.',
    provider: 'azure',
    difficulty: 'beginner',
    estimatedTime: '45 min',
    moduleTitle: 'Cloud Foundations',
    tasks: [
      'Créer un compte Azure gratuit (Free Tier)',
      'Explorer le portail Azure et identifier les menus principaux',
      'Naviguer vers la carte des régions Azure mondiales',
      'Créer un Resource Group nommé "rg-az900-lab1"',
      'Explorer les options de tagging sur le Resource Group',
    ],
    steps: [
      {
        title: 'Créer un compte Azure gratuit (Free Tier)',
        instruction: `## Créer votre compte Azure Free Tier

Azure offre 12 mois de services gratuits + 200 USD de crédits pour les 30 premiers jours.

**Étapes :**

1. Allez sur **https://azure.microsoft.com/free**
2. Cliquez **Start free**
3. Connectez-vous avec un compte Microsoft (Outlook/Hotmail) ou créez-en un
4. Remplissez le formulaire : nom, pays, numéro de téléphone (vérification par SMS)
5. Entrez une carte bancaire — **aucun débit** si vous restez dans le Free Tier
6. Acceptez les conditions → **Sign up**
7. Attendez 2–3 minutes le provisionnement du compte`,
        hint: `💡 Pas de carte bancaire personnelle ? Utilisez le **Microsoft Learn Sandbox** (gratuit, sans CB) : https://learn.microsoft.com/training/modules/describe-core-architectural-components-of-azure/`,
        validationNote: `✅ Vous êtes redirigé vers le portail Azure (portal.azure.com) et voyez le tableau de bord. En haut à droite : votre nom d'utilisateur est affiché.`,
        estimatedMinutes: 10,
      },
      {
        title: 'Explorer le portail Azure et identifier les menus principaux',
        instruction: `## Naviguer dans le portail Azure

Le portail Azure est votre interface principale pour gérer toutes les ressources cloud.

**Explorez ces 5 zones clés :**

1. **Barre de recherche** (en haut au centre) — tapez n'importe quel service Azure pour y accéder directement
2. **Menu burger (≡)** en haut à gauche — liste tous les services organisés par catégorie
3. **Notifications (🔔)** en haut à droite — statut de vos déploiements en temps réel
4. **Cloud Shell (>_)** en haut à droite — terminal bash/PowerShell directement dans le navigateur
5. **Tableau de bord** (lien en haut) — personnalisable avec vos tuiles de ressources

**Action :** Dans la barre de recherche, tapez "Virtual Machines" — remarquez que les suggestions apparaissent avant même de finir.`,
        hint: `💡 Raccourci utile : Appuyez sur **G** puis **/** pour ouvrir la barre de recherche depuis le clavier.`,
        validationNote: `✅ Vous pouvez identifier les 5 zones et accéder à Virtual Machines via la recherche. La barre latérale gauche montre les "Favoris" (services épinglés).`,
        estimatedMinutes: 8,
      },
      {
        title: 'Naviguer vers la carte des régions Azure mondiales',
        instruction: `## Découvrir l'infrastructure mondiale Azure

Azure opère dans plus de 60 régions mondiales — c'est l'un des réseaux cloud les plus étendus.

**Étapes :**

1. Dans la barre de recherche du portail → tapez **"Azure global infrastructure"** → ouvrez le lien externe OU
2. Allez directement sur **https://infrastructuremap.microsoft.com/**
3. Explorez la carte interactive :
   - Cliquez sur une région pour voir les services disponibles
   - Identifiez les **paires de régions** (ex: West Europe / North Europe)
   - Notez la présence de régions en France, Allemagne, Suède

**Concept clé :** Une **région** = plusieurs datacenters physiques proches (appelés Availability Zones). L'examen AZ-900 teste votre compréhension des régions, zones et paires.`,
        hint: `💡 Pour l'examen : retenez que "Availability Zones" = datacenters indépendants DANS une région. "Region pairs" = deux régions distinctes pour le disaster recovery.`,
        validationNote: `✅ Vous avez identifié au moins 3 régions européennes sur la carte. Vous pouvez expliquer la différence entre une région et une zone de disponibilité.`,
        estimatedMinutes: 7,
      },
      {
        title: 'Créer un Resource Group nommé "rg-az900-lab1"',
        instruction: `## Créer votre premier Resource Group

Un **Resource Group** est un conteneur logique pour regrouper les ressources Azure liées. C'est obligatoire — toute ressource Azure doit appartenir à un Resource Group.

**Étapes :**

1. Dans le portail → barre de recherche → tapez **"Resource groups"** → cliquez sur le service
2. Cliquez **+ Create**
3. Remplissez le formulaire :
   - **Subscription :** Azure subscription 1 (votre abonnement par défaut)
   - **Resource group :** \`rg-az900-lab1\`
   - **Region :** West Europe
4. Cliquez **Review + create** → vérifiez le résumé → **Create**
5. Attendez 5–10 secondes`,
        hint: `💡 La convention de nommage \`rg-\` est une bonne pratique (rg = resource group). Azure la recommande pour identifier le type de ressource au premier coup d'œil.`,
        validationNote: `✅ Dans "Resource groups" → votre \`rg-az900-lab1\` apparaît avec Region = West Europe et Status = Succeeded. Cliquez dessus — il est vide pour l'instant.`,
        estimatedMinutes: 5,
      },
      {
        title: 'Explorer les options de tagging sur le Resource Group',
        instruction: `## Ajouter des tags pour la gouvernance

Les **tags** sont des paires clé-valeur qui permettent d'organiser les ressources et de filtrer les coûts.

**Étapes :**

1. Dans Resource groups → cliquez sur \`rg-az900-lab1\`
2. Dans le menu gauche → cliquez **Tags**
3. Ajoutez ces 3 tags (cliquez + pour en ajouter) :
   - Clé : \`Environment\` → Valeur : \`Lab\`
   - Clé : \`Project\` → Valeur : \`AZ-900-Training\`
   - Clé : \`Owner\` → Valeur : votre prénom
4. Cliquez **Apply**
5. Revenez à la liste des Resource Groups → vérifiez que les tags s'affichent`,
        hint: `💡 Dans une vraie entreprise, les tags sont utilisés par les équipes FinOps pour allouer les coûts par département. Ex: "CostCenter: Marketing" permet de facturer le budget marketing séparément.`,
        validationNote: `✅ Les 3 tags apparaissent dans l'onglet Tags du Resource Group. Dans le menu "Cost Management + Billing", vous pouvez filtrer les coûts par tag.`,
        estimatedMinutes: 5,
      },
    ],
    metadata: {
      level: 'beginner',
      levelLabel: 'Débutant',
      index: 0,
      totalInLevel: 4,
      providerLoginUrl: 'https://portal.azure.com/',
      logo: AZURE_LOGO,
      tags: ['azure', 'az900'],
      learningObjectives: [
        'Créer un compte Azure Free Tier et accéder au portail',
        'Naviguer dans les menus principaux du portail Azure',
        'Comprendre le concept de région, zone et paire de régions',
        'Créer un Resource Group et appliquer des tags de gouvernance',
      ],
      prerequisites: ['Navigateur web Chrome ou Edge recommandé', 'Carte bancaire pour la vérification (aucun débit)'],
      scenario: `Vous venez d'être recruté(e) comme stagiaire Cloud Engineer chez **TechWave**, une startup qui migre vers Azure. Avant votre première mission, votre responsable vous demande de vous familiariser avec le portail Azure et de créer l'environnement de base du projet. Ce lab vous prendra environ 35 minutes.`,
      postLabQuiz: [
        {
          question: "Qu'est-ce qu'un Resource Group dans Azure ?",
          options: [
            "Un datacenter physique dans une région Azure",
            "Un conteneur logique regroupant des ressources Azure liées pour une gestion commune",
            "Un type d'abonnement Azure",
            "Un service de stockage de fichiers",
          ],
          correct: 1,
          explanation: "Un Resource Group est un conteneur logique (pas physique). Il regroupe des ressources pour les gérer ensemble : déploiement, permissions RBAC, facturation, et suppression groupée. Toute ressource Azure doit appartenir à exactement un Resource Group.",
        },
        {
          question: "À quoi servent les tags dans Azure ?",
          options: [
            "À sécuriser les ressources avec des mots de passe",
            "À définir la région géographique d'une ressource",
            "À organiser les ressources et filtrer les coûts par catégorie",
            "À chiffrer les données au repos",
          ],
          correct: 2,
          explanation: "Les tags (paires clé-valeur) servent à la gouvernance : identifier les ressources par projet, environnement, propriétaire, ou centre de coût. Les équipes FinOps utilisent les tags pour allouer les dépenses cloud par département.",
        },
      ],
      careerConnection: "La maîtrise du portail Azure est la compétence de base de tout Cloud Engineer. Compétences LinkedIn associées : 'Microsoft Azure', 'Cloud Administration'. Rôles ciblés : Cloud Administrator, DevOps Engineer. Salaire moyen en France : 40 000–55 000 EUR/an.",
    },
    status: 'published',
  },
  {
    slug: 'az900-beginner-2',
    title: 'Deploy a Virtual Machine (IaaS)',
    description: 'Déployez une VM Windows Server sur Azure, connectez-vous via RDP et comprenez le modèle de responsabilité partagée IaaS.',
    provider: 'azure',
    difficulty: 'beginner',
    estimatedTime: '90 min',
    moduleTitle: 'Cloud Service Models',
    tasks: [
      'Créer une VM Azure (Windows Server 2022, taille B1s)',
      'Choisir la région et la zone de disponibilité',
      'Configurer le réseau virtuel et le sous-réseau',
      'Observer les responsabilités client vs Microsoft dans le portail',
      'Se connecter à la VM via RDP ou Bastion',
      'Supprimer la VM après le lab (éviter les coûts)',
    ],
    steps: [
      {
        title: 'Créer une VM Azure (Windows Server 2022, taille B1s)',
        instruction: `## Déployer votre première Virtual Machine Azure

Une **VM (IaaS)** vous donne un serveur virtuel complet. Microsoft gère le hardware et la virtualisation. Vous gérez tout le reste : OS, patches, applications.

**Étapes :**

1. Portail Azure → barre de recherche → **Virtual machines** → **+ Create** → **Azure virtual machine**
2. Onglet **Basics** :
   - Resource group : \`rg-az900-lab1\` (le RG du lab précédent, ou créez-en un nouveau)
   - Virtual machine name : \`vm-az900-lab2\`
   - Region : **(Europe) West Europe**
   - Availability options : **Availability zone** → Zone 1
   - Image : **Windows Server 2022 Datacenter: Azure Edition - Gen2**
   - Size : cliquez **See all sizes** → cherchez \`B1s\` → **Select**
   - Administrator username : \`labadmin\`
   - Password : \`Az900Lab@2024!\` *(notez-le bien)*
3. Onglet **Disks** : laissez les valeurs par défaut (OS disk = Standard SSD)
4. Onglet **Networking** : laissez les valeurs par défaut (un VNet et subnet seront créés automatiquement)
5. **Review + Create** → vérifiez le coût estimé (~0.012 USD/h) → **Create**`,
        hint: `💡 Si B1s n'apparaît pas : cliquez "All sizes", puis filtrez "General purpose" et cherchez "B1s". C'est la taille la moins chère (~8 USD/mois si laissée allumée en permanence).`,
        validationNote: `✅ Notifications (🔔) → "Deployment succeeded". Cliquez "Go to resource" → la VM affiche **Status: Running** et une adresse IP publique.`,
        estimatedMinutes: 15,
      },
      {
        title: 'Observer les responsabilités client vs Microsoft',
        instruction: `## Comprendre le modèle de responsabilité partagée IaaS

C'est un concept central de l'examen AZ-900. Dans IaaS, la frontière est claire.

**Microsoft gère (vous ne touchez pas) :**
- Serveurs physiques dans les datacenters
- Hyperviseur de virtualisation
- Réseau physique (câbles, switches)
- Climatisation et alimentation des datacenters

**Vous gérez :**
- Système d'exploitation Windows Server (patches, mises à jour)
- Antivirus et sécurité OS
- Runtime et middleware (IIS, .NET, etc.)
- Votre application
- Vos données

**Dans le portail, vérifiez :**
1. Sur la page de votre VM → **Updates** dans le menu gauche → vous voyez que Windows Update est votre responsabilité
2. **Security** → Microsoft Defender for Cloud vous recommande des actions côté OS`,
        hint: `💡 Mémorisez la pyramide pour l'examen : On-premises (tout vous) → IaaS (partagé, Microsoft gère le physique) → PaaS (Microsoft gère OS+runtime) → SaaS (Microsoft gère tout sauf les données).`,
        validationNote: `✅ Vous pouvez lister 3 choses que Microsoft gère et 3 choses que vous gérez dans cette VM. Vous avez vu la section "Updates" dans le portail.`,
        estimatedMinutes: 8,
      },
      {
        title: 'Se connecter à la VM via RDP',
        instruction: `## Accéder au bureau Windows Server via Remote Desktop

RDP (Remote Desktop Protocol, port 3389) vous permet de voir et contrôler le bureau Windows Server à distance.

**Étapes :**

1. Sur la page de la VM → **Connect** dans le menu gauche → **RDP**
2. Cliquez **Download RDP File** → ouvrez-le
   - *Sur Windows :* l'application RDP s'ouvre automatiquement
   - *Sur Mac :* installez **Microsoft Remote Desktop** depuis l'App Store
3. Dans la fenêtre de connexion :
   - Utilisateur : \`labadmin\`
   - Mot de passe : \`Az900Lab@2024!\`
4. Acceptez le certificat SSL (cliquez Yes/Connect)
5. Attendez l'ouverture du bureau Windows Server

**Dans la VM, explorez :**
- Server Manager s'ouvre automatiquement → c'est vous qui le gérez, pas Microsoft`,
        hint: `💡 Si le port RDP est bloqué par votre réseau d'entreprise : utilisez **Azure Bastion** (option dans le menu Connect) qui fonctionne via HTTPS port 443. Bastion coûte ~0.19 USD/h.`,
        validationNote: `✅ Vous voyez le bureau Windows Server 2022 dans une fenêtre. La barre de titre indique "vm-az900-lab2 - Remote Desktop Connection".`,
        estimatedMinutes: 10,
      },
      {
        title: 'Analyser les coûts dans Azure Cost Management',
        instruction: `## Comprendre la facturation Azure

Azure facture à l'heure (ou à la seconde pour certains services). Comprendre les coûts est critique.

**Étapes :**

1. Fermez la session RDP (dans la VM : Start → Disconnect)
2. Dans le portail → revenez à la page de la VM
3. Menu gauche → **Cost Management** → **Cost analysis**
4. Observez le coût estimé pour cette session

**Éléments facturés par cette VM :**
- Temps de calcul (CPU) : ~0.012 USD/h pour B1s
- Disque OS : ~0.003 USD/h
- Adresse IP publique : ~0.004 USD/h
- Transfert réseau sortant : variable

**Note sur l'état de la VM :**
- VM **Running** = facturé pour compute + disque + IP
- VM **Stopped (Deallocated)** = facturé uniquement pour le disque`,
        hint: `💡 Arrêter une VM depuis l'OS (shutdown dans Windows) la laisse en état "Stopped" mais toujours facturée pour le compute. Il faut cliquer "Stop" dans le portail Azure pour la "Deallocate".`,
        validationNote: `✅ Vous voyez le coût de cette session dans Cost Analysis (quelques centimes). Vous comprenez la différence entre "Stopped" et "Deallocated".`,
        estimatedMinutes: 7,
      },
      {
        title: 'Supprimer la VM pour éviter les frais',
        instruction: `## Nettoyage — Supprimer toutes les ressources

⚠️ **Important :** Une VM B1s arrêtée (pas deallocated) coûte encore de l'argent. Supprimez tout en supprimant le Resource Group.

**Méthode rapide — supprimer le Resource Group entier :**

1. Portail Azure → **Resource groups** → \`rg-az900-lab1\`
2. Cliquez **Delete resource group** (bouton rouge en haut)
3. Tapez \`rg-az900-lab1\` dans le champ de confirmation
4. Cliquez **Delete**
5. Attendez 2–5 minutes — toutes les ressources (VM, VNet, IP, disque) sont supprimées

*Ou supprimer uniquement la VM :*
1. Page de la VM → **Delete** → cochez "Delete OS disk" et "Delete network interface" → Confirm`,
        hint: `💡 Supprimer le Resource Group est la méthode "nucléaire" recommandée en lab — elle supprime TOUT sans rien oublier (disques orphelins, IPs, etc.).`,
        validationNote: `✅ Resource groups ne contient plus \`rg-az900-lab1\`. Aucune ressource orpheline dans "All resources". Coût total du lab : < 0.10 USD.`,
        estimatedMinutes: 5,
      },
    ],
    metadata: {
      level: 'beginner',
      levelLabel: 'Débutant',
      index: 1,
      totalInLevel: 4,
      providerLoginUrl: 'https://portal.azure.com/',
      logo: AZURE_LOGO,
      tags: ['azure', 'az900', 'iaas', 'vm'],
      learningObjectives: [
        'Déployer une Virtual Machine Windows Server sur Azure',
        'Expliquer le modèle de responsabilité partagée IaaS',
        'Se connecter à une VM distante via Remote Desktop Protocol',
        'Nettoyer les ressources Azure pour éviter les frais',
      ],
      prerequisites: ['Lab az900-beginner-1 (portail Azure)'],
      scenario: `Vous êtes Cloud Engineer Junior chez **CloudFirst TN**. Votre chef de projet vous demande de déployer un serveur Windows pour tester une application interne avant migration vers Azure. C'est votre première VM sur le cloud — durée estimée : 45 minutes, coût : ~0.05 USD.`,
      costWarning: '⚠️ VM B1s ≈ 0.012 USD/heure. Supprimez le Resource Group à la fin du lab pour éviter tout frais.',
      sandboxUrl: 'https://learn.microsoft.com/training/modules/describe-cloud-service-types/',
      postLabQuiz: [
        {
          question: "Dans le modèle IaaS, qui est responsable des mises à jour (patches) du système d'exploitation ?",
          options: ['Microsoft Azure', 'Le client (vous)', 'Automatiquement géré par Azure', "Personne — l'OS ne reçoit pas de patches en cloud"],
          correct: 1,
          explanation: "En IaaS, Microsoft gère uniquement le hardware et la virtualisation. Le client est responsable de l'OS complet : installation, patches, antivirus, configuration. C'est la différence fondamentale avec PaaS où Microsoft gère aussi l'OS.",
        },
        {
          question: "Vous arrêtez une VM depuis Windows (Start → Shutdown). Qu'est-ce qui est facturé ?",
          options: [
            "Rien — la VM est arrêtée",
            "Uniquement le disque OS",
            "Le compute (CPU), le disque et l'IP publique sont encore facturés",
            "Seulement l'IP publique",
          ],
          correct: 2,
          explanation: "Arrêter l'OS depuis Windows laisse la VM en état 'Stopped' (non deallocated). Azure continue de facturer le compute, le disque et l'IP. Pour arrêter la facturation compute, il faut cliquer 'Stop' depuis le portail Azure pour obtenir l'état 'Deallocated'.",
        },
      ],
      careerConnection: "La gestion des VMs Azure est une compétence fondamentale pour les Cloud Administrators. Certifications qui utilisent cette compétence : AZ-104 (Azure Administrator). Rôles : Cloud Administrator, Systems Engineer, DevOps Engineer.",
    },
    status: 'published',
  },
  {
    slug: 'az900-beginner-3',
    title: 'Deploy an App Service (PaaS)',
    description: 'Déployez une Web App sur Azure App Service, comprenez PaaS et comparez avec IaaS.',
    provider: 'azure',
    difficulty: 'beginner',
    estimatedTime: '60 min',
    moduleTitle: 'Cloud Service Models',
    tasks: [
      "Créer une Web App Azure (App Service, plan gratuit F1)",
      "Observer l'abstraction infrastructure (pas de gestion OS)",
      'Déployer une application HTML simple via ZIP Deploy',
      'Comparer les responsabilités avec le lab VM précédent',
      'Explorer les options de scaling dans App Service',
    ],
    steps: [
      {
        title: "Créer un App Service Plan F1 et une Web App",
        instruction: `## Déployer votre première Web App Azure (PaaS)

En **PaaS**, vous ne gérez plus l'OS ni le serveur. Vous déployez uniquement votre code. Microsoft s'occupe du reste.

**Étapes :**

1. Portail Azure → **+ Create a resource** → cherchez **Web App** → Create
2. Remplissez l'onglet **Basics** :
   - Resource Group : \`rg-az900-lab3\` (créez-en un nouveau)
   - Name : \`webapp-az900-[votreprénom]\` *(doit être unique globalement)*
   - Publish : **Code**
   - Runtime stack : **PHP 8.2** (ou Node 20 — peu importe pour ce lab)
   - Operating System : **Linux**
   - Region : West Europe
3. Section **App Service Plan** → cliquez **Create new**
   - Name : \`asp-az900-lab3\`
   - Pricing tier : cliquez **Explore pricing plans** → onglet **Dev/Test** → sélectionnez **F1 (Free)**
4. **Review + Create** → **Create**`,
        hint: `💡 Le nom de la Web App doit être globalement unique car il forme l'URL : \`webapp-az900-[votrenom].azurewebsites.net\`. Ajoutez votre prénom ou un numéro si le nom est pris.`,
        validationNote: `✅ Déploiement réussi → cliquez "Go to resource". Vous voyez la page de la Web App avec l'URL \`https://[votrenom].azurewebsites.net\`. Cliquez dessus — une page "Your web app is running" apparaît.`,
        estimatedMinutes: 10,
      },
      {
        title: "Observer l'abstraction infrastructure — pas de gestion OS",
        instruction: `## PaaS vs IaaS — Qu'est-ce qui a disparu ?

Comparez avec le lab VM précédent :

**Dans la VM (IaaS), vous aviez accès à :**
- Système d'exploitation complet (Windows Server)
- Remote Desktop Protocol (RDP)
- Gestion des patches Windows Update
- Configuration réseau de la VM

**Dans App Service (PaaS), cherchez ces mêmes éléments :**

1. Sur la page de votre Web App → menu gauche → **SSH** → **Go**
2. Vous obtenez un terminal Linux **limité** — pas d'accès root complet
3. Cherchez "Windows Update" ou "RDP" dans le menu — **introuvable** ← c'est normal
4. Menu gauche → **Overview** → notez qu'il n'y a pas d'adresse IP de VM

**Conclusion :** Microsoft gère complètement l'OS, les patches, le serveur web. Vous voyez seulement votre code et la configuration de l'application.`,
        hint: `💡 Pour l'examen : PaaS = vous gérez uniquement l'application et les données. Tout le reste (OS, runtime, serveur web) est géré par Azure.`,
        validationNote: `✅ Vous avez constaté l'absence d'interface RDP, de Windows Update, et d'accès OS direct dans App Service. Vous pouvez expliquer pourquoi.`,
        estimatedMinutes: 8,
      },
      {
        title: 'Déployer une page HTML via ZIP Deploy',
        instruction: `## Déployer votre première application web

Nous allons déployer une page HTML simple pour voir le cycle de déploiement PaaS.

**Créez un fichier \`index.html\` sur votre ordinateur :**

\`\`\`html
<!DOCTYPE html>
<html>
<head><title>Mon App Azure</title></head>
<body>
  <h1>Déployé sur Azure App Service !</h1>
  <p>PaaS — aucun serveur à gérer.</p>
</body>
</html>
\`\`\`

**Déployez via Kudu (interface de déploiement) :**

1. Dans l'URL du portail, ajoutez \`.scm\` après votre nom d'app :
   \`https://[votrenom].scm.azurewebsites.net\`
2. Cliquez **Zip Deploy** dans le menu Kudu
3. Glissez-déposez votre fichier \`index.html\` (ou un ZIP le contenant)
4. Attendez quelques secondes
5. Ouvrez \`https://[votrenom].azurewebsites.net\` dans un nouvel onglet`,
        hint: `💡 Alternative plus simple : dans le portail → **App Service Editor** (dans le menu gauche) → vous pouvez créer et modifier directement les fichiers en ligne.`,
        validationNote: `✅ Votre page HTML s'affiche sur \`https://[votrenom].azurewebsites.net\`. Le texte "Déployé sur Azure App Service !" est visible sans avoir configuré de serveur web.`,
        estimatedMinutes: 12,
      },
      {
        title: 'Explorer les options de scaling dans App Service',
        instruction: `## Scale Up et Scale Out — Concepts clés AZ-900

Azure offre deux types de scaling, tous deux accessibles sans gérer de serveurs :

**Scale Up (Vertical) — changer la taille du plan :**
1. Menu gauche → **Scale up (App Service plan)**
2. Vous voyez les différents tiers : Free → Shared → Basic → Standard → Premium
3. *Ne changez pas* (restons sur F1 gratuit) — observez seulement les options

**Scale Out (Horizontal) — ajouter des instances :**
1. Menu gauche → **Scale out (App Service plan)**
2. Sur le tier F1, c'est désactivé (1 instance fixe)
3. Observez le message expliquant que cette fonctionnalité nécessite le tier Standard

**Concept exam :** Scale Out = elasticité = ajouter des instances selon la charge = un des **avantages du cloud** testés dans AZ-900.`,
        hint: `💡 Pour l'examen : "Elasticity" = capacité d'augmenter/diminuer les ressources selon la demande. C'est différent de "Scalability" = capacité maximale d'un système à supporter une charge.`,
        validationNote: `✅ Vous avez vu la différence entre Scale Up (verticallement, changer de tier) et Scale Out (horizontalement, ajouter des instances). Vous pouvez expliquer pourquoi le F1 ne supporte pas l'autoscale.`,
        estimatedMinutes: 8,
      },
      {
        title: 'Comparer IaaS vs PaaS et nettoyer',
        instruction: `## Bilan IaaS vs PaaS — Pour l'examen

| Aspect | IaaS (VM du lab 2) | PaaS (App Service) |
|--------|--------------------|--------------------|
| OS | Vous gérez | Microsoft gère |
| Patches | Vous faites | Automatiques |
| Accès serveur | RDP complet | Limité (SSH restreint) |
| Déploiement | Installer manuellement | Zip / Git push |
| Coût F1 | N/A (pas de tier gratuit) | **Gratuit** |

**Nettoyage :**
1. Portail → Resource groups → \`rg-az900-lab3\`
2. **Delete resource group** → confirmez → Delete`,
        hint: `💡 Retenez cette phrase pour l'examen : "PaaS = vous vous concentrez sur le code, pas sur l'infrastructure."`,
        validationNote: `✅ Vous pouvez compléter le tableau comparatif IaaS/PaaS sans regarder vos notes. Resource group \`rg-az900-lab3\` supprimé.`,
        estimatedMinutes: 5,
      },
    ],
    metadata: {
      level: 'beginner',
      levelLabel: 'Débutant',
      index: 2,
      totalInLevel: 4,
      providerLoginUrl: 'https://portal.azure.com/',
      logo: AZURE_LOGO,
      tags: ['azure', 'az900', 'paas', 'app-service'],
      learningObjectives: [
        'Déployer une Web App sur Azure App Service avec le tier gratuit F1',
        'Distinguer les responsabilités client en PaaS vs IaaS',
        "Déployer du code via l'interface Kudu / ZIP Deploy",
        'Expliquer les concepts de Scale Up et Scale Out',
      ],
      prerequisites: ['Lab az900-beginner-2 (VM IaaS) recommandé'],
      scenario: `Votre startup **AppDev Tunisia** veut lancer un site web sans gérer de serveur. Votre CTO vous demande de déployer la première version de l'app sur Azure App Service en utilisant le tier gratuit. Durée estimée : 45 minutes, coût : 0 TND (F1 gratuit).`,
      postLabQuiz: [
        {
          question: "Dans Azure App Service (PaaS), qui est responsable des patches du système d'exploitation ?",
          options: ['Le développeur', 'Microsoft Azure', "L'équipe DevOps", 'Personne — les patches sont désactivés en PaaS'],
          correct: 1,
          explanation: "En PaaS, Microsoft gère entièrement l'OS, les patches, le runtime et le serveur web. Le développeur se concentre uniquement sur son code et ses données. C'est l'avantage principal de PaaS par rapport à IaaS.",
        },
        {
          question: "Qu'est-ce qu'un App Service Plan ?",
          options: [
            "L'application web elle-même",
            "Le code source de l'application",
            "L'infrastructure sous-jacente (région, CPU, RAM) qui exécute l'application",
            "Le plan tarifaire du compte Azure",
          ],
          correct: 2,
          explanation: "L'App Service Plan définit la région, la puissance de calcul et le modèle de tarification. C'est le 'serveur' sur lequel votre app tourne. Plusieurs apps peuvent partager le même plan. Le tier F1 est gratuit avec des limitations.",
        },
      ],
      careerConnection: "Le déploiement sur App Service est une compétence clé pour les développeurs web et DevOps qui travaillent avec Azure. Certifications associées : AZ-204 (Azure Developer). Salaire moyen Azure Developer : 42 000–58 000 EUR/an.",
    },
    status: 'published',
  },
  {
    slug: 'az900-beginner-4',
    title: 'Scaling & Monitoring',
    description: 'Configurez autoscaling et alertes Azure Monitor — les deux piliers de la haute disponibilité dans le cloud.',
    provider: 'azure',
    difficulty: 'beginner',
    estimatedTime: '75 min',
    moduleTitle: 'Cloud Benefits',
    tasks: [
      "Activer l'autoscaling sur un App Service Plan",
      "Configurer une règle d'autoscale (CPU > 70% → ajouter une instance)",
      'Ouvrir Azure Monitor et visualiser les métriques de la VM',
      'Créer une alerte sur une métrique (CPU > 80%)',
      'Comprendre le concept de High Availability via les diagnostics',
    ],
    steps: [
      {
        title: "Préparer un App Service Standard pour l'autoscale",
        instruction: `## Créer un App Service avec autoscaling actif

⚠️ L'autoscaling nécessite le tier **Standard S1** (~0.10 USD/h). Supprimez-le après le lab.

**Étapes :**

1. Portail → **App Services** → **+ Create**
2. Basics :
   - Resource Group : \`rg-az900-lab4\` (nouveau)
   - Name : \`webapp-monitor-[votreprénom]\`
   - Runtime : PHP 8.2 / Linux
   - Region : West Europe
3. App Service Plan → **Create new** → name: \`asp-standard\`
   - Pricing tier : **Standard S1** (onglet "Production")
4. **Review + Create** → Create`,
        hint: `💡 Pour ce lab uniquement, nous utilisons S1 pour accéder à l'autoscale. Supprimez toutes les ressources après le lab. Coût max si vous travaillez en 2h : ~0.20 USD.`,
        validationNote: `✅ App Service déployé sur le tier S1. La page de l'App Service affiche "App Service plan: asp-standard (S1)".`,
        estimatedMinutes: 8,
      },
      {
        title: "Configurer une règle d'autoscale (CPU > 70%)",
        instruction: `## Configurer l'autoscaling basé sur la charge CPU

L'**autoscaling** est l'élasticité automatique du cloud — une des propriétés fondamentales testées dans AZ-900.

**Étapes :**

1. Sur la page de votre App Service → menu gauche → **Scale out (App Service plan)**
2. Cliquez **Custom autoscale**
3. Scale mode : **Scale based on a metric**
4. Cliquez **+ Add a rule** :
   - Metric source : **Current resource**
   - Metric name : **CPU Percentage**
   - Operator : **Greater than**
   - Threshold : **70**
   - Duration : 5 minutes
   - Action : **Increase count by** 1
5. Ajoutez une règle de **scale-in** : CPU < 30% → Decrease count by 1
6. Instance limits : Min = **1**, Max = **3**, Default = **1**
7. **Save**`,
        hint: `💡 Toujours créer une règle scale-in (réduction) pour économiser les coûts. Sans elle, Azure pourrait maintenir 3 instances même quand la charge est basse.`,
        validationNote: `✅ Dans "Scale out" → l'option "Custom autoscale" est sélectionnée. Deux règles visibles : scale-out (CPU > 70%) et scale-in (CPU < 30%). Min=1, Max=3.`,
        estimatedMinutes: 10,
      },
      {
        title: 'Explorer Azure Monitor et visualiser les métriques',
        instruction: `## Azure Monitor — Le tableau de bord d'observabilité

Azure Monitor centralise toutes les métriques, logs et alertes de vos ressources.

**Étapes :**

1. Barre de recherche → **Monitor** → ouvrez Azure Monitor
2. Dans le menu gauche → **Metrics**
3. Sélectionnez votre ressource :
   - Scope : votre App Service \`webapp-monitor-[votreprénom]\`
   - Metric : **CPU Percentage**
   - Aggregation : **Average**
4. Observez le graphique (probablement proche de 0% — normal)
5. Changez la période en haut à droite : **Last 30 minutes**
6. Cliquez **+ Add metric** → ajoutez **Http 2xx** pour voir les requêtes HTTP

**Concept :** Azure Monitor collecte automatiquement les métriques de toutes les ressources Azure sans configuration supplémentaire.`,
        hint: `💡 Vous pouvez épingler ce graphique à votre tableau de bord Azure : cliquez "Pin to dashboard" en haut à droite du graphique.`,
        validationNote: `✅ Vous voyez un graphique avec CPU Percentage et Http 2xx pour votre App Service. La période "Last 30 minutes" est sélectionnée.`,
        estimatedMinutes: 8,
      },
      {
        title: 'Créer une alerte Azure Monitor (CPU > 80%)',
        instruction: `## Configurer une alerte pour être notifié en cas de problème

Les alertes Azure Monitor vous préviennent (email, SMS, webhook) quand une métrique dépasse un seuil.

**Étapes :**

1. Dans Azure Monitor → menu gauche → **Alerts** → **+ Create** → **Alert rule**
2. Onglet **Condition** :
   - Signal : **CPU Percentage**
   - Operator : **Greater than**
   - Threshold value : **80**
   - Evaluation frequency : 1 minute
3. Onglet **Actions** → **+ Create action group** :
   - Action group name : \`ag-az900-lab4\`
   - Notification type : **Email** → entrez votre adresse email
4. Onglet **Details** :
   - Alert rule name : \`cpu-high-alert\`
   - Severity : **2 - Warning**
5. **Review + Create** → Create`,
        hint: `💡 En production, les alertes sont souvent connectées à PagerDuty ou Teams via webhooks, pas seulement par email. L'examen AZ-900 ne demande pas ces détails — l'important est de comprendre le concept.`,
        validationNote: `✅ Dans Alerts → "Alert rules" : votre règle \`cpu-high-alert\` apparaît avec State = Enabled. Un email de confirmation d'action group a été envoyé à votre adresse.`,
        estimatedMinutes: 10,
      },
      {
        title: 'Nettoyer les ressources',
        instruction: `## Supprimer toutes les ressources du lab

Ce lab utilise un App Service Standard S1 (~0.10 USD/h). Supprimez immédiatement après le lab.

**Étapes :**

1. Portail → **Resource groups** → \`rg-az900-lab4\`
2. **Delete resource group** → tapez \`rg-az900-lab4\` → **Delete**

**Bilan du lab — Concepts appris :**
- **Elasticity** : autoscaling = ajout automatique d'instances selon la charge
- **High Availability** : plusieurs instances = pas de point de défaillance unique
- **Observability** : Azure Monitor = métriques + logs + alertes centralisés
- Ces 3 concepts sont des **avantages du cloud** listés dans le domaine AZ-900 "Describe benefits of cloud services"`,
        hint: `💡 L'examen AZ-900 liste ces avantages du cloud : High Availability, Scalability, Elasticity, Agility, Geo-distribution, Disaster Recovery. Assurez-vous de pouvoir définir chacun.`,
        validationNote: `✅ Resource group \`rg-az900-lab4\` supprimé. Vous pouvez définir elasticity, high availability et observability sans vos notes.`,
        estimatedMinutes: 5,
      },
    ],
    metadata: {
      level: 'beginner',
      levelLabel: 'Débutant',
      index: 3,
      totalInLevel: 4,
      providerLoginUrl: 'https://portal.azure.com/',
      logo: AZURE_LOGO,
      tags: ['azure', 'az900', 'monitor', 'autoscale'],
      learningObjectives: [
        "Configurer une règle d'autoscale basée sur la charge CPU",
        'Utiliser Azure Monitor pour visualiser les métriques de performance',
        "Créer une alerte email déclenchée par un seuil de métrique",
        'Expliquer les concepts cloud : elasticity, high availability, observability',
      ],
      prerequisites: ['Lab az900-beginner-3 (App Service)'],
      scenario: `L'application de votre startup **AppDev Tunisia** connaît des pics de trafic lors des lancements de produits. Votre responsable vous demande de configurer l'autoscaling et les alertes pour garantir la disponibilité. Durée : 45 min. Coût max : ~0.20 USD.`,
      costWarning: '⚠️ App Service Standard S1 ≈ 0.10 USD/h. Supprimez le Resource Group dès que le lab est terminé.',
      postLabQuiz: [
        {
          question: "Quelle est la différence entre Scalability et Elasticity dans le cloud ?",
          options: [
            "Ce sont des synonymes",
            "Scalability = capacité max du système. Elasticity = ajustement automatique selon la demande",
            "Scalability = horizontal. Elasticity = vertical",
            "Elasticity concerne uniquement le stockage",
          ],
          correct: 1,
          explanation: "Scalability = la capacité d'un système à gérer une charge croissante (plafond). Elasticity = la capacité d'ajouter ET réduire automatiquement les ressources selon la demande actuelle. Un système élastique est scalable, mais l'inverse n'est pas toujours vrai.",
        },
        {
          question: "Quel service Azure centralise les métriques, logs et alertes de toutes les ressources ?",
          options: ['Azure Security Center', 'Azure Monitor', 'Azure Advisor', 'Azure Policy'],
          correct: 1,
          explanation: "Azure Monitor est le service d'observabilité centralisé d'Azure. Il collecte automatiquement les métriques de toutes les ressources, permet de créer des alertes, et s'intègre avec Log Analytics pour les logs. Azure Security Center gère la sécurité, Azure Advisor donne des recommandations.",
        },
      ],
      careerConnection: "La configuration d'autoscaling et d'alertes est une compétence quotidienne des Cloud Administrators et SRE (Site Reliability Engineers). Certifications : AZ-104, AZ-900. Rôles : Cloud Operations Engineer, SRE.",
    },
    status: 'published',
  },
];

const AZ900_INTERMEDIATE_RAW: SeedLabRowUnchained[] = [
  {
    slug: 'az900-intermediate-1',
    title: 'Multi-Region Deployment',
    description: 'Déployez un stockage geo-redondant entre deux régions Azure et comprenez la haute disponibilité géographique.',
    provider: 'azure',
    difficulty: 'intermediate',
    estimatedTime: '90 min',
    moduleTitle: 'Azure Core Architecture',
    tasks: [
      'Déployer une ressource (Storage Account) en région West Europe',
      'Déployer la même ressource en région North Europe',
      'Activer la geo-réplication entre les deux régions',
      'Observer le failover automatique dans le portail',
      "Analyser l'impact sur le SLA avec la redondance GRS",
    ],
    steps: [
      {
        title: 'Créer un Storage Account GRS en West Europe',
        instruction: `## Déployer un compte de stockage geo-redondant

La **redondance géographique (GRS)** copie automatiquement vos données vers une seconde région à des centaines de km — protection contre une panne régionale complète.

**Étapes :**
1. Portail → **Storage accounts** → **+ Create**
2. Resource group : \`rg-az900-int1\` (nouveau)
3. Storage account name : \`stgaz900[votreprénom]\` *(minuscules, unique, sans tirets)*
4. Region : **West Europe**
5. Redundancy : **Geo-redundant storage (GRS)**
6. **Review + Create** → **Create**`,
        hint: `💡 GRS réplique vers la région paire automatiquement choisie par Azure (West Europe → North Europe). Vous ne choisissez pas la région secondaire — elle est imposée par la "region pair".`,
        validationNote: `✅ Le Storage Account affiche Redundancy = "Geo-redundant storage (GRS)" et Primary location = West Europe, Secondary location = North Europe.`,
        estimatedMinutes: 10,
      },
      {
        title: 'Identifier la région secondaire et le statut de réplication',
        instruction: `## Localiser la copie géo-répliquée

1. Sur la page du Storage Account → menu gauche → **Redundancy**
2. Observez le schéma : **Primary (West Europe)** ↔ **Secondary (North Europe)**
3. Notez le champ **Last Sync Time** — heure de la dernière réplication réussie
4. Le champ "Publish read access (RA-GRS)" permettrait la lecture depuis la région secondaire`,
        hint: `💡 RA-GRS (Read-Access GRS) permet de LIRE depuis la copie secondaire même sans failover. GRS standard ne le permet pas — la copie secondaire n'est accessible qu'après un failover.`,
        validationNote: `✅ Vous voyez Primary = West Europe et Secondary = North Europe avec un "Last Sync Time" récent.`,
        estimatedMinutes: 8,
      },
      {
        title: 'Uploader des données et vérifier la réplication',
        instruction: `## Tester la réplication avec de vraies données

1. Menu gauche → **Containers** → **+ Container** → name: \`donnees\` → Create
2. Ouvrez le container → **Upload** → choisissez un fichier (ex: une image)
3. Le fichier est immédiatement stocké en West Europe et répliqué de façon asynchrone vers North Europe
4. Revenez à **Redundancy** → le "Last Sync Time" se met à jour`,
        hint: `💡 La réplication GRS est ASYNCHRONE : il peut y avoir un léger délai (RPO < 15 min) entre l'écriture primaire et la copie secondaire. LRS/ZRS sont synchrones dans une même région.`,
        validationNote: `✅ Le fichier apparaît dans le container \`donnees\` et le "Last Sync Time" reflète l'upload récent.`,
        estimatedMinutes: 8,
      },
      {
        title: 'Comprendre le SLA et nettoyer',
        instruction: `## SLA des modèles de redondance

| Redondance | Copies | Portée | SLA durabilité |
|-----------|--------|--------|----------------|
| LRS | 3 | 1 datacenter | 99,999999999% (11 neufs) |
| ZRS | 3 | 3 zones | 12 neufs |
| GRS | 6 | 2 régions | 16 neufs |
| RA-GRS | 6 | 2 régions + lecture | 16 neufs |

**Nettoyage :** Resource groups → \`rg-az900-int1\` → **Delete resource group**.`,
        hint: `💡 Pour l'examen : plus de neufs = plus de durabilité. GRS (16 neufs) protège contre une panne régionale ; LRS (11 neufs) seulement contre une panne disque.`,
        validationNote: `✅ Vous pouvez classer LRS < ZRS < GRS par niveau de durabilité. Resource group supprimé.`,
        estimatedMinutes: 6,
      },
    ],
    metadata: {
      level: 'intermediate',
      levelLabel: 'Intermédiaire',
      index: 0,
      totalInLevel: 11,
      providerLoginUrl: 'https://portal.azure.com/',
      logo: AZURE_LOGO,
      tags: ['azure', 'az900'],
      learningObjectives: [
        'Déployer un Storage Account avec redondance géographique (GRS)',
        'Identifier la région paire et le statut de réplication',
        'Distinguer les modèles LRS, ZRS, GRS et RA-GRS',
        'Expliquer le lien entre redondance et SLA de durabilité',
      ],
      prerequisites: ['Labs AZ-900 Débutant'],
      scenario: `Votre entreprise **DataSafe TN** héberge des documents critiques. Après une panne régionale chez un concurrent, votre DSI exige une stratégie de stockage résistant aux pannes régionales. Vous mettez en place un stockage geo-redondant. Durée : ~35 min, coût : < 0.05 USD.`,
      costWarning: '⚠️ Le stockage GRS facture le double du LRS (deux copies). Coût négligeable pour quelques fichiers, mais supprimez le Resource Group après le lab.',
      postLabQuiz: [
        {
          question: "Quelle redondance protège contre une panne complète d'une région Azure ?",
          options: ['LRS (Locally Redundant Storage)', 'ZRS (Zone Redundant Storage)', 'GRS (Geo Redundant Storage)', 'Aucune ne le permet'],
          correct: 2,
          explanation: "GRS réplique les données vers une SECONDE région (la région paire). LRS protège seulement contre une panne disque dans un datacenter ; ZRS contre une panne de zone dans une même région. Seul GRS/RA-GRS survit à une panne régionale entière.",
        },
        {
          question: "La réplication GRS entre deux régions est :",
          options: ['Synchrone (instantanée)', 'Asynchrone (léger délai, RPO < 15 min)', 'Manuelle (déclenchée par l\'admin)', 'Désactivée par défaut'],
          correct: 1,
          explanation: "La réplication GRS inter-régions est asynchrone : il existe un léger délai (Recovery Point Objective < 15 min). Seule la réplication intra-région (LRS/ZRS) est synchrone. C'est un compromis nécessaire vu la distance géographique.",
        },
      ],
      careerConnection: "La conception de stratégies de résilience est centrale pour les Cloud Architects. Certifications : AZ-104, AZ-305. Rôles : Cloud Architect, Infrastructure Engineer.",
    },
    status: 'published',
  },
  {
    slug: 'az900-intermediate-2',
    title: 'Resource Groups + RBAC Configuration',
    description: 'Maîtrisez le contrôle d\'accès basé sur les rôles (RBAC) — qui peut faire quoi sur quelles ressources Azure.',
    provider: 'azure',
    difficulty: 'intermediate',
    estimatedTime: '75 min',
    moduleTitle: 'Azure Core Architecture',
    tasks: [
      'Créer 2 Resource Groups : "rg-prod" et "rg-dev"',
      'Assigner le rôle "Contributor" à un utilisateur sur rg-prod',
      'Assigner le rôle "Reader" à un autre utilisateur',
      'Tester les permissions via le portail avec les deux comptes',
      "Vérifier l'héritage RBAC depuis la souscription",
    ],
    steps: [
      {
        title: 'Créer deux Resource Groups (prod et dev)',
        instruction: `## Séparer les environnements avec des Resource Groups

1. Portail → **Resource groups** → **+ Create** → name: \`rg-prod\` → Region: West Europe → Create
2. Répétez pour \`rg-dev\`
3. Ces deux RG simulent un environnement de production et un environnement de développement aux permissions différentes`,
        hint: `💡 En entreprise, séparer prod/dev par Resource Group permet d'appliquer des permissions RBAC distinctes : les développeurs ont un accès complet en dev mais seulement en lecture en prod.`,
        validationNote: `✅ Les deux Resource Groups \`rg-prod\` et \`rg-dev\` apparaissent dans la liste.`,
        estimatedMinutes: 6,
      },
      {
        title: 'Assigner un rôle RBAC (Contributor / Reader)',
        instruction: `## Attribuer des permissions via Access Control (IAM)

1. Ouvrez \`rg-prod\` → menu gauche → **Access control (IAM)**
2. **+ Add** → **Add role assignment**
3. Onglet **Role** : sélectionnez **Reader** (lecture seule)
4. Onglet **Members** : **+ Select members** → choisissez votre propre compte (ou un utilisateur Entra ID)
5. **Review + assign**
6. Refaites sur \`rg-dev\` mais avec le rôle **Contributor** (création/modification autorisée)`,
        hint: `💡 Les 3 rôles fondamentaux à connaître pour l'examen : **Owner** (tout + gestion des accès), **Contributor** (tout sauf gestion des accès), **Reader** (lecture seule).`,
        validationNote: `✅ Dans Access control (IAM) → onglet "Role assignments" : Reader sur rg-prod, Contributor sur rg-dev sont visibles.`,
        estimatedMinutes: 10,
      },
      {
        title: "Comprendre l'héritage RBAC et nettoyer",
        instruction: `## Héritage des permissions par portée (scope)

RBAC s'hérite du haut vers le bas :
**Management Group → Subscription → Resource Group → Resource**

Une permission accordée à la souscription est héritée par TOUS les Resource Groups en-dessous.

1. Ouvrez votre **Subscription** → Access control (IAM) → "View my access"
2. Observez les rôles hérités au niveau souscription
3. **Nettoyage :** supprimez \`rg-prod\` et \`rg-dev\``,
        hint: `💡 Principe du moindre privilège : accordez le rôle le plus bas possible à la portée la plus précise possible. Évitez d'attribuer "Owner" au niveau souscription.`,
        validationNote: `✅ Vous comprenez la hiérarchie d'héritage. Les deux Resource Groups sont supprimés.`,
        estimatedMinutes: 7,
      },
    ],
    metadata: {
      level: 'intermediate',
      levelLabel: 'Intermédiaire',
      index: 1,
      totalInLevel: 11,
      providerLoginUrl: 'https://portal.azure.com/',
      logo: AZURE_LOGO,
      tags: ['azure', 'az900', 'rbac'],
      learningObjectives: [
        'Créer des Resource Groups pour séparer les environnements',
        'Assigner les rôles RBAC Owner, Contributor et Reader',
        "Expliquer l'héritage des permissions par portée (scope)",
        'Appliquer le principe du moindre privilège',
      ],
      prerequisites: ['Lab az900-intermediate-1'],
      scenario: `Chez **SecureCloud TN**, un audit de sécurité a révélé que tous les développeurs avaient un accès "Owner" en production. Votre mission : implémenter un RBAC propre où dev a accès complet en dev mais lecture seule en prod. Durée : ~25 min, coût : 0 USD.`,
      postLabQuiz: [
        {
          question: "Quel rôle RBAC permet de tout faire SAUF gérer les accès des autres utilisateurs ?",
          options: ['Reader', 'Contributor', 'Owner', 'User Access Administrator'],
          correct: 1,
          explanation: "Contributor peut créer, modifier et supprimer des ressources, mais ne peut PAS attribuer de rôles à d'autres. Owner peut tout faire y compris la gestion des accès. Reader est en lecture seule.",
        },
        {
          question: "Si vous accordez le rôle Reader au niveau de la souscription, quelles ressources sont concernées ?",
          options: [
            "Uniquement la souscription elle-même",
            "Toutes les ressources et Resource Groups de la souscription (héritage)",
            "Aucune ressource, seulement la facturation",
            "Seulement le premier Resource Group",
          ],
          correct: 1,
          explanation: "RBAC s'hérite de haut en bas : Subscription → Resource Group → Resource. Un rôle accordé à la souscription s'applique à TOUT ce qui est en-dessous. C'est pourquoi il faut être prudent avec les attributions au niveau souscription.",
        },
      ],
      careerConnection: "La gestion RBAC est une responsabilité quotidienne des Cloud Administrators et Security Engineers. Certifications : AZ-104, SC-300. Rôles : Cloud Security Engineer, IAM Administrator.",
    },
    status: 'published',
  },
  {
    slug: 'az900-intermediate-3',
    title: 'VM Scale Set avec Autoscaling',
    description: 'Déployez un Virtual Machine Scale Set qui ajoute et retire automatiquement des VMs selon la charge.',
    provider: 'azure',
    difficulty: 'intermediate',
    estimatedTime: '90 min',
    moduleTitle: 'Compute Deep Dive',
    tasks: [
      'Créer un Virtual Machine Scale Set (VMSS) avec 2 instances initiales',
      "Configurer l'autoscale : minimum 1, maximum 5 instances",
      'Définir une règle : CPU > 70% → +1 instance',
      'Simuler une charge CPU avec un script de stress test',
      'Observer le scaling automatique dans Azure Monitor',
    ],
    steps: [
      {
        title: 'Créer un Virtual Machine Scale Set',
        instruction: `## Déployer un VMSS

Un **Scale Set** gère un groupe de VMs identiques qui montent/descendent en nombre automatiquement.

1. Portail → cherchez **Virtual machine scale sets** → **+ Create**
2. Resource group : \`rg-az900-int3\`
3. Name : \`vmss-az900\`
4. Region : West Europe
5. Image : Ubuntu Server 22.04 LTS
6. Size : **Standard_B1s**
7. Scaling → Initial instance count : **2**
8. **Review + Create** → Create`,
        hint: `💡 Le VMSS gère le déploiement uniforme : toutes les instances ont la même image, taille et config. C'est idéal pour les workloads stateless derrière un load balancer.`,
        validationNote: `✅ Le Scale Set \`vmss-az900\` affiche "2/2 instances running" dans l'Overview.`,
        estimatedMinutes: 12,
      },
      {
        title: "Configurer l'autoscaling basé sur le CPU",
        instruction: `## Règles d'autoscale élastique

1. Sur le VMSS → menu gauche → **Scaling**
2. **Custom autoscale**
3. Règle scale-out : Metric = **Percentage CPU**, > **70%** sur 5 min → Increase by 1
4. Règle scale-in : Percentage CPU < **30%** → Decrease by 1
5. Instance limits : Min **1**, Max **5**, Default **2**
6. **Save**`,
        hint: `💡 Un "cooldown" (délai de refroidissement, 5 min par défaut) évite que le scale set ajoute/retire des instances en rafale lors de fluctuations rapides du CPU.`,
        validationNote: `✅ Dans Scaling : règles scale-out (>70%) et scale-in (<30%) visibles, limites Min=1 / Max=5.`,
        estimatedMinutes: 10,
      },
      {
        title: "Observer le scaling et nettoyer",
        instruction: `## Visualiser l'élasticité en action

1. Menu gauche → **Instances** : vous voyez les VMs individuelles du set
2. Menu gauche → **Monitoring** → **Metrics** → ajoutez "Percentage CPU"
3. En production, une charge réelle déclencherait l'ajout d'instances ; ici observez l'état stable
4. **Nettoyage :** Resource groups → \`rg-az900-int3\` → Delete (le VMSS facture chaque instance B1s)`,
        hint: `💡 Différence VMSS vs App Service autoscale : le VMSS scale des VMs complètes (IaaS, vous gérez l'OS), App Service scale des instances managées (PaaS). Même concept d'élasticité, couches différentes.`,
        validationNote: `✅ Vous avez vu les instances individuelles et le graphique CPU. Resource group supprimé.`,
        estimatedMinutes: 8,
      },
    ],
    metadata: {
      level: 'intermediate',
      levelLabel: 'Intermédiaire',
      index: 2,
      totalInLevel: 11,
      providerLoginUrl: 'https://portal.azure.com/',
      logo: AZURE_LOGO,
      tags: ['azure', 'az900', 'vmss'],
      learningObjectives: [
        'Déployer un Virtual Machine Scale Set avec plusieurs instances',
        "Configurer des règles d'autoscale basées sur le CPU",
        'Distinguer le scaling VMSS (IaaS) du scaling App Service (PaaS)',
        "Expliquer l'élasticité comme avantage du cloud",
      ],
      prerequisites: ['Lab az900-beginner-4 (autoscale App Service)'],
      scenario: `Le site e-commerce de **ShopFast TN** subit des pics de trafic pendant les soldes. Votre équipe veut un parc de serveurs qui grandit automatiquement à la demande. Vous déployez un VM Scale Set. Durée : ~30 min, coût : ~0.05 USD.`,
      costWarning: '⚠️ Un VMSS facture CHAQUE instance. 2 × B1s ≈ 0.024 USD/h. Supprimez le Resource Group après le lab.',
      postLabQuiz: [
        {
          question: "Quel est l'avantage principal d'un Virtual Machine Scale Set ?",
          options: [
            "Réduire le coût de stockage",
            "Ajouter/retirer automatiquement des VMs identiques selon la charge",
            "Chiffrer les disques",
            "Remplacer le besoin d'un load balancer",
          ],
          correct: 1,
          explanation: "Un VMSS fournit l'élasticité : il déploie un groupe de VMs identiques et ajuste leur nombre automatiquement selon des règles (CPU, mémoire, planning). Idéal pour les workloads stateless à charge variable.",
        },
        {
          question: "À quoi sert le 'cooldown' dans une règle d'autoscale ?",
          options: [
            "À éteindre les VMs la nuit",
            "À éviter des ajouts/retraits en rafale lors de fluctuations rapides du CPU",
            "À refroidir physiquement les serveurs",
            "À réduire le prix des instances",
          ],
          correct: 1,
          explanation: "Le cooldown est un délai après une action de scaling pendant lequel aucune nouvelle action n'est déclenchée. Il évite le 'flapping' (ajout/retrait répété) quand la métrique oscille autour du seuil.",
        },
      ],
      careerConnection: "Le scaling automatique est une compétence clé pour les SRE et Cloud Engineers gérant des applications à fort trafic. Certifications : AZ-104, AZ-305.",
    },
    status: 'published',
  },
  {
    slug: 'az900-intermediate-4',
    title: 'Deploy Azure Kubernetes Service (AKS)',
    description: 'Déployez un cluster Kubernetes managé et exposez une application conteneurisée. ⚠️ Niveau avancé pour AZ-900.',
    provider: 'azure',
    difficulty: 'intermediate',
    estimatedTime: '120 min',
    moduleTitle: 'Compute Deep Dive',
    tasks: [
      'Créer un cluster AKS avec 1 node pool (Standard_B2s)',
      'Configurer kubectl pour se connecter au cluster',
      'Déployer un conteneur nginx via manifest YAML',
      "Exposer l'application via un Service LoadBalancer",
      "Vérifier l'accès externe via l'IP publique du service",
    ],
    steps: [
      {
        title: 'Créer un cluster AKS',
        instruction: `## Déployer un cluster Kubernetes managé

⚠️ **Prérequis :** ce lab demande des notions de conteneurs et de ligne de commande. AZ-900 teste seulement la *connaissance* d'AKS — ce lab pratique va plus loin pour les curieux.

1. Portail → cherchez **Kubernetes services** → **+ Create** → **Create a Kubernetes cluster**
2. Resource group : \`rg-az900-int4\`
3. Cluster preset : **Dev/Test**
4. Cluster name : \`aks-az900\`
5. Node size : **Standard_B2s**, Node count : **1**
6. **Review + Create** → Create (le déploiement prend 5–10 min)`,
        hint: `💡 AKS est "managé" : Azure gère le control plane Kubernetes (gratuit). Vous payez seulement les VMs des nodes. C'est un service PaaS pour l'orchestration de conteneurs.`,
        validationNote: `✅ Le cluster \`aks-az900\` affiche Status = Succeeded et "1 node" dans l'Overview.`,
        estimatedMinutes: 15,
      },
      {
        title: 'Se connecter via Cloud Shell et kubectl',
        instruction: `## Piloter le cluster avec kubectl

1. Cliquez **Cloud Shell** (\`>_\`) en haut du portail → choisissez **Bash**
2. Connectez kubectl au cluster :
\`\`\`bash
az aks get-credentials --resource-group rg-az900-int4 --name aks-az900
\`\`\`
3. Vérifiez la connexion :
\`\`\`bash
kubectl get nodes
\`\`\`
Vous devez voir 1 node avec STATUS = Ready.`,
        hint: `💡 Cloud Shell a déjà az CLI et kubectl préinstallés et authentifiés — pas besoin de rien installer sur votre machine.`,
        validationNote: `✅ \`kubectl get nodes\` retourne 1 node en STATUS "Ready".`,
        estimatedMinutes: 8,
      },
      {
        title: 'Déployer nginx et exposer via LoadBalancer',
        instruction: `## Déployer et exposer une application

1. Dans Cloud Shell, déployez nginx :
\`\`\`bash
kubectl create deployment nginx --image=nginx
kubectl expose deployment nginx --port=80 --type=LoadBalancer
\`\`\`
2. Récupérez l'IP publique (attendez 1–2 min qu'elle s'attribue) :
\`\`\`bash
kubectl get service nginx
\`\`\`
3. Ouvrez l'EXTERNAL-IP dans un navigateur → page "Welcome to nginx!"
4. **Nettoyage CRITIQUE :** Resource groups → \`rg-az900-int4\` → Delete`,
        hint: `💡 Le type "LoadBalancer" demande à AKS de provisionner automatiquement un Azure Load Balancer avec IP publique. C'est l'intégration entre Kubernetes et l'infrastructure Azure.`,
        validationNote: `✅ La page nginx s'affiche via l'IP publique externe. Après nettoyage, le Resource group est supprimé (AKS + load balancer facturent).`,
        estimatedMinutes: 12,
      },
    ],
    metadata: {
      level: 'intermediate',
      levelLabel: 'Intermédiaire',
      index: 3,
      totalInLevel: 11,
      providerLoginUrl: 'https://portal.azure.com/',
      logo: AZURE_LOGO,
      tags: ['azure', 'az900', 'aks'],
      learningObjectives: [
        'Déployer un cluster Kubernetes managé avec AKS',
        'Connecter kubectl à un cluster via Cloud Shell',
        'Déployer et exposer une application conteneurisée',
        'Expliquer le modèle "managé" du control plane AKS',
      ],
      prerequisites: [
        'Notions de conteneurs (Docker) recommandées',
        'Aisance avec la ligne de commande',
        'Lab az900-intermediate-3 (compute) recommandé',
      ],
      scenario: `**ContainerCo TN** modernise ses applications vers les microservices conteneurisés. En tant qu'ingénieur cloud, vous testez un déploiement Kubernetes managé sur AKS avant la migration. Durée : ~40 min, coût : ~0.15 USD.`,
      costWarning: '⚠️ AKS facture les VMs des nodes (B2s ≈ 0.04 USD/h) + le Load Balancer. Supprimez IMPÉRATIVEMENT le Resource Group après le lab.',
      postLabQuiz: [
        {
          question: "Dans AKS, qui gère le 'control plane' Kubernetes ?",
          options: ['Le client (vous)', 'Microsoft Azure (gratuit)', 'Un prestataire tiers', 'Personne — il n\'y a pas de control plane'],
          correct: 1,
          explanation: "AKS est un service managé : Azure gère et héberge gratuitement le control plane Kubernetes (API server, scheduler, etc.). Vous payez uniquement les VMs des worker nodes. C'est ce qui rend AKS plus simple qu'un Kubernetes auto-hébergé.",
        },
        {
          question: "Que fait un Service de type 'LoadBalancer' dans Kubernetes sur AKS ?",
          options: [
            "Il chiffre le trafic réseau",
            "Il provisionne automatiquement un Azure Load Balancer avec une IP publique",
            "Il réplique les données entre régions",
            "Il sauvegarde le cluster",
          ],
          correct: 1,
          explanation: "Un Service de type LoadBalancer demande à AKS de créer automatiquement un Azure Load Balancer et de lui attribuer une IP publique externe, exposant l'application à Internet. C'est l'intégration native entre Kubernetes et l'infrastructure Azure.",
        },
      ],
      careerConnection: "Kubernetes est l'une des compétences les plus demandées du marché cloud. Certifications : CKA, AZ-104, AZ-305. Rôles : DevOps Engineer, Platform Engineer, SRE. Salaire moyen : 50 000–70 000 EUR/an.",
    },
    status: 'published',
  },
  {
    slug: 'az900-intermediate-5',
    title: 'Azure Functions — Serverless HTTP Trigger',
    description: 'Créez une fonction serverless déclenchée par HTTP et comprenez le modèle de paiement à l\'exécution.',
    provider: 'azure',
    difficulty: 'intermediate',
    estimatedTime: '60 min',
    moduleTitle: 'Compute Deep Dive',
    tasks: [
      'Créer une Function App (runtime Node.js ou Python)',
      'Créer une fonction HTTP Trigger via le portail',
      'Tester la fonction avec Postman ou curl',
      "Observer les métriques d'exécution dans Application Insights",
      'Comparer le coût vs une VM équivalente en uptime',
    ],
    steps: [
      {
        title: 'Créer une Function App',
        instruction: `## Déployer une application serverless

Le **serverless** facture uniquement les exécutions — zéro coût quand le code ne tourne pas.

1. Portail → cherchez **Function App** → **+ Create** → **Consumption** (serverless)
2. Resource group : \`rg-az900-int5\`
3. Function App name : \`func-az900-[votreprénom]\`
4. Runtime stack : **Node.js** (ou Python)
5. Region : West Europe
6. **Review + Create** → Create`,
        hint: `💡 Le plan "Consumption" est le vrai serverless : 1 million d'exécutions gratuites par mois, puis paiement à l'exécution. Le plan "Premium" garde des instances chaudes (moins de cold start) mais coûte plus.`,
        validationNote: `✅ La Function App \`func-az900-[prénom]\` affiche Status = Running dans l'Overview.`,
        estimatedMinutes: 10,
      },
      {
        title: 'Créer une fonction HTTP Trigger et la tester',
        instruction: `## Ajouter et tester un déclencheur HTTP

1. Dans la Function App → menu gauche → **Functions** → **+ Create**
2. Template : **HTTP trigger** → name: \`HttpHello\` → Create
3. Ouvrez la fonction → **Get Function Url** → copiez l'URL
4. Testez dans un navigateur ou via curl :
\`\`\`bash
curl "https://func-az900-prenom.azurewebsites.net/api/HttpHello?name=Subul"
\`\`\`
5. Réponse attendue : "Hello, Subul..."`,
        hint: `💡 Le "cold start" : la première requête après une période d'inactivité prend ~1-2s de plus car Azure doit démarrer une instance. Les requêtes suivantes sont rapides. C'est le compromis du serverless.`,
        validationNote: `✅ La requête HTTP retourne une réponse "Hello, Subul". La fonction apparaît avec un compteur d'exécutions.`,
        estimatedMinutes: 10,
      },
      {
        title: 'Comparer les coûts serverless vs VM et nettoyer',
        instruction: `## Le modèle économique serverless

| Modèle | Facturation | Idéal pour |
|--------|-------------|-----------|
| VM (IaaS) | 24/7 même inactive | Charge constante |
| App Service (PaaS) | Plan fixe mensuel | Trafic régulier |
| Functions (Serverless) | Par exécution | Charge sporadique/événementielle |

Une fonction appelée 1000×/jour coûte quelques centimes. Une VM équivalente coûterait ~8 USD/mois minimum, allumée en permanence.

**Nettoyage :** Resource groups → \`rg-az900-int5\` → Delete.`,
        hint: `💡 Pour l'examen : serverless = vous ne gérez aucun serveur ET vous ne payez que l'exécution. Idéal pour des tâches déclenchées par événements (upload de fichier, message de queue, requête HTTP).`,
        validationNote: `✅ Vous pouvez expliquer quand choisir serverless plutôt qu'une VM. Resource group supprimé.`,
        estimatedMinutes: 6,
      },
    ],
    metadata: {
      level: 'intermediate',
      levelLabel: 'Intermédiaire',
      index: 4,
      totalInLevel: 11,
      providerLoginUrl: 'https://portal.azure.com/',
      logo: AZURE_LOGO,
      tags: ['azure', 'az900', 'functions'],
      learningObjectives: [
        'Déployer une Function App sur le plan Consumption (serverless)',
        'Créer et tester une fonction déclenchée par HTTP',
        'Expliquer le concept de cold start',
        'Comparer le modèle de coût serverless vs VM vs App Service',
      ],
      prerequisites: ['Lab az900-beginner-3 (App Service)'],
      scenario: `**EventDriven TN** veut traiter des notifications ponctuelles sans payer un serveur allumé 24/7. Vous proposez une architecture serverless avec Azure Functions et démontrez les économies. Durée : ~25 min, coût : ~0 USD (sous le quota gratuit).`,
      costWarning: '⚠️ Le plan Consumption offre 1M d\'exécutions gratuites/mois. Ce lab reste gratuit, mais supprimez le Resource Group pour éviter les frais de stockage associés.',
      postLabQuiz: [
        {
          question: "Avec un plan Azure Functions Consumption, comment êtes-vous facturé ?",
          options: [
            "Un forfait mensuel fixe",
            "À l'exécution (nombre d'appels + durée + mémoire)",
            "Par heure, comme une VM",
            "Gratuit et illimité",
          ],
          correct: 1,
          explanation: "Le plan Consumption (serverless) facture à l'exécution : nombre d'invocations, durée et mémoire consommée. Zéro coût quand le code ne tourne pas, avec 1 million d'exécutions gratuites par mois. C'est l'inverse d'une VM facturée en continu.",
        },
        {
          question: "Qu'est-ce qu'un 'cold start' en serverless ?",
          options: [
            "Une panne du datacenter",
            "Le délai supplémentaire de la première requête après une période d'inactivité",
            "Le démarrage initial du compte Azure",
            "Un type d'attaque réseau",
          ],
          correct: 1,
          explanation: "Le cold start est la latence ajoutée quand Azure doit démarrer une nouvelle instance pour traiter une requête après une période d'inactivité. Les requêtes suivantes (instance 'chaude') sont rapides. C'est le compromis du serverless ; le plan Premium le réduit.",
        },
      ],
      careerConnection: "L'architecture serverless est très recherchée pour réduire les coûts d'infrastructure. Certifications : AZ-204, AZ-305. Rôles : Cloud Developer, Solutions Architect.",
    },
    status: 'published',
  },
  {
    slug: 'az900-intermediate-6',
    title: 'Create VNet + Subnets + NSG',
    description: 'Concevez un réseau virtuel isolé avec sous-réseaux et règles de pare-feu (NSG) — fondation de toute architecture Azure sécurisée.',
    provider: 'azure',
    difficulty: 'intermediate',
    estimatedTime: '80 min',
    moduleTitle: 'Networking Essentials',
    tasks: [
      "Créer un VNet avec l'espace d'adressage 10.0.0.0/16",
      'Créer 2 subnets : "web" (10.0.1.0/24) et "data" (10.0.2.0/24)',
      'Créer un NSG et l\'attacher au subnet "web"',
      'Configurer une règle NSG : autoriser HTTP (port 80) inbound',
      "Vérifier l'isolation réseau entre les subnets",
    ],
    steps: [
      {
        title: 'Créer un VNet avec deux subnets',
        instruction: `## Concevoir le réseau virtuel

Un **VNet** est votre réseau privé isolé dans Azure. Les **subnets** le segmentent par fonction.

1. Portail → cherchez **Virtual networks** → **+ Create**
2. Resource group : \`rg-az900-int6\`
3. Name : \`vnet-az900\` → Region : West Europe
4. Onglet **IP Addresses** :
   - IPv4 address space : \`10.0.0.0/16\` (65 536 adresses)
   - Supprimez le subnet par défaut, puis **+ Add subnet** :
     - \`web\` → \`10.0.1.0/24\` (256 adresses)
     - \`data\` → \`10.0.2.0/24\`
5. **Review + Create** → Create`,
        hint: `💡 La notation CIDR /16 = 65 536 adresses, /24 = 256 adresses. Plus le nombre après / est grand, plus le réseau est petit. Le subnet web et data ne se chevauchent pas.`,
        validationNote: `✅ Le VNet \`vnet-az900\` contient deux subnets : web (10.0.1.0/24) et data (10.0.2.0/24).`,
        estimatedMinutes: 10,
      },
      {
        title: 'Créer un NSG et autoriser HTTP',
        instruction: `## Pare-feu réseau avec Network Security Group

Un **NSG** filtre le trafic entrant/sortant par règles (port, protocole, IP source).

1. Portail → cherchez **Network security groups** → **+ Create**
2. Resource group : \`rg-az900-int6\` → Name : \`nsg-web\` → Create
3. Ouvrez \`nsg-web\` → **Inbound security rules** → **+ Add** :
   - Source : Any | Destination port : **80** | Protocol : TCP | Action : **Allow** | Priority : 100 | Name : \`Allow-HTTP\`
4. Attachez le NSG au subnet : \`nsg-web\` → **Subnets** → **+ Associate** → vnet-az900 / subnet **web**`,
        hint: `💡 Les règles NSG sont évaluées par priorité (plus le nombre est bas, plus c'est prioritaire). Azure ajoute des règles par défaut (priorité 65000+) qui autorisent le trafic intra-VNet et bloquent le reste.`,
        validationNote: `✅ Le NSG \`nsg-web\` a une règle Allow-HTTP (port 80) et est associé au subnet "web" (onglet Subnets).`,
        estimatedMinutes: 10,
      },
      {
        title: "Comprendre l'isolation réseau et nettoyer",
        instruction: `## Isolation et défense en profondeur

- Le subnet **web** accepte HTTP (port 80) depuis Internet via le NSG.
- Le subnet **data** n'a PAS de NSG autorisant Internet → isolé, accessible uniquement depuis le VNet interne.
- C'est le principe de **défense en profondeur** : la base de données n'est jamais exposée directement à Internet.

**Architecture type :** Internet → [subnet web] → [subnet data]. Le trafic externe n'atteint jamais directement data.

**Nettoyage :** Resource groups → \`rg-az900-int6\` → Delete.`,
        hint: `💡 NSG vs Azure Firewall : un NSG est gratuit et filtre au niveau réseau/transport (L3/L4). Azure Firewall est payant et inspecte au niveau applicatif (L7) avec plus de fonctionnalités.`,
        validationNote: `✅ Vous pouvez expliquer pourquoi le subnet data est plus protégé que web. Resource group supprimé.`,
        estimatedMinutes: 7,
      },
    ],
    metadata: {
      level: 'intermediate',
      levelLabel: 'Intermédiaire',
      index: 5,
      totalInLevel: 11,
      providerLoginUrl: 'https://portal.azure.com/',
      logo: AZURE_LOGO,
      tags: ['azure', 'az900', 'network'],
      learningObjectives: [
        'Créer un VNet et le segmenter en sous-réseaux',
        'Comprendre la notation CIDR pour le plan d\'adressage',
        'Configurer un Network Security Group avec des règles de pare-feu',
        'Appliquer le principe de défense en profondeur (isolation web/data)',
      ],
      prerequisites: ['Labs AZ-900 Débutant'],
      scenario: `**FinSecure TN**, une fintech, doit isoler sa base de données du réseau public pour la conformité. Votre mission : concevoir un VNet où la couche web est exposée mais la couche data reste interne. Durée : ~30 min, coût : ~0 USD.`,
      postLabQuiz: [
        {
          question: "Que fait un Network Security Group (NSG) ?",
          options: [
            "Il chiffre les données stockées",
            "Il filtre le trafic réseau entrant/sortant selon des règles (port, protocole, IP)",
            "Il réplique les VMs entre régions",
            "Il gère les identités des utilisateurs",
          ],
          correct: 1,
          explanation: "Un NSG est un pare-feu réseau de base (gratuit) qui filtre le trafic au niveau L3/L4 selon des règles : port, protocole, IP source/destination, action Allow/Deny. On l'attache à un subnet ou à une interface réseau de VM.",
        },
        {
          question: "Dans la notation CIDR, combien d'adresses contient un subnet /24 ?",
          options: ['16', '256', '1024', '65 536'],
          correct: 1,
          explanation: "Un /24 réserve les 8 derniers bits pour les hôtes, soit 2^8 = 256 adresses (dont quelques-unes réservées par Azure). Un /16 contient 65 536 adresses. Plus le nombre après / est grand, plus le réseau est petit.",
        },
      ],
      careerConnection: "La conception réseau cloud est fondamentale pour les Cloud Network Engineers. Certifications : AZ-700, AZ-104. Rôles : Network Engineer, Cloud Security Architect.",
    },
    status: 'published',
  },
  {
    slug: 'az900-intermediate-7',
    title: 'Configure Azure Load Balancer',
    description: 'Distribuez le trafic entre plusieurs VMs avec un load balancer et garantissez la haute disponibilité.',
    provider: 'azure',
    difficulty: 'intermediate',
    estimatedTime: '85 min',
    moduleTitle: 'Networking Essentials',
    tasks: [
      'Créer 2 VM identiques dans un Availability Set',
      'Créer un Load Balancer public avec une IP publique statique',
      'Ajouter les 2 VM au Backend Pool du Load Balancer',
      'Configurer une Health Probe (TCP port 80)',
      'Tester la distribution du trafic en désactivant une VM',
    ],
    steps: [
      {
        title: 'Comprendre les composants du Load Balancer',
        instruction: `## Architecture de la haute disponibilité

Un **Load Balancer** distribue le trafic entrant entre plusieurs VMs (backend pool). Si une VM tombe, le trafic est redirigé vers les autres.

**Composants clés (à connaître pour l'examen) :**
- **Frontend IP** : l'adresse IP publique qui reçoit le trafic
- **Backend pool** : le groupe de VMs qui traitent les requêtes
- **Health probe** : vérifie régulièrement que chaque VM est saine
- **Load balancing rule** : associe frontend → backend sur un port

Schéma : Internet → [Frontend IP] → [Rule port 80] → [Backend pool: VM1, VM2] (filtré par Health probe)`,
        hint: `💡 Azure Load Balancer (L4, ports/IP) vs Application Gateway (L7, inspection HTTP/URL). Pour l'examen AZ-900, retenez que le Load Balancer distribue selon le réseau, l'App Gateway selon le contenu web.`,
        validationNote: `✅ Vous pouvez nommer les 4 composants : frontend IP, backend pool, health probe, load balancing rule.`,
        estimatedMinutes: 8,
      },
      {
        title: 'Créer un Load Balancer et le backend pool',
        instruction: `## Déployer le load balancer

1. Portail → cherchez **Load balancers** → **+ Create**
2. Resource group : \`rg-az900-int7\` → Name : \`lb-az900\`
3. Type : **Public** | SKU : **Standard**
4. Frontend IP : créez une nouvelle IP publique \`lb-public-ip\`
5. Créez le LB, puis ouvrez-le :
   - **Backend pools** → + Add → \`pool-web\` (vous y ajouteriez vos VMs)
   - **Health probes** → + Add → TCP port 80
   - **Load balancing rules** → + Add → frontend port 80 → backend port 80 → pool-web`,
        hint: `💡 Le SKU Standard est recommandé en production (zone-redundant, plus de fonctionnalités). Le SKU Basic est gratuit mais déprécié. Pour ce lab, Standard montre la vraie configuration.`,
        validationNote: `✅ Le Load Balancer \`lb-az900\` a une IP publique frontend, un backend pool, une health probe TCP/80 et une règle de répartition port 80.`,
        estimatedMinutes: 12,
      },
      {
        title: 'Comprendre le rôle de la health probe et nettoyer',
        instruction: `## Health probes et failover

- La **health probe** envoie une requête (TCP port 80) à chaque VM toutes les quelques secondes.
- Si une VM ne répond pas → elle est retirée du pool → le trafic va vers les VMs saines.
- Quand elle redevient saine → elle est réintégrée automatiquement.

C'est le mécanisme de **haute disponibilité** : aucune interruption de service même si une VM tombe.

**Availability Set** : placer les VMs dans un Availability Set garantit qu'elles sont sur des racks/alimentations différents → pas de panne simultanée.

**Nettoyage :** Resource groups → \`rg-az900-int7\` → Delete.`,
        hint: `💡 Pour l'examen : "high availability" = pas de point de défaillance unique. Load balancer + plusieurs VMs + availability set = architecture haute disponibilité classique.`,
        validationNote: `✅ Vous pouvez expliquer comment la health probe assure la haute disponibilité. Resource group supprimé.`,
        estimatedMinutes: 7,
      },
    ],
    metadata: {
      level: 'intermediate',
      levelLabel: 'Intermédiaire',
      index: 6,
      totalInLevel: 11,
      providerLoginUrl: 'https://portal.azure.com/',
      logo: AZURE_LOGO,
      tags: ['azure', 'az900', 'lb'],
      learningObjectives: [
        'Identifier les composants d\'un Azure Load Balancer',
        'Déployer un load balancer public avec backend pool et health probe',
        'Expliquer le rôle de la health probe dans le failover',
        'Concevoir une architecture haute disponibilité',
      ],
      prerequisites: ['Lab az900-intermediate-6 (réseau)'],
      scenario: `Le portail client de **WebScale TN** doit rester disponible 24/7 même en cas de panne d'un serveur. Vous concevez une architecture load-balancée à deux VMs. Durée : ~30 min, coût : ~0.05 USD.`,
      costWarning: '⚠️ Le Load Balancer Standard et l\'IP publique facturent des frais horaires. Supprimez le Resource Group après le lab.',
      postLabQuiz: [
        {
          question: "Quel composant du Load Balancer détecte qu'une VM est tombée en panne ?",
          options: ['Le backend pool', 'La health probe', 'La frontend IP', 'La load balancing rule'],
          correct: 1,
          explanation: "La health probe sonde régulièrement chaque VM du backend pool. Si une VM ne répond plus, elle est retirée du pool et le trafic est redirigé vers les VMs saines. C'est le mécanisme central de la haute disponibilité.",
        },
        {
          question: "Quelle est la différence entre Azure Load Balancer et Application Gateway ?",
          options: [
            "Aucune, ce sont des synonymes",
            "Load Balancer distribue au niveau réseau (L4) ; Application Gateway au niveau applicatif HTTP (L7)",
            "Application Gateway est gratuit, Load Balancer payant",
            "Load Balancer fonctionne uniquement en interne",
          ],
          correct: 1,
          explanation: "Azure Load Balancer opère au niveau L4 (TCP/UDP, IP, ports). Application Gateway opère au niveau L7 (HTTP/HTTPS) et peut router selon l'URL, le host header, etc., avec un WAF intégré. On choisit selon le besoin de routage applicatif.",
        },
      ],
      careerConnection: "La conception d'architectures haute disponibilité est centrale pour les Solutions Architects. Certifications : AZ-104, AZ-305. Rôles : Cloud Architect, Infrastructure Engineer.",
    },
    status: 'published',
  },
  {
    slug: 'az900-intermediate-8',
    title: "Blob Storage — Gestion des tiers d'accès",
    description: 'Optimisez les coûts de stockage avec les tiers Hot/Cool/Archive et les politiques de cycle de vie automatiques.',
    provider: 'azure',
    difficulty: 'intermediate',
    estimatedTime: '70 min',
    moduleTitle: 'Storage & Databases',
    tasks: [
      'Créer un Storage Account (LRS, région West Europe)',
      'Créer un container Blob et uploader plusieurs fichiers',
      'Changer un blob de "Hot" à "Cool" tier manuellement',
      'Créer une Lifecycle Management Policy (Hot → Cool après 30j)',
      'Observer les économies de coût entre les tiers',
    ],
    steps: [
      {
        title: 'Créer un Storage Account et uploader des blobs',
        instruction: `## Stockage d'objets Blob

1. Portail → **Storage accounts** → **+ Create**
2. Resource group : \`rg-az900-int8\` → Name : \`stgblob[prénom]\` → Redundancy : LRS → Create
3. Ouvrez-le → **Containers** → **+ Container** → \`documents\` → Create
4. Ouvrez le container → **Upload** → uploadez 2-3 fichiers (images, PDF)
5. Cliquez sur un blob → notez son **Access tier** = **Hot** par défaut`,
        hint: `💡 Le tier "Hot" est optimisé pour les données fréquemment consultées (coût stockage élevé, coût accès bas). Parfait pour les fichiers actifs.`,
        validationNote: `✅ Le container \`documents\` contient vos fichiers, chacun avec un Access tier "Hot".`,
        estimatedMinutes: 8,
      },
      {
        title: 'Changer le tier et créer une lifecycle policy',
        instruction: `## Optimiser les coûts avec les tiers

**Les 3 tiers de stockage (à connaître pour l'examen) :**
- **Hot** : accès fréquent. Stockage cher, accès pas cher.
- **Cool** : accès rare (≥ 30 jours). Stockage moins cher, accès plus cher.
- **Archive** : accès très rare (≥ 180 jours). Stockage très bas, restauration en heures.

**Changement manuel :**
1. Cliquez un blob → **Change tier** → **Cool** → Save

**Automatiser avec une Lifecycle Policy :**
2. Storage account → menu gauche → **Lifecycle management** → **+ Add rule**
3. Règle : si blob non modifié depuis **30 jours** → déplacer vers **Cool** ; depuis 90 jours → **Archive**`,
        hint: `💡 Une lifecycle policy automatise les économies : les vieux fichiers descendent automatiquement vers les tiers moins chers sans intervention. Une entreprise économise ainsi des milliers d'euros sur l'archivage.`,
        validationNote: `✅ Un blob est passé en tier "Cool". Une lifecycle rule déplace automatiquement les blobs anciens vers Cool/Archive.`,
        estimatedMinutes: 12,
      },
      {
        title: 'Comparer les coûts et nettoyer',
        instruction: `## Le compromis coût/accès

| Tier | Coût stockage | Coût accès | Cas d'usage |
|------|---------------|------------|-------------|
| Hot | Élevé | Bas | Fichiers actifs |
| Cool | Moyen | Moyen | Sauvegardes mensuelles |
| Archive | Très bas | Élevé + délai | Conformité légale (7 ans) |

**Règle :** plus la donnée est consultée rarement, plus on descend vers Archive pour économiser.

**Nettoyage :** Resource groups → \`rg-az900-int8\` → Delete.`,
        hint: `💡 L'Archive a un délai de "réhydratation" de plusieurs heures pour relire les données. Ne l'utilisez jamais pour des données potentiellement urgentes.`,
        validationNote: `✅ Vous savez choisir le bon tier selon la fréquence d'accès. Resource group supprimé.`,
        estimatedMinutes: 6,
      },
    ],
    metadata: {
      level: 'intermediate',
      levelLabel: 'Intermédiaire',
      index: 7,
      totalInLevel: 11,
      providerLoginUrl: 'https://portal.azure.com/',
      logo: AZURE_LOGO,
      tags: ['azure', 'az900', 'storage'],
      learningObjectives: [
        'Créer un Storage Account et gérer des blobs',
        'Distinguer les tiers Hot, Cool et Archive',
        'Configurer une politique de cycle de vie automatique',
        'Optimiser les coûts de stockage selon la fréquence d\'accès',
      ],
      prerequisites: ['Labs AZ-900 Débutant'],
      scenario: `**ArchiveCorp TN** stocke 10 ans de documents légaux mais ne consulte que les récents. Votre mission : configurer un stockage qui descend automatiquement les vieux fichiers vers des tiers moins chers. Durée : ~25 min, coût : ~0 USD.`,
      postLabQuiz: [
        {
          question: "Quel tier de stockage Blob est le moins cher pour le STOCKAGE de données rarement consultées ?",
          options: ['Hot', 'Cool', 'Archive', 'Premium'],
          correct: 2,
          explanation: "Le tier Archive offre le coût de stockage le plus bas, idéal pour des données consultées très rarement (conformité, archives légales). En contrepartie, l'accès coûte plus cher et nécessite une réhydratation de plusieurs heures.",
        },
        {
          question: "À quoi sert une Lifecycle Management Policy ?",
          options: [
            "À supprimer le compte de stockage",
            "À déplacer automatiquement les blobs vers des tiers moins chers selon leur âge",
            "À chiffrer les blobs",
            "À répliquer les données entre régions",
          ],
          correct: 1,
          explanation: "Une lifecycle policy automatise l'optimisation des coûts : elle déplace les blobs vers Cool puis Archive (ou les supprime) selon des règles d'âge, sans intervention manuelle. Cela réduit fortement la facture de stockage sur le long terme.",
        },
      ],
      careerConnection: "L'optimisation des coûts de stockage (FinOps) est très valorisée. Certifications : AZ-104, AZ-305. Rôles : Cloud FinOps Engineer, Storage Administrator.",
    },
    status: 'published',
  },
  {
    slug: 'az900-intermediate-9',
    title: 'Deploy Azure SQL + Connexion',
    description: 'Déployez une base de données relationnelle managée (PaaS) et connectez-vous-y — sans gérer de serveur SQL.',
    provider: 'azure',
    difficulty: 'intermediate',
    estimatedTime: '75 min',
    moduleTitle: 'Storage & Databases',
    tasks: [
      'Créer un serveur Azure SQL et une base de données (S0)',
      'Configurer le firewall pour autoriser votre IP cliente',
      'Se connecter depuis Azure Data Studio',
      'Créer une table et insérer des données de test',
      'Explorer les options de backup automatique et geo-réplication',
    ],
    steps: [
      {
        title: 'Créer un serveur Azure SQL et une base de données',
        instruction: `## Déployer une base de données managée (PaaS)

Azure SQL Database est un service PaaS : Microsoft gère le moteur SQL, les patches, les sauvegardes. Vous gérez seulement vos données et requêtes.

1. Portail → cherchez **SQL databases** → **+ Create**
2. Resource group : \`rg-az900-int9\`
3. Database name : \`db-az900\`
4. Server : **Create new** → name: \`sqlsrv-az900-[prénom]\` → Authentication : SQL → admin: \`sqladmin\` / password: \`Az900Sql@2024!\`
5. Compute + storage : **Basic** ou **S0** (le moins cher)
6. **Review + Create** → Create`,
        hint: `💡 Le "serveur" Azure SQL est un conteneur logique (point de connexion), pas une VM. Vous ne gérez jamais l'OS ni le moteur SQL — c'est du PaaS pur.`,
        validationNote: `✅ La base \`db-az900\` affiche Status = Online et est rattachée au serveur \`sqlsrv-az900-[prénom]\`.`,
        estimatedMinutes: 12,
      },
      {
        title: 'Configurer le firewall et se connecter via Query Editor',
        instruction: `## Autoriser votre IP et exécuter du SQL

Par défaut, Azure SQL bloque toutes les connexions externes.

1. Ouvrez la base → menu gauche → **Query editor (preview)**
2. Si bloqué : un bandeau propose "Allowlist IP [votre IP]" → cliquez-le, ou allez dans le serveur → **Networking** → **+ Add your client IPv4 address** → Save
3. Connectez-vous : login \`sqladmin\` / password \`Az900Sql@2024!\`
4. Créez une table et insérez des données :
\`\`\`sql
CREATE TABLE Etudiants (id INT, nom NVARCHAR(50));
INSERT INTO Etudiants VALUES (1, 'Ala'), (2, 'Amira');
SELECT * FROM Etudiants;
\`\`\``,
        hint: `💡 Le firewall Azure SQL est une couche de sécurité essentielle : seules les IP autorisées peuvent se connecter. En production, on restreint aux IP des serveurs d'application uniquement.`,
        validationNote: `✅ La requête SELECT retourne les deux étudiants. La table Etudiants est créée dans la base.`,
        estimatedMinutes: 12,
      },
      {
        title: 'Explorer backups, geo-réplication et nettoyer',
        instruction: `## Continuité de service managée

Azure SQL fournit automatiquement (sans config) :
- **Sauvegardes automatiques** : full hebdo, différentielle toutes les 12-24h, logs toutes les 5-10 min
- **Point-in-time restore** : restaurer à n'importe quel instant des 7 derniers jours
- **Geo-réplication active** : créer une réplique en lecture dans une autre région

1. Base → menu gauche → **Backups** → observez les points de restauration
2. Serveur → **Failover groups** : option de geo-réplication pour le disaster recovery
3. **Nettoyage :** Resource groups → \`rg-az900-int9\` → Delete`,
        hint: `💡 Pour l'examen : en PaaS, les sauvegardes sont automatiques et gérées par Azure. C'est un avantage majeur vs une base auto-hébergée où vous devez tout configurer manuellement.`,
        validationNote: `✅ Vous avez vu les points de restauration automatiques et l'option de geo-réplication. Resource group supprimé.`,
        estimatedMinutes: 6,
      },
    ],
    metadata: {
      level: 'intermediate',
      levelLabel: 'Intermédiaire',
      index: 8,
      totalInLevel: 11,
      providerLoginUrl: 'https://portal.azure.com/',
      logo: AZURE_LOGO,
      tags: ['azure', 'az900', 'sql'],
      learningObjectives: [
        'Déployer une base Azure SQL Database (PaaS)',
        'Configurer le firewall SQL pour autoriser une connexion',
        'Exécuter des requêtes SQL via le Query Editor',
        'Identifier les sauvegardes automatiques et la geo-réplication',
      ],
      prerequisites: ['Labs AZ-900 Débutant'],
      scenario: `**DataApp TN** lance une application qui a besoin d'une base relationnelle fiable mais n'a pas de DBA pour gérer un serveur SQL. Vous déployez Azure SQL Database managé. Durée : ~30 min, coût : ~0.02 USD (tier Basic).`,
      costWarning: '⚠️ Azure SQL Basic/S0 facture à l\'heure. Supprimez le Resource Group dès la fin du lab.',
      postLabQuiz: [
        {
          question: "En PaaS avec Azure SQL Database, qui gère les sauvegardes de la base ?",
          options: ['Le client manuellement', 'Microsoft Azure automatiquement', "Un DBA externe", 'Personne — il faut un script'],
          correct: 1,
          explanation: "Azure SQL Database (PaaS) effectue automatiquement les sauvegardes (complètes, différentielles, logs) sans configuration. Cela permet un point-in-time restore sur les 7 derniers jours par défaut. C'est l'avantage du modèle managé.",
        },
        {
          question: "Pourquoi configurer le firewall Azure SQL avant de se connecter ?",
          options: [
            "Pour accélérer les requêtes",
            "Car Azure SQL bloque toutes les connexions externes par défaut (sécurité)",
            "Pour activer les sauvegardes",
            "Ce n'est pas nécessaire",
          ],
          correct: 1,
          explanation: "Par sécurité, Azure SQL refuse toute connexion externe par défaut. Il faut explicitement ajouter les adresses IP autorisées dans les règles de firewall. En production, on n'autorise que les IP des serveurs d'application.",
        },
      ],
      careerConnection: "La gestion de bases managées est clé pour les Database Administrators cloud et Data Engineers. Certifications : DP-300, AZ-104. Rôles : Cloud DBA, Data Engineer.",
    },
    status: 'published',
  },
  {
    slug: 'az900-intermediate-10',
    title: 'Configure Entra ID + RBAC',
    description: 'Gérez les identités, activez le MFA et appliquez l\'accès conditionnel — le cœur de la sécurité Azure.',
    provider: 'azure',
    difficulty: 'intermediate',
    estimatedTime: '90 min',
    moduleTitle: 'Identity & Governance',
    tasks: [
      'Créer un nouvel utilisateur dans Microsoft Entra ID',
      'Activer et configurer le MFA pour cet utilisateur',
      'Assigner un rôle RBAC "Contributor" sur un Resource Group',
      'Créer une Conditional Access Policy (MFA si hors réseau)',
      "Tester l'accès avec et sans MFA selon la politique",
    ],
    steps: [
      {
        title: 'Créer un utilisateur dans Microsoft Entra ID',
        instruction: `## Gérer les identités avec Entra ID

**Microsoft Entra ID** (ex-Azure AD) est le service d'identité cloud d'Azure — il gère les utilisateurs, groupes et authentification.

1. Portail → cherchez **Microsoft Entra ID**
2. Menu gauche → **Users** → **+ New user** → **Create new user**
3. User principal name : \`testuser\` (le domaine se complète automatiquement)
4. Display name : \`Test User\`
5. Notez le mot de passe auto-généré
6. **Review + create** → Create`,
        hint: `💡 Entra ID est le fournisseur d'identité pour TOUT l'écosystème Microsoft : Azure, Microsoft 365, et des milliers d'apps SaaS via SSO. C'est différent du RBAC qui gère les permissions SUR les ressources.`,
        validationNote: `✅ L'utilisateur \`testuser\` apparaît dans la liste Users d'Entra ID.`,
        estimatedMinutes: 8,
      },
      {
        title: 'Activer le MFA et assigner un rôle RBAC',
        instruction: `## Renforcer la sécurité avec MFA + permissions

**Multi-Factor Authentication (MFA)** = mot de passe + second facteur (app mobile, SMS). Réduit 99,9% des compromissions de compte.

1. Entra ID → **Security** → **Authentication methods** ou **Per-user MFA** (selon licence)
2. Activez le MFA pour \`testuser\`

**Assigner des permissions RBAC :**
3. Allez sur un Resource Group → **Access control (IAM)** → **+ Add role assignment**
4. Role : **Contributor** → Member : \`testuser\` → Review + assign`,
        hint: `💡 Distinction clé pour l'examen : Entra ID = AUTHENTIFICATION (qui es-tu ?). RBAC = AUTORISATION (qu'as-tu le droit de faire ?). Les deux sont complémentaires.`,
        validationNote: `✅ Le MFA est activé pour testuser, et il a le rôle Contributor sur un Resource Group.`,
        estimatedMinutes: 10,
      },
      {
        title: "Comprendre l'accès conditionnel et nettoyer",
        instruction: `## Conditional Access — sécurité contextuelle

L'**accès conditionnel** applique des règles selon le contexte :
- *Si* connexion depuis un pays inhabituel → *exiger* MFA
- *Si* appareil non conforme → *bloquer*
- *Si* application sensible → *exiger* MFA même sur réseau interne

1. Entra ID → **Security** → **Conditional Access** (nécessite Entra ID P1)
2. Observez l'interface de création de politique : Users → Cloud apps → Conditions → Grant controls
3. *(P1 requis pour créer — explorez l'interface)*

**Nettoyage :** supprimez \`testuser\` (Users → testuser → Delete) et toute assignation RBAC de test.`,
        hint: `💡 L'accès conditionnel fait partie d'Entra ID P1/P2 (licences payantes). Le concept "Zero Trust" repose dessus : ne jamais faire confiance, toujours vérifier selon le contexte.`,
        validationNote: `✅ Vous comprenez le principe de l'accès conditionnel. testuser et ses assignations sont supprimés.`,
        estimatedMinutes: 8,
      },
    ],
    metadata: {
      level: 'intermediate',
      levelLabel: 'Intermédiaire',
      index: 9,
      totalInLevel: 11,
      providerLoginUrl: 'https://portal.azure.com/',
      logo: AZURE_LOGO,
      tags: ['azure', 'az900', 'entra'],
      learningObjectives: [
        'Créer et gérer des utilisateurs dans Microsoft Entra ID',
        'Activer la Multi-Factor Authentication',
        'Distinguer authentification (Entra ID) et autorisation (RBAC)',
        "Expliquer le principe de l'accès conditionnel et Zero Trust",
      ],
      prerequisites: ['Lab az900-intermediate-2 (RBAC)'],
      scenario: `Après une tentative de phishing chez **TrustID TN**, la direction impose le MFA pour tous et un accès conditionnel renforcé. Vous configurez les identités et la sécurité dans Entra ID. Durée : ~30 min, coût : ~0 USD.`,
      postLabQuiz: [
        {
          question: "Quelle est la différence entre Entra ID et RBAC ?",
          options: [
            "Ce sont deux noms pour le même service",
            "Entra ID gère l'authentification (qui es-tu) ; RBAC gère l'autorisation (que peux-tu faire)",
            "Entra ID est gratuit, RBAC payant",
            "RBAC remplace Entra ID",
          ],
          correct: 1,
          explanation: "Entra ID (ex-Azure AD) est le fournisseur d'identité : il authentifie les utilisateurs (login, MFA, SSO). RBAC attribue ensuite des permissions sur les ressources Azure. Authentification puis autorisation — deux étapes complémentaires.",
        },
        {
          question: "Pourquoi activer la Multi-Factor Authentication (MFA) ?",
          options: [
            "Pour accélérer la connexion",
            "Pour réduire drastiquement les compromissions de compte (ajoute un second facteur)",
            "Pour économiser des coûts",
            "C'est obligatoire pour créer des VMs",
          ],
          correct: 1,
          explanation: "Le MFA exige un second facteur (app mobile, SMS, clé) en plus du mot de passe. Microsoft estime qu'il bloque 99,9% des attaques de compromission de compte, car voler un mot de passe ne suffit plus.",
        },
      ],
      careerConnection: "La gestion des identités (IAM) est l'une des spécialités sécurité les plus demandées. Certifications : SC-300, SC-900, AZ-104. Rôles : Identity Engineer, IAM Administrator, Security Engineer.",
    },
    status: 'published',
  },
  {
    slug: 'az900-intermediate-11',
    title: 'Azure Policy + Budget Alert',
    description: 'Imposez des règles de gouvernance avec Azure Policy et maîtrisez les coûts avec des budgets et alertes.',
    provider: 'azure',
    difficulty: 'intermediate',
    estimatedTime: '60 min',
    moduleTitle: 'Identity & Governance',
    tasks: [
      'Créer une Azure Policy "Allowed locations" (West Europe uniquement)',
      'Assigner la Policy à votre souscription ou Resource Group',
      'Tenter de créer une ressource dans une région non autorisée',
      'Créer un Budget mensuel avec seuil à 50€',
      'Configurer des alertes à 80% et 100% du budget',
    ],
    steps: [
      {
        title: 'Créer et assigner une Azure Policy',
        instruction: `## Imposer des règles de gouvernance

**Azure Policy** applique automatiquement des règles à vos ressources (régions autorisées, tags obligatoires, SKU permis).

1. Portail → cherchez **Policy** → menu gauche → **Assignments** → **Assign policy**
2. Scope : votre Resource Group de test
3. Policy definition : cherchez **"Allowed locations"** → sélectionnez-la
4. Parameters → Allowed locations : **West Europe** uniquement
5. **Review + create** → Create`,
        hint: `💡 Azure Policy ≠ RBAC. RBAC contrôle QUI peut agir. Policy contrôle CE QUI peut être créé (peu importe qui). Ex: même un Owner ne peut pas créer une ressource dans une région interdite par Policy.`,
        validationNote: `✅ La policy "Allowed locations" est assignée à votre scope, limitée à West Europe.`,
        estimatedMinutes: 10,
      },
      {
        title: 'Tester la policy (création interdite)',
        instruction: `## Vérifier que la gouvernance s'applique

1. Essayez de créer une ressource (ex: un Storage Account) dans une région NON autorisée, comme **East US**
2. Au moment du **Review + Create**, Azure **bloque** la création avec une erreur de policy : "Resource 'xxx' was disallowed by policy"
3. Recréez la même ressource en **West Europe** → cette fois ça fonctionne`,
        hint: `💡 Les effets de policy courants : "Deny" (bloque la création), "Audit" (autorise mais journalise la non-conformité), "Append/Modify" (ajoute automatiquement des propriétés comme des tags).`,
        validationNote: `✅ La création en East US est bloquée par la policy ; la création en West Europe réussit.`,
        estimatedMinutes: 8,
      },
      {
        title: 'Créer un budget avec alertes et nettoyer',
        instruction: `## Maîtriser les coûts avec un budget

1. Portail → **Cost Management + Billing** → **Budgets** → **+ Add**
2. Scope : votre souscription
3. Budget amount : **50** (EUR ou USD)
4. Reset period : Monthly
5. Alert conditions :
   - À **80%** du budget → email
   - À **100%** du budget → email
6. Entrez votre email → Create

**Nettoyage :** supprimez l'assignation de policy et les ressources de test.`,
        hint: `💡 Un budget Azure n'EMPÊCHE pas la dépense — il ALERTE seulement. Pour bloquer réellement, il faut combiner avec des policies ou des automatisations (ex: désactiver des ressources via Logic App au seuil 100%).`,
        validationNote: `✅ Le budget mensuel de 50 avec alertes à 80% et 100% est créé. Policy et ressources de test supprimées.`,
        estimatedMinutes: 7,
      },
    ],
    metadata: {
      level: 'intermediate',
      levelLabel: 'Intermédiaire',
      index: 10,
      totalInLevel: 11,
      providerLoginUrl: 'https://portal.azure.com/',
      logo: AZURE_LOGO,
      tags: ['azure', 'az900', 'policy'],
      learningObjectives: [
        'Créer et assigner une Azure Policy de gouvernance',
        'Distinguer Azure Policy (quoi) de RBAC (qui)',
        'Configurer un budget mensuel avec alertes',
        'Comprendre que les budgets alertent mais ne bloquent pas',
      ],
      prerequisites: ['Lab az900-intermediate-2 (RBAC)'],
      scenario: `La direction financière de **GovCloud TN** veut empêcher le déploiement de ressources hors d'Europe (RGPD) et être alertée avant tout dépassement budgétaire. Vous mettez en place Policy + Budget. Durée : ~25 min, coût : ~0 USD.`,
      postLabQuiz: [
        {
          question: "Quelle est la différence entre Azure Policy et RBAC ?",
          options: [
            "Aucune différence",
            "RBAC contrôle QUI peut agir ; Azure Policy contrôle CE QUI peut être créé/configuré",
            "Azure Policy gère les utilisateurs",
            "RBAC est plus récent et remplace Policy",
          ],
          correct: 1,
          explanation: "RBAC gère les permissions des utilisateurs (qui peut faire quoi). Azure Policy impose des règles sur les ressources elles-mêmes (régions autorisées, tags requis, SKU permis), indépendamment de l'utilisateur. Même un Owner est soumis aux policies.",
        },
        {
          question: "Que se passe-t-il quand un budget Azure atteint 100% ?",
          options: [
            "Azure bloque automatiquement toute nouvelle dépense",
            "Azure envoie une alerte mais ne bloque pas les dépenses",
            "Le compte est supprimé",
            "Les ressources sont automatiquement éteintes",
          ],
          correct: 1,
          explanation: "Un budget Azure est un outil d'ALERTE, pas de blocage. Il notifie quand un seuil est atteint mais n'empêche pas la dépense. Pour bloquer réellement, il faut combiner avec des automatisations (Logic Apps, policies) déclenchées par l'alerte.",
        },
      ],
      careerConnection: "La gouvernance et le FinOps sont des compétences stratégiques pour les Cloud Governance Engineers. Certifications : AZ-104, AZ-305. Rôles : Cloud Governance Lead, FinOps Engineer.",
    },
    status: 'published',
  },
];

const AWS_EC2_BEGINNER_RAW: SeedLabRowUnchained[] = [
  {
    slug: 'aws-ec2-beginner-aws-account-setup',
    title: 'Create AWS Account',
    description: 'Créez votre compte AWS Free Tier et sécurisez-le avec un utilisateur IAM et le MFA — la base de toute pratique AWS.',
    provider: 'aws',
    difficulty: 'beginner',
    estimatedTime: '45 minutes',
    moduleTitle: 'AWS Account Setup',
    tasks: [
      'Create AWS Free Tier Account',
      'Configure IAM User and Groups',
      'Set up Multi-Factor Authentication (MFA)',
      'Explore AWS Management Console',
    ],
    steps: [
      {
        title: 'Créer un compte AWS Free Tier',
        instruction: `## Ouvrir votre compte AWS gratuit

Le Free Tier AWS offre 12 mois de services gratuits + des offres permanentes (ex: 750h/mois d'instance t2.micro).

1. Allez sur **https://aws.amazon.com/free**
2. Cliquez **Create a Free Account**
3. Entrez email, mot de passe et nom de compte
4. Type de compte : **Personal**
5. Renseignez l'adresse et une carte bancaire (vérification ~1 USD remboursé)
6. Vérifiez votre identité par SMS
7. Choisissez le plan **Basic support - Free**`,
        hint: `💡 Le compte créé est le compte "root" — le plus puissant. Règle de sécurité absolue : ne l'utilisez JAMAIS au quotidien. Créez un utilisateur IAM pour le travail (étape suivante).`,
        validationNote: `✅ Vous accédez à la AWS Management Console (console.aws.amazon.com) et voyez le tableau de bord avec votre nom de compte en haut à droite.`,
        estimatedMinutes: 12,
      },
      {
        title: 'Créer un utilisateur IAM et un groupe',
        instruction: `## Sécuriser avec un utilisateur IAM

N'utilisez jamais le compte root pour le travail quotidien. Créez un utilisateur IAM dédié.

1. Console → recherchez **IAM** → menu gauche → **Users** → **Create user**
2. User name : \`lab-admin\`
3. Cochez **Provide user access to the AWS Management Console**
4. **Permissions** → **Add user to group** → **Create group** :
   - Group name : \`Administrators\`
   - Attachez la policy **AdministratorAccess**
5. **Create user** → notez l'URL de connexion et les identifiants`,
        hint: `💡 Le principe du moindre privilège : en production, on n'attache pas AdministratorAccess. On donne uniquement les permissions nécessaires. Pour un lab d'apprentissage, AdministratorAccess est acceptable.`,
        validationNote: `✅ L'utilisateur \`lab-admin\` apparaît dans IAM → Users, membre du groupe \`Administrators\`.`,
        estimatedMinutes: 10,
      },
      {
        title: 'Activer le MFA sur le compte root',
        instruction: `## Protéger le compte root avec le MFA

Le MFA ajoute un second facteur d'authentification — indispensable sur le compte root.

1. Console → cliquez votre nom (haut droite) → **Security credentials**
2. Section **Multi-factor authentication (MFA)** → **Assign MFA device**
3. Choisissez **Authenticator app**
4. Scannez le QR code avec Google Authenticator / Microsoft Authenticator
5. Entrez deux codes consécutifs pour confirmer
6. **Add MFA**`,
        hint: `💡 AWS recommande FORTEMENT le MFA sur le root. Sans lui, un mot de passe volé donne un accès total à votre compte et facturation. C'est aussi un point de l'examen Cloud Practitioner.`,
        validationNote: `✅ La section Security credentials affiche un MFA device actif pour le compte root.`,
        estimatedMinutes: 8,
      },
    ],
    metadata: {
      level: 'beginner',
      levelLabel: 'Niveau Débutant',
      index: 0,
      totalInLevel: 4,
      providerLoginUrl: 'https://aws.amazon.com/console/',
      logo: AWS_LOGO,
      tags: ['aws', 'ec2', 'account'],
      learningObjectives: [
        'Créer un compte AWS Free Tier',
        'Distinguer le compte root d\'un utilisateur IAM',
        'Créer un utilisateur IAM et un groupe avec des permissions',
        'Activer le MFA pour sécuriser le compte root',
      ],
      prerequisites: [],
      scenario: `Vous démarrez votre parcours Cloud chez **AWSLearn TN**. Avant toute manipulation, votre mentor insiste : sécurisez d'abord le compte. Vous créez le compte, un utilisateur IAM et activez le MFA. Durée : ~30 min, coût : 0 USD.`,
      postLabQuiz: [
        {
          question: "Pourquoi ne faut-il pas utiliser le compte root AWS au quotidien ?",
          options: [
            "Il est plus lent",
            "Il a un accès illimité — un vol de ses identifiants compromet tout le compte",
            "Il ne peut pas créer de ressources",
            "Il coûte plus cher",
          ],
          correct: 1,
          explanation: "Le compte root a un accès total et illimité, y compris à la facturation et à la fermeture du compte. Si ses identifiants sont volés, tout est compromis. La bonne pratique est de créer des utilisateurs IAM avec des permissions limitées pour le travail quotidien.",
        },
        {
          question: "Qu'apporte le MFA (Multi-Factor Authentication) ?",
          options: [
            "Il accélère la connexion",
            "Il ajoute un second facteur, rendant un mot de passe volé insuffisant",
            "Il chiffre les données S3",
            "Il réduit la facture AWS",
          ],
          correct: 1,
          explanation: "Le MFA exige un second facteur (code d'une app authenticator) en plus du mot de passe. Même si un attaquant vole le mot de passe, il ne peut pas se connecter sans le second facteur physique. C'est essentiel sur le compte root.",
        },
      ],
      careerConnection: "La sécurisation des comptes IAM est la première compétence de tout praticien AWS. Certifications : AWS Cloud Practitioner (CLF-C02), AWS Security Specialty. Rôles : Cloud Engineer, AWS Administrator.",
    },
    status: 'published',
  },
  {
    slug: 'aws-ec2-beginner-ec2-instance-basics',
    title: 'Launch First EC2 Instance',
    description: 'Lancez et connectez-vous à votre première instance EC2 — le service de calcul fondamental d\'AWS.',
    provider: 'aws',
    difficulty: 'beginner',
    estimatedTime: '60 minutes',
    moduleTitle: 'EC2 Instance Management',
    tasks: [
      'Choose EC2 Instance Type',
      'Configure Security Groups',
      'Launch EC2 Instance',
      'Connect via SSH',
    ],
    steps: [
      {
        title: 'Lancer une instance EC2 t2.micro',
        instruction: `## Démarrer votre premier serveur AWS

**EC2 (Elastic Compute Cloud)** fournit des serveurs virtuels redimensionnables. C'est l'équivalent AWS d'une VM Azure.

1. Console AWS → service **EC2** → **Launch instance**
2. Name : \`ec2-lab-1\`
3. AMI (image) : **Amazon Linux 2023** (Free tier eligible)
4. Instance type : **t2.micro** (Free tier eligible — 750h/mois gratuites)
5. Key pair : **Create new key pair** → name \`lab-key\` → type RSA → **.pem** → téléchargez le fichier
6. Network settings : laissez le VPC par défaut, cochez **Allow SSH from My IP**
7. **Launch instance**`,
        hint: `💡 Conservez précieusement le fichier .pem téléchargé — c'est votre clé privée SSH. AWS ne vous le redonnera jamais. Sans lui, impossible de vous connecter à l'instance.`,
        validationNote: `✅ L'instance \`ec2-lab-1\` apparaît dans Instances avec Instance state = "Running" et un check de statut "2/2 checks passed" après ~2 min.`,
        estimatedMinutes: 12,
      },
      {
        title: 'Se connecter via SSH',
        instruction: `## Accéder à l'instance en ligne de commande

1. Sélectionnez l'instance → **Connect** → onglet **SSH client**
2. Récupérez la commande affichée et l'IP publique
3. Sur votre terminal (Linux/Mac) :
\`\`\`bash
chmod 400 lab-key.pem
ssh -i lab-key.pem ec2-user@[IP-PUBLIQUE]
\`\`\`
4. Sur Windows : utilisez **EC2 Instance Connect** (bouton "Connect" → onglet EC2 Instance Connect → Connect) directement dans le navigateur — pas besoin de la clé`,
        hint: `💡 L'erreur la plus courante : "permissions too open" sur la clé. La commande \`chmod 400 lab-key.pem\` corrige cela en restreignant les permissions du fichier. Sur Windows, EC2 Instance Connect évite ce problème.`,
        validationNote: `✅ Vous obtenez le prompt shell de l'instance (ex: \`[ec2-user@ip-172-31-x-x ~]$\`). Vous êtes connecté au serveur.`,
        estimatedMinutes: 10,
      },
      {
        title: 'Installer un serveur web et nettoyer',
        instruction: `## Installer Apache et terminer le lab

Sur l'instance via SSH :
\`\`\`bash
sudo yum update -y
sudo yum install -y httpd
sudo systemctl start httpd
echo "<h1>Bonjour depuis EC2 !</h1>" | sudo tee /var/www/html/index.html
\`\`\`

Pour voir la page, ajoutez une règle HTTP (port 80) au Security Group, puis ouvrez \`http://[IP-PUBLIQUE]\`.

**Nettoyage CRITIQUE :**
- Sélectionnez l'instance → **Instance state** → **Terminate instance**`,
        hint: `💡 "Stop" arrête l'instance (le disque EBS reste facturé). "Terminate" supprime tout définitivement. En lab, terminez toujours l'instance pour ne rien payer.`,
        validationNote: `✅ La page "Bonjour depuis EC2 !" s'affiche via l'IP publique. Après Terminate, l'instance passe à "Terminated" et cesse d'être facturée.`,
        estimatedMinutes: 10,
      },
    ],
    metadata: {
      level: 'beginner',
      levelLabel: 'Niveau Débutant',
      index: 1,
      totalInLevel: 4,
      providerLoginUrl: 'https://aws.amazon.com/console/',
      logo: AWS_LOGO,
      tags: ['aws', 'ec2'],
      learningObjectives: [
        'Lancer une instance EC2 t2.micro (Free Tier)',
        'Gérer les key pairs SSH pour la connexion sécurisée',
        'Se connecter via SSH ou EC2 Instance Connect',
        'Distinguer Stop et Terminate pour la gestion des coûts',
      ],
      prerequisites: ['Lab aws-ec2-beginner-aws-account-setup'],
      scenario: `**WebHost TN** veut héberger son premier site sur AWS. En tant que stagiaire cloud, vous lancez une instance EC2, vous y connectez et installez un serveur web. Durée : ~30 min, coût : 0 USD (Free Tier t2.micro).`,
      costWarning: '⚠️ t2.micro est gratuit 750h/mois la première année. Au-delà ou avec d\'autres types, des frais s\'appliquent. Terminez toujours l\'instance après le lab.',
      sandboxUrl: 'https://aws.amazon.com/getting-started/hands-on/',
      postLabQuiz: [
        {
          question: "Quelle est la différence entre 'Stop' et 'Terminate' une instance EC2 ?",
          options: [
            "Aucune différence",
            "Stop éteint mais conserve l'instance (disque facturé) ; Terminate la supprime définitivement",
            "Terminate est temporaire",
            "Stop supprime les données",
          ],
          correct: 1,
          explanation: "Stop éteint l'instance mais conserve son disque EBS (qui reste facturé) — on peut la redémarrer. Terminate supprime définitivement l'instance et son disque racine. En lab, on Terminate pour ne plus rien payer.",
        },
        {
          question: "À quoi sert le fichier .pem (key pair) téléchargé au lancement ?",
          options: [
            "À chiffrer le disque",
            "C'est la clé privée SSH nécessaire pour se connecter à l'instance",
            "À payer l'instance",
            "À configurer le réseau",
          ],
          correct: 1,
          explanation: "Le fichier .pem contient la clé privée SSH. Elle est indispensable pour se connecter à l'instance via SSH. AWS ne la stocke pas — si vous la perdez, vous ne pourrez plus accéder à l'instance par SSH (sauf via EC2 Instance Connect).",
        },
      ],
      careerConnection: "La gestion d'instances EC2 est la compétence centrale de tout Cloud Engineer AWS. Certifications : CLF-C02, SAA-C03. Rôles : AWS Cloud Engineer, DevOps Engineer. Salaire moyen : 42 000–60 000 EUR/an.",
    },
    status: 'published',
  },
  {
    slug: 'aws-ec2-beginner-ec2-storage-volumes',
    title: 'Manage EBS Volumes',
    description: 'Créez, attachez et gérez des volumes de stockage persistant EBS pour vos instances EC2.',
    provider: 'aws',
    difficulty: 'beginner',
    estimatedTime: '50 minutes',
    moduleTitle: 'Storage Management',
    tasks: [
      'Create EBS Volume',
      'Attach Volume to Instance',
      'Format and Mount Volume',
      'Create Volume Snapshots',
    ],
    steps: [
      {
        title: 'Créer un volume EBS',
        instruction: `## Créer un volume de stockage persistant

**EBS (Elastic Block Store)** fournit du stockage bloc persistant pour les instances EC2 — les données survivent même si l'instance est arrêtée.

1. Console AWS → service **EC2** → menu gauche → **Elastic Block Store** → **Volumes**
2. Cliquez **Create volume**
3. Configurez :
   - Volume type : **gp3** (SSD usage général)
   - Size : **8 GiB**
   - Availability Zone : **la même que votre instance EC2** (ex: eu-west-1a) ← crucial
4. Tags : Name = \`ebs-lab-vol\`
5. **Create volume**`,
        hint: `💡 Un volume EBS ne peut être attaché qu'à une instance dans la MÊME Availability Zone. Si votre instance est en eu-west-1a, le volume doit l'être aussi.`,
        validationNote: `✅ Le volume \`ebs-lab-vol\` apparaît dans la liste Volumes avec State = "Available" (pas encore attaché).`,
        estimatedMinutes: 8,
      },
      {
        title: 'Attacher le volume à une instance EC2',
        instruction: `## Attacher et rendre le volume utilisable

1. Sélectionnez \`ebs-lab-vol\` → **Actions** → **Attach volume**
2. Instance : sélectionnez votre instance EC2 en cours d'exécution
3. Device name : laissez la valeur par défaut (ex: \`/dev/sdf\`)
4. **Attach volume**
5. Le State passe à "In-use"

**Sur l'instance (via SSH), formatez et montez :**
\`\`\`bash
lsblk                              # liste les disques
sudo mkfs -t xfs /dev/xvdf         # formate le volume
sudo mkdir /data
sudo mount /dev/xvdf /data         # monte le volume
df -h                              # vérifie le montage
\`\`\``,
        hint: `💡 Le nom du device dans la console (/dev/sdf) peut apparaître comme /dev/xvdf dans Linux. Utilisez 'lsblk' pour voir le vrai nom assigné par le système.`,
        validationNote: `✅ La commande \`df -h\` montre le volume monté sur /data. Le State du volume est "In-use" dans la console.`,
        estimatedMinutes: 12,
      },
      {
        title: 'Créer un snapshot et nettoyer',
        instruction: `## Sauvegarder avec un snapshot

Un **snapshot** est une sauvegarde ponctuelle du volume, stockée dans S3 (incrémentale).

1. Sélectionnez \`ebs-lab-vol\` → **Actions** → **Create snapshot**
2. Description : \`snapshot-lab-1\` → **Create snapshot**
3. Menu gauche → **Snapshots** → observez l'avancement

**Nettoyage IMPORTANT :**
4. Détachez le volume (Actions → Detach), puis supprimez-le (Actions → Delete volume)
5. Supprimez le snapshot (Snapshots → Delete)`,
        hint: `💡 Les snapshots EBS sont incrémentaux : seuls les blocs modifiés depuis le dernier snapshot sont stockés, ce qui réduit les coûts. Ils servent de sauvegarde et permettent de créer de nouveaux volumes.`,
        validationNote: `✅ Le snapshot \`snapshot-lab-1\` a un statut "Completed". Après nettoyage, le volume et le snapshot sont supprimés (aucun coût en attente).`,
        estimatedMinutes: 8,
      },
    ],
    metadata: {
      level: 'beginner',
      levelLabel: 'Niveau Débutant',
      index: 2,
      totalInLevel: 4,
      providerLoginUrl: 'https://aws.amazon.com/console/',
      logo: AWS_LOGO,
      tags: ['aws', 'ec2', 'ebs'],
      learningObjectives: [
        'Créer un volume EBS gp3 dans la bonne Availability Zone',
        'Attacher, formater et monter un volume sur une instance EC2',
        'Créer un snapshot de sauvegarde',
        'Nettoyer les ressources de stockage pour éviter les frais',
      ],
      prerequisites: ['Lab aws-ec2-beginner-ec2-instance-basics (instance EC2 en cours)'],
      scenario: `Chez **StoreData TN**, une application a besoin de stockage persistant qui survit aux redémarrages des serveurs. Vous configurez un volume EBS attaché à une instance EC2. Durée : ~28 min, coût : ~0.01 USD.`,
      costWarning: '⚠️ EBS facture par GiB-mois même si le volume est détaché. Supprimez le volume ET le snapshot après le lab.',
      sandboxUrl: 'https://aws.amazon.com/getting-started/hands-on/',
      postLabQuiz: [
        {
          question: "Pourquoi un volume EBS doit-il être dans la même Availability Zone que l'instance EC2 ?",
          options: [
            "Pour réduire les coûts de stockage",
            "Car un volume EBS ne peut être attaché qu'à une instance de la même AZ",
            "Pour le chiffrement",
            "Ce n'est pas obligatoire",
          ],
          correct: 1,
          explanation: "Un volume EBS est lié à une Availability Zone précise et ne peut être attaché qu'à une instance dans cette même AZ. Pour déplacer des données vers une autre AZ, il faut créer un snapshot puis un nouveau volume depuis ce snapshot.",
        },
        {
          question: "Qu'est-ce qu'un snapshot EBS ?",
          options: [
            "Une copie complète du volume à chaque fois",
            "Une sauvegarde incrémentale ponctuelle stockée dans S3",
            "Un type d'instance EC2",
            "Une règle de sécurité réseau",
          ],
          correct: 1,
          explanation: "Un snapshot EBS est une sauvegarde ponctuelle et incrémentale (seuls les blocs modifiés sont stockés) conservée dans Amazon S3. Il permet de restaurer le volume ou d'en créer de nouveaux, y compris dans d'autres AZ.",
        },
      ],
      careerConnection: "La gestion du stockage cloud est fondamentale pour les Cloud Administrators AWS. Certifications : AWS Solutions Architect Associate (SAA-C03). Rôles : Cloud Engineer, AWS Administrator.",
    },
    status: 'published',
  },
  {
    slug: 'aws-ec2-beginner-ec2-security-groups',
    title: 'Configure Security Groups',
    description: 'Maîtrisez les Security Groups AWS — le pare-feu virtuel qui protège vos instances EC2.',
    provider: 'aws',
    difficulty: 'beginner',
    estimatedTime: '40 minutes',
    moduleTitle: 'Security Configuration',
    tasks: [
      'Understand Security Group Rules',
      'Configure Inbound Rules',
      'Set Up Outbound Rules',
      'Test Security Group Configuration',
    ],
    steps: [
      {
        title: 'Comprendre les Security Groups',
        instruction: `## Le pare-feu virtuel d'AWS

Un **Security Group** est un pare-feu au niveau de l'instance. Il contrôle le trafic entrant (inbound) et sortant (outbound).

**Caractéristiques clés (examen) :**
- **Stateful** : si vous autorisez le trafic entrant, la réponse sortante est automatiquement autorisée
- Seules des règles **Allow** existent (pas de règles Deny — tout est bloqué par défaut)
- S'attache à une interface réseau d'instance (plusieurs SG possibles par instance)

1. Console AWS → **EC2** → menu gauche → **Security Groups**
2. Cliquez **Create security group**
3. Name : \`sg-web-lab\` | Description : \`Lab web server SG\` | VPC : le VPC par défaut`,
        hint: `💡 Security Group (stateful, niveau instance) vs Network ACL (stateless, niveau subnet). Le SG se souvient des connexions ; la NACL évalue chaque paquet indépendamment.`,
        validationNote: `✅ Le Security Group \`sg-web-lab\` est créé et visible dans la liste.`,
        estimatedMinutes: 8,
      },
      {
        title: 'Configurer les règles inbound et outbound',
        instruction: `## Autoriser le trafic web et SSH

**Règles entrantes (Inbound) :**
1. Ouvrez \`sg-web-lab\` → onglet **Inbound rules** → **Edit inbound rules**
2. **Add rule** : Type = **HTTP** (port 80), Source = **Anywhere-IPv4** (0.0.0.0/0)
3. **Add rule** : Type = **SSH** (port 22), Source = **My IP** ← jamais 0.0.0.0/0 pour SSH !
4. **Save rules**

**Règles sortantes (Outbound) :**
5. Onglet **Outbound rules** → par défaut "All traffic" est autorisé (laissez ainsi)`,
        hint: `💡 SÉCURITÉ : n'ouvrez JAMAIS le port SSH (22) à 0.0.0.0/0 (tout Internet). Limitez-le à "My IP". Ouvrir SSH à tous est l'erreur de sécurité la plus courante et dangereuse.`,
        validationNote: `✅ Inbound : HTTP depuis Anywhere et SSH depuis My IP. Outbound : All traffic autorisé.`,
        estimatedMinutes: 10,
      },
      {
        title: 'Tester et comprendre le comportement stateful',
        instruction: `## Vérifier la configuration

1. Attachez \`sg-web-lab\` à une instance EC2 : sélectionnez l'instance → Actions → Security → Change security groups
2. Si un serveur web tourne, ouvrez \`http://[IP-publique]\` → la page s'affiche (port 80 autorisé)
3. Essayez SSH depuis votre machine → fonctionne (port 22 autorisé pour My IP)
4. **Test stateful :** la réponse HTTP sortante n'a pas besoin de règle outbound explicite — le SG est stateful

**Pas de nettoyage de coût** (les Security Groups sont gratuits), mais détachez-le si vous supprimez l'instance.`,
        hint: `💡 "Stateful" signifie : vous autorisez une connexion entrante, et AWS autorise automatiquement la réponse, sans règle outbound correspondante. Cela simplifie la configuration vs un pare-feu stateless.`,
        validationNote: `✅ Vous pouvez accéder au port 80 et SSH selon les règles. Vous comprenez pourquoi aucune règle outbound n'est nécessaire pour les réponses.`,
        estimatedMinutes: 7,
      },
    ],
    metadata: {
      level: 'beginner',
      levelLabel: 'Niveau Débutant',
      index: 3,
      totalInLevel: 4,
      providerLoginUrl: 'https://aws.amazon.com/console/',
      logo: AWS_LOGO,
      tags: ['aws', 'ec2', 'security'],
      learningObjectives: [
        'Comprendre le rôle des Security Groups comme pare-feu d\'instance',
        'Configurer des règles inbound (HTTP, SSH) sécurisées',
        'Expliquer le comportement stateful des Security Groups',
        'Distinguer Security Group et Network ACL',
      ],
      prerequisites: ['Lab aws-ec2-beginner-ec2-instance-basics'],
      scenario: `Après un incident où un port SSH ouvert à tout Internet a été exploité chez un concurrent, **SecureWeb TN** vous demande de configurer correctement les Security Groups de ses serveurs web. Durée : ~25 min, coût : 0 USD.`,
      postLabQuiz: [
        {
          question: "Que signifie qu'un Security Group AWS est 'stateful' ?",
          options: [
            "Il garde un journal de toutes les connexions",
            "Si le trafic entrant est autorisé, la réponse sortante l'est automatiquement",
            "Il bloque tout le trafic par défaut",
            "Il s'applique à tout le subnet",
          ],
          correct: 1,
          explanation: "Stateful signifie que le Security Group se souvient des connexions autorisées : si vous autorisez une requête entrante, la réponse sortante est automatiquement permise sans règle outbound explicite. Les Network ACL, elles, sont stateless.",
        },
        {
          question: "Quelle source faut-il utiliser pour une règle SSH (port 22) entrante ?",
          options: [
            "Anywhere (0.0.0.0/0)",
            "My IP — limiter à votre adresse uniquement",
            "Toutes les adresses IPv6",
            "Le port 80",
          ],
          correct: 1,
          explanation: "On limite toujours SSH à 'My IP' (votre adresse). Ouvrir SSH à 0.0.0.0/0 expose l'instance à des attaques par force brute depuis tout Internet — c'est l'erreur de sécurité la plus fréquente et dangereuse.",
        },
      ],
      careerConnection: "La sécurité réseau AWS est essentielle pour les Cloud Security Engineers. Certifications : AWS Security Specialty, SAA-C03. Rôles : Cloud Security Engineer, DevSecOps.",
    },
    status: 'published',
  },
];

const AWS_EC2_INTERMEDIATE_RAW: SeedLabRowUnchained[] = [
  {
    slug: 'aws-ec2-intermediate-ec2-load-balancing',
    title: 'Set Up Load Balancing',
    description: 'Configurez un Application Load Balancer pour distribuer le trafic et garantir la haute disponibilité.',
    provider: 'aws',
    difficulty: 'intermediate',
    estimatedTime: '75 minutes',
    moduleTitle: 'High Availability',
    tasks: [
      'Create Application Load Balancer',
      'Configure Target Groups',
      'Set Up Health Checks',
      'Test Load Distribution',
    ],
    steps: [
      {
        title: 'Créer un Target Group',
        instruction: `## Définir le groupe de cibles

Un **Target Group** regroupe les instances EC2 qui recevront le trafic du load balancer.

1. Console **EC2** → menu gauche → **Target Groups** → **Create target group**
2. Target type : **Instances**
3. Name : \`tg-web-lab\`
4. Protocol : HTTP, Port : 80
5. Health check path : \`/\`
6. **Next** → enregistrez 1-2 instances EC2 en cours d'exécution → **Create target group**`,
        hint: `💡 Le health check vérifie que chaque cible répond sur le path défini (ex: /). Une cible "unhealthy" est automatiquement retirée de la rotation jusqu'à ce qu'elle redevienne saine.`,
        validationNote: `✅ Le target group \`tg-web-lab\` est créé avec vos instances enregistrées (statut "healthy" après quelques secondes).`,
        estimatedMinutes: 10,
      },
      {
        title: "Créer l'Application Load Balancer",
        instruction: `## Déployer l'ALB

1. Console EC2 → **Load Balancers** → **Create load balancer**
2. Type : **Application Load Balancer**
3. Name : \`alb-web-lab\`
4. Scheme : **Internet-facing**
5. Network mapping : sélectionnez au moins **2 Availability Zones** ← requis pour la HA
6. Security group : autorisez HTTP (port 80)
7. Listener : HTTP:80 → forward vers \`tg-web-lab\`
8. **Create load balancer**`,
        hint: `💡 Un ALB exige au moins 2 AZ pour assurer la haute disponibilité. ALB (L7, HTTP/routing par URL) vs NLB (L4, ultra-performant TCP) vs CLB (legacy). Choisissez ALB pour le trafic web.`,
        validationNote: `✅ L'ALB \`alb-web-lab\` affiche State = "Active" et un DNS name (ex: alb-web-lab-xxx.elb.amazonaws.com).`,
        estimatedMinutes: 12,
      },
      {
        title: 'Tester la distribution et nettoyer',
        instruction: `## Vérifier la répartition du trafic

1. Copiez le **DNS name** de l'ALB → ouvrez-le dans le navigateur
2. Rafraîchissez plusieurs fois → le trafic est distribué entre vos instances
3. Pour visualiser : faites afficher l'ID d'instance sur chaque page web
4. Arrêtez une instance → l'ALB redirige automatiquement vers les saines (health check)

**Nettoyage :** supprimez l'ALB, le target group, puis terminez les instances.`,
        hint: `💡 L'ALB facture un tarif horaire + LCU (Load Balancer Capacity Units). Toujours le supprimer après un lab pour éviter des frais récurrents.`,
        validationNote: `✅ Le rafraîchissement montre une distribution entre instances. ALB et ressources supprimés.`,
        estimatedMinutes: 8,
      },
    ],
    metadata: {
      level: 'intermediate',
      levelLabel: 'Niveau Intermédiaire',
      index: 0,
      totalInLevel: 4,
      providerLoginUrl: 'https://aws.amazon.com/console/',
      logo: AWS_LOGO,
      tags: ['aws', 'ec2', 'elb'],
      learningObjectives: [
        'Créer un target group avec health checks',
        'Déployer un Application Load Balancer multi-AZ',
        'Distinguer ALB, NLB et CLB',
        'Tester la distribution du trafic et le failover',
      ],
      prerequisites: ['Labs AWS EC2 Débutant (instances en cours)'],
      scenario: `Le site de **HighTraffic TN** doit rester disponible même si un serveur tombe. Vous mettez en place un Application Load Balancer réparti sur deux zones. Durée : ~30 min, coût : ~0.05 USD.`,
      costWarning: '⚠️ L\'ALB facture un tarif horaire + LCU. Supprimez le load balancer et terminez les instances après le lab.',
      postLabQuiz: [
        {
          question: "Pourquoi un Application Load Balancer requiert-il au moins 2 Availability Zones ?",
          options: [
            "Pour réduire le coût",
            "Pour garantir la haute disponibilité même si une AZ tombe",
            "Pour le chiffrement",
            "Ce n'est pas requis",
          ],
          correct: 1,
          explanation: "L'ALB exige au moins 2 AZ pour la haute disponibilité : si une zone de disponibilité subit une panne, le trafic continue d'être servi par les instances de l'autre zone. C'est un principe fondamental de résilience sur AWS.",
        },
        {
          question: "Quelle est la différence entre un ALB et un NLB ?",
          options: [
            "ALB opère au niveau L7 (HTTP/routing) ; NLB au niveau L4 (TCP, ultra-performant)",
            "ALB est gratuit",
            "NLB ne fait pas de health checks",
            "Aucune différence",
          ],
          correct: 0,
          explanation: "L'Application Load Balancer (L7) comprend le HTTP et peut router selon l'URL, le host, etc. Le Network Load Balancer (L4) opère au niveau TCP/UDP avec une latence ultra-basse et des millions de requêtes/s. On choisit selon le besoin (web routing vs performance brute).",
        },
      ],
      careerConnection: "Les architectures haute disponibilité sont au cœur du métier de Solutions Architect AWS. Certifications : SAA-C03. Rôles : Cloud Architect, DevOps Engineer.",
    },
    status: 'published',
  },
  {
    slug: 'aws-ec2-intermediate-ec2-auto-scaling',
    title: 'Implement Auto Scaling',
    description: 'Configurez un Auto Scaling Group qui ajuste automatiquement le nombre d\'instances EC2 selon la demande.',
    provider: 'aws',
    difficulty: 'intermediate',
    estimatedTime: '80 minutes',
    moduleTitle: 'Scalability',
    tasks: [
      'Create Auto Scaling Group',
      'Configure Scaling Policies',
      'Set Up CloudWatch Alarms',
      'Test Auto Scaling Behavior',
    ],
    steps: [
      {
        title: 'Créer un Launch Template',
        instruction: `## Définir le modèle d'instance

Un **Launch Template** définit la configuration des instances que l'Auto Scaling Group créera.

1. Console EC2 → **Launch Templates** → **Create launch template**
2. Name : \`lt-web-lab\`
3. AMI : Amazon Linux 2023
4. Instance type : **t2.micro**
5. Key pair et Security group : vos valeurs existantes
6. (Optionnel) User data : script d'installation d'Apache
7. **Create launch template**`,
        hint: `💡 Le Launch Template remplace l'ancien "Launch Configuration" (déprécié). Il est versionné : vous pouvez mettre à jour le template et l'ASG utilisera la nouvelle version pour les futures instances.`,
        validationNote: `✅ Le launch template \`lt-web-lab\` apparaît dans la liste avec sa version 1.`,
        estimatedMinutes: 10,
      },
      {
        title: "Créer l'Auto Scaling Group avec scaling policies",
        instruction: `## Configurer l'élasticité automatique

1. Console EC2 → **Auto Scaling Groups** → **Create Auto Scaling group**
2. Name : \`asg-web-lab\` → Launch template : \`lt-web-lab\`
3. Network : sélectionnez 2+ Availability Zones
4. Group size : Desired **2**, Minimum **1**, Maximum **4**
5. Scaling policy : **Target tracking** → métrique **Average CPU utilization** → cible **50%**
6. **Create Auto Scaling group**`,
        hint: `💡 Le "target tracking" est la politique la plus simple : AWS ajoute/retire automatiquement des instances pour maintenir le CPU moyen autour de 50%. Plus intelligent que les règles à seuil manuel.`,
        validationNote: `✅ L'ASG \`asg-web-lab\` lance 2 instances (desired capacity) réparties sur les AZ. La politique target tracking à 50% CPU est active.`,
        estimatedMinutes: 12,
      },
      {
        title: 'Observer le comportement et nettoyer',
        instruction: `## Vérifier l'auto scaling

1. Onglet **Activity** de l'ASG → historique des actions de scaling
2. Onglet **Instances** → voyez les instances gérées par l'ASG
3. Terminez manuellement une instance → l'ASG en relance automatiquement une (self-healing)
4. C'est le double rôle de l'ASG : **élasticité** (charge) + **résilience** (remplace les instances mortes)

**Nettoyage :** supprimez l'ASG (\`asg-web-lab\` → Delete) — cela termine automatiquement les instances.`,
        hint: `💡 L'ASG ne fait pas que scaler : il maintient toujours le "desired count". Si vous tuez une instance, il en relance une pour respecter le nombre désiré. C'est l'auto-réparation (self-healing).`,
        validationNote: `✅ Après avoir terminé une instance, l'ASG en relance une automatiquement. ASG supprimé, instances terminées.`,
        estimatedMinutes: 8,
      },
    ],
    metadata: {
      level: 'intermediate',
      levelLabel: 'Niveau Intermédiaire',
      index: 1,
      totalInLevel: 4,
      providerLoginUrl: 'https://aws.amazon.com/console/',
      logo: AWS_LOGO,
      tags: ['aws', 'ec2', 'asg'],
      learningObjectives: [
        'Créer un Launch Template versionné',
        'Configurer un Auto Scaling Group multi-AZ',
        'Mettre en place une politique de target tracking CPU',
        'Comprendre l\'auto-réparation (self-healing) de l\'ASG',
      ],
      prerequisites: ['Lab aws-ec2-intermediate-ec2-load-balancing'],
      scenario: `**ScaleApp TN** subit des pics de charge imprévisibles. Votre mission : un parc de serveurs qui grandit et se répare automatiquement. Vous configurez un Auto Scaling Group. Durée : ~30 min, coût : 0 USD (t2.micro Free Tier).`,
      costWarning: '⚠️ L\'ASG peut lancer jusqu\'à 4 instances. Au-delà du Free Tier, des frais s\'appliquent. Supprimez l\'ASG après le lab.',
      postLabQuiz: [
        {
          question: "Outre l'élasticité, quel autre rôle joue un Auto Scaling Group ?",
          options: [
            "Le chiffrement des données",
            "L'auto-réparation : il remplace automatiquement les instances défaillantes",
            "La sauvegarde des disques",
            "La gestion des utilisateurs IAM",
          ],
          correct: 1,
          explanation: "L'ASG maintient toujours le nombre d'instances désiré (desired capacity). Si une instance tombe ou est terminée, l'ASG en lance automatiquement une nouvelle. C'est l'auto-réparation (self-healing), qui s'ajoute à l'élasticité basée sur la charge.",
        },
        {
          question: "Qu'est-ce qu'une politique de 'target tracking' ?",
          options: [
            "Elle suit la localisation des utilisateurs",
            "AWS ajuste automatiquement les instances pour maintenir une métrique cible (ex: CPU à 50%)",
            "Elle bloque le trafic suspect",
            "Elle facture à l'usage",
          ],
          correct: 1,
          explanation: "Le target tracking est la politique de scaling la plus simple : vous définissez une cible (ex: CPU moyen à 50%) et AWS ajoute/retire automatiquement des instances pour maintenir cette valeur. Pas besoin de définir des seuils manuels.",
        },
      ],
      careerConnection: "L'auto scaling est une compétence clé pour gérer des applications élastiques. Certifications : SAA-C03, AWS DevOps Pro. Rôles : DevOps Engineer, SRE, Cloud Architect.",
    },
    status: 'published',
  },
  {
    slug: 'aws-ec2-intermediate-ec2-instance-types',
    title: 'Optimize Instance Types',
    description: 'Choisissez le bon type d\'instance EC2 selon le workload pour optimiser coût et performance.',
    provider: 'aws',
    difficulty: 'intermediate',
    estimatedTime: '65 minutes',
    moduleTitle: 'Performance Optimization',
    tasks: [
      'Compare Instance Families',
      'Analyze Performance Requirements',
      'Test Different Instance Types',
      'Optimize for Cost and Performance',
    ],
    steps: [
      {
        title: 'Comprendre les familles d\'instances',
        instruction: `## Les familles d'instances EC2

Chaque famille est optimisée pour un type de workload (à connaître pour l'examen) :

| Famille | Optimisé pour | Exemple d'usage |
|---------|---------------|-----------------|
| **T** (t3, t4g) | Usage général, burstable | Sites web, dev |
| **M** (m5, m6g) | Usage général équilibré | Serveurs d'application |
| **C** (c5, c6g) | Compute (CPU) | Calcul intensif, batch |
| **R** (r5, r6g) | Mémoire (RAM) | Bases de données, cache |
| **G/P** | GPU | ML, rendu graphique |

1. Console EC2 → **Instance Types** → explorez le filtre par famille
2. Comparez vCPU, mémoire et prix entre t3.micro, c5.large et r5.large`,
        hint: `💡 Moyen mnémotechnique : C = Compute (CPU), R = RAM (mémoire), M = Medium/équilibré, T = Tiny/burstable. Le suffixe "g" (m6g) = processeurs ARM Graviton, moins chers.`,
        validationNote: `✅ Vous pouvez associer chaque famille (T, M, C, R, G) à son type de workload optimal.`,
        estimatedMinutes: 10,
      },
      {
        title: 'Analyser et comparer pour un workload',
        instruction: `## Choisir selon le besoin

**Cas pratique :** une base de données en mémoire (Redis) a besoin de beaucoup de RAM, peu de CPU.

1. Dans **Instance Types**, filtrez par mémoire élevée
2. Comparez r5.large (16 Go RAM) vs c5.large (4 Go RAM) au même prix approximatif
3. Pour Redis → **r5.large** (la RAM prime)
4. Pour un encodage vidéo → **c5** (le CPU prime)

Utilisez le **AWS Pricing Calculator** (calculator.aws) pour estimer le coût mensuel de chaque option.`,
        hint: `💡 Sur-dimensionner coûte cher, sous-dimensionner dégrade la performance. Le "right-sizing" (dimensionnement juste) est une compétence FinOps clé. AWS Compute Optimizer recommande automatiquement le bon type.`,
        validationNote: `✅ Vous pouvez justifier le choix d'une famille d'instance selon un workload donné (CPU-bound vs memory-bound).`,
        estimatedMinutes: 10,
      },
      {
        title: 'Optimiser avec les modèles de tarification',
        instruction: `## Réduire les coûts avec les pricing models

| Modèle | Réduction | Engagement | Usage |
|--------|-----------|------------|-------|
| **On-Demand** | 0% | Aucun | Charge imprévisible |
| **Reserved/Savings Plans** | ~40-72% | 1-3 ans | Charge stable |
| **Spot** | ~90% | Aucun (interruptible) | Batch, tolérant aux pannes |

1. Explorez **Spot Instances** dans la console EC2
2. Pour un calcul batch non urgent → Spot (jusqu'à 90% moins cher)
3. Pour un serveur 24/7 stable → Savings Plan

*Pas de ressource créée — exploration uniquement, aucun nettoyage requis.*`,
        hint: `💡 Les Spot Instances peuvent être interrompues par AWS avec un préavis de 2 min quand la capacité est demandée ailleurs. Parfaites pour du calcul tolérant aux pannes, jamais pour une base de données critique.`,
        validationNote: `✅ Vous pouvez recommander un pricing model (On-Demand, Reserved, Spot) selon le profil d'usage.`,
        estimatedMinutes: 8,
      },
    ],
    metadata: {
      level: 'intermediate',
      levelLabel: 'Niveau Intermédiaire',
      index: 2,
      totalInLevel: 4,
      providerLoginUrl: 'https://aws.amazon.com/console/',
      logo: AWS_LOGO,
      tags: ['aws', 'ec2'],
      learningObjectives: [
        'Identifier les familles d\'instances EC2 (T, M, C, R, G)',
        'Choisir un type d\'instance selon le workload',
        'Distinguer On-Demand, Reserved et Spot',
        'Appliquer le right-sizing pour optimiser les coûts',
      ],
      prerequisites: ['Labs AWS EC2 Débutant'],
      scenario: `Le DSI de **OptiCost TN** trouve la facture EC2 trop élevée. Votre mission : analyser les workloads et recommander les bons types d'instances et modèles de tarification. Durée : ~25 min, coût : 0 USD (exploration).`,
      postLabQuiz: [
        {
          question: "Quelle famille d'instance EC2 choisir pour une base de données en mémoire (Redis) ?",
          options: ['C (compute-optimized)', 'R (memory-optimized)', 'T (burstable)', 'G (GPU)'],
          correct: 1,
          explanation: "La famille R (memory-optimized, ex: r5, r6g) offre un ratio RAM/vCPU élevé, idéal pour les bases de données en mémoire, les caches et l'analytique. La famille C privilégie le CPU, non la mémoire.",
        },
        {
          question: "Quel modèle de tarification offre jusqu'à 90% de réduction mais peut être interrompu ?",
          options: ['On-Demand', 'Reserved Instances', 'Spot Instances', 'Savings Plans'],
          correct: 2,
          explanation: "Les Spot Instances utilisent la capacité inutilisée d'AWS avec jusqu'à 90% de réduction, mais AWS peut les interrompre avec un préavis de 2 minutes. Parfaites pour du batch tolérant aux pannes, jamais pour des charges critiques continues.",
        },
      ],
      careerConnection: "L'optimisation des coûts (FinOps) et du right-sizing est très valorisée. Certifications : SAA-C03, AWS Cloud Practitioner. Rôles : Cloud FinOps Engineer, Solutions Architect.",
    },
    status: 'published',
  },
  {
    slug: 'aws-ec2-intermediate-ec2-monitoring',
    title: 'Monitor EC2 Performance',
    description: 'Mettez en place une surveillance complète de vos instances EC2 avec CloudWatch metrics, alarmes et dashboards.',
    provider: 'aws',
    difficulty: 'intermediate',
    estimatedTime: '70 minutes',
    moduleTitle: 'Monitoring & Observability',
    tasks: [
      'Configure CloudWatch Metrics',
      'Set Up Custom Metrics',
      'Create Alarms and Notifications',
      'Monitor Performance Dashboards',
    ],
    steps: [
      {
        title: 'Explorer les métriques CloudWatch',
        instruction: `## Observer les métriques d'instance

**CloudWatch** est le service de monitoring centralisé d'AWS — il collecte automatiquement les métriques de vos ressources.

1. Console → recherchez **CloudWatch** → **Metrics** → **All metrics**
2. Naviguez : **EC2** → **Per-Instance Metrics**
3. Sélectionnez votre instance → cochez **CPUUtilization**
4. Observez le graphique sur les dernières heures
5. Explorez aussi : NetworkIn, NetworkOut, DiskReadOps`,
        hint: `💡 Attention : par défaut, CloudWatch ne collecte PAS les métriques de RAM et d'espace disque utilisé (ce sont des métriques "internes" à l'OS). Il faut installer le CloudWatch Agent pour ces métriques custom.`,
        validationNote: `✅ Vous voyez le graphique CPUUtilization de votre instance et pouvez naviguer entre plusieurs métriques.`,
        estimatedMinutes: 8,
      },
      {
        title: 'Créer une alarme CloudWatch avec notification',
        instruction: `## Être alerté en cas de problème

1. CloudWatch → **Alarms** → **Create alarm** → **Select metric**
2. EC2 → Per-Instance → votre instance → **CPUUtilization**
3. Conditions : **Greater than 80%**, période 5 min
4. Notification : **Create new SNS topic** → entrez votre email → vous recevrez un email de confirmation à valider
5. Alarm name : \`cpu-high-ec2-lab\`
6. **Create alarm**`,
        hint: `💡 SNS (Simple Notification Service) est le service de notification d'AWS. Une alarme CloudWatch publie sur un topic SNS, qui peut envoyer email, SMS, ou déclencher une Lambda. Confirmez l'abonnement email avant de tester.`,
        validationNote: `✅ L'alarme \`cpu-high-ec2-lab\` est créée (état "OK" ou "Insufficient data"). Vous avez confirmé l'abonnement SNS par email.`,
        estimatedMinutes: 10,
      },
      {
        title: 'Créer un dashboard et nettoyer',
        instruction: `## Visualiser avec un dashboard

1. CloudWatch → **Dashboards** → **Create dashboard** → name \`dash-ec2-lab\`
2. Ajoutez un widget **Line** → métrique CPUUtilization de votre instance
3. Ajoutez un widget pour NetworkIn/NetworkOut
4. **Save dashboard**

Le dashboard centralise la santé de votre infrastructure sur une seule vue.

**Nettoyage :** supprimez l'alarme, le dashboard et le topic SNS.`,
        hint: `💡 Les dashboards CloudWatch sont facturés (~3 USD/dashboard/mois au-delà de 3 gratuits). Supprimez-les après le lab. En production, on crée un dashboard par application ou par équipe.`,
        validationNote: `✅ Le dashboard \`dash-ec2-lab\` affiche les graphiques CPU et réseau. Alarme, dashboard et topic SNS supprimés.`,
        estimatedMinutes: 8,
      },
    ],
    metadata: {
      level: 'intermediate',
      levelLabel: 'Niveau Intermédiaire',
      index: 3,
      totalInLevel: 4,
      providerLoginUrl: 'https://aws.amazon.com/console/',
      logo: AWS_LOGO,
      tags: ['aws', 'ec2', 'cloudwatch'],
      learningObjectives: [
        'Explorer les métriques EC2 dans CloudWatch',
        'Créer une alarme avec notification SNS par email',
        'Comprendre la limite des métriques par défaut (pas de RAM/disque)',
        'Construire un dashboard de monitoring',
      ],
      prerequisites: ['Labs AWS EC2 Débutant'],
      scenario: `Après une panne non détectée chez **MonitorMe TN**, la direction exige une surveillance proactive. Vous configurez CloudWatch metrics, alarmes et un dashboard pour les serveurs EC2. Durée : ~28 min, coût : ~0 USD.`,
      costWarning: '⚠️ Les dashboards CloudWatch au-delà de 3 et les alarmes au-delà de 10 sont facturés. Supprimez les ressources après le lab.',
      postLabQuiz: [
        {
          question: "Par défaut, quelles métriques CloudWatch ne sont PAS collectées sur une instance EC2 ?",
          options: [
            "L'utilisation CPU",
            "La RAM utilisée et l'espace disque (métriques internes à l'OS)",
            "Le trafic réseau",
            "Toutes les métriques sont collectées",
          ],
          correct: 1,
          explanation: "CloudWatch collecte par défaut les métriques visibles depuis l'hyperviseur (CPU, réseau, disque I/O) mais PAS la RAM utilisée ni l'espace disque (métriques internes à l'OS). Il faut installer le CloudWatch Agent pour ces métriques custom.",
        },
        {
          question: "Quel service AWS envoie les notifications d'une alarme CloudWatch ?",
          options: ['SES', 'SNS (Simple Notification Service)', 'SQS', 'EC2'],
          correct: 1,
          explanation: "Une alarme CloudWatch publie sur un topic SNS (Simple Notification Service), qui peut ensuite envoyer un email, un SMS, ou déclencher une fonction Lambda. SQS est pour les files de messages, SES pour l'email transactionnel.",
        },
      ],
      careerConnection: "L'observabilité est une compétence centrale des SRE et DevOps. Certifications : SAA-C03, AWS DevOps Pro. Rôles : SRE, Cloud Operations Engineer, DevOps Engineer.",
    },
    status: 'published',
  },
];

/* ─────────────────────────────────────────────────────────
 * GCP Labs — Beginner / Intermediate / Advanced
 * ───────────────────────────────────────────────────────── */

const GCP_BEGINNER_RAW: SeedLabRowUnchained[] = [
  {
    slug: 'gcp-beginner-console-iam',
    title: 'Explore Google Cloud Console & IAM',
    description: 'Découvrez la console GCP, créez un projet et configurez les rôles IAM — la fondation de toute pratique Google Cloud.',
    provider: 'gcp',
    difficulty: 'beginner',
    estimatedTime: '40 min',
    moduleTitle: 'GCP Foundations',
    tasks: [
      'Create a new GCP project',
      'Navigate the Cloud Console dashboard',
      'Create a service account with Viewer role',
      'Grant Editor role to a team member',
      'Review the IAM audit log in Cloud Logging',
    ],
    steps: [
      {
        title: 'Créer un projet GCP',
        instruction: `## La structure projet de GCP

Dans GCP, le **projet** est l'unité d'organisation centrale : toutes les ressources, la facturation et les permissions y sont rattachées.

1. Allez sur **https://console.cloud.google.com**
2. En haut, cliquez le sélecteur de projet → **New Project**
3. Project name : \`subul-lab-gcp\`
4. **Create**
5. Sélectionnez le nouveau projet dans le sélecteur`,
        hint: `💡 Hiérarchie GCP : Organization → Folders → Projects → Resources. Le projet est l'équivalent du Resource Group Azure ou du compte AWS pour isoler les ressources et la facturation.`,
        validationNote: `✅ Le projet \`subul-lab-gcp\` est créé et sélectionné (visible en haut de la console).`,
        estimatedMinutes: 8,
      },
      {
        title: 'Créer un service account avec le rôle Viewer',
        instruction: `## Identités machine avec les service accounts

Un **service account** est une identité pour les applications/VMs (pas pour les humains).

1. Menu ☰ → **IAM & Admin** → **Service Accounts** → **Create service account**
2. Name : \`sa-lab-viewer\`
3. Grant role : **Viewer** (lecture seule sur le projet)
4. **Done**`,
        hint: `💡 GCP a 3 types de rôles : Basic (Owner/Editor/Viewer — larges), Predefined (granulaires par service), Custom (sur mesure). En production, préférez les rôles Predefined au principe du moindre privilège.`,
        validationNote: `✅ Le service account \`sa-lab-viewer\` apparaît dans la liste avec le rôle Viewer.`,
        estimatedMinutes: 8,
      },
      {
        title: "Explorer l'audit log et nettoyer",
        instruction: `## Traçabilité avec Cloud Logging

GCP journalise automatiquement toutes les actions IAM.

1. Menu ☰ → **Logging** → **Logs Explorer**
2. Filtrez par resource type : **Audit Log** → observez les événements (création du SA, etc.)
3. Chaque action (qui, quoi, quand) est tracée pour l'audit de sécurité

**Nettoyage :** supprimez le service account (IAM & Admin → Service Accounts → Delete). Vous pouvez conserver le projet (gratuit s'il est vide).`,
        hint: `💡 Cloud Audit Logs enregistre "Admin Activity" (gratuit, toujours actif) et "Data Access" (payant, à activer). C'est essentiel pour la conformité et les enquêtes de sécurité.`,
        validationNote: `✅ Vous voyez les événements d'audit dans Logs Explorer. Service account supprimé.`,
        estimatedMinutes: 7,
      },
    ],
    metadata: {
      level: 'beginner',
      levelLabel: 'Beginner',
      index: 0,
      totalInLevel: 3,
      providerLoginUrl: 'https://console.cloud.google.com/',
      logo: GCP_LOGO,
      tags: ['gcp', 'iam', 'console', 'foundations'],
      learningObjectives: [
        'Créer un projet GCP et comprendre la hiérarchie des ressources',
        'Naviguer dans la Cloud Console',
        'Créer un service account avec un rôle IAM',
        'Consulter les audit logs dans Cloud Logging',
      ],
      prerequisites: ['Compte Google Cloud (300 USD de crédits gratuits)'],
      scenario: `Vous rejoignez **GCloud TN** comme ingénieur cloud junior. Avant tout déploiement, vous devez maîtriser la console GCP et configurer les identités du projet. Durée : ~25 min, coût : 0 USD.`,
      postLabQuiz: [
        {
          question: "Quelle est l'unité d'organisation centrale dans GCP ?",
          options: ['Le Resource Group', 'Le Projet', 'Le compte', 'La région'],
          correct: 1,
          explanation: "Dans GCP, le Projet est l'unité centrale : toutes les ressources, la facturation et les permissions IAM y sont rattachées. La hiérarchie est Organization → Folders → Projects → Resources.",
        },
        {
          question: "À quoi sert un service account dans GCP ?",
          options: [
            "À connecter des utilisateurs humains",
            "À fournir une identité aux applications et VMs (non-humaine)",
            "À payer les factures",
            "À créer des projets",
          ],
          correct: 1,
          explanation: "Un service account est une identité destinée aux applications, services et VMs — pas aux humains. Il permet à une VM d'accéder à des ressources GCP de façon sécurisée, sans identifiants codés en dur.",
        },
      ],
      careerConnection: "La maîtrise de GCP IAM est la base du métier de Cloud Engineer GCP. Certifications : Google Associate Cloud Engineer, Cloud Digital Leader. Rôles : GCP Cloud Engineer.",
    },
    status: 'published',
  },
  {
    slug: 'gcp-beginner-compute-engine',
    title: 'Launch a Compute Engine VM',
    description: 'Créez et connectez-vous à une VM Compute Engine, le service de calcul fondamental de GCP.',
    provider: 'gcp',
    difficulty: 'beginner',
    estimatedTime: '50 min',
    moduleTitle: 'Compute Basics',
    tasks: [
      'Create a Compute Engine VM (e2-micro, Debian)',
      'Configure firewall rules to allow HTTP traffic',
      'SSH into the VM via Cloud Shell',
      'Install nginx and verify the web page',
      'Stop and delete the instance to avoid charges',
    ],
    steps: [
      {
        title: 'Créer une VM Compute Engine',
        instruction: `## Déployer une VM e2-micro

**Compute Engine** est le service IaaS de GCP — l'équivalent d'EC2 (AWS) ou des VMs Azure.

1. Menu ☰ → **Compute Engine** → **VM instances** → **Create instance**
2. Name : \`vm-lab-gcp\`
3. Region : europe-west1, Zone : europe-west1-b
4. Machine type : **e2-micro** (éligible au free tier)
5. Boot disk : Debian 12
6. Firewall : cochez **Allow HTTP traffic**
7. **Create**`,
        hint: `💡 La e2-micro fait partie du "Always Free" tier de GCP (1 instance/mois dans certaines régions US). En europe-west1, elle est facturée mais très peu (~0.008 USD/h).`,
        validationNote: `✅ La VM \`vm-lab-gcp\` affiche un statut vert (Running) avec une IP externe.`,
        estimatedMinutes: 12,
      },
      {
        title: 'Se connecter via SSH et installer nginx',
        instruction: `## SSH en un clic et serveur web

1. Dans la liste des VMs → cliquez **SSH** à côté de \`vm-lab-gcp\` → un terminal s'ouvre dans le navigateur
2. Installez nginx :
\`\`\`bash
sudo apt update
sudo apt install -y nginx
\`\`\`
3. Ouvrez \`http://[IP-EXTERNE]\` dans un navigateur → page "Welcome to nginx!"`,
        hint: `💡 Le bouton SSH de GCP gère automatiquement les clés — pas besoin de générer ou télécharger une clé comme sur AWS. GCP injecte une clé temporaire dans la VM.`,
        validationNote: `✅ La page nginx s'affiche via l'IP externe de la VM.`,
        estimatedMinutes: 10,
      },
      {
        title: 'Arrêter et supprimer la VM',
        instruction: `## Nettoyage pour éviter les frais

1. Sélectionnez \`vm-lab-gcp\` → bouton **Delete** (poubelle) → Confirm
2. Vérifiez que la liste des VMs est vide

**Stop vs Delete sur GCP :**
- **Stop** : la VM est arrêtée mais le disque persistant reste facturé
- **Delete** : tout est supprimé`,
        hint: `💡 Comme sur AWS/Azure, une VM arrêtée (Stop) facture encore son disque. En lab, supprimez (Delete) pour ne rien payer.`,
        validationNote: `✅ La VM est supprimée et la liste Compute Engine est vide.`,
        estimatedMinutes: 5,
      },
    ],
    metadata: {
      level: 'beginner',
      levelLabel: 'Beginner',
      index: 1,
      totalInLevel: 3,
      providerLoginUrl: 'https://console.cloud.google.com/',
      logo: GCP_LOGO,
      tags: ['gcp', 'compute-engine', 'vm'],
      learningObjectives: [
        'Créer une VM Compute Engine e2-micro',
        'Activer les règles de firewall pour le trafic HTTP',
        'Se connecter via SSH navigateur intégré',
        'Gérer le cycle de vie de la VM pour éviter les frais',
      ],
      prerequisites: ['Lab gcp-beginner-console-iam'],
      scenario: `**WebGCP TN** veut héberger une application sur Google Cloud. Vous déployez une première VM Compute Engine avec un serveur web. Durée : ~28 min, coût : ~0.02 USD.`,
      costWarning: '⚠️ La VM e2-micro facture ~0.008 USD/h en Europe (gratuite en région US éligible). Supprimez-la après le lab.',
      sandboxUrl: 'https://www.cloudskillsboost.google/',
      postLabQuiz: [
        {
          question: "Quel service GCP est l'équivalent d'Amazon EC2 ?",
          options: ['Cloud Storage', 'Compute Engine', 'Cloud Functions', 'BigQuery'],
          correct: 1,
          explanation: "Compute Engine est le service IaaS de GCP qui fournit des machines virtuelles, équivalent à EC2 (AWS) ou aux Virtual Machines (Azure). Vous gérez l'OS et les applications, Google gère le matériel.",
        },
        {
          question: "Sur GCP, que facture encore une VM 'arrêtée' (Stop) ?",
          options: ['Rien', 'Le disque persistant', 'Le CPU', 'La bande passante'],
          correct: 1,
          explanation: "Une VM arrêtée ne facture plus le compute (CPU/RAM) mais son disque persistant continue d'être facturé. Pour ne plus rien payer, il faut supprimer (Delete) la VM et son disque.",
        },
      ],
      careerConnection: "Compute Engine est la base de l'infrastructure GCP. Certifications : Google Associate Cloud Engineer. Rôles : GCP Cloud Engineer, DevOps Engineer.",
    },
    status: 'published',
  },
  {
    slug: 'gcp-beginner-cloud-storage',
    title: 'Cloud Storage Buckets',
    description: 'Créez des buckets Cloud Storage, gérez les objets, le contrôle d\'accès et les politiques de cycle de vie.',
    provider: 'gcp',
    difficulty: 'beginner',
    estimatedTime: '35 min',
    moduleTitle: 'Storage Basics',
    tasks: [
      'Create a Cloud Storage bucket with Standard class',
      'Upload files via the Console and gsutil CLI',
      'Set object-level permissions (public read)',
      'Enable versioning on the bucket',
      'Configure a lifecycle rule to delete objects after 30 days',
    ],
    steps: [
      {
        title: 'Créer un bucket et uploader des objets',
        instruction: `## Stockage d'objets sur GCP

**Cloud Storage** stocke des objets (fichiers) dans des buckets — équivalent d'Amazon S3 ou Azure Blob.

1. Menu ☰ → **Cloud Storage** → **Buckets** → **Create**
2. Name : \`subul-bucket-[unique]\` (globalement unique)
3. Location type : Region → europe-west1
4. Storage class : **Standard**
5. **Create**
6. Ouvrez le bucket → **Upload files** → uploadez quelques fichiers`,
        hint: `💡 Les classes de stockage GCP : Standard (accès fréquent), Nearline (≥30j), Coldline (≥90j), Archive (≥365j). Équivalent des tiers Hot/Cool/Archive d'Azure.`,
        validationNote: `✅ Le bucket contient vos fichiers uploadés, en classe Standard.`,
        estimatedMinutes: 10,
      },
      {
        title: 'Activer le versioning et gérer les accès',
        instruction: `## Versioning et permissions

**Versioning** (garder l'historique des objets) :
1. Bucket → onglet **Protection** → Object Versioning → **Enable**

**Permissions (rendre un objet public) :**
2. Onglet **Permissions** → **Grant access** → Principal : \`allUsers\` → Role : **Storage Object Viewer**
3. ⚠️ Cela rend le bucket public — uniquement pour ce lab`,
        hint: `💡 Rendre un bucket public via allUsers est utile pour héberger un site statique, mais DANGEREUX pour des données sensibles. GCP affiche un avertissement "Public to internet". Désactivez après le lab.`,
        validationNote: `✅ Le versioning est activé et un objet est accessible publiquement (badge "Public").`,
        estimatedMinutes: 8,
      },
      {
        title: 'Configurer une lifecycle rule et nettoyer',
        instruction: `## Automatiser la suppression des vieux objets

1. Bucket → onglet **Lifecycle** → **Add a rule**
2. Action : **Delete object**
3. Condition : **Age** = 30 days
4. **Create** → les objets de plus de 30 jours seront supprimés automatiquement

**Nettoyage :** supprimez le bucket entier (Buckets → cochez → Delete).`,
        hint: `💡 Les lifecycle rules réduisent les coûts en supprimant ou rétrogradant automatiquement les vieux objets vers des classes moins chères (Nearline, Coldline, Archive).`,
        validationNote: `✅ La lifecycle rule (delete after 30j) est créée. Bucket supprimé après le lab.`,
        estimatedMinutes: 6,
      },
    ],
    metadata: {
      level: 'beginner',
      levelLabel: 'Beginner',
      index: 2,
      totalInLevel: 3,
      providerLoginUrl: 'https://console.cloud.google.com/',
      logo: GCP_LOGO,
      tags: ['gcp', 'cloud-storage', 'buckets'],
      learningObjectives: [
        'Créer un bucket Cloud Storage en classe Standard',
        'Gérer les objets et le versioning',
        'Configurer les permissions d\'accès (public/privé)',
        'Automatiser le cycle de vie des objets',
      ],
      prerequisites: ['Lab gcp-beginner-console-iam'],
      scenario: `**MediaStore TN** doit stocker des fichiers média avec une suppression automatique des vieux contenus. Vous configurez un bucket Cloud Storage avec versioning et lifecycle. Durée : ~25 min, coût : ~0 USD.`,
      postLabQuiz: [
        {
          question: "Quel service GCP est l'équivalent d'Amazon S3 ?",
          options: ['Compute Engine', 'Cloud Storage', 'Persistent Disk', 'BigQuery'],
          correct: 1,
          explanation: "Cloud Storage est le service de stockage d'objets de GCP, équivalent d'Amazon S3 ou Azure Blob Storage. Il stocke des fichiers dans des buckets avec différentes classes de stockage selon la fréquence d'accès.",
        },
        {
          question: "Quelle classe de stockage GCP choisir pour des archives consultées une fois par an ?",
          options: ['Standard', 'Nearline', 'Coldline', 'Archive'],
          correct: 3,
          explanation: "La classe Archive offre le coût de stockage le plus bas pour des données consultées très rarement (≥ 365 jours), comme des archives de conformité. En contrepartie, les coûts d'accès et de récupération sont plus élevés.",
        },
      ],
      careerConnection: "La gestion du stockage objet est essentielle pour les Data Engineers et Cloud Engineers GCP. Certifications : Google Associate Cloud Engineer, Professional Data Engineer.",
    },
    status: 'published',
  },
];

const GCP_INTERMEDIATE_RAW: SeedLabRowUnchained[] = [
  {
    slug: 'gcp-intermediate-gke-cluster',
    title: 'Deploy a GKE Cluster',
    description: 'Déployez un cluster Google Kubernetes Engine et une application conteneurisée scalable.',
    provider: 'gcp',
    difficulty: 'intermediate',
    estimatedTime: '90 min',
    moduleTitle: 'Kubernetes on GCP',
    tasks: [
      'Create a GKE Autopilot cluster',
      'Connect to the cluster via kubectl in Cloud Shell',
      'Deploy an nginx Deployment with 3 replicas',
      'Expose the app with a LoadBalancer Service',
      'Scale the deployment and observe pod distribution',
    ],
    steps: [
      {
        title: 'Créer un cluster GKE Autopilot',
        instruction: `## Kubernetes managé sur GCP

**GKE (Google Kubernetes Engine)** est le service Kubernetes managé de Google, créateur de Kubernetes. Le mode **Autopilot** gère entièrement les nodes.

1. Menu ☰ → **Kubernetes Engine** → **Clusters** → **Create**
2. Choisissez **Autopilot** (Google gère les nodes automatiquement)
3. Name : \`gke-lab\` → Region : europe-west1
4. **Create** (5-7 min)`,
        hint: `💡 Autopilot vs Standard : Autopilot facture par pod (Google gère les nodes), Standard facture par node (vous les gérez). Autopilot est plus simple et optimisé pour les coûts.`,
        validationNote: `✅ Le cluster \`gke-lab\` affiche un statut vert (Running) dans la liste Kubernetes Engine.`,
        estimatedMinutes: 12,
      },
      {
        title: 'Déployer nginx avec 3 replicas',
        instruction: `## Déployer une application conteneurisée

1. Cliquez **Connect** sur le cluster → **Run in Cloud Shell** → exécutez la commande gcloud affichée
2. Déployez nginx avec 3 replicas :
\`\`\`bash
kubectl create deployment nginx --image=nginx --replicas=3
kubectl expose deployment nginx --port=80 --type=LoadBalancer
kubectl get pods
\`\`\`
3. \`kubectl get pods\` doit montrer 3 pods en Running`,
        hint: `💡 Un "replica" est une copie identique du pod. 3 replicas = haute disponibilité + répartition de charge. Si un pod meurt, Kubernetes en recrée un automatiquement pour maintenir 3.`,
        validationNote: `✅ \`kubectl get pods\` affiche 3 pods nginx en statut Running.`,
        estimatedMinutes: 10,
      },
      {
        title: 'Exposer, scaler et nettoyer',
        instruction: `## Scaler et observer

1. Récupérez l'IP externe : \`kubectl get service nginx\` (attendez l'EXTERNAL-IP)
2. Ouvrez l'IP dans un navigateur → page nginx
3. Scalez à 5 replicas :
\`\`\`bash
kubectl scale deployment nginx --replicas=5
kubectl get pods
\`\`\`
4. **Nettoyage :** Kubernetes Engine → \`gke-lab\` → Delete`,
        hint: `💡 Le scaling Kubernetes est déclaratif : vous dites "je veux 5 replicas" et Kubernetes fait le nécessaire. C'est différent du scaling impératif où vous ajoutez les instances une par une.`,
        validationNote: `✅ Le déploiement passe à 5 pods. La page nginx est accessible. Cluster supprimé après le lab.`,
        estimatedMinutes: 10,
      },
    ],
    metadata: {
      level: 'intermediate',
      levelLabel: 'Intermediate',
      index: 0,
      totalInLevel: 2,
      providerLoginUrl: 'https://console.cloud.google.com/',
      logo: GCP_LOGO,
      tags: ['gcp', 'gke', 'kubernetes', 'containers'],
      learningObjectives: [
        'Créer un cluster GKE Autopilot managé',
        'Déployer une application conteneurisée avec replicas',
        'Exposer une app via un Service LoadBalancer',
        'Scaler un déploiement de façon déclarative',
      ],
      prerequisites: ['Lab gcp-beginner-compute-engine', 'Notions de conteneurs'],
      scenario: `**ContainerGCP TN** modernise ses applications vers Kubernetes. Vous déployez un cluster GKE managé et une application scalable. Durée : ~32 min, coût : ~0.15 USD.`,
      costWarning: '⚠️ GKE Autopilot facture les pods en cours d\'exécution + le load balancer. Supprimez le cluster IMPÉRATIVEMENT après le lab.',
      postLabQuiz: [
        {
          question: "Quelle est la différence entre GKE Autopilot et Standard ?",
          options: [
            "Autopilot est gratuit",
            "Autopilot gère automatiquement les nodes (facturé par pod) ; Standard vous laisse gérer les nodes",
            "Standard ne supporte pas Kubernetes",
            "Aucune différence",
          ],
          correct: 1,
          explanation: "En mode Autopilot, Google gère entièrement les nodes (provisioning, mise à l'échelle, sécurité) et facture par pod. En mode Standard, vous gérez et payez les nodes. Autopilot simplifie l'exploitation et optimise les coûts.",
        },
        {
          question: "Que se passe-t-il si un pod d'un déploiement à 3 replicas meurt ?",
          options: [
            "Le déploiement passe à 2 replicas définitivement",
            "Kubernetes recrée automatiquement un pod pour maintenir 3 replicas",
            "Le cluster s'arrête",
            "Il faut le recréer manuellement",
          ],
          correct: 1,
          explanation: "Kubernetes maintient l'état déclaré : si vous demandez 3 replicas, il s'assure qu'il y en a toujours 3. Si un pod meurt, le contrôleur de déploiement en recrée immédiatement un nouveau (self-healing).",
        },
      ],
      careerConnection: "GKE et Kubernetes sont parmi les compétences cloud les plus recherchées. Certifications : Google Professional Cloud Architect, CKA. Rôles : Platform Engineer, DevOps, SRE.",
    },
    status: 'published',
  },
  {
    slug: 'gcp-intermediate-cloud-functions',
    title: 'Serverless with Cloud Functions',
    description: 'Construisez des Cloud Functions serverless déclenchées par HTTP et Pub/Sub.',
    provider: 'gcp',
    difficulty: 'intermediate',
    estimatedTime: '60 min',
    moduleTitle: 'Serverless Computing',
    tasks: [
      'Create an HTTP-triggered Cloud Function (Python)',
      'Test the function via curl and Cloud Console',
      'Create a Pub/Sub topic and subscription',
      'Deploy a Pub/Sub-triggered Cloud Function',
      'Monitor function executions in Cloud Logging',
    ],
    steps: [
      {
        title: 'Créer une Cloud Function HTTP',
        instruction: `## Serverless sur GCP

**Cloud Functions** exécute du code sans gérer de serveur — équivalent d'AWS Lambda ou Azure Functions.

1. Menu ☰ → **Cloud Functions** → **Create function**
2. Environment : 2nd gen → Name : \`fn-hello\` → Region : europe-west1
3. Trigger : **HTTPS** → Allow unauthenticated invocations
4. Runtime : Python 3.12 → gardez le code par défaut (hello_http)
5. **Deploy** (2-3 min)`,
        hint: `💡 Cloud Functions 2nd gen est basé sur Cloud Run et offre plus de mémoire, des timeouts plus longs et la concurrence. Préférez-la à la 1st gen pour les nouveaux projets.`,
        validationNote: `✅ La fonction \`fn-hello\` est déployée avec un statut vert et une URL de déclenchement.`,
        estimatedMinutes: 10,
      },
      {
        title: 'Tester la fonction',
        instruction: `## Invoquer la fonction HTTP

1. Ouvrez la fonction → onglet **Trigger** → copiez l'URL
2. Testez dans le navigateur ou via Cloud Shell :
\`\`\`bash
curl "https://[REGION]-[PROJECT].cloudfunctions.net/fn-hello?name=Subul"
\`\`\`
3. La réponse affiche "Hello Subul!"
4. Onglet **Testing** dans la console permet aussi de tester directement`,
        hint: `💡 "Allow unauthenticated" rend la fonction publique. En production, on exige l'authentification (IAM) et on n'expose que via API Gateway ou Load Balancer.`,
        validationNote: `✅ La requête HTTP retourne une réponse personnalisée "Hello Subul!".`,
        estimatedMinutes: 8,
      },
      {
        title: 'Monitorer et nettoyer',
        instruction: `## Observabilité et nettoyage

1. Fonction → onglet **Logs** → observez les exécutions tracées dans Cloud Logging
2. Onglet **Metrics** → invocations, latence, utilisation mémoire
3. Chaque invocation est facturée — gratuit sous 2M d'appels/mois

**Nettoyage :** Cloud Functions → \`fn-hello\` → Delete.`,
        hint: `💡 GCP Cloud Functions offre 2 millions d'invocations gratuites par mois. Au-delà, facturation par invocation + temps de calcul + mémoire, comme AWS Lambda.`,
        validationNote: `✅ Vous voyez les logs et métriques d'exécution. Fonction supprimée après le lab.`,
        estimatedMinutes: 7,
      },
    ],
    metadata: {
      level: 'intermediate',
      levelLabel: 'Intermediate',
      index: 1,
      totalInLevel: 2,
      providerLoginUrl: 'https://console.cloud.google.com/',
      logo: GCP_LOGO,
      tags: ['gcp', 'cloud-functions', 'serverless', 'pubsub'],
      learningObjectives: [
        'Déployer une Cloud Function déclenchée par HTTP',
        'Tester et invoquer une fonction serverless',
        'Monitorer les exécutions dans Cloud Logging',
        'Comprendre le modèle de facturation serverless',
      ],
      prerequisites: ['Lab gcp-beginner-console-iam'],
      scenario: `**ServerlessGCP TN** veut traiter des événements ponctuels sans gérer de serveur. Vous déployez une Cloud Function HTTP serverless. Durée : ~25 min, coût : ~0 USD (sous le quota gratuit).`,
      costWarning: '⚠️ Cloud Functions offre 2M d\'invocations gratuites/mois. Supprimez la fonction après le lab pour éviter tout frais résiduel.',
      postLabQuiz: [
        {
          question: "Quel service GCP est l'équivalent d'AWS Lambda ?",
          options: ['Compute Engine', 'Cloud Functions', 'GKE', 'Cloud Storage'],
          correct: 1,
          explanation: "Cloud Functions est le service serverless de GCP, équivalent d'AWS Lambda ou Azure Functions. Il exécute du code en réponse à des événements (HTTP, Pub/Sub, Storage) sans que vous gériez de serveur.",
        },
        {
          question: "Quel est l'avantage principal du serverless (Cloud Functions) ?",
          options: [
            "Plus de contrôle sur l'OS",
            "Aucune gestion de serveur + paiement uniquement à l'exécution",
            "Stockage illimité gratuit",
            "Connexion SSH directe",
          ],
          correct: 1,
          explanation: "Le serverless élimine la gestion de serveurs et facture uniquement les exécutions réelles (zéro coût à l'inactivité). Idéal pour des charges événementielles ou sporadiques, avec une mise à l'échelle automatique.",
        },
      ],
      careerConnection: "Le serverless est très demandé pour réduire les coûts d'infrastructure. Certifications : Google Professional Cloud Developer. Rôles : Cloud Developer, Solutions Architect.",
    },
    status: 'published',
  },
];

const GCP_ADVANCED_RAW: SeedLabRowUnchained[] = [
  {
    slug: 'gcp-advanced-vpc-networking',
    title: 'Advanced VPC Networking & Peering',
    description: 'Concevez des architectures multi-VPC avec peering, Cloud NAT et Private Google Access. ⚠️ Niveau avancé.',
    provider: 'gcp',
    difficulty: 'advanced',
    estimatedTime: '120 min',
    moduleTitle: 'Networking Deep Dive',
    tasks: [
      'Create two custom-mode VPC networks with subnets',
      'Set up VPC peering between the two networks',
      'Configure Cloud NAT for private instances',
      'Enable Private Google Access on a subnet',
      'Create firewall rules and test cross-VPC connectivity',
      'Verify routing tables and peering status',
    ],
    steps: [
      {
        title: 'Créer deux VPC custom-mode',
        instruction: `## Réseaux virtuels isolés

1. Menu ☰ → **VPC network** → **Create VPC network**
2. VPC 1 : name \`vpc-a\` → Subnet creation mode : **Custom** → subnet \`subnet-a\` : 10.0.1.0/24 (europe-west1)
3. Répétez pour VPC 2 : \`vpc-b\` → subnet \`subnet-b\` : 10.0.2.0/24
4. Les CIDR ne se chevauchent pas (requis pour le peering)`,
        hint: `💡 Custom-mode VPC = vous contrôlez chaque subnet. Auto-mode = GCP crée un subnet par région automatiquement. En production, on utilise toujours custom-mode pour la maîtrise.`,
        validationNote: `✅ Deux VPC \`vpc-a\` et \`vpc-b\` existent avec des subnets non chevauchants.`,
        estimatedMinutes: 12,
      },
      {
        title: 'Configurer le VPC Peering',
        instruction: `## Connecter deux VPC de façon privée

Le **VPC peering** relie deux VPC pour qu'ils communiquent via IP privées, sans passer par Internet.

1. VPC network → **VPC Network Peering** → **Create connection**
2. Peering 1 : name \`peer-a-to-b\` → Your VPC : \`vpc-a\` → Peered VPC : \`vpc-b\`
3. Créez le peering RÉCIPROQUE : \`peer-b-to-a\` (vpc-b → vpc-a)
4. Le peering devient ACTIVE quand les deux côtés sont créés`,
        hint: `💡 Le VPC peering doit être configuré des DEUX côtés pour devenir actif — c'est une relation bidirectionnelle. Le peering n'est pas transitif : A-B et B-C ne donnent pas A-C.`,
        validationNote: `✅ Les deux peerings affichent le statut "ACTIVE". Les routes vers les subnets distants apparaissent.`,
        estimatedMinutes: 12,
      },
      {
        title: 'Cloud NAT, Private Google Access et nettoyer',
        instruction: `## Sortie Internet sécurisée pour instances privées

**Cloud NAT** permet aux VMs sans IP publique d'accéder à Internet (mises à jour, etc.) sans être exposées.

1. VPC network → **Cloud NAT** → **Create Cloud NAT gateway**
2. Name : \`nat-a\` → Network : \`vpc-a\` → Region : europe-west1 → Cloud Router : créez-en un
3. **Private Google Access** : sur le subnet → Edit → Private Google Access : **On** (accès aux API Google sans IP publique)

**Nettoyage :** supprimez Cloud NAT, les peerings, puis les deux VPC.`,
        hint: `💡 Cloud NAT (sortie Internet pour instances privées) ≠ Load Balancer (entrée). Private Google Access permet d'atteindre les API Google (Storage, BigQuery) sans IP publique ni passage par Internet.`,
        validationNote: `✅ Cloud NAT est actif et Private Google Access est activé sur le subnet. Toutes les ressources supprimées après le lab.`,
        estimatedMinutes: 15,
      },
    ],
    metadata: {
      level: 'advanced',
      levelLabel: 'Advanced',
      index: 0,
      totalInLevel: 2,
      providerLoginUrl: 'https://console.cloud.google.com/',
      logo: GCP_LOGO,
      tags: ['gcp', 'vpc', 'networking', 'peering', 'cloud-nat'],
      learningObjectives: [
        'Concevoir des architectures multi-VPC custom-mode',
        'Configurer le VPC peering bidirectionnel',
        'Mettre en place Cloud NAT pour instances privées',
        'Activer Private Google Access',
      ],
      prerequisites: ['Lab gcp-beginner-compute-engine', 'Notions de réseau IP/CIDR'],
      scenario: `**NetArchGCP TN** doit relier deux environnements isolés (prod et data) tout en gardant les serveurs data sans accès Internet direct. Vous concevez l'architecture réseau multi-VPC. Durée : ~40 min, coût : ~0.10 USD.`,
      costWarning: '⚠️ Cloud NAT et Cloud Router facturent des frais horaires. Supprimez toutes les ressources réseau après le lab.',
      postLabQuiz: [
        {
          question: "Le VPC peering sur GCP est-il transitif (A-B + B-C donne A-C) ?",
          options: [
            "Oui, automatiquement",
            "Non, le peering n'est jamais transitif — il faut le configurer entre chaque paire",
            "Seulement dans la même région",
            "Seulement avec Cloud NAT",
          ],
          correct: 1,
          explanation: "Le VPC peering n'est PAS transitif : si A est peeré avec B, et B avec C, alors A ne communique pas avec C automatiquement. Il faut un peering explicite entre chaque paire de VPC qui doivent communiquer.",
        },
        {
          question: "À quoi sert Cloud NAT ?",
          options: [
            "À exposer des serveurs à Internet",
            "À permettre aux VMs privées (sans IP publique) d'accéder à Internet en sortie",
            "À équilibrer la charge",
            "À chiffrer le trafic",
          ],
          correct: 1,
          explanation: "Cloud NAT permet aux instances sans IP publique d'initier des connexions sortantes vers Internet (mises à jour, API externes) sans être exposées aux connexions entrantes. C'est une sortie sécurisée, pas une entrée.",
        },
      ],
      careerConnection: "L'architecture réseau cloud avancée est une spécialité très valorisée. Certifications : Google Professional Cloud Network Engineer. Rôles : Cloud Network Architect.",
    },
    status: 'published',
  },
  {
    slug: 'gcp-advanced-bigquery-ml',
    title: 'BigQuery ML — Train & Predict',
    description: 'Construisez un modèle de machine learning directement en SQL avec BigQuery ML. ⚠️ Niveau avancé.',
    provider: 'gcp',
    difficulty: 'advanced',
    estimatedTime: '100 min',
    moduleTitle: 'Data & AI',
    tasks: [
      'Load a public dataset into BigQuery',
      'Explore the data with SQL queries',
      'Create a logistic regression model with CREATE MODEL',
      'Evaluate the model with ML.EVALUATE',
      'Generate predictions with ML.PREDICT',
      'Export predictions to a Cloud Storage bucket',
    ],
    steps: [
      {
        title: 'Explorer un dataset public dans BigQuery',
        instruction: `## Machine Learning en SQL

**BigQuery ML** permet d'entraîner des modèles ML directement avec des requêtes SQL — sans Python ni infrastructure ML.

1. Menu ☰ → **BigQuery**
2. Dans l'éditeur, explorez un dataset public :
\`\`\`sql
SELECT * FROM \`bigquery-public-data.ml_datasets.census_adult_income\`
LIMIT 100;
\`\`\`
3. Ce dataset prédit si un revenu dépasse 50k USD selon des caractéristiques démographiques`,
        hint: `💡 BigQuery ML démocratise le ML : les analystes data qui connaissent SQL peuvent créer des modèles sans apprendre Python/TensorFlow. Idéal pour le prototypage rapide.`,
        validationNote: `✅ La requête retourne 100 lignes du dataset census. Vous identifiez la colonne cible (income_bracket).`,
        estimatedMinutes: 10,
      },
      {
        title: 'Créer et évaluer un modèle de régression logistique',
        instruction: `## Entraîner un modèle en une requête

1. Créez d'abord un dataset BigQuery : \`census_ml\`
2. Entraînez un modèle de classification :
\`\`\`sql
CREATE OR REPLACE MODEL census_ml.income_model
OPTIONS(model_type='logistic_reg', input_label_cols=['income_bracket']) AS
SELECT age, workclass, education_num, hours_per_week, income_bracket
FROM \`bigquery-public-data.ml_datasets.census_adult_income\`;
\`\`\`
3. Évaluez la performance :
\`\`\`sql
SELECT * FROM ML.EVALUATE(MODEL census_ml.income_model);
\`\`\``,
        hint: `💡 ML.EVALUATE retourne precision, recall, accuracy, f1_score, roc_auc. Un roc_auc proche de 1 = excellent modèle ; proche de 0.5 = aléatoire. Visez > 0.8 pour un bon modèle.`,
        validationNote: `✅ Le modèle est entraîné (visible dans le dataset census_ml). ML.EVALUATE retourne les métriques de performance.`,
        estimatedMinutes: 15,
      },
      {
        title: 'Générer des prédictions et nettoyer',
        instruction: `## Prédire avec ML.PREDICT

1. Générez des prédictions sur de nouvelles données :
\`\`\`sql
SELECT predicted_income_bracket, age, hours_per_week
FROM ML.PREDICT(MODEL census_ml.income_model,
  (SELECT age, workclass, education_num, hours_per_week
   FROM \`bigquery-public-data.ml_datasets.census_adult_income\` LIMIT 10));
\`\`\`
2. Chaque ligne reçoit une prédiction (>50K ou <=50K)

**Nettoyage :** supprimez le dataset \`census_ml\` (il contient le modèle).`,
        hint: `💡 BigQuery ML facture l'entraînement selon les données traitées (~5 USD/TB). Les datasets publics sont gratuits à requêter sous le quota de 1 TB/mois gratuit. Supprimez votre modèle après le lab.`,
        validationNote: `✅ ML.PREDICT retourne des prédictions de revenu pour 10 individus. Dataset census_ml supprimé.`,
        estimatedMinutes: 12,
      },
    ],
    metadata: {
      level: 'advanced',
      levelLabel: 'Advanced',
      index: 1,
      totalInLevel: 2,
      providerLoginUrl: 'https://console.cloud.google.com/',
      logo: GCP_LOGO,
      tags: ['gcp', 'bigquery', 'ml', 'data-analytics'],
      learningObjectives: [
        'Explorer des datasets publics dans BigQuery',
        'Entraîner un modèle de régression logistique en SQL',
        'Évaluer un modèle avec ML.EVALUATE',
        'Générer des prédictions avec ML.PREDICT',
      ],
      prerequisites: ['Lab gcp-beginner-cloud-storage', 'Notions de SQL'],
      scenario: `**DataAI TN** veut prédire le segment de revenu de ses clients sans embaucher de data scientist. Vous démontrez la puissance de BigQuery ML en SQL pur. Durée : ~37 min, coût : ~0 USD (quota gratuit).`,
      costWarning: '⚠️ BigQuery facture les données traitées (1 TB/mois gratuit). Ce lab reste sous le quota. Supprimez le dataset modèle après le lab.',
      postLabQuiz: [
        {
          question: "Quel est l'avantage clé de BigQuery ML ?",
          options: [
            "Il remplace toutes les bases de données",
            "Il permet d'entraîner des modèles ML directement en SQL, sans Python ni infrastructure ML",
            "Il est plus rapide qu'un GPU",
            "Il chiffre les données",
          ],
          correct: 1,
          explanation: "BigQuery ML permet de créer, entraîner et utiliser des modèles de machine learning avec de simples requêtes SQL (CREATE MODEL, ML.EVALUATE, ML.PREDICT). Cela démocratise le ML pour les analystes data sans compétences Python/TensorFlow.",
        },
        {
          question: "Que retourne la fonction ML.EVALUATE ?",
          options: [
            "Les données brutes",
            "Les métriques de performance du modèle (precision, recall, accuracy, roc_auc)",
            "Le code source du modèle",
            "Le coût d'entraînement",
          ],
          correct: 1,
          explanation: "ML.EVALUATE retourne les métriques d'évaluation du modèle : precision, recall, accuracy, f1_score et roc_auc. Ces métriques permettent de juger la qualité du modèle avant de l'utiliser en production.",
        },
      ],
      careerConnection: "BigQuery ML est très recherché pour le ML accessible aux équipes data. Certifications : Google Professional Data Engineer, Professional ML Engineer. Rôles : Data Engineer, ML Engineer, Data Analyst.",
    },
    status: 'published',
  },
];

/* ─────────────────────────────────────────────────────────
 * AWS Advanced Labs
 * ───────────────────────────────────────────────────────── */

const AWS_ADVANCED_RAW: SeedLabRowUnchained[] = [
  {
    slug: 'aws-advanced-vpc-peering-transit',
    title: 'VPC Peering & Transit Gateway',
    description: 'Architecturez une connectivité multi-VPC avec peering et Transit Gateway. ⚠️ Niveau avancé.',
    provider: 'aws',
    difficulty: 'advanced',
    estimatedTime: '120 min',
    moduleTitle: 'Advanced Networking',
    tasks: [
      'Create two VPCs with non-overlapping CIDR blocks',
      'Establish VPC peering connection and update route tables',
      'Launch instances in each VPC and verify connectivity',
      'Create a Transit Gateway and attach both VPCs',
      'Add a third VPC and route through Transit Gateway',
      'Test end-to-end connectivity across all three VPCs',
    ],
    steps: [
      {
        title: 'Créer deux VPC et établir le peering',
        instruction: `## Connecter deux VPC par peering

1. Console **VPC** → **Create VPC** → \`vpc-a\` (CIDR 10.0.0.0/16) avec un subnet
2. Répétez : \`vpc-b\` (CIDR 10.1.0.0/16) ← CIDR non chevauchant, obligatoire
3. Menu gauche → **Peering connections** → **Create peering connection** → vpc-a ↔ vpc-b
4. Sélectionnez le peering → **Actions** → **Accept request**
5. Mettez à jour les **route tables** de chaque VPC pour router vers le CIDR de l'autre`,
        hint: `💡 Le peering AWS n'est PAS transitif (comme GCP). Après le peering, il faut OBLIGATOIREMENT ajouter les routes dans les route tables, sinon le trafic ne passe pas malgré le peering actif.`,
        validationNote: `✅ Le peering est "Active" et les route tables des deux VPC contiennent une route vers le CIDR distant.`,
        estimatedMinutes: 15,
      },
      {
        title: 'Déployer un Transit Gateway pour relier 3+ VPC',
        instruction: `## Transit Gateway — le hub réseau

Le peering ne scale pas (N VPC = N² connexions). **Transit Gateway** est un hub central qui relie tous les VPC.

1. Console VPC → **Transit Gateways** → **Create transit gateway** → \`tgw-lab\`
2. **Transit Gateway Attachments** → attachez vpc-a, vpc-b, et un vpc-c
3. Mettez à jour les route tables des VPC pour router via le Transit Gateway
4. Maintenant les 3 VPC communiquent via un hub unique`,
        hint: `💡 Transit Gateway (hub-and-spoke) remplace le maillage complet du peering. Pour 10 VPC : peering = 45 connexions, Transit Gateway = 10 attachments. Beaucoup plus simple à gérer.`,
        validationNote: `✅ Le Transit Gateway \`tgw-lab\` a 3 attachments actifs. Les VPC peuvent communiquer entre eux via le TGW.`,
        estimatedMinutes: 18,
      },
      {
        title: 'Tester la connectivité et nettoyer',
        instruction: `## Vérifier et nettoyer

1. Lancez une instance EC2 dans chaque VPC
2. Depuis une instance, pingez l'IP privée d'une instance dans un autre VPC → réponse OK
3. Cela prouve la connectivité cross-VPC via le Transit Gateway

**Nettoyage CRITIQUE (le TGW facture cher) :**
4. Détachez les VPC du TGW → supprimez le TGW → supprimez les peerings → terminez les instances → supprimez les VPC`,
        hint: `💡 Le Transit Gateway facture par attachment ET par Go de données traité. C'est un des services réseau les plus chers — ne l'oubliez JAMAIS allumé après un lab.`,
        validationNote: `✅ Le ping cross-VPC fonctionne. Toutes les ressources (TGW, peerings, instances, VPC) sont supprimées.`,
        estimatedMinutes: 12,
      },
    ],
    metadata: {
      level: 'advanced',
      levelLabel: 'Advanced',
      index: 0,
      totalInLevel: 4,
      providerLoginUrl: 'https://aws.amazon.com/console/',
      logo: AWS_LOGO,
      tags: ['aws', 'vpc', 'networking', 'transit-gateway'],
      learningObjectives: [
        'Concevoir des architectures réseau multi-VPC',
        'Configurer le VPC peering et les route tables',
        'Déployer un Transit Gateway hub-and-spoke',
        'Gérer le routage cross-VPC',
      ],
      prerequisites: ['Labs AWS EC2', 'Notions réseau IP/CIDR'],
      scenario: `**EnterpriseNet TN** gère 3 environnements isolés (prod, dev, shared services) qui doivent communiquer. Vous concevez une architecture Transit Gateway scalable. Durée : ~45 min, coût : ~0.20 USD.`,
      costWarning: '⚠️ Le Transit Gateway est cher (par attachment + par Go). Supprimez-le IMMÉDIATEMENT après le lab.',
      postLabQuiz: [
        {
          question: "Pourquoi préférer un Transit Gateway au VPC peering pour relier 10 VPC ?",
          options: [
            "Le peering est payant, le TGW gratuit",
            "Le peering nécessite N² connexions (maillage) ; le TGW est un hub central simple",
            "Le peering ne fonctionne qu'en une région",
            "Aucune raison",
          ],
          correct: 1,
          explanation: "Le VPC peering nécessite une connexion entre chaque paire de VPC (maillage complet = N² connexions, soit 45 pour 10 VPC). Le Transit Gateway agit comme un hub central : chaque VPC s'y attache une fois (10 attachments). Bien plus simple à gérer à grande échelle.",
        },
        {
          question: "Après avoir créé un VPC peering actif, le trafic passe-t-il automatiquement ?",
          options: [
            "Oui, immédiatement",
            "Non, il faut aussi mettre à jour les route tables des VPC",
            "Seulement avec un Transit Gateway",
            "Seulement après redémarrage des instances",
          ],
          correct: 1,
          explanation: "Un peering actif ne suffit pas : il faut explicitement ajouter des routes dans les route tables de chaque VPC pointant vers le CIDR distant. Sans ces routes, le trafic ne sait pas où aller malgré le peering établi.",
        },
      ],
      careerConnection: "L'architecture réseau multi-VPC est une compétence senior très valorisée. Certifications : AWS Advanced Networking Specialty, SAA-C03. Rôles : Cloud Network Architect.",
    },
    status: 'published',
  },
  {
    slug: 'aws-advanced-ecs-fargate',
    title: 'Deploy Containers on ECS Fargate',
    description: 'Construisez une architecture de conteneurs serverless avec ECS Fargate et un load balancer. ⚠️ Niveau avancé.',
    provider: 'aws',
    difficulty: 'advanced',
    estimatedTime: '100 min',
    moduleTitle: 'Container Orchestration',
    tasks: [
      'Create an ECR repository and push a Docker image',
      'Define an ECS task definition with Fargate launch type',
      'Create an ECS cluster and service',
      'Configure an Application Load Balancer for the service',
      'Set up ECS Service Auto Scaling based on CPU',
      'Monitor container logs in CloudWatch',
    ],
    steps: [
      {
        title: 'Préparer une image dans ECR',
        instruction: `## Registre de conteneurs ECR

**ECR (Elastic Container Registry)** stocke vos images Docker, comme Docker Hub mais privé et intégré à AWS.

1. Console → **ECR** → **Create repository** → \`app-lab\`
2. Suivez les "View push commands" pour pousser une image (ou utilisez l'image publique \`nginx\` pour simplifier)
3. Via Cloud Shell / CLI :
\`\`\`bash
docker pull nginx
docker tag nginx [ECR_URI]:latest
docker push [ECR_URI]:latest
\`\`\``,
        hint: `💡 ECS Fargate est "serverless containers" : vous ne gérez aucune VM (contrairement à ECS sur EC2). AWS provisionne et facture uniquement les ressources des conteneurs en cours.`,
        validationNote: `✅ Le repository ECR \`app-lab\` contient une image taguée "latest".`,
        estimatedMinutes: 12,
      },
      {
        title: 'Créer le cluster, la task definition et le service',
        instruction: `## Déployer sur Fargate

1. Console **ECS** → **Create cluster** → \`cluster-lab\` (Fargate)
2. **Task definitions** → **Create** → launch type **Fargate**
   - Container : votre image ECR, port 80
   - CPU : 0.25 vCPU, Memory : 0.5 GB
3. **Create service** dans le cluster → task definition → desired tasks : 2
4. Configurez un **Application Load Balancer** pour exposer le service`,
        hint: `💡 La "task definition" est le plan (image, CPU, RAM, ports). La "task" est une instance en cours. Le "service" maintient un nombre désiré de tasks et les remplace si elles tombent (comme un ASG pour conteneurs).`,
        validationNote: `✅ Le service ECS lance 2 tasks en Running, accessibles via le DNS de l'ALB.`,
        estimatedMinutes: 18,
      },
      {
        title: 'Auto scaling, logs et nettoyage',
        instruction: `## Élasticité et observabilité

1. Service ECS → **Auto Scaling** → target tracking sur CPU 50%, min 2 / max 6
2. **Logs** : les logs des conteneurs sont automatiquement envoyés à CloudWatch (awslogs driver)
3. Consultez CloudWatch → Log groups → \`/ecs/app-lab\`

**Nettoyage :** supprimez le service, le cluster, l'ALB, et le repository ECR.`,
        hint: `💡 Fargate facture à la seconde selon le vCPU et la RAM alloués aux tasks. Toujours supprimer le service (qui maintient les tasks) ET l'ALB après le lab.`,
        validationNote: `✅ L'auto scaling est configuré et les logs apparaissent dans CloudWatch. Toutes les ressources supprimées.`,
        estimatedMinutes: 12,
      },
    ],
    metadata: {
      level: 'advanced',
      levelLabel: 'Advanced',
      index: 1,
      totalInLevel: 4,
      providerLoginUrl: 'https://aws.amazon.com/console/',
      logo: AWS_LOGO,
      tags: ['aws', 'ecs', 'fargate', 'containers', 'docker'],
      learningObjectives: [
        'Stocker des images Docker dans ECR',
        'Déployer des conteneurs serverless sur Fargate',
        'Configurer un ALB avec un service ECS',
        'Mettre en place l\'auto scaling de conteneurs',
      ],
      prerequisites: ['Labs AWS EC2 Intermédiaire', 'Notions Docker'],
      scenario: `**MicroServ TN** veut déployer ses microservices conteneurisés sans gérer de serveurs. Vous mettez en place ECS Fargate avec load balancing et auto scaling. Durée : ~42 min, coût : ~0.15 USD.`,
      costWarning: '⚠️ Fargate facture vCPU + RAM à la seconde, et l\'ALB facture à l\'heure. Supprimez le service et l\'ALB après le lab.',
      postLabQuiz: [
        {
          question: "Qu'est-ce qui caractérise ECS Fargate par rapport à ECS sur EC2 ?",
          options: [
            "Fargate est gratuit",
            "Fargate est serverless : vous ne gérez aucune VM, AWS provisionne les conteneurs",
            "Fargate ne supporte pas Docker",
            "Fargate est plus lent",
          ],
          correct: 1,
          explanation: "ECS Fargate est le mode 'serverless' : vous définissez vos conteneurs et AWS gère entièrement l'infrastructure sous-jacente (pas de VM à patcher ou dimensionner). En mode EC2, vous gérez les instances qui hébergent les conteneurs.",
        },
        {
          question: "Quel est le rôle d'un 'service' ECS ?",
          options: [
            "Stocker les images Docker",
            "Maintenir un nombre désiré de tasks et les remplacer si elles tombent",
            "Gérer la facturation",
            "Chiffrer les conteneurs",
          ],
          correct: 1,
          explanation: "Un service ECS maintient en permanence le nombre désiré de tasks en cours d'exécution. Si une task échoue, le service en relance une automatiquement. Il s'intègre aussi avec l'ALB et l'auto scaling — l'équivalent d'un Auto Scaling Group pour conteneurs.",
        },
      ],
      careerConnection: "Les conteneurs serverless sont au cœur des architectures modernes. Certifications : SAA-C03, AWS DevOps Pro. Rôles : DevOps Engineer, Platform Engineer, Cloud Architect.",
    },
    status: 'published',
  },
  {
    slug: 'aws-advanced-lambda-api-gateway',
    title: 'Serverless API with Lambda & API Gateway',
    description: 'Construisez une API REST serverless avec Lambda, API Gateway et DynamoDB. ⚠️ Niveau avancé.',
    provider: 'aws',
    difficulty: 'advanced',
    estimatedTime: '110 min',
    moduleTitle: 'Serverless Architecture',
    tasks: [
      'Create a DynamoDB table for storing items',
      'Write Lambda functions for CRUD operations (Node.js)',
      'Create a REST API in API Gateway',
      'Connect API routes to Lambda functions',
      'Enable API key authentication',
      'Test the full CRUD API with curl or Postman',
    ],
    steps: [
      {
        title: 'Créer une table DynamoDB',
        instruction: `## Base de données NoSQL serverless

**DynamoDB** est la base NoSQL managée d'AWS — scalable, sans serveur, latence < 10ms.

1. Console → **DynamoDB** → **Create table**
2. Table name : \`Items\`
3. Partition key : \`id\` (String)
4. Capacity : **On-demand** (paiement à l'usage, pas de provisioning)
5. **Create table**`,
        hint: `💡 La partition key (clé de partition) détermine la distribution des données. DynamoDB On-demand facture par requête (pas de capacité à provisionner) — idéal pour des charges imprévisibles.`,
        validationNote: `✅ La table \`Items\` est en statut "Active" avec une partition key \`id\`.`,
        estimatedMinutes: 8,
      },
      {
        title: 'Créer une Lambda CRUD et l\'API Gateway',
        instruction: `## Logique serverless + exposition REST

1. Console **Lambda** → **Create function** → \`crud-items\` → Node.js
2. Code : opérations CRUD sur DynamoDB (PutItem, GetItem, Scan, DeleteItem) via le SDK AWS
3. Donnez à la Lambda un rôle IAM avec permissions DynamoDB
4. Console **API Gateway** → **Create API** → **REST API**
5. Créez les ressources/méthodes : GET /items, POST /items, DELETE /items/{id}
6. Intégrez chaque méthode à la Lambda \`crud-items\` → **Deploy API**`,
        hint: `💡 Architecture serverless classique : API Gateway (porte d'entrée HTTP) → Lambda (logique) → DynamoDB (données). Aucun serveur à gérer, scaling automatique, paiement à l'usage.`,
        validationNote: `✅ L'API REST est déployée avec une URL d'invocation. Les méthodes GET/POST/DELETE sont liées à la Lambda.`,
        estimatedMinutes: 20,
      },
      {
        title: 'Sécuriser, tester et nettoyer',
        instruction: `## API Key et tests

1. API Gateway → créez une **API Key** + **Usage Plan** → activez "API Key Required" sur les méthodes
2. Testez avec curl :
\`\`\`bash
curl -X POST [API_URL]/items -H "x-api-key: [KEY]" -d '{"id":"1","name":"test"}'
curl [API_URL]/items -H "x-api-key: [KEY]"
\`\`\`
3. **Nettoyage :** supprimez l'API, la Lambda, le rôle IAM et la table DynamoDB`,
        hint: `💡 Les API Keys identifient l'appelant et appliquent des quotas (usage plans), mais ne sont PAS une authentification forte. Pour de la vraie auth, utilisez Cognito ou un Lambda Authorizer (JWT).`,
        validationNote: `✅ Les requêtes CRUD fonctionnent avec l'API key. Toutes les ressources supprimées après le lab.`,
        estimatedMinutes: 12,
      },
    ],
    metadata: {
      level: 'advanced',
      levelLabel: 'Advanced',
      index: 2,
      totalInLevel: 4,
      providerLoginUrl: 'https://aws.amazon.com/console/',
      logo: AWS_LOGO,
      tags: ['aws', 'lambda', 'api-gateway', 'dynamodb', 'serverless'],
      learningObjectives: [
        'Créer une table DynamoDB On-demand',
        'Écrire des Lambda CRUD intégrées à DynamoDB',
        'Exposer une API REST via API Gateway',
        'Sécuriser une API avec des API Keys et usage plans',
      ],
      prerequisites: ['Notions IAM', 'Notions de programmation (Node.js)'],
      scenario: `**APIBuilder TN** lance un backend mobile qui doit scaler sans gérer de serveurs. Vous construisez une API REST 100% serverless (API Gateway + Lambda + DynamoDB). Durée : ~40 min, coût : ~0 USD (Free Tier).`,
      costWarning: '⚠️ Lambda, API Gateway et DynamoDB ont des Free Tiers généreux. Supprimez les ressources après le lab pour éviter tout frais résiduel.',
      postLabQuiz: [
        {
          question: "Quelle est l'architecture serverless classique d'une API AWS ?",
          options: [
            "EC2 → RDS → S3",
            "API Gateway → Lambda → DynamoDB",
            "ALB → ECS → Aurora",
            "CloudFront → S3 → Glacier",
          ],
          correct: 1,
          explanation: "L'architecture serverless type est : API Gateway (entrée HTTP/REST) → Lambda (logique métier) → DynamoDB (stockage NoSQL). Aucun serveur à gérer, scaling automatique, et paiement uniquement à l'usage.",
        },
        {
          question: "Une API Key dans API Gateway fournit-elle une authentification forte ?",
          options: [
            "Oui, c'est suffisant pour toute sécurité",
            "Non, elle sert à identifier l'appelant et appliquer des quotas, pas à authentifier des utilisateurs",
            "Oui, elle chiffre les données",
            "Non, elle est uniquement décorative",
          ],
          correct: 1,
          explanation: "Une API Key identifie l'application appelante et permet d'appliquer des quotas (usage plans), mais ce n'est pas une authentification d'utilisateur. Pour authentifier des utilisateurs, on utilise Amazon Cognito ou un Lambda Authorizer validant des tokens JWT.",
        },
      ],
      careerConnection: "Les architectures serverless sont très demandées pour leur scalabilité et coût. Certifications : AWS Developer Associate, SAA-C03. Rôles : Cloud Developer, Solutions Architect.",
    },
    status: 'published',
  },
  {
    slug: 'aws-advanced-cloudformation-iac',
    title: 'Infrastructure as Code with CloudFormation',
    description: 'Automatisez le déploiement d\'infrastructure AWS avec des templates CloudFormation. ⚠️ Niveau avancé.',
    provider: 'aws',
    difficulty: 'advanced',
    estimatedTime: '90 min',
    moduleTitle: 'DevOps & Automation',
    tasks: [
      'Write a CloudFormation template for a VPC with subnets',
      'Add an EC2 instance with UserData bootstrap script',
      'Deploy the stack via AWS Console',
      'Update the stack by adding a Security Group',
      'Use stack outputs to reference resource IDs',
      'Delete the stack and verify all resources are cleaned up',
    ],
    steps: [
      {
        title: 'Écrire un template CloudFormation',
        instruction: `## Infrastructure as Code (IaC)

**CloudFormation** décrit votre infrastructure en YAML/JSON. Un même template recrée une infra identique à l'infini.

Créez \`template.yaml\` :
\`\`\`yaml
AWSTemplateFormatVersion: '2010-09-09'
Resources:
  LabVPC:
    Type: AWS::EC2::VPC
    Properties:
      CidrBlock: 10.0.0.0/16
      Tags:
        - Key: Name
          Value: cfn-lab-vpc
  LabSubnet:
    Type: AWS::EC2::Subnet
    Properties:
      VpcId: !Ref LabVPC
      CidrBlock: 10.0.1.0/24
Outputs:
  VpcId:
    Value: !Ref LabVPC
\`\`\``,
        hint: `💡 IaC = déclaratif : vous décrivez l'état désiré, CloudFormation calcule les actions. Avantages : reproductibilité, versionnage Git, suppression propre, pas de "drift" manuel.`,
        validationNote: `✅ Votre template YAML décrit un VPC + subnet avec une section Outputs valide.`,
        estimatedMinutes: 15,
      },
      {
        title: 'Déployer et mettre à jour le stack',
        instruction: `## Déployer le stack

1. Console **CloudFormation** → **Create stack** → **Upload a template file** → votre \`template.yaml\`
2. Stack name : \`lab-stack\` → **Create stack**
3. Observez l'onglet **Events** : chaque ressource est créée dans l'ordre des dépendances
4. **Mise à jour :** ajoutez une ressource Security Group au template → **Update stack** → CloudFormation applique seulement le différentiel (change set)
5. Onglet **Outputs** : récupérez le VpcId exporté`,
        hint: `💡 Un "change set" prévisualise les modifications avant application — comme un "dry run". CloudFormation ne touche que ce qui change, sans recréer tout le stack.`,
        validationNote: `✅ Le stack \`lab-stack\` est "CREATE_COMPLETE" puis "UPDATE_COMPLETE". L'onglet Outputs affiche le VpcId.`,
        estimatedMinutes: 12,
      },
      {
        title: 'Supprimer le stack (nettoyage automatique)',
        instruction: `## La force de l'IaC : suppression propre

1. Console CloudFormation → \`lab-stack\` → **Delete**
2. CloudFormation supprime TOUTES les ressources du stack dans le bon ordre
3. Vérifiez : le VPC, le subnet et le security group ont disparu

C'est l'avantage majeur de l'IaC : pas de ressources orphelines oubliées qui continuent de facturer.`,
        hint: `💡 Avec l'IaC, "Delete stack" garantit un nettoyage complet — impossible d'oublier une ressource. C'est pourquoi l'IaC est la meilleure pratique pour les environnements éphémères (dev, tests, labs).`,
        validationNote: `✅ Le stack est "DELETE_COMPLETE" et toutes les ressources associées sont supprimées automatiquement.`,
        estimatedMinutes: 6,
      },
    ],
    metadata: {
      level: 'advanced',
      levelLabel: 'Advanced',
      index: 3,
      totalInLevel: 4,
      providerLoginUrl: 'https://aws.amazon.com/console/',
      logo: AWS_LOGO,
      tags: ['aws', 'cloudformation', 'iac', 'devops'],
      learningObjectives: [
        'Écrire des templates CloudFormation en YAML',
        'Déployer et mettre à jour des stacks d\'infrastructure',
        'Utiliser les Outputs et change sets',
        'Gérer le cycle de vie de l\'infrastructure as code',
      ],
      prerequisites: ['Labs AWS EC2', 'Notions VPC'],
      scenario: `**AutoInfra TN** recrée manuellement ses environnements à chaque projet, source d'erreurs. Votre mission : automatiser le déploiement avec CloudFormation pour une infra reproductible. Durée : ~33 min, coût : ~0 USD.`,
      costWarning: '⚠️ Les ressources créées par le stack (VPC, etc.) sont gratuites ici, mais supprimez le stack après le lab pour de bonnes habitudes.',
      postLabQuiz: [
        {
          question: "Quel est l'avantage principal de l'Infrastructure as Code (CloudFormation) ?",
          options: [
            "C'est plus rapide à cliquer manuellement",
            "Reproductibilité, versionnage et suppression propre de l'infrastructure",
            "Cela réduit les coûts de calcul",
            "Cela chiffre automatiquement les données",
          ],
          correct: 1,
          explanation: "L'IaC permet de décrire l'infrastructure dans des fichiers versionnables (Git), de la recréer à l'identique à l'infini, et de la supprimer proprement sans ressource orpheline. Cela élimine les erreurs manuelles et le 'drift' de configuration.",
        },
        {
          question: "Qu'est-ce qu'un 'change set' dans CloudFormation ?",
          options: [
            "Une sauvegarde du stack",
            "Une prévisualisation des modifications avant de les appliquer (dry run)",
            "Un type de ressource",
            "Une facture détaillée",
          ],
          correct: 1,
          explanation: "Un change set prévisualise les modifications qu'une mise à jour de stack va appliquer, avant de les exécuter. C'est un 'dry run' qui permet de vérifier l'impact (ressources créées, modifiées, supprimées) avant validation.",
        },
      ],
      careerConnection: "L'IaC est une compétence DevOps fondamentale. Certifications : AWS DevOps Pro, SAA-C03. Rôles : DevOps Engineer, Cloud Automation Engineer, Platform Engineer.",
    },
    status: 'published',
  },
];

/* ─────────────────────────────────────────────────────────
 * Azure Advanced Labs
 * ───────────────────────────────────────────────────────── */

const AZURE_ADVANCED_RAW: SeedLabRowUnchained[] = [
  {
    slug: 'azure-advanced-bicep-iac',
    title: 'Infrastructure as Code with Bicep',
    description: 'Automatisez le déploiement de ressources Azure avec des templates Bicep. ⚠️ Niveau avancé.',
    provider: 'azure',
    difficulty: 'advanced',
    estimatedTime: '100 min',
    moduleTitle: 'DevOps & Automation',
    tasks: [
      'Install Bicep CLI and VS Code extension',
      'Write a Bicep template for a Storage Account + App Service',
      'Use parameters and variables for reusability',
      'Create a Bicep module for networking resources',
      'Deploy the template with az deployment group create',
      'Convert an existing ARM template to Bicep with az bicep decompile',
    ],
    steps: [
      {
        title: 'Écrire un template Bicep',
        instruction: `## IaC native Azure avec Bicep

**Bicep** est le langage IaC d'Azure — plus simple que l'ARM JSON, il compile vers ARM.

1. Ouvrez **Cloud Shell** (Bash) dans le portail — Bicep y est préinstallé
2. Créez \`main.bicep\` :
\`\`\`bicep
param location string = resourceGroup().location
param storageName string = 'stg\${uniqueString(resourceGroup().id)}'

resource storage 'Microsoft.Storage/storageAccounts@2023-01-01' = {
  name: storageName
  location: location
  sku: { name: 'Standard_LRS' }
  kind: 'StorageV2'
}

output storageId string = storage.id
\`\`\``,
        hint: `💡 Bicep utilise des "params" (entrées) et "outputs" (sorties) pour la réutilisabilité. La fonction uniqueString() génère un nom déterministe unique — pratique car les noms de storage doivent être globalement uniques.`,
        validationNote: `✅ Votre fichier \`main.bicep\` décrit un Storage Account avec params et output, sans erreur de syntaxe.`,
        estimatedMinutes: 15,
      },
      {
        title: 'Déployer le template',
        instruction: `## Déployer avec az CLI

1. Créez un Resource Group : \`az group create -n rg-bicep-lab -l westeurope\`
2. Déployez :
\`\`\`bash
az deployment group create \\
  --resource-group rg-bicep-lab \\
  --template-file main.bicep
\`\`\`
3. Vérifiez dans le portail → rg-bicep-lab → le Storage Account est créé
4. Le déploiement est **idempotent** : relancez-le, rien ne change si le template est identique`,
        hint: `💡 Idempotence : déployer 10× le même template donne le même résultat qu'une fois. Bicep calcule le différentiel entre l'état actuel et désiré — comme CloudFormation/Terraform.`,
        validationNote: `✅ Le déploiement réussit (provisioningState: Succeeded) et le Storage Account apparaît dans le Resource Group.`,
        estimatedMinutes: 12,
      },
      {
        title: 'Nettoyer via suppression du Resource Group',
        instruction: `## Nettoyage IaC

1. \`az group delete -n rg-bicep-lab --yes\`
2. Toutes les ressources décrites par le template sont supprimées

**Bicep vs ARM vs Terraform :**
- Bicep : natif Azure, syntaxe simple
- ARM JSON : verbeux, l'ancêtre de Bicep
- Terraform : multi-cloud (AWS+Azure+GCP)`,
        hint: `💡 Bicep est spécifique à Azure. Si vous travaillez en multi-cloud, Terraform est préférable car un même outil gère AWS, Azure et GCP.`,
        validationNote: `✅ Le Resource Group \`rg-bicep-lab\` et toutes ses ressources sont supprimés.`,
        estimatedMinutes: 6,
      },
    ],
    metadata: {
      level: 'advanced',
      levelLabel: 'Advanced',
      index: 0,
      totalInLevel: 4,
      providerLoginUrl: 'https://portal.azure.com/',
      logo: AZURE_LOGO,
      tags: ['azure', 'bicep', 'iac', 'devops', 'arm'],
      learningObjectives: [
        'Écrire des templates Bicep avec params et outputs',
        'Déployer une infrastructure via az CLI',
        'Comprendre l\'idempotence des déploiements IaC',
        'Distinguer Bicep, ARM et Terraform',
      ],
      prerequisites: ['Labs AZ-900', 'Notions de ligne de commande'],
      scenario: `**InfraCode TN** veut standardiser ses déploiements Azure et éliminer les configurations manuelles. Vous introduisez Bicep pour automatiser l'infrastructure. Durée : ~33 min, coût : ~0 USD.`,
      costWarning: '⚠️ Le Storage Account LRS facture très peu, mais supprimez le Resource Group après le lab.',
      postLabQuiz: [
        {
          question: "Qu'est-ce que Bicep par rapport à ARM ?",
          options: [
            "Un langage concurrent qui ne fonctionne pas sur Azure",
            "Un langage IaC plus simple qui compile vers ARM JSON",
            "Un service de stockage",
            "Un outil de monitoring",
          ],
          correct: 1,
          explanation: "Bicep est un langage de définition d'infrastructure (IaC) plus lisible et concis que l'ARM JSON. Il compile (transpile) vers ARM, qui reste le moteur de déploiement sous-jacent d'Azure. Bicep simplifie l'écriture sans perdre de fonctionnalités.",
        },
        {
          question: "Que signifie qu'un déploiement Bicep est 'idempotent' ?",
          options: [
            "Il ne peut être exécuté qu'une seule fois",
            "Le réexécuter avec le même template produit le même résultat sans effet de bord",
            "Il supprime tout à chaque exécution",
            "Il est plus rapide à chaque fois",
          ],
          correct: 1,
          explanation: "L'idempotence signifie que déployer plusieurs fois le même template donne toujours le même état final. Bicep compare l'état désiré à l'état actuel et n'applique que les différences, sans recréer ce qui existe déjà.",
        },
      ],
      careerConnection: "L'IaC Azure est une compétence DevOps essentielle. Certifications : AZ-400 (DevOps Engineer Expert), AZ-104. Rôles : DevOps Engineer, Cloud Automation Engineer.",
    },
    status: 'published',
  },
  {
    slug: 'azure-advanced-container-apps',
    title: 'Deploy with Azure Container Apps',
    description: 'Déployez des microservices sur Azure Container Apps avec déploiement blue/green. ⚠️ Niveau avancé.',
    provider: 'azure',
    difficulty: 'advanced',
    estimatedTime: '110 min',
    moduleTitle: 'Container Orchestration',
    tasks: [
      'Create an Azure Container Registry and push an image',
      'Create a Container Apps Environment',
      'Deploy a container app with ingress enabled',
      'Configure environment variables and secrets',
      'Set up revision-based traffic splitting (blue/green)',
      'Enable Dapr sidecar for service-to-service invocation',
    ],
    steps: [
      {
        title: 'Créer un Container Apps Environment et déployer une app',
        instruction: `## Conteneurs serverless sans Kubernetes

**Azure Container Apps** exécute des conteneurs sans gérer Kubernetes — plus simple qu'AKS.

1. Portail → cherchez **Container Apps** → **+ Create**
2. Resource group : \`rg-aca-lab\` → App name : \`app-lab\`
3. Container Apps Environment : créez \`env-lab\`
4. Image source : **Docker Hub** → image \`nginx:latest\`
5. Ingress : **Enabled**, accepting traffic from **Anywhere**, target port 80
6. **Create**`,
        hint: `💡 Container Apps vs AKS : Container Apps cache la complexité Kubernetes (idéal microservices simples). AKS donne le contrôle total de Kubernetes (workloads complexes). Container Apps facture à l'usage (scale-to-zero possible).`,
        validationNote: `✅ L'app \`app-lab\` est déployée avec un statut "Running" et une URL d'application publique (...azurecontainerapps.io).`,
        estimatedMinutes: 15,
      },
      {
        title: 'Configurer le traffic splitting (blue/green)',
        instruction: `## Déploiement blue/green par révisions

Container Apps gère des **révisions** (versions immuables) avec répartition de trafic.

1. App → menu gauche → **Revision management** → activez le mode **Multiple revisions**
2. Déployez une nouvelle révision (changez l'image ou une variable d'env)
3. Configurez le split : 80% révision actuelle (blue), 20% nouvelle (green)
4. Augmentez progressivement vers 100% green si tout va bien (canary release)`,
        hint: `💡 Le blue/green et le canary réduisent le risque : vous testez la nouvelle version sur une fraction du trafic réel avant de basculer 100%. En cas de bug, rollback instantané vers l'ancienne révision.`,
        validationNote: `✅ Deux révisions coexistent avec une répartition de trafic configurée (ex: 80/20).`,
        estimatedMinutes: 15,
      },
      {
        title: 'Secrets, scaling et nettoyage',
        instruction: `## Secrets et scale-to-zero

1. App → **Secrets** → ajoutez un secret (ex: \`db-password\`)
2. Référencez-le comme variable d'environnement (jamais en dur dans l'image)
3. **Scale** : configurez min replicas = **0** → l'app descend à zéro sans trafic (coût nul)

**Nettoyage :** Resource groups → \`rg-aca-lab\` → Delete.`,
        hint: `💡 Le "scale-to-zero" est unique aux conteneurs serverless : sans trafic, zéro replica = zéro coût compute. Idéal pour des microservices peu sollicités. AKS ne fait pas ça nativement.`,
        validationNote: `✅ Un secret est configuré et le scaling min=0 est activé. Resource group supprimé après le lab.`,
        estimatedMinutes: 10,
      },
    ],
    metadata: {
      level: 'advanced',
      levelLabel: 'Advanced',
      index: 1,
      totalInLevel: 4,
      providerLoginUrl: 'https://portal.azure.com/',
      logo: AZURE_LOGO,
      tags: ['azure', 'container-apps', 'containers', 'dapr', 'microservices'],
      learningObjectives: [
        'Déployer une app sur Azure Container Apps',
        'Implémenter un déploiement blue/green par révisions',
        'Gérer les secrets et variables d\'environnement',
        'Configurer le scale-to-zero pour optimiser les coûts',
      ],
      prerequisites: ['Lab az900-intermediate-4 (AKS)', 'Notions Docker'],
      scenario: `**MicroAzure TN** veut déployer des microservices conteneurisés sans la complexité de Kubernetes. Vous utilisez Azure Container Apps avec blue/green. Durée : ~40 min, coût : ~0.10 USD.`,
      costWarning: '⚠️ Container Apps facture à l\'usage (scale-to-zero possible). Supprimez le Resource Group après le lab.',
      postLabQuiz: [
        {
          question: "Quel est l'avantage d'Azure Container Apps par rapport à AKS ?",
          options: [
            "Il est plus puissant pour les workloads complexes",
            "Il cache la complexité de Kubernetes et supporte le scale-to-zero",
            "Il est le seul à supporter Docker",
            "Il offre un accès root aux nodes",
          ],
          correct: 1,
          explanation: "Azure Container Apps abstrait la complexité de Kubernetes : pas de cluster à gérer, facturation à l'usage et scale-to-zero (zéro coût sans trafic). AKS offre plus de contrôle mais demande de gérer Kubernetes. ACA est idéal pour des microservices simples.",
        },
        {
          question: "Qu'est-ce qu'un déploiement blue/green ?",
          options: [
            "Un déploiement coloré dans le portail",
            "Faire coexister deux versions et basculer progressivement le trafic pour réduire le risque",
            "Un type de chiffrement",
            "Une stratégie de sauvegarde",
          ],
          correct: 1,
          explanation: "Le blue/green fait tourner l'ancienne version (blue) et la nouvelle (green) en parallèle. On bascule progressivement le trafic vers green en surveillant. En cas de problème, rollback instantané vers blue. Cela réduit le risque des mises en production.",
        },
      ],
      careerConnection: "Les architectures microservices conteneurisées sont très demandées. Certifications : AZ-204, AZ-400. Rôles : Cloud Developer, DevOps Engineer, Platform Engineer.",
    },
    status: 'published',
  },
  {
    slug: 'azure-advanced-defender-sentinel',
    title: 'Security Monitoring with Defender & Sentinel',
    description: 'Configurez Microsoft Defender for Cloud et Azure Sentinel pour la détection de menaces. ⚠️ Niveau avancé.',
    provider: 'azure',
    difficulty: 'advanced',
    estimatedTime: '120 min',
    moduleTitle: 'Security & Compliance',
    tasks: [
      'Enable Microsoft Defender for Cloud on your subscription',
      'Review the Secure Score and remediate top recommendations',
      'Create a Log Analytics workspace',
      'Enable Azure Sentinel and connect data sources',
      'Create an analytics rule for brute-force sign-in detection',
      'Investigate a simulated incident in the Sentinel dashboard',
    ],
    steps: [
      {
        title: 'Activer Defender for Cloud et consulter le Secure Score',
        instruction: `## Posture de sécurité avec Defender for Cloud

**Microsoft Defender for Cloud** évalue et améliore la sécurité de vos ressources.

1. Portail → cherchez **Microsoft Defender for Cloud**
2. Menu gauche → **Environment settings** → activez Defender sur votre souscription (un plan gratuit existe)
3. Retournez à **Overview** → consultez le **Secure Score** (score de sécurité en %)
4. Menu **Recommendations** → triez par impact → lisez les actions correctives proposées`,
        hint: `💡 Le Secure Score quantifie votre posture de sécurité. Chaque recommandation appliquée augmente le score. Les équipes sécurité l'utilisent comme KPI mesurable d'amélioration continue.`,
        validationNote: `✅ Defender for Cloud est activé et vous voyez un Secure Score avec une liste de recommandations priorisées.`,
        estimatedMinutes: 12,
      },
      {
        title: 'Créer un Log Analytics workspace et activer Sentinel',
        instruction: `## SIEM cloud avec Azure Sentinel

**Azure Sentinel** est le SIEM (Security Information and Event Management) cloud de Microsoft.

1. Portail → cherchez **Log Analytics workspaces** → **+ Create** → \`law-sentinel-lab\` (West Europe)
2. Portail → cherchez **Microsoft Sentinel** → **+ Create** → sélectionnez \`law-sentinel-lab\`
3. Dans Sentinel → **Data connectors** → explorez les connecteurs (Azure AD, Office 365, etc.)
4. Connectez la source **Azure Activity** (logs d'activité de la souscription)`,
        hint: `💡 Un SIEM agrège les logs de toutes vos sources, les corrèle, et détecte les menaces. Sentinel repose sur Log Analytics (KQL — Kusto Query Language) pour interroger les données de sécurité.`,
        validationNote: `✅ Sentinel est activé sur le workspace \`law-sentinel-lab\` avec au moins un data connector configuré.`,
        estimatedMinutes: 15,
      },
      {
        title: 'Créer une analytics rule et nettoyer',
        instruction: `## Détection de menaces automatisée

1. Sentinel → **Analytics** → **+ Create** → **Scheduled query rule**
2. Utilisez un template de détection (ex: "brute force" sur les connexions échouées)
3. La règle s'exécute périodiquement et génère un **incident** si le seuil est dépassé
4. Menu **Incidents** → explorez l'interface d'investigation (timeline, entités, gravité)

**Nettoyage :** supprimez Sentinel, le workspace Log Analytics, et désactivez les plans Defender payants.`,
        hint: `💡 Les analytics rules transforment des logs bruts en incidents actionnables. Le SOC (Security Operations Center) investigue ensuite chaque incident via la timeline et les entités liées (utilisateur, IP, ressource).`,
        validationNote: `✅ Une analytics rule de détection est active. Vous avez exploré l'interface Incidents. Ressources supprimées après le lab.`,
        estimatedMinutes: 13,
      },
    ],
    metadata: {
      level: 'advanced',
      levelLabel: 'Advanced',
      index: 2,
      totalInLevel: 4,
      providerLoginUrl: 'https://portal.azure.com/',
      logo: AZURE_LOGO,
      tags: ['azure', 'defender', 'sentinel', 'security', 'siem'],
      learningObjectives: [
        'Activer Defender for Cloud et interpréter le Secure Score',
        'Déployer Azure Sentinel sur un workspace Log Analytics',
        'Connecter des sources de données de sécurité',
        'Créer une règle de détection de menaces',
      ],
      prerequisites: ['Lab az900-intermediate-10 (Entra ID)', 'Notions de sécurité'],
      scenario: `Après une cyberattaque dans le secteur, **CyberGuard TN** veut une détection proactive des menaces. Vous déployez Defender for Cloud et le SIEM Sentinel. Durée : ~40 min, coût : ~0.10 USD.`,
      costWarning: '⚠️ Les plans Defender payants et Sentinel (ingestion de logs) facturent. Désactivez les plans et supprimez le workspace après le lab.',
      postLabQuiz: [
        {
          question: "À quoi sert le 'Secure Score' de Defender for Cloud ?",
          options: [
            "À facturer les ressources",
            "À quantifier la posture de sécurité et prioriser les actions correctives",
            "À chiffrer les données",
            "À gérer les utilisateurs",
          ],
          correct: 1,
          explanation: "Le Secure Score est un pourcentage mesurant la posture de sécurité de votre environnement Azure. Chaque recommandation appliquée l'augmente. Il sert de KPI pour piloter l'amélioration continue de la sécurité.",
        },
        {
          question: "Qu'est-ce qu'Azure Sentinel ?",
          options: [
            "Un pare-feu réseau",
            "Un SIEM cloud qui agrège les logs, les corrèle et détecte les menaces",
            "Un service de stockage",
            "Un outil de déploiement",
          ],
          correct: 1,
          explanation: "Azure Sentinel est le SIEM (Security Information and Event Management) cloud de Microsoft. Il collecte les logs de multiples sources, les corrèle via des règles analytiques, détecte les menaces et génère des incidents que le SOC investigue.",
        },
      ],
      careerConnection: "La sécurité cloud (SIEM/SOC) est l'un des domaines les plus demandés et rémunérateurs. Certifications : SC-200 (Security Operations Analyst), AZ-500. Rôles : SOC Analyst, Cloud Security Engineer.",
    },
    status: 'published',
  },
  {
    slug: 'azure-advanced-devops-pipeline',
    title: 'CI/CD with Azure DevOps Pipelines',
    description: 'Construisez un pipeline CI/CD complet déployant vers Azure App Service. ⚠️ Niveau avancé.',
    provider: 'azure',
    difficulty: 'advanced',
    estimatedTime: '100 min',
    moduleTitle: 'DevOps & Automation',
    tasks: [
      'Create an Azure DevOps project and import a Git repository',
      'Write a YAML pipeline for build (npm install, test, build)',
      'Add a release stage deploying to Azure App Service',
      'Configure service connection to your Azure subscription',
      'Add approval gates between staging and production',
      'Trigger the pipeline and verify the deployed application',
    ],
    steps: [
      {
        title: 'Créer un projet Azure DevOps et un pipeline YAML',
        instruction: `## Pipeline CI/CD as code

1. Allez sur **https://dev.azure.com** → créez une organisation → **New project** : \`devops-lab\`
2. **Repos** → importez un repo exemple (ex: une app Node.js simple)
3. **Pipelines** → **New pipeline** → choisissez votre repo → starter pipeline
4. Le fichier \`azure-pipelines.yml\` définit les étapes :
\`\`\`yaml
trigger: [main]
pool: { vmImage: 'ubuntu-latest' }
steps:
  - script: npm install
  - script: npm test
  - script: npm run build
\`\`\``,
        hint: `💡 CI (Continuous Integration) = build + test automatiques à chaque push. CD (Continuous Delivery) = déploiement automatique. Le pipeline-as-code (YAML versionné) garantit la reproductibilité.`,
        validationNote: `✅ Le pipeline YAML s'exécute : npm install, test et build réussissent (coche verte).`,
        estimatedMinutes: 15,
      },
      {
        title: 'Ajouter le déploiement vers App Service',
        instruction: `## Étape de déploiement (CD)

1. Créez d'abord un App Service cible dans le portail Azure (\`webapp-cicd-lab\`)
2. Dans Azure DevOps → **Project Settings** → **Service connections** → créez une connexion à votre souscription Azure
3. Ajoutez une étape de déploiement au YAML :
\`\`\`yaml
  - task: AzureWebApp@1
    inputs:
      azureSubscription: 'votre-service-connection'
      appName: 'webapp-cicd-lab'
      package: '$(System.DefaultWorkingDirectory)'
\`\`\`
4. Push → le pipeline build PUIS déploie automatiquement`,
        hint: `💡 La "service connection" est un lien sécurisé entre Azure DevOps et votre souscription Azure, basé sur un service principal. Elle évite de stocker des identifiants dans le pipeline.`,
        validationNote: `✅ Le pipeline déploie l'app sur \`webapp-cicd-lab\`. L'URL App Service affiche l'application déployée.`,
        estimatedMinutes: 15,
      },
      {
        title: "Approval gates et nettoyage",
        instruction: `## Contrôle de mise en production

1. Dans **Environments** (Pipelines → Environments), créez un environnement \`production\`
2. Ajoutez une **Approval check** : un humain doit approuver avant le déploiement en prod
3. Le pipeline s'arrête à la gate jusqu'à l'approbation → contrôle qualité

**Nettoyage :** supprimez l'App Service (portail Azure) et le projet Azure DevOps.`,
        hint: `💡 Les approval gates ajoutent un contrôle humain avant les déploiements critiques (prod). C'est un équilibre entre automatisation (vitesse) et gouvernance (sécurité). Essentiel pour les environnements sensibles.`,
        validationNote: `✅ Une approval gate bloque le déploiement prod jusqu'à validation manuelle. Ressources supprimées après le lab.`,
        estimatedMinutes: 10,
      },
    ],
    metadata: {
      level: 'advanced',
      levelLabel: 'Advanced',
      index: 3,
      totalInLevel: 4,
      providerLoginUrl: 'https://portal.azure.com/',
      logo: AZURE_LOGO,
      tags: ['azure', 'devops', 'ci-cd', 'pipelines'],
      learningObjectives: [
        'Créer un pipeline CI/CD YAML dans Azure DevOps',
        'Configurer une service connection vers Azure',
        'Déployer automatiquement vers App Service',
        'Ajouter des approval gates de gouvernance',
      ],
      prerequisites: ['Lab az900-beginner-3 (App Service)', 'Notions Git'],
      scenario: `**ShipFast TN** déploie manuellement, source de bugs et de lenteur. Votre mission : automatiser le build, les tests et le déploiement avec un pipeline CI/CD Azure DevOps. Durée : ~40 min, coût : ~0 USD.`,
      costWarning: '⚠️ Azure DevOps est gratuit pour 5 utilisateurs. L\'App Service cible facture selon son tier — utilisez F1 gratuit et supprimez après le lab.',
      postLabQuiz: [
        {
          question: "Que signifient CI et CD ?",
          options: [
            "Cloud Infrastructure / Cloud Deployment",
            "Continuous Integration (build+test auto) / Continuous Delivery (déploiement auto)",
            "Code Inspection / Code Distribution",
            "Central Index / Central Database",
          ],
          correct: 1,
          explanation: "CI (Continuous Integration) automatise le build et les tests à chaque modification de code. CD (Continuous Delivery/Deployment) automatise le déploiement. Ensemble, ils permettent de livrer du code testé rapidement et de façon fiable.",
        },
        {
          question: "À quoi sert une approval gate dans un pipeline CD ?",
          options: [
            "À accélérer le déploiement",
            "À exiger une validation humaine avant un déploiement critique (ex: production)",
            "À chiffrer le code",
            "À réduire les coûts",
          ],
          correct: 1,
          explanation: "Une approval gate impose qu'un humain valide explicitement avant que le pipeline déploie en environnement sensible (production). Elle équilibre l'automatisation (vitesse) et la gouvernance (contrôle qualité, conformité).",
        },
      ],
      careerConnection: "Le CI/CD est une compétence DevOps centrale et très demandée. Certifications : AZ-400 (DevOps Engineer Expert). Rôles : DevOps Engineer, Release Manager, Platform Engineer. Salaire : 50 000–70 000 EUR/an.",
    },
    status: 'published',
  },
];

/* ─────────────────────────────────────────────────────────
 * Additional AWS Labs (S3, RDS, IAM)
 * ───────────────────────────────────────────────────────── */

const AWS_EXTRA_RAW: SeedLabRowUnchained[] = [
  {
    slug: 'aws-beginner-s3-basics',
    title: 'Amazon S3 — Buckets & Objects',
    description: 'Créez des buckets S3, gérez les objets et hébergez un site web statique.',
    provider: 'aws',
    difficulty: 'beginner',
    estimatedTime: '40 min',
    moduleTitle: 'Storage Foundations',
    tasks: [
      'Create an S3 bucket with default encryption',
      'Upload files and organize with prefixes (folders)',
      'Configure bucket policy for public read access',
      'Enable static website hosting on the bucket',
      'Test the website URL and verify content',
    ],
    steps: [
      {
        title: 'Créer un bucket S3 et uploader des objets',
        instruction: `## Stockage d'objets avec S3

**S3 (Simple Storage Service)** stocke des objets dans des buckets — durabilité de 99,999999999% (11 neufs).

1. Console → **S3** → **Create bucket**
2. Bucket name : \`subul-s3-[votrenom]\` (globalement unique)
3. Region : eu-west-1
4. Default encryption : laissez activé (SSE-S3)
5. **Create bucket**
6. Ouvrez le bucket → **Upload** → ajoutez un fichier \`index.html\` simple`,
        hint: `💡 Le nom du bucket S3 est globalement unique sur TOUT AWS (pas seulement votre compte). Si "subul-s3-test" est pris, ajoutez des chiffres. Les noms doivent être en minuscules, sans espaces.`,
        validationNote: `✅ Le bucket apparaît dans la liste S3 et contient votre fichier uploadé.`,
        estimatedMinutes: 10,
      },
      {
        title: 'Activer l\'hébergement de site statique',
        instruction: `## Héberger un site web sur S3

1. Ouvrez votre bucket → onglet **Properties**
2. Descendez à **Static website hosting** → **Edit** → **Enable**
3. Index document : \`index.html\` → **Save changes**
4. Notez l'URL "Bucket website endpoint"
5. Pour le rendre accessible : onglet **Permissions** → désactivez "Block all public access" → ajoutez une bucket policy autorisant \`s3:GetObject\` public`,
        hint: `💡 Deux niveaux d'accès public S3 : "Block public access" (interrupteur global) ET la bucket policy. Les DEUX doivent autoriser l'accès. C'est une double sécurité pour éviter les fuites accidentelles.`,
        validationNote: `✅ L'URL du website endpoint affiche votre page index.html dans le navigateur.`,
        estimatedMinutes: 12,
      },
      {
        title: 'Comprendre les classes de stockage et nettoyer',
        instruction: `## Classes de stockage S3

| Classe | Usage | Coût |
|--------|-------|------|
| Standard | Accès fréquent | Élevé |
| Standard-IA | Accès rare | Moyen |
| Glacier | Archives | Très bas |
| Intelligent-Tiering | Auto-optimisé | Variable |

**Nettoyage :** sélectionnez le bucket → videz-le (Empty) → puis supprimez-le (Delete).`,
        hint: `💡 S3 Intelligent-Tiering déplace automatiquement les objets entre classes selon les patterns d'accès — idéal si vous ne connaissez pas la fréquence d'accès à l'avance.`,
        validationNote: `✅ Vous pouvez nommer 3 classes de stockage S3. Le bucket est vidé et supprimé.`,
        estimatedMinutes: 6,
      },
    ],
    metadata: {
      level: 'beginner',
      levelLabel: 'Beginner',
      index: 0,
      totalInLevel: 1,
      providerLoginUrl: 'https://aws.amazon.com/console/',
      logo: AWS_LOGO,
      tags: ['aws', 's3', 'storage', 'static-hosting'],
      learningObjectives: [
        'Créer un bucket S3 avec chiffrement par défaut',
        'Configurer une bucket policy pour l\'accès public',
        'Héberger un site web statique sur S3',
        'Distinguer les classes de stockage S3',
      ],
      prerequisites: ['Lab aws-ec2-beginner-aws-account-setup'],
      scenario: `**StaticWeb TN** veut héberger un site vitrine à moindre coût, sans serveur. Vous utilisez S3 static website hosting. Durée : ~25 min, coût : ~0 USD (Free Tier).`,
      costWarning: '⚠️ S3 offre 5 Go gratuits/an. Supprimez le bucket après le lab pour éviter tout frais résiduel.',
      sandboxUrl: 'https://aws.amazon.com/getting-started/hands-on/',
      postLabQuiz: [
        {
          question: "Le nom d'un bucket S3 doit être unique à quel niveau ?",
          options: ['Dans votre compte', 'Dans votre région', 'Globalement sur tout AWS', "Il n'a pas besoin d'être unique"],
          correct: 2,
          explanation: "Le nom d'un bucket S3 doit être globalement unique sur l'ensemble d'AWS (tous les comptes, toutes les régions), car il fait partie de l'URL accessible publiquement. C'est pourquoi on ajoute souvent un suffixe unique.",
        },
        {
          question: "Pour rendre un objet S3 accessible publiquement, que faut-il configurer ?",
          options: [
            "Uniquement la bucket policy",
            "Désactiver 'Block public access' ET ajouter une bucket policy autorisant l'accès",
            "Uniquement le chiffrement",
            "Rien, c'est public par défaut",
          ],
          correct: 1,
          explanation: "Par défaut, S3 bloque tout accès public (double sécurité). Il faut à la fois désactiver 'Block all public access' ET ajouter une bucket policy autorisant s3:GetObject. Cette double barrière prévient les fuites de données accidentelles.",
        },
      ],
      careerConnection: "S3 est le service de stockage le plus utilisé d'AWS. Certifications : CLF-C02, SAA-C03. Rôles : Cloud Engineer, Solutions Architect.",
    },
    status: 'published',
  },
  {
    slug: 'aws-intermediate-rds-mysql',
    title: 'Launch RDS MySQL & Connect',
    description: 'Déployez une base MySQL managée avec RDS, en Multi-AZ, et connectez-vous depuis EC2.',
    provider: 'aws',
    difficulty: 'intermediate',
    estimatedTime: '75 min',
    moduleTitle: 'Managed Databases',
    tasks: [
      'Create an RDS MySQL instance (db.t3.micro, Free Tier)',
      'Configure the DB subnet group and security group',
      'Enable Multi-AZ deployment for high availability',
      'Connect to the database from an EC2 instance using mysql CLI',
      'Create a database, table, and insert sample data',
    ],
    steps: [
      {
        title: 'Créer une instance RDS MySQL',
        instruction: `## Base de données relationnelle managée

**RDS (Relational Database Service)** gère MySQL/PostgreSQL/etc. : patches, sauvegardes, réplication automatiques.

1. Console → **RDS** → **Create database**
2. Engine : **MySQL** → Template : **Free tier**
3. DB instance identifier : \`db-lab-mysql\`
4. Master username : \`admin\` / password : \`LabRds2024!\`
5. Instance : **db.t3.micro** (Free Tier)
6. Public access : **No** (sécurité — accès via EC2 uniquement)
7. **Create database** (5-10 min)`,
        hint: `💡 RDS gère automatiquement les sauvegardes, patches et failover. Vous ne gérez que vos données et requêtes — c'est du PaaS, contrairement à une base installée manuellement sur EC2 (IaaS).`,
        validationNote: `✅ L'instance \`db-lab-mysql\` affiche le statut "Available" avec un endpoint de connexion.`,
        estimatedMinutes: 15,
      },
      {
        title: 'Comprendre le Multi-AZ et se connecter',
        instruction: `## Haute disponibilité Multi-AZ

**Multi-AZ** maintient une réplique synchrone dans une autre Availability Zone. En cas de panne, failover automatique en ~60-120s.

1. Sur l'instance RDS → Modify → activez **Multi-AZ deployment** (note : indisponible en Free Tier réel)
2. Connectez-vous depuis une instance EC2 (même VPC) :
\`\`\`bash
sudo yum install -y mysql
mysql -h [RDS_ENDPOINT] -u admin -p
\`\`\`
3. Le Security Group du RDS doit autoriser le port 3306 depuis le SG de l'EC2`,
        hint: `💡 Multi-AZ (haute disponibilité, réplique synchrone, même région) ≠ Read Replica (performance lecture, réplique asynchrone, peut être cross-région). Multi-AZ pour la résilience, Read Replica pour scaler les lectures.`,
        validationNote: `✅ Vous obtenez le prompt \`mysql>\` depuis l'instance EC2, connecté à la base RDS.`,
        estimatedMinutes: 12,
      },
      {
        title: 'Créer des données et nettoyer',
        instruction: `## Manipuler la base et nettoyer

\`\`\`sql
CREATE DATABASE boutique;
USE boutique;
CREATE TABLE produits (id INT, nom VARCHAR(50), prix DECIMAL(10,2));
INSERT INTO produits VALUES (1, 'Clavier', 29.99), (2, 'Souris', 14.99);
SELECT * FROM produits;
\`\`\`

**Nettoyage :** RDS → \`db-lab-mysql\` → **Delete** → décochez "Create final snapshot" → confirmez.`,
        hint: `💡 À la suppression, RDS propose un "final snapshot". En production, gardez-le (sauvegarde). En lab, décochez-le pour ne rien payer. Les snapshots RDS sont facturés au stockage.`,
        validationNote: `✅ La requête SELECT retourne les 2 produits. L'instance RDS est supprimée après le lab.`,
        estimatedMinutes: 8,
      },
    ],
    metadata: {
      level: 'intermediate',
      levelLabel: 'Intermediate',
      index: 0,
      totalInLevel: 1,
      providerLoginUrl: 'https://aws.amazon.com/console/',
      logo: AWS_LOGO,
      tags: ['aws', 'rds', 'mysql', 'database'],
      learningObjectives: [
        'Déployer une base MySQL managée avec RDS',
        'Comprendre le Multi-AZ pour la haute disponibilité',
        'Distinguer Multi-AZ et Read Replica',
        'Se connecter à RDS depuis une instance EC2',
      ],
      prerequisites: ['Labs AWS EC2', 'Security Groups'],
      scenario: `**ShopDB TN** a besoin d'une base de données fiable sans embaucher de DBA. Vous déployez RDS MySQL en Multi-AZ pour la haute disponibilité. Durée : ~35 min, coût : ~0 USD (Free Tier).`,
      costWarning: '⚠️ RDS db.t3.micro est gratuit 750h/mois la 1ère année. Multi-AZ et le stockage au-delà des quotas facturent. Supprimez l\'instance après le lab.',
      postLabQuiz: [
        {
          question: "Quelle est la différence entre Multi-AZ et Read Replica sur RDS ?",
          options: [
            "Aucune différence",
            "Multi-AZ = haute disponibilité (réplique synchrone, failover) ; Read Replica = performance lecture (asynchrone)",
            "Read Replica est pour la sécurité",
            "Multi-AZ est moins cher",
          ],
          correct: 1,
          explanation: "Multi-AZ maintient une réplique synchrone dans une autre AZ pour le failover automatique (haute disponibilité). Read Replica crée des copies asynchrones pour répartir la charge de lecture (performance), et peut être cross-région. Objectifs différents.",
        },
        {
          question: "Pourquoi RDS est-il considéré comme un service PaaS ?",
          options: [
            "Car vous gérez l'OS du serveur de base de données",
            "Car AWS gère automatiquement les patches, sauvegardes et failover ; vous gérez seulement les données",
            "Car il est gratuit",
            "Car il nécessite une connexion SSH",
          ],
          correct: 1,
          explanation: "RDS est PaaS car AWS gère l'infrastructure, l'OS, le moteur de base de données, les patches, les sauvegardes et le failover. Vous vous concentrez uniquement sur vos données et requêtes — contrairement à une base installée sur EC2 (IaaS) où vous gérez tout.",
        },
      ],
      careerConnection: "La gestion de bases managées est essentielle pour les Cloud DBA et Backend Engineers. Certifications : SAA-C03, AWS Database Specialty. Rôles : Cloud DBA, Data Engineer.",
    },
    status: 'published',
  },
  {
    slug: 'aws-intermediate-iam-policies',
    title: 'IAM Policies & Cross-Account Access',
    description: 'Maîtrisez les policies IAM, les rôles et l\'accès via instance profiles — le cœur de la sécurité AWS.',
    provider: 'aws',
    difficulty: 'intermediate',
    estimatedTime: '65 min',
    moduleTitle: 'Security & Identity',
    tasks: [
      'Create a custom IAM policy allowing S3 read-only access',
      'Attach the policy to an IAM group',
      'Create an IAM role with a trust policy for EC2',
      'Assign the role to an EC2 instance profile',
      'Verify the instance can access S3 without explicit credentials',
    ],
    steps: [
      {
        title: 'Écrire une policy IAM personnalisée',
        instruction: `## Permissions granulaires avec IAM

Une **policy IAM** est un document JSON qui définit les permissions (Allow/Deny sur des actions/ressources).

1. Console → **IAM** → **Policies** → **Create policy** → onglet **JSON** :
\`\`\`json
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Action": ["s3:GetObject", "s3:ListBucket"],
    "Resource": "*"
  }]
}
\`\`\`
2. Name : \`S3ReadOnlyLab\` → **Create policy**`,
        hint: `💡 Structure d'une policy : Effect (Allow/Deny), Action (les opérations), Resource (sur quoi). Le principe du moindre privilège = accordez uniquement les actions strictement nécessaires.`,
        validationNote: `✅ La policy \`S3ReadOnlyLab\` est créée et visible dans IAM → Policies.`,
        estimatedMinutes: 10,
      },
      {
        title: 'Créer un rôle IAM pour EC2',
        instruction: `## Rôles et instance profiles

Un **rôle IAM** est assumable par un service (EC2, Lambda). C'est plus sûr que des clés d'accès codées en dur.

1. IAM → **Roles** → **Create role**
2. Trusted entity : **AWS service** → **EC2**
3. Attachez votre policy \`S3ReadOnlyLab\`
4. Role name : \`EC2-S3-ReadRole\` → Create
5. Attachez le rôle à une instance EC2 : sélectionnez l'instance → Actions → Security → **Modify IAM role** → \`EC2-S3-ReadRole\``,
        hint: `💡 Règle de sécurité fondamentale : ne JAMAIS coder des clés d'accès (access key/secret) en dur dans une application sur EC2. Utilisez un rôle IAM — AWS injecte des identifiants temporaires automatiquement.`,
        validationNote: `✅ Le rôle \`EC2-S3-ReadRole\` est attaché à une instance EC2 (visible dans les détails de l'instance).`,
        estimatedMinutes: 12,
      },
      {
        title: 'Vérifier l\'accès sans credentials et nettoyer',
        instruction: `## Tester l'accès par rôle

1. Connectez-vous à l'instance EC2 via SSH
2. Testez l'accès S3 SANS configurer de clés :
\`\`\`bash
aws s3 ls
\`\`\`
3. Ça fonctionne ! L'instance utilise automatiquement les permissions du rôle attaché
4. Essayez une action non autorisée (ex: \`aws s3 rb s3://bucket\` = supprimer) → **Access Denied** (la policy est read-only)

**Nettoyage :** détachez le rôle de l'instance, supprimez le rôle et la policy.`,
        hint: `💡 C'est la magie des rôles IAM : l'instance reçoit des credentials temporaires rotés automatiquement par AWS via le metadata endpoint (169.254.169.254). Aucun secret à gérer ni à faire fuiter.`,
        validationNote: `✅ \`aws s3 ls\` fonctionne sans clés configurées. Une action d'écriture est refusée (read-only). Rôle et policy supprimés.`,
        estimatedMinutes: 8,
      },
    ],
    metadata: {
      level: 'intermediate',
      levelLabel: 'Intermediate',
      index: 0,
      totalInLevel: 1,
      providerLoginUrl: 'https://aws.amazon.com/console/',
      logo: AWS_LOGO,
      tags: ['aws', 'iam', 'security', 'policies', 'roles'],
      learningObjectives: [
        'Écrire des policies IAM JSON personnalisées',
        'Créer des rôles IAM avec trust policy',
        'Attacher un rôle à une instance EC2 (instance profile)',
        'Appliquer le principe du moindre privilège',
      ],
      prerequisites: ['Lab aws-ec2-beginner-aws-account-setup', 'Lab aws-beginner-s3-basics'],
      scenario: `Un audit chez **SecureAccess TN** a trouvé des clés AWS codées en dur dans le code. Votre mission : remplacer ces clés par des rôles IAM sécurisés sur les instances EC2. Durée : ~30 min, coût : 0 USD.`,
      postLabQuiz: [
        {
          question: "Quel est l'avantage d'un rôle IAM par rapport à des clés d'accès codées en dur ?",
          options: [
            "Le rôle est gratuit",
            "AWS fournit des credentials temporaires rotés automatiquement — aucun secret à gérer ni à faire fuiter",
            "Le rôle est plus rapide",
            "Aucune différence",
          ],
          correct: 1,
          explanation: "Un rôle IAM attaché à une instance EC2 fournit des identifiants temporaires, rotés automatiquement par AWS via le metadata endpoint. Aucune clé permanente n'est stockée dans l'application, éliminant le risque de fuite de secrets dans le code ou les logs.",
        },
        {
          question: "Quels sont les 3 éléments essentiels d'une déclaration de policy IAM ?",
          options: [
            "Name, Region, Tag",
            "Effect, Action, Resource",
            "User, Password, MFA",
            "Bucket, Key, Value",
          ],
          correct: 1,
          explanation: "Une déclaration de policy IAM contient : Effect (Allow ou Deny), Action (les opérations API autorisées, ex: s3:GetObject), et Resource (sur quelles ressources). C'est la base du contrôle d'accès granulaire sur AWS.",
        },
      ],
      careerConnection: "La maîtrise d'IAM est fondamentale pour la sécurité AWS. Certifications : AWS Security Specialty, SAA-C03. Rôles : Cloud Security Engineer, IAM Specialist, DevSecOps.",
    },
    status: 'published',
  },
];

/* ─────────────────────────────────────────────────────────
 * Additional Azure Labs (Cosmos DB, Logic Apps)
 * ───────────────────────────────────────────────────────── */

const AZURE_EXTRA_RAW: SeedLabRowUnchained[] = [
  {
    slug: 'azure-beginner-cosmos-db',
    title: 'Azure Cosmos DB — NoSQL Basics',
    description: 'Créez un compte Cosmos DB, une base NoSQL et manipulez des documents avec l\'API SQL.',
    provider: 'azure',
    difficulty: 'beginner',
    estimatedTime: '50 min',
    moduleTitle: 'Data Services',
    tasks: [
      'Create a Cosmos DB account (Serverless, SQL API)',
      'Create a database and container with a partition key',
      'Insert documents using the Data Explorer',
      'Query documents with SQL-like syntax',
      'Explore throughput settings and Request Units (RU)',
    ],
    steps: [
      {
        title: 'Créer un compte Cosmos DB Serverless',
        instruction: `## Base NoSQL distribuée mondialement

**Azure Cosmos DB** est une base NoSQL managée, multi-modèle, à latence < 10ms garantie.

1. Portail → cherchez **Azure Cosmos DB** → **+ Create** → **Azure Cosmos DB for NoSQL**
2. Resource group : \`rg-cosmos-lab\`
3. Account name : \`cosmos-lab-[votrenom]\`
4. Capacity mode : **Serverless** (paiement à la requête, idéal lab)
5. **Review + Create** → Create (5 min)`,
        hint: `💡 Le mode Serverless facture par opération (pas de débit à provisionner) — parfait pour les charges variables ou les labs. Le mode Provisioned réserve un débit (RU/s) constant, mieux pour la production à charge stable.`,
        validationNote: `✅ Le compte Cosmos DB \`cosmos-lab-[nom]\` est déployé avec le statut Online.`,
        estimatedMinutes: 12,
      },
      {
        title: 'Créer une base, un container et insérer des documents',
        instruction: `## Manipuler des documents avec Data Explorer

1. Ouvrez le compte → **Data Explorer** → **New Container**
2. Database id : \`BoutiqueDB\` → Container id : \`Produits\`
3. **Partition key** : \`/categorie\` ← crucial pour la distribution
4. Insérez un document (New Item) :
\`\`\`json
{
  "id": "1",
  "nom": "Clavier mécanique",
  "categorie": "peripheriques",
  "prix": 79.99
}
\`\`\`
5. Ajoutez 2-3 autres documents avec des catégories variées`,
        hint: `💡 La partition key détermine comment Cosmos DB distribue les données. Choisissez une clé avec beaucoup de valeurs distinctes et réparties (ex: categorie, userId). Une mauvaise clé crée des "hot partitions" qui dégradent la performance.`,
        validationNote: `✅ Le container \`Produits\` contient plusieurs documents JSON visibles dans Data Explorer.`,
        estimatedMinutes: 12,
      },
      {
        title: 'Interroger en SQL et comprendre les RU, puis nettoyer',
        instruction: `## Requêtes et Request Units

1. Dans Data Explorer → **New SQL Query** :
\`\`\`sql
SELECT * FROM Produits p WHERE p.prix > 50
\`\`\`
2. Exécutez → observez le coût en bas : **Request Units (RU)** consommés
3. Les **RU** sont l'unité de facturation/performance de Cosmos DB : chaque opération consomme des RU

**Nettoyage :** Resource groups → \`rg-cosmos-lab\` → Delete.`,
        hint: `💡 1 RU = le coût de lecture d'un document de 1 Ko par sa clé. Une requête complexe ou un scan consomme plus de RU. Optimiser les RU = optimiser coût ET performance dans Cosmos DB.`,
        validationNote: `✅ La requête SQL retourne les produits filtrés et affiche les RU consommés. Resource group supprimé.`,
        estimatedMinutes: 8,
      },
    ],
    metadata: {
      level: 'beginner',
      levelLabel: 'Beginner',
      index: 0,
      totalInLevel: 1,
      providerLoginUrl: 'https://portal.azure.com/',
      logo: AZURE_LOGO,
      tags: ['azure', 'cosmos-db', 'nosql', 'database'],
      learningObjectives: [
        'Créer un compte Cosmos DB en mode Serverless',
        'Concevoir un container avec une partition key adaptée',
        'Manipuler des documents JSON via Data Explorer',
        'Comprendre les Request Units (RU)',
      ],
      prerequisites: ['Labs AZ-900 Débutant'],
      scenario: `**NoSQLApp TN** lance une application mondiale qui a besoin d'une base à faible latence partout. Vous découvrez Azure Cosmos DB et son modèle NoSQL. Durée : ~30 min, coût : ~0 USD (Serverless).`,
      costWarning: '⚠️ Le mode Serverless facture par opération (très peu pour un lab). Supprimez le Resource Group après le lab.',
      postLabQuiz: [
        {
          question: "Qu'est-ce qu'une Request Unit (RU) dans Cosmos DB ?",
          options: [
            "Une unité de stockage",
            "L'unité qui mesure le coût en performance/facturation d'une opération",
            "Un type de document",
            "Une région Azure",
          ],
          correct: 1,
          explanation: "Une Request Unit (RU) est l'unité de mesure du débit dans Cosmos DB : chaque opération (lecture, écriture, requête) consomme un certain nombre de RU. C'est à la fois l'unité de performance et de facturation. Optimiser les RU optimise coût et performance.",
        },
        {
          question: "Pourquoi le choix de la partition key est-il important ?",
          options: [
            "Il définit le mot de passe",
            "Il détermine la distribution des données — une mauvaise clé crée des 'hot partitions'",
            "Il chiffre les documents",
            "Il n'a aucune importance",
          ],
          correct: 1,
          explanation: "La partition key contrôle comment Cosmos DB répartit les données sur ses partitions physiques. Une bonne clé (valeurs nombreuses et bien réparties) assure une distribution équilibrée. Une mauvaise clé concentre le trafic sur quelques partitions ('hot partitions'), dégradant la performance.",
        },
      ],
      careerConnection: "Cosmos DB est très utilisé pour les applications mondiales à faible latence. Certifications : DP-420, AZ-204. Rôles : Cloud Developer, Data Engineer.",
    },
    status: 'published',
  },
  {
    slug: 'azure-intermediate-logic-apps',
    title: 'Automate Workflows with Logic Apps',
    description: 'Construisez des workflows automatisés sans code reliant des services Azure et des API externes.',
    provider: 'azure',
    difficulty: 'intermediate',
    estimatedTime: '70 min',
    moduleTitle: 'Integration Services',
    tasks: [
      'Create a Logic App with an HTTP trigger',
      'Add a condition to branch workflow logic',
      'Connect to an Outlook/Gmail connector to send emails',
      'Add a Blob Storage action to save request payloads',
      'Test the workflow end-to-end and review run history',
    ],
    steps: [
      {
        title: 'Créer une Logic App avec déclencheur HTTP',
        instruction: `## Automatisation low-code

**Azure Logic Apps** orchestre des workflows automatisés avec des centaines de connecteurs prêts à l'emploi — peu ou pas de code.

1. Portail → cherchez **Logic apps** → **+ Add** → **Consumption** plan
2. Resource group : \`rg-logic-lab\` → Name : \`logic-lab\` → Create
3. Ouvrez → **Logic app designer** → choisissez le trigger **"When a HTTP request is received"**
4. Sauvegardez → une URL POST est générée`,
        hint: `💡 Logic Apps (low-code, connecteurs visuels) vs Functions (code). Logic Apps excelle pour l'intégration entre services SaaS (envoyer un email quand un fichier arrive, etc.) sans écrire de code.`,
        validationNote: `✅ La Logic App \`logic-lab\` a un trigger HTTP avec une URL d'invocation générée.`,
        estimatedMinutes: 12,
      },
      {
        title: 'Ajouter une condition et une action',
        instruction: `## Logique conditionnelle et actions

1. Dans le designer → **+ New step** → **Condition**
2. Configurez : si le champ JSON \`priorite\` = "haute" → branche True
3. Dans la branche True → **+ Add an action** → connecteur **Azure Blob Storage** → "Create blob" (sauvegarde le payload)
4. Dans la branche False → une action différente (ex: ne rien faire ou logger)
5. Sauvegardez le workflow`,
        hint: `💡 Les connecteurs Logic Apps couvrent 1000+ services : Office 365, Salesforce, Twitter, SQL, Blob Storage, etc. C'est l'outil d'intégration (iPaaS) d'Azure, équivalent de Zapier/Power Automate niveau entreprise.`,
        validationNote: `✅ Le workflow contient une condition qui route vers une action Blob Storage selon la priorité.`,
        estimatedMinutes: 15,
      },
      {
        title: 'Tester et examiner l\'historique, puis nettoyer',
        instruction: `## Exécuter et observer

1. Copiez l'URL HTTP du trigger → envoyez une requête POST (via curl ou Postman) :
\`\`\`bash
curl -X POST "[URL]" -H "Content-Type: application/json" -d '{"priorite":"haute"}'
\`\`\`
2. Dans la Logic App → **Overview** → **Run history** → cliquez la dernière exécution
3. Vous voyez chaque étape colorée (vert = succès) avec ses entrées/sorties

**Nettoyage :** Resource groups → \`rg-logic-lab\` → Delete.`,
        hint: `💡 Le "Run history" est précieux pour le débogage : il montre exactement quelles étapes se sont exécutées, avec quelles données, et où ça a échoué le cas échéant. Chaque exécution est tracée.`,
        validationNote: `✅ L'exécution apparaît dans Run history avec toutes les étapes en vert. Resource group supprimé.`,
        estimatedMinutes: 10,
      },
    ],
    metadata: {
      level: 'intermediate',
      levelLabel: 'Intermediate',
      index: 0,
      totalInLevel: 1,
      providerLoginUrl: 'https://portal.azure.com/',
      logo: AZURE_LOGO,
      tags: ['azure', 'logic-apps', 'automation', 'integration'],
      learningObjectives: [
        'Créer une Logic App avec un déclencheur HTTP',
        'Ajouter de la logique conditionnelle (branches)',
        'Utiliser des connecteurs (Blob Storage, email)',
        'Examiner le run history pour le débogage',
      ],
      prerequisites: ['Lab az900-intermediate-8 (Blob Storage)'],
      scenario: `**AutoFlow TN** veut automatiser le traitement des demandes entrantes (sauvegarde, notification) sans développer d'application. Vous construisez un workflow Logic Apps low-code. Durée : ~37 min, coût : ~0 USD.`,
      costWarning: '⚠️ Logic Apps Consumption facture par action exécutée (très peu pour un lab). Supprimez le Resource Group après le lab.',
      postLabQuiz: [
        {
          question: "Quand préférer Logic Apps à Azure Functions ?",
          options: [
            "Quand on a besoin de code complexe et performant",
            "Pour intégrer des services SaaS via des connecteurs visuels, sans écrire de code",
            "Logic Apps est toujours meilleur",
            "Pour le calcul intensif",
          ],
          correct: 1,
          explanation: "Logic Apps excelle pour l'intégration (iPaaS) entre services via des connecteurs prêts à l'emploi, avec peu ou pas de code. Functions est préférable quand il faut du code custom et de la performance. Souvent, on les combine.",
        },
        {
          question: "À quoi sert le 'Run history' d'une Logic App ?",
          options: [
            "À facturer les exécutions",
            "À déboguer en visualisant chaque étape exécutée avec ses entrées/sorties",
            "À chiffrer les workflows",
            "À planifier les exécutions",
          ],
          correct: 1,
          explanation: "Le Run history trace chaque exécution du workflow, montrant quelles étapes se sont exécutées, avec quelles données en entrée/sortie, et où une erreur s'est produite le cas échéant. C'est l'outil principal de débogage des Logic Apps.",
        },
      ],
      careerConnection: "L'automatisation low-code (iPaaS) est de plus en plus demandée. Certifications : AZ-204, AZ-305. Rôles : Integration Engineer, Cloud Developer, Automation Specialist.",
    },
    status: 'published',
  },
];

function fillLearningObjectives(lab: SeedLabRow): SeedLabRow {
  const lo = lab.metadata.learningObjectives?.length
    ? lab.metadata.learningObjectives
    : lab.tasks;
  return {
    ...lab,
    metadata: { ...lab.metadata, learningObjectives: lo },
  };
}

/** All rows to upsert into `labs` (hubs + all provider tracks). */
export function getAllSeedLabRows(): SeedLabRow[] {
  const chain = (raw: SeedLabRowUnchained[]) => chainLevel(raw).map(fillLearningObjectives);

  return [
    ...HUB_LABS,
    ...chain(AZ900_BEGINNER_RAW),
    ...chain(AZ900_INTERMEDIATE_RAW),
    ...chain(AZURE_ADVANCED_RAW),
    ...chain(AZURE_EXTRA_RAW),
    ...chain(AWS_EC2_BEGINNER_RAW),
    ...chain(AWS_EC2_INTERMEDIATE_RAW),
    ...chain(AWS_ADVANCED_RAW),
    ...chain(AWS_EXTRA_RAW),
    ...chain(GCP_BEGINNER_RAW),
    ...chain(GCP_INTERMEDIATE_RAW),
    ...chain(GCP_ADVANCED_RAW),
  ];
}
