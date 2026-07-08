# Subul Certification Academy Content Pack

Generated: 2026-05-01T23:43:10.272133Z

This pack is an original, academy-grade Subul import bundle built from official public certification pages, study guides, documentation, and public exam objective language. It does **not** contain official exam dumps, copied exam questions, or protected provider material.

## Files

```txt
subul-certification-pack/
├── courses-certifications.json
├── interactive-labs.json
├── practice-exams.json
├── certification-paths.json
├── invalid-test-sample.json
└── README.md
```

## Scale

- Certifications: **20**
- Courses: **100**
- Modules: **800**
- Lessons: **4000**
- Embedded course labs: **800**
- Standalone interactive labs: **240**
- Practice exams: **40**
- Practice questions: **600**
- Certification paths: **20**

## Provider breakdown

| Provider | Certifications |
|---|---:|
| AWS | 4 |
| CNCF | 3 |
| Google Cloud | 4 |
| HashiCorp | 2 |
| Microsoft | 4 |
| NVIDIA | 3 |

## Certification catalog

| Provider | Code | Certification | Level | Track | Depth |
|---|---|---|---|---|---:|
| AWS | CLF-C02 | AWS Certified Cloud Practitioner (CLF-C02) Academy | Fundamental | cloud | 6 weeks |
| AWS | SAA-C03 | AWS Certified Solutions Architect – Associate (SAA-C03) Academy | Intermediate | cloud | 10 weeks |
| AWS | DVA-C02 | AWS Certified Developer – Associate (DVA-C02) Academy | Intermediate | devops | 9 weeks |
| AWS | AIF-C01 | AWS Certified AI Practitioner (AIF-C01) Academy | Beginner | ai | 7 weeks |
| Microsoft | AZ-900 | Microsoft Azure Fundamentals (AZ-900) Academy | Fundamental | cloud | 6 weeks |
| Microsoft | AI-900 | Microsoft Azure AI Fundamentals (AI-900) Academy | Fundamental | ai | 6 weeks |
| Microsoft | SC-900 | Microsoft Security, Compliance, and Identity Fundamentals (SC-900) Academy | Fundamental | cyber | 6 weeks |
| Microsoft | AZ-104 | Microsoft Azure Administrator (AZ-104) Academy | Intermediate | cloud | 10 weeks |
| Google Cloud | CDL | Google Cloud Digital Leader Academy | Fundamental | cloud | 6 weeks |
| Google Cloud | ACE | Google Associate Cloud Engineer Academy | Intermediate | cloud | 10 weeks |
| Google Cloud | PCA | Google Professional Cloud Architect Academy | Advanced | cloud | 12 weeks |
| Google Cloud | PMLE | Google Professional Machine Learning Engineer Academy | Advanced | ai | 12 weeks |
| NVIDIA | NCA-GENL | NVIDIA-Certified Associate Generative AI LLMs Academy | Beginner | ai | 7 weeks |
| NVIDIA | NCA-AIIO | NVIDIA-Certified Associate AI Infrastructure and Operations Academy | Beginner | devops | 7 weeks |
| NVIDIA | NCP-GENL | NVIDIA-Certified Professional Generative AI LLMs Academy | Advanced | ai | 12 weeks |
| CNCF | KCNA | Kubernetes and Cloud Native Associate (KCNA) Academy | Beginner | devops | 7 weeks |
| CNCF | CKA | Certified Kubernetes Administrator (CKA) Academy | Advanced | devops | 12 weeks |
| CNCF | CKS | Certified Kubernetes Security Specialist (CKS) Academy | Expert | cyber | 12 weeks |
| HashiCorp | TA-004 | HashiCorp Certified: Terraform Associate (004) Academy | Intermediate | devops | 8 weeks |
| HashiCorp | VA-003 | HashiCorp Certified: Vault Associate (003) Academy | Intermediate | cyber | 8 weeks |

## Recommended import order

1. Upload `courses-certifications.json` in Admin → Courses/Certifications JSON import.
2. Run **Validate** first. Your Phase A validator should return path-precise errors before DB writes.
3. Run **Preview / dry-run**. Confirm created/updated counts for certifications, courses, modules, lessons, quizzes, and course labs.
4. Run **Import** only after preview looks correct.
5. Upload `interactive-labs.json` in Admin → Labs JSON import.
6. Upload `practice-exams.json` in Admin → Content → Practice Exams.
7. Upload `certification-paths.json` in Admin → Content → Certification Paths.
8. Trigger **Sync AI Tutor** from the indexing banner or Admin → Content → Indexing.

## AI Tutor sync

Subul uses RAG with Azure Cognitive Search. New content requires re-indexing, not model retraining. After import, trigger the content indexer so lessons, labs, path context, and exam remediation text become searchable for the tutor. The files include `aiTutorIndexableKnowledge`, `indexableKnowledge`, and metadata fields to improve retrieval quality.

## Admin workflow

- Start with `invalid-test-sample.json` to confirm validator behavior.
- Import the course/certification pack using dry-run.
- Import labs, then exams, then paths.
- Check for duplicate identifiers:
  - Courses use `courseId`.
  - Standalone labs use `slug`.
  - Certifications use `externalId` / `slug`.
  - Practice exams use `slug`.
