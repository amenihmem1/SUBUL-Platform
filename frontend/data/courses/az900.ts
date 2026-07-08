// @/data/courses/az900.ts

// ─── Interfaces ───────────────────────────────────────────────────────────────

export interface Lesson {
  id: number;
  title: string;
  content: string;
  bullets: string[];
  examTips: string[];
}

export interface CourseModule {
  id: number;
  title: string;
  icon: string;
  lessons: Lesson[];
}

export interface Lab {
  id: number;
  title: string;
  moduleTitle: string;
  tasks: string[];
}

export interface CourseLevel {
  level: 'beginner' | 'intermediate';
  label: string;
  objective: string;
  modules: CourseModule[];
  labs: Lab[];
}

export interface CourseDataFull {
  title: string;
  description: string;
  levels: CourseLevel[];
}

// Backward compat type
export type CourseData = {
  title: string;
  description: string;
  modules: CourseModule[];
};

// ─── Full Course ──────────────────────────────────────────────────────────────

export const AZ900_FULL_COURSE: CourseDataFull = {
  title: 'Microsoft Azure Fundamentals (AZ-900)',
  description:
    'Cours de préparation à la certification AZ-900 : fondamentaux du cloud, services Azure, sécurité, gouvernance et tarification.',

  levels: [
    // ══════════════════════════════════════════════════════
    // BEGINNER
    // ══════════════════════════════════════════════════════
    {
      level: 'beginner',
      label: 'Débutant',
      objective: 'Comprendre les fondamentaux du cloud et préparer la certification AZ-900.',
      modules: [
        {
          id: 1,
          title: 'Cloud Foundations',
          icon: '☁️',
          lessons: [
            {
              id: 1,
              title: 'What is Cloud Computing?',
              content:
                "Le cloud computing est la livraison de services informatiques à la demande via Internet. Les ressources — calcul, stockage, réseau — sont provisionnées instantanément selon un modèle de facturation à l'usage, sans investissement matériel initial.",
              bullets: [
                'On-demand delivery over the internet',
                'Pay-as-you-go pricing',
                'Scalability and elasticity',
                'Reduced operational overhead',
              ],
              examTips: [
                'La définition NIST du cloud (5 caractéristiques) est testée à l\'examen',
                'On-demand self-service = provisionnement automatique sans intervention humaine',
                'Pay-as-you-go = vous payez ce que vous consommez, pas à l\'avance',
              ],
            },
            {
              id: 2,
              title: 'Cloud Deployment Models',
              content:
                'Les trois modèles de déploiement définissent QUI héberge l\'infrastructure. Le choix dépend de vos besoins en contrôle, conformité et coût.',
              bullets: [
                'Public Cloud — hébergé par Microsoft, partagé entre clients',
                'Private Cloud — hébergé dans votre datacenter, usage exclusif',
                'Hybrid Cloud — combinaison des deux pour flexibilité maximale',
                'Use-case comparisons',
              ],
              examTips: [
                'Public Cloud = Microsoft gère l\'infra, vous gérez vos ressources',
                'Private Cloud = vous gérez tout (plus de contrôle, plus de coût)',
                'Hybrid Cloud = recommandé pour la transition progressive vers le cloud',
              ],
            },
            {
              id: 3,
              title: 'CapEx vs OpEx',
              content:
                'La migration vers le cloud transforme les dépenses d\'investissement (CapEx) en dépenses d\'exploitation (OpEx), améliorant la flexibilité financière et réduisant le risque.',
              bullets: [
                'CapEx = upfront investment (achat matériel/licences)',
                'OpEx = consumption-based model (abonnement mensuel)',
                'Cloud follows OpEx — payez ce que vous utilisez',
                'Lower financial risk — pas de capacité inutilisée',
              ],
              examTips: [
                'Question classique : quel modèle de dépense correspond au cloud ? → OpEx',
                'CapEx = immobilisation financière, risque de surcapacité',
                'OpEx = prévisibilité budgétaire, adaptation à la demande',
              ],
            },
          ],
        },

        {
          id: 2,
          title: 'Cloud Service Models',
          icon: '🧱',
          lessons: [
            {
              id: 1,
              title: 'Infrastructure as a Service (IaaS)',
              content:
                'L\'IaaS fournit des ressources de calcul virtualisées (VM, réseau, stockage). Le client gère OS, middleware et applications. Le fournisseur gère uniquement la couche physique.',
              bullets: [
                'Virtual Machines — serveurs virtuels à la demande',
                'Customer manages OS and apps — contrôle total sur la pile logicielle',
                'Maximum control — migration lift-and-shift depuis on-premises',
              ],
              examTips: [
                'IaaS = client gère OS + middleware + applications + données',
                'Exemples Azure : Virtual Machines, Azure Storage, Azure Virtual Network',
                'Shared Responsibility : fournisseur = physique, client = tout le reste',
              ],
            },
            {
              id: 2,
              title: 'Platform as a Service (PaaS)',
              content:
                'Le PaaS abstrait la couche infrastructure (OS, runtime, middleware) pour laisser le développeur se concentrer uniquement sur le code et les données.',
              bullets: [
                'Managed runtime environment — OS et runtime patchés automatiquement',
                'Focus on development — déployez votre code, pas votre infra',
                'Reduced management overhead — Microsoft gère la plateforme',
              ],
              examTips: [
                'PaaS = client gère uniquement l\'application et les données',
                'Exemples Azure : App Service, Azure SQL Database, Azure Functions',
                'Plus facile que IaaS, moins de contrôle mais moins de travail',
              ],
            },
            {
              id: 3,
              title: 'Software as a Service (SaaS)',
              content:
                'Le SaaS livre des logiciels complets, hébergés et maintenus entièrement par le fournisseur. L\'utilisateur accède via navigateur, sans aucune gestion d\'infrastructure.',
              bullets: [
                'Subscription-based software — abonnement mensuel ou annuel',
                'Accessible via browser — aucune installation requise',
                'Minimal management — Microsoft gère tout, vous utilisez',
              ],
              examTips: [
                'SaaS = client ne gère rien, il utilise seulement l\'application',
                'Exemples : Microsoft 365, Teams, Salesforce, GitHub',
                'Responsabilité client : données et accès utilisateurs uniquement',
              ],
            },
          ],
        },

        {
          id: 3,
          title: 'Cloud Benefits',
          icon: '🚀',
          lessons: [
            {
              id: 1,
              title: 'High Availability & Scalability',
              content:
                'Azure garantit la haute disponibilité grâce à la redondance multi-zones, et la scalabilité par ajout ou suppression automatique de ressources selon la demande réelle.',
              bullets: [
                'Redundancy — ressources répliquées sur plusieurs zones/régions',
                'Horizontal vs Vertical scaling — ajout de nœuds vs montée en charge',
                'Load balancing — distribution automatique du trafic',
              ],
              examTips: [
                'HA = disponibilité ≥ 99.9% grâce à la redondance des composants',
                'Vertical scaling = plus de CPU/RAM sur la même VM (limité)',
                'Horizontal scaling = plus de VM en parallèle (recommandé, scalable)',
              ],
            },
            {
              id: 2,
              title: 'Reliability & Predictability',
              content:
                'La fiabilité du cloud repose sur une infrastructure mondiale avec reprise après sinistre automatisée. La prévisibilité permet d\'anticiper coûts et performances.',
              bullets: [
                'Disaster recovery — reprise automatique en cas de panne',
                'Global deployment — déployez partout dans le monde en quelques clics',
                'Cost forecasting tools — estimez vos dépenses avant de déployer',
              ],
              examTips: [
                'Disaster Recovery : RTO (temps de reprise) + RPO (perte de données max)',
                'Predictability inclut cost predictability ET performance predictability',
                'Azure SLA garanti contractuellement par Microsoft',
              ],
            },
            {
              id: 3,
              title: 'Security, Governance & Manageability',
              content:
                'Azure intègre des contrôles de sécurité (Defender, Entra ID), de gouvernance (Policy, Blueprints) et de gestion (Monitor, Advisor) à chaque couche de la plateforme.',
              bullets: [
                'Identity and access control — Entra ID, MFA, RBAC',
                'Compliance standards — 100+ certifications (ISO, SOC, GDPR, HIPAA)',
                'Monitoring and automation — Azure Monitor, Advisor, Automation',
              ],
              examTips: [
                'Defense in depth = sécurité en couches (physique → réseau → identité → données)',
                'Zero Trust = "ne jamais faire confiance, toujours vérifier"',
                'Shared Responsibility : Microsoft sécurise l\'infra, vous sécurisez vos données',
              ],
            },
          ],
        },
      ],

      labs: [
        {
          id: 1,
          title: 'Explore Azure Portal',
          moduleTitle: 'Cloud Foundations',
          tasks: [
            'Créer un compte Azure gratuit (Free Tier)',
            'Explorer le portail Azure et identifier les menus principaux',
            'Naviguer vers la carte des régions Azure mondiales',
            'Créer un Resource Group nommé "rg-az900-lab1"',
            'Explorer les options de tagging sur le Resource Group',
          ],
        },
        {
          id: 2,
          title: 'Deploy a Virtual Machine (IaaS)',
          moduleTitle: 'Cloud Service Models',
          tasks: [
            'Créer une VM Azure (Windows Server 2022, taille B1s)',
            'Choisir la région et la zone de disponibilité',
            'Configurer le réseau virtuel et le sous-réseau',
            'Observer les responsabilités client vs Microsoft dans le portail',
            'Se connecter à la VM via RDP ou Bastion',
            'Supprimer la VM après le lab (éviter les coûts)',
          ],
        },
        {
          id: 3,
          title: 'Deploy an App Service (PaaS)',
          moduleTitle: 'Cloud Service Models',
          tasks: [
            'Créer une Web App Azure (App Service, plan gratuit F1)',
            'Observer l\'abstraction infrastructure (pas de gestion OS)',
            'Déployer une application HTML simple via ZIP Deploy',
            'Comparer les responsabilités avec le lab VM précédent',
            'Explorer les options de scaling dans App Service',
          ],
        },
        {
          id: 4,
          title: 'Scaling & Monitoring',
          moduleTitle: 'Cloud Benefits',
          tasks: [
            'Activer l\'autoscaling sur un App Service Plan',
            'Configurer une règle d\'autoscale (CPU > 70% → ajouter une instance)',
            'Ouvrir Azure Monitor et visualiser les métriques de la VM',
            'Créer une alerte sur une métrique (CPU > 80%)',
            'Comprendre le concept de High Availability via les diagnostics',
          ],
        },
      ],
    },

    // ══════════════════════════════════════════════════════
    // INTERMEDIATE
    // ══════════════════════════════════════════════════════
    {
      level: 'intermediate',
      label: 'Intermédiaire',
      objective: "Maîtriser l'architecture Azure et la logique de décision pour l'examen.",
      modules: [
        {
          id: 1,
          title: 'Azure Core Architecture',
          icon: '🏗️',
          lessons: [
            {
              id: 1,
              title: 'Regions & Availability Zones',
              content:
                "L'infrastructure Azure est organisée en 60+ régions géographiques. Chaque région supportée comporte au moins 3 zones de disponibilité physiquement indépendantes pour garantir la résilience maximale.",
              bullets: [
                'Geographic regions — 60+ régions dans le monde',
                'Availability zones — 3 zones min. par région supportée',
                'Impact on SLA — AZ garantit 99.99% vs 99.9% sans AZ',
              ],
              examTips: [
                'Minimum 3 Availability Zones par région supportée',
                'Availability Zone ≠ Availability Set (AZ = datacenter entier, AS = racks dans un datacenter)',
                'Paires de régions : West Europe ↔ North Europe, East US ↔ West US',
              ],
            },
            {
              id: 2,
              title: 'Resource Groups & Subscriptions',
              content:
                "La hiérarchie Azure organise les ressources en Management Groups > Subscriptions > Resource Groups > Resources, permettant une gouvernance et une facturation précises à chaque niveau.",
              bullets: [
                'Logical organization — regrouper les ressources par projet/environnement',
                'RBAC basics — contrôle d\'accès hérité depuis la souscription',
                'Isolation strategies — séparer prod/dev/test',
              ],
              examTips: [
                'Un Resource Group ne peut pas être imbriqué dans un autre RG',
                'RBAC s\'hérite en cascade : Management Group → Subscription → RG → Resource',
                'Les ressources d\'un RG peuvent être dans des régions différentes',
              ],
            },
          ],
        },

        {
          id: 2,
          title: 'Compute Deep Dive',
          icon: '💻',
          lessons: [
            {
              id: 1,
              title: 'Virtual Machines & Scale Sets',
              content:
                "Les VM Azure permettent la migration lift-and-shift des workloads on-premises. Les Scale Sets orchestrent automatiquement des pools de VM identiques avec autoscaling.",
              bullets: [
                'VM sizing — D-series, E-series, F-series selon workload',
                'Auto-scaling — VMSS ajuste dynamiquement le nombre de VM',
                'Use cases — dev/test, legacy apps, contrôle total',
              ],
              examTips: [
                'VMSS = Virtual Machine Scale Set = autoscaling automatique',
                'Spot VMs = jusqu\'à 90% moins cher, mais peuvent être évictées',
                'Reserved Instances = économies jusqu\'à 72% sur 1 ou 3 ans',
              ],
            },
            {
              id: 2,
              title: 'Containers & Kubernetes',
              content:
                "AKS (Azure Kubernetes Service) est le service Kubernetes managé d'Azure pour orchestrer des conteneurs à l'échelle, avec plan de contrôle gratuit et intégration native Azure.",
              bullets: [
                'AKS basics — cluster Kubernetes managé (control plane gratuit)',
                'Container orchestration — déploiement, scaling, self-healing',
                'When to use containers — microservices, CI/CD, portabilité',
              ],
              examTips: [
                'ACI = Azure Container Instances (conteneurs simples, sans orchestration)',
                'AKS = Kubernetes managé (vous payez uniquement les worker nodes)',
                'Azure Container Registry = registre privé pour vos images Docker',
              ],
            },
            {
              id: 3,
              title: 'Serverless',
              content:
                "Azure Functions exécute des fonctions isolées en réponse à des événements (HTTP, timer, message queue) sans gestion de serveur, avec facturation uniquement à l'exécution.",
              bullets: [
                'Event-driven architecture — déclencheurs : HTTP, timer, blob, queue',
                'Azure Functions — code stateless, scaling automatique à 0',
                'Billing per execution — vous payez uniquement quand le code s\'exécute',
              ],
              examTips: [
                'Azure Functions = serverless, event-driven, scaling to zero',
                'Logic Apps = workflows serverless visuels (low-code/no-code)',
                'Facturation : nombre d\'exécutions + durée — pas de coût si inactif',
              ],
            },
          ],
        },

        {
          id: 3,
          title: 'Networking Essentials',
          icon: '🌐',
          lessons: [
            {
              id: 1,
              title: 'Virtual Networks & Subnets',
              content:
                "Un Virtual Network (VNet) est l'espace réseau privé isolé d'Azure. Les subnets le segmentent logiquement pour contrôler le flux de trafic entre ressources.",
              bullets: [
                'IP addressing — plages CIDR privées (10.0.0.0/8, 172.16.0.0/12…)',
                'Network segmentation — subnets web, app, data séparés',
                'Private endpoints — accès privé aux services PaaS sans Internet',
              ],
              examTips: [
                'NSG (Network Security Group) = firewall stateful au niveau subnet ou NIC',
                'Private Endpoint = accès privé aux services managés (ex: Azure SQL)',
                'VNet Peering = connexion directe entre VNets sans passerelle publique',
              ],
            },
            {
              id: 2,
              title: 'Load Balancer & VPN Gateway',
              content:
                "Azure Load Balancer distribue le trafic sur des VM backend (couche L4). VPN Gateway crée des tunnels IPsec chiffrés entre Azure et votre réseau on-premises.",
              bullets: [
                'Traffic distribution — L4 (TCP/UDP) pour les VM backend',
                'Hybrid connectivity — VPN site-to-site ou point-to-site',
                'Secure access — chiffrement IPsec/IKE',
              ],
              examTips: [
                'Azure LB = L4 (TCP/UDP), Application Gateway = L7 (HTTP/HTTPS + WAF)',
                'VPN Gateway vs ExpressRoute : ExpressRoute = connexion privée dédiée (pas via Internet)',
                'Azure Front Door = CDN + WAF + routage global intelligent (L7)',
              ],
            },
          ],
        },

        {
          id: 4,
          title: 'Storage & Databases',
          icon: '🗄️',
          lessons: [
            {
              id: 1,
              title: 'Azure Storage Types',
              content:
                "Azure Blob Storage stocke des objets non structurés (fichiers, images, vidéos) avec 3 niveaux d'accès (Hot, Cool, Archive) pour optimiser automatiquement les coûts.",
              bullets: [
                'Blob storage — objets non structurés (images, vidéos, backups)',
                'Disk storage — stockage bloc persistant pour les VM',
                'File storage — partages SMB/NFS pour migrations on-prem',
              ],
              examTips: [
                'Hot = accès fréquent (coût stockage élevé, accès peu cher)',
                'Cool = accès < 1 fois/mois, Archive = accès rare (heures pour récupérer)',
                'Redondance : LRS → ZRS → GRS → GZRS (de local à géo-redondant)',
              ],
            },
            {
              id: 2,
              title: 'Azure SQL vs Cosmos DB',
              content:
                "Azure SQL Database est un SGBDR managé compatible SQL Server pour workloads relationnels. Cosmos DB est une base NoSQL multi-modèle avec distribution mondiale et latence garantie inférieure à 10ms.",
              bullets: [
                'Relational vs NoSQL — SQL Server T-SQL vs document, clé-valeur, graphe',
                'Global distribution — Cosmos DB répliqué dans plusieurs régions automatiquement',
                'Use case comparison — Azure SQL = OLTP structuré, Cosmos DB = données globales',
              ],
              examTips: [
                'Cosmos DB = SLA 99.999%, latence < 10ms, 5 API (SQL, MongoDB, Cassandra…)',
                'Azure SQL = compatible SQL Server, migration SSMA facile depuis on-prem',
                'Cosmos DB a une distribution mondiale native, Azure SQL nécessite configuration',
              ],
            },
          ],
        },

        {
          id: 5,
          title: 'Identity & Governance',
          icon: '🔐',
          lessons: [
            {
              id: 1,
              title: 'Entra ID & RBAC',
              content:
                "Microsoft Entra ID (ex Azure Active Directory) centralise l'authentification et l'autorisation pour Azure et Microsoft 365. RBAC contrôle l'accès aux ressources Azure via des rôles prédéfinis.",
              bullets: [
                'Authentication & authorization — SSO, MFA, Conditional Access',
                'Role assignments — Owner, Contributor, Reader, User Access Admin',
                'Conditional access — politiques basées sur location, device, risk score',
              ],
              examTips: [
                '4 rôles RBAC built-in principaux : Owner > Contributor > Reader > User Access Admin',
                'MFA = couche de sécurité critique pour les comptes à hauts privilèges',
                'Entra ID = ancien Azure Active Directory (renommé en 2023)',
              ],
            },
            {
              id: 2,
              title: 'Cost Management & Policy',
              content:
                "Azure Cost Management permet de suivre et optimiser les dépenses cloud. Azure Policy applique automatiquement des règles de conformité sur les ressources de votre souscription.",
              bullets: [
                'Budgets & alerts — définir des seuils de dépenses avec alertes',
                'Azure Policy — créer des guardrails sur les ressources',
                'Tagging strategy — étiqueter les ressources pour l\'allocation des coûts',
              ],
              examTips: [
                'Azure Policy = guardrails (empêche la création de ressources non conformes)',
                'Cost Management ne bloque pas, il alerte — seule Policy peut bloquer',
                'Tags ≠ Resource Groups : les tags sont des métadonnées libres sur chaque ressource',
              ],
            },
          ],
        },
      ],

      labs: [
        // Azure Core (2 labs)
        {
          id: 1,
          title: 'Multi-Region Deployment',
          moduleTitle: 'Azure Core Architecture',
          tasks: [
            'Déployer une ressource (Storage Account) en région West Europe',
            'Déployer la même ressource en région North Europe',
            'Activer la geo-réplication entre les deux régions',
            'Observer le failover automatique dans le portail',
            'Analyser l\'impact sur le SLA avec la redondance GRS',
          ],
        },
        {
          id: 2,
          title: 'Resource Groups + RBAC Configuration',
          moduleTitle: 'Azure Core Architecture',
          tasks: [
            'Créer 2 Resource Groups : "rg-prod" et "rg-dev"',
            'Assigner le rôle "Contributor" à un utilisateur sur rg-prod',
            'Assigner le rôle "Reader" à un autre utilisateur',
            'Tester les permissions via le portail avec les deux comptes',
            'Vérifier l\'héritage RBAC depuis la souscription',
          ],
        },

        // Compute (3 labs)
        {
          id: 3,
          title: 'VM Scale Set avec Autoscaling',
          moduleTitle: 'Compute Deep Dive',
          tasks: [
            'Créer un Virtual Machine Scale Set (VMSS) avec 2 instances initiales',
            'Configurer l\'autoscale : minimum 1, maximum 5 instances',
            'Définir une règle : CPU > 70% → +1 instance',
            'Simuler une charge CPU avec un script de stress test',
            'Observer le scaling automatique dans Azure Monitor',
          ],
        },
        {
          id: 4,
          title: 'Deploy Azure Kubernetes Service (AKS)',
          moduleTitle: 'Compute Deep Dive',
          tasks: [
            'Créer un cluster AKS avec 1 node pool (Standard_B2s)',
            'Configurer kubectl pour se connecter au cluster',
            'Déployer un conteneur nginx via manifest YAML',
            'Exposer l\'application via un Service LoadBalancer',
            'Vérifier l\'accès externe via l\'IP publique du service',
          ],
        },
        {
          id: 5,
          title: 'Azure Functions — Serverless HTTP Trigger',
          moduleTitle: 'Compute Deep Dive',
          tasks: [
            'Créer une Function App (runtime Node.js ou Python)',
            'Créer une fonction HTTP Trigger via le portail',
            'Tester la fonction avec Postman ou curl',
            'Observer les métriques d\'exécution dans Application Insights',
            'Comparer le coût vs une VM équivalente en uptime',
          ],
        },

        // Networking (2 labs)
        {
          id: 6,
          title: 'Create VNet + Subnets + NSG',
          moduleTitle: 'Networking Essentials',
          tasks: [
            'Créer un VNet avec l\'espace d\'adressage 10.0.0.0/16',
            'Créer 2 subnets : "web" (10.0.1.0/24) et "data" (10.0.2.0/24)',
            'Créer un NSG et l\'attacher au subnet "web"',
            'Configurer une règle NSG : autoriser HTTP (port 80) inbound',
            'Vérifier l\'isolation réseau entre les subnets',
          ],
        },
        {
          id: 7,
          title: 'Configure Azure Load Balancer',
          moduleTitle: 'Networking Essentials',
          tasks: [
            'Créer 2 VM identiques dans un Availability Set',
            'Créer un Load Balancer public avec une IP publique statique',
            'Ajouter les 2 VM au Backend Pool du Load Balancer',
            'Configurer une Health Probe (TCP port 80)',
            'Tester la distribution du trafic en désactivant une VM',
          ],
        },

        // Storage (2 labs)
        {
          id: 8,
          title: 'Blob Storage — Gestion des tiers d\'accès',
          moduleTitle: 'Storage & Databases',
          tasks: [
            'Créer un Storage Account (LRS, région West Europe)',
            'Créer un container Blob et uploader plusieurs fichiers',
            'Changer un blob de "Hot" à "Cool" tier manuellement',
            'Créer une Lifecycle Management Policy (Hot → Cool après 30j)',
            'Observer les économies de coût entre les tiers',
          ],
        },
        {
          id: 9,
          title: 'Deploy Azure SQL + Connexion',
          moduleTitle: 'Storage & Databases',
          tasks: [
            'Créer un serveur Azure SQL et une base de données (S0)',
            'Configurer le firewall pour autoriser votre IP cliente',
            'Se connecter depuis Azure Data Studio',
            'Créer une table et insérer des données de test',
            'Explorer les options de backup automatique et geo-réplication',
          ],
        },

        // Identity & Governance (2 labs)
        {
          id: 10,
          title: 'Configure Entra ID + RBAC',
          moduleTitle: 'Identity & Governance',
          tasks: [
            'Créer un nouvel utilisateur dans Microsoft Entra ID',
            'Activer et configurer le MFA pour cet utilisateur',
            'Assigner un rôle RBAC "Contributor" sur un Resource Group',
            'Créer une Conditional Access Policy (MFA si hors réseau)',
            'Tester l\'accès avec et sans MFA selon la politique',
          ],
        },
        {
          id: 11,
          title: 'Azure Policy + Budget Alert',
          moduleTitle: 'Identity & Governance',
          tasks: [
            'Créer une Azure Policy "Allowed locations" (West Europe uniquement)',
            'Assigner la Policy à votre souscription ou Resource Group',
            'Tenter de créer une ressource dans une région non autorisée',
            'Créer un Budget mensuel avec seuil à 50€',
            'Configurer des alertes à 80% et 100% du budget',
          ],
        },
      ],
    },
  ],
};

// ─── Backward compatibility ───────────────────────────────────────────────────

export const AZ900_COURSE: CourseData = {
  title: AZ900_FULL_COURSE.title,
  description: AZ900_FULL_COURSE.description,
  modules: AZ900_FULL_COURSE.levels[0].modules,
};
