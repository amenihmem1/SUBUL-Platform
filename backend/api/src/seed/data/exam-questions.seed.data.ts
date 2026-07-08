import type { ExamQuestionOption } from '../../exams/entities/exam-question.entity';

export interface ExamQuestionSeed {
  sortOrder: number;
  prompt: string;
  options: ExamQuestionOption[];
  correctOptionId: string;
}

const A = (text: string): ExamQuestionOption => ({ id: 'A', text });
const B = (text: string): ExamQuestionOption => ({ id: 'B', text });
const C = (text: string): ExamQuestionOption => ({ id: 'C', text });
const D = (text: string): ExamQuestionOption => ({ id: 'D', text });

/** Key: `${title}|${course}` — must match BASELINE_EXAMS entries. */
export const BASELINE_EXAM_QUESTIONS: Record<string, ExamQuestionSeed[]> = {
  'AZ-900 Practice Exam 1|Azure Fundamentals': [
    {
      sortOrder: 0,
      prompt: 'What is a primary benefit of cloud computing?',
      options: [
        A('Eliminating the need for any network security'),
        B('Capital expenditure instead of operational expenditure'),
        C('Pay-as-you-go pricing and flexible consumption'),
        D('Guaranteed 100% uptime for all services'),
      ],
      correctOptionId: 'C',
    },
    {
      sortOrder: 1,
      prompt: 'Which Azure service provides serverless compute?',
      options: [
        A('Azure Virtual Machines'),
        B('Azure Functions'),
        C('Azure Virtual Network'),
        D('Azure Disk Storage'),
      ],
      correctOptionId: 'B',
    },
    {
      sortOrder: 2,
      prompt: 'What does IaaS (Infrastructure as a Service) provide?',
      options: [
        A('Only pre-built user interfaces'),
        B('Managed applications without managing infrastructure'),
        C('Virtual machines, storage, and networks you manage'),
        D('Only identity and access management'),
      ],
      correctOptionId: 'C',
    },
    {
      sortOrder: 3,
      prompt: 'Which Azure service is used for identity and access management?',
      options: [A('Azure Policy'), B('Microsoft Entra ID'), C('Azure Monitor'), D('Azure DNS')],
      correctOptionId: 'B',
    },
    {
      sortOrder: 4,
      prompt: 'What is an Azure region?',
      options: [
        A('A single data center in one building'),
        B('A set of data centers connected by a low-latency network'),
        C('A subscription billing boundary'),
        D('A resource group'),
      ],
      correctOptionId: 'B',
    },
    {
      sortOrder: 5,
      prompt: 'Which model describes shared responsibility across cloud providers and customers?',
      options: [
        A('Waterfall model'),
        B('Shared responsibility model'),
        C('DevOps maturity model'),
        D('OSI model'),
      ],
      correctOptionId: 'B',
    },
    {
      sortOrder: 6,
      prompt: 'What is a resource group in Azure?',
      options: [
        A('A billing unit for Azure Support'),
        B('A logical container for resources that share the same lifecycle'),
        C('A virtual network subnet'),
        D('A storage account tier'),
      ],
      correctOptionId: 'B',
    },
    {
      sortOrder: 7,
      prompt: 'Which Azure service provides object storage for unstructured data?',
      options: [A('Azure SQL Database'), B('Azure Blob Storage'), C('Azure Cosmos DB'), D('Azure Cache for Redis')],
      correctOptionId: 'B',
    },
    {
      sortOrder: 8,
      prompt: 'What is elasticity in cloud computing?',
      options: [
        A('Fixed capacity for predictable workloads'),
        B('Scaling resources up or down based on demand'),
        C('Encrypting data at rest only'),
        D('Using only open-source software'),
      ],
      correctOptionId: 'B',
    },
    {
      sortOrder: 9,
      prompt: 'Which Azure tool helps estimate costs before deployment?',
      options: [A('Azure Advisor'), B('Azure Pricing Calculator'), C('Azure Sentinel'), D('Azure Policy')],
      correctOptionId: 'B',
    },
  ],

  'AWS Cloud Practitioner Mock Exam|AWS Cloud Practitioner': [
    {
      sortOrder: 0,
      prompt: 'Which statement best describes the AWS Well-Architected Framework?',
      options: [
        A('A single service for monitoring workloads'),
        B('Guidance and best practices across operational excellence, security, reliability, performance, cost, sustainability'),
        C('A certification exam only'),
        D('A reserved instance purchase program'),
      ],
      correctOptionId: 'B',
    },
    {
      sortOrder: 1,
      prompt: 'What is AWS IAM used for?',
      options: [
        A('Object storage only'),
        B('Managing users, groups, roles, and permissions'),
        C('Running containers without servers'),
        D('DNS hosting'),
      ],
      correctOptionId: 'B',
    },
    {
      sortOrder: 2,
      prompt: 'Which AWS service provides relational database hosting?',
      options: [A('Amazon S3'), B('Amazon RDS'), C('Amazon DynamoDB'), D('Amazon EBS')],
      correctOptionId: 'B',
    },
    {
      sortOrder: 3,
      prompt: 'What does the AWS Shared Responsibility Model define?',
      options: [
        A('How to split subnets across AZs'),
        B('Security and compliance responsibilities between AWS and the customer'),
        C('Reserved instance pricing tiers'),
        D('API rate limits'),
      ],
      correctOptionId: 'B',
    },
    {
      sortOrder: 4,
      prompt: 'Which service is Amazon S3?',
      options: [
        A('A relational database'),
        B('Object storage for unstructured data'),
        C('A message queue'),
        D('A container orchestrator'),
      ],
      correctOptionId: 'B',
    },
    {
      sortOrder: 5,
      prompt: 'What is an Availability Zone in AWS?',
      options: [
        A('A geographic area with multiple countries'),
        B('One or more discrete data centers with redundant power and networking'),
        C('A billing account'),
        D('A VPC peering connection'),
      ],
      correctOptionId: 'B',
    },
    {
      sortOrder: 6,
      prompt: 'Which AWS support plan includes 24/7 phone and chat for production systems?',
      options: [
        A('Basic only'),
        B('Developer'),
        C('Business or Enterprise'),
        D('Free tier'),
      ],
      correctOptionId: 'C',
    },
    {
      sortOrder: 7,
      prompt: 'What is AWS Lambda?',
      options: [
        A('A managed load balancer'),
        B('A serverless compute service that runs code in response to events'),
        C('A block storage volume'),
        D('A VPN gateway'),
      ],
      correctOptionId: 'B',
    },
    {
      sortOrder: 8,
      prompt: 'Which pillar focuses on protecting systems and data?',
      options: [
        A('Cost optimization'),
        B('Security'),
        C('Reliability'),
        D('Performance efficiency'),
      ],
      correctOptionId: 'B',
    },
    {
      sortOrder: 9,
      prompt: 'What is a primary benefit of Amazon CloudFront?',
      options: [
        A('Relational database hosting'),
        B('Content delivery network for low latency and high transfer speeds'),
        C('Serverless functions only'),
        D('Key management'),
      ],
      correctOptionId: 'B',
    },
  ],

  'SC-900 Security Fundamentals Quiz|Security Fundamentals': [
    {
      sortOrder: 0,
      prompt: 'What is the primary purpose of multi-factor authentication (MFA)?',
      options: [
        A('Replace passwords entirely'),
        B('Add a second factor beyond something you know'),
        C('Encrypt all network traffic'),
        D('Disable single sign-on'),
      ],
      correctOptionId: 'B',
    },
    {
      sortOrder: 1,
      prompt: 'Which concept describes granting least privilege access?',
      options: [
        A('Giving every user admin rights'),
        B('Granting only the permissions needed to perform a task'),
        C('Disabling all logging'),
        D('Using only public networks'),
      ],
      correctOptionId: 'B',
    },
    {
      sortOrder: 2,
      prompt: 'What is a common goal of identity governance?',
      options: [
        A('Eliminating audits'),
        B('Ensuring appropriate access reviews and lifecycle management'),
        C('Removing encryption'),
        D('Disabling MFA'),
      ],
      correctOptionId: 'B',
    },
    {
      sortOrder: 3,
      prompt: 'Which term describes protecting data from unauthorized disclosure?',
      options: [A('Integrity'), B('Confidentiality'), C('Availability'), D('Non-repudiation')],
      correctOptionId: 'B',
    },
    {
      sortOrder: 4,
      prompt: 'What is phishing?',
      options: [
        A('Encrypting disk volumes'),
        B('Deceptive attempts to obtain sensitive information by impersonating a trusted actor'),
        C('A backup strategy'),
        D('A firewall rule'),
      ],
      correctOptionId: 'B',
    },
    {
      sortOrder: 5,
      prompt: 'Which control type includes policies and procedures?',
      options: [A('Physical'), B('Administrative'), C('Technical'), D('Environmental')],
      correctOptionId: 'B',
    },
    {
      sortOrder: 6,
      prompt: 'What is zero trust in security?',
      options: [
        A('Trust all internal network traffic by default'),
        B('Verify explicitly and assume breach — no implicit trust'),
        C('Disable all remote access'),
        D('Use only passwords'),
      ],
      correctOptionId: 'B',
    },
    {
      sortOrder: 7,
      prompt: 'Which regulation often drives data residency and privacy requirements?',
      options: [
        A('HTTP'),
        B('GDPR and regional privacy laws'),
        C('TCP'),
        D('DNS'),
      ],
      correctOptionId: 'B',
    },
    {
      sortOrder: 8,
      prompt: 'What is defense in depth?',
      options: [
        A('A single firewall at the perimeter'),
        B('Layered security controls to reduce risk'),
        C('Disabling all logging'),
        D('Using one password for all systems'),
      ],
      correctOptionId: 'B',
    },
    {
      sortOrder: 9,
      prompt: 'Which practice helps detect security incidents?',
      options: [
        A('Disabling monitoring'),
        B('Centralized logging, alerting, and SIEM capabilities'),
        C('Removing encryption'),
        D('Sharing admin credentials'),
      ],
      correctOptionId: 'B',
    },
  ],
};