- Use admin assignment only for standalone labs/courses/certs, not embedded course labs.

## Learner workflow

Each certification is designed as a certification-first journey:

1. Certification overview and readiness target.
2. Five structured courses.
3. Forty modules per certification.
4. Two hundred lessons per certification.
5. Progressive labs after each course stage.
6. Two practice exams.
7. Final Subul badge/certificate.

## Expected completion depth

- Fundamental / Beginner: 6–7 weeks.
- Intermediate: 8–10 weeks.
- Advanced / Expert: 12 weeks.
- Recommended weekly rhythm: 4–6 lessons, 1–2 labs, one quiz review session, one tutor remediation conversation.

## Content quality model

Every lesson includes:

- Rich explanation.
- Key points.
- Analogy.
- Comparison table.
- Common mistakes.
- Check-for-understanding prompts.
- Embedded quiz.
- AI Tutor hints.

Every standalone lab includes:

- Scenario.
- Objectives.
- Tasks.
- Validation hints.
- Metadata chaining with `prevSlug` / `nextSlug`.

Every practice question includes:

- Domain alignment.
- Difficulty.
- Explanation.
- Why distractors are wrong.
- Reference topics.

## Official source map

- **CLF-C02**: https://aws.amazon.com/certification/certified-cloud-practitioner/, https://aws.amazon.com/certification/certification-prep/
- **SAA-C03**: https://aws.amazon.com/certification/certified-solutions-architect-associate/, https://docs.aws.amazon.com/wellarchitected/latest/framework/welcome.html
- **DVA-C02**: https://aws.amazon.com/certification/certified-developer-associate/, https://docs.aws.amazon.com/lambda/latest/dg/welcome.html
- **AIF-C01**: https://aws.amazon.com/certification/certified-ai-practitioner/, https://docs.aws.amazon.com/bedrock/latest/userguide/what-is-bedrock.html
- **AZ-900**: https://learn.microsoft.com/en-us/credentials/certifications/resources/study-guides/az-900, https://learn.microsoft.com/en-us/training/azure/
- **AI-900**: https://learn.microsoft.com/en-us/credentials/certifications/resources/study-guides/ai-900, https://learn.microsoft.com/en-us/credentials/certifications/azure-ai-fundamentals/
- **SC-900**: https://learn.microsoft.com/en-us/credentials/certifications/resources/study-guides/sc-900, https://learn.microsoft.com/en-us/security/
- **AZ-104**: https://learn.microsoft.com/en-us/credentials/certifications/resources/study-guides/az-104, https://learn.microsoft.com/en-us/azure/
- **CDL**: https://cloud.google.com/learn/certification/guides/cloud-digital-leader, https://cloud.google.com/learn/certification/cloud-digital-leader
- **ACE**: https://cloud.google.com/learn/certification/cloud-engineer, https://cloud.google.com/docs
- **PCA**: https://cloud.google.com/learn/certification/cloud-architect, https://cloud.google.com/architecture/framework
- **PMLE**: https://cloud.google.com/learn/certification/machine-learning-engineer, https://services.google.com/fh/files/misc/professional_machine_learning_engineer_exam_guide_english.pdf
- **NCA-GENL**: https://www.nvidia.com/en-us/learn/certification/generative-ai-llm-associate/, https://www.nvidia.com/en-us/learn/learning-path/generative-ai-llm/
- **NCA-AIIO**: https://www.nvidia.com/en-us/learn/certification/ai-infrastructure-operations-associate/, https://www.nvidia.com/en-us/training/academy/
- **NCP-GENL**: https://www.nvidia.com/en-us/learn/certification/generative-ai-llm-professional/, https://www.nvidia.com/en-us/learn/learning-path/generative-ai-llm/
- **KCNA**: https://training.linuxfoundation.org/certification/kubernetes-cloud-native-associate/, https://kubernetes.io/docs/concepts/overview/
- **CKA**: https://training.linuxfoundation.org/certification/certified-kubernetes-administrator-cka/, https://kubernetes.io/docs/home/
- **CKS**: https://training.linuxfoundation.org/certification/certified-kubernetes-security-specialist/, https://kubernetes.io/docs/concepts/security/
- **TA-004**: https://developer.hashicorp.com/certifications/infrastructure-automation, https://developer.hashicorp.com/terraform/docs
- **VA-003**: https://developer.hashicorp.com/certifications/security-automation, https://developer.hashicorp.com/vault/docs

## Content scaling strategy

This pack is intentionally structured so Subul can scale without rewriting the platform:

- Add more providers by copying a certification object and preserving IDs.
- Add more labs by extending the lab sequence with unique slugs.
- Add exam variants by reusing domain coverage and new question IDs.
- Keep official-source URLs in metadata for auditability.
- Run AI indexing after every major import.
- Avoid official exam dumps; generate original practice based on public objectives.

## Production notes

- If your certification path importer requires numeric DB certification IDs instead of `certificationExternalId`, import certifications first, export/map `externalId → id`, then replace the path references.
- If your current importer expects a flatter certification shape, keep this file as the canonical academy source and add a small transform script that maps `certifications[].courses[]` to your exact DTO.
- Keep `invalid-test-sample.json` out of production imports except validator tests.
