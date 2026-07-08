# AI Agents Architecture: Job Search & CV Booster

This document explains the functionality of the **Job Search Agent** and **CV Booster Agent** within the Subul platform, including their responsibilities and how the frontend and backend communicate with them.

## 1. CV Booster Agent

**Goal:** The CV Booster acts as an AI-powered resume enhancement tool. It takes a raw user CV, extracts the information, identifies weak points, and enriches it by seamlessly integrating their learning data from the Subul platform (labs, certifications, quiz results) into a beautifully formatted Word Document (`.docx`).

### How It Works

1. **Extraction (`/api/cv/extract`):** The user uploads a CV. The backend sends it to the Python AI Agent which parses the document into structured data and identifies missing sections.
2. **Platform Enrichment (`/api/cv/platform-data`):** The backend compiles the learner's progress across the platform (completed courses, labs, and achieved certifications).
3. **Enhancement (`/api/cv/boost`):** The AI Agent merges the raw extracted CV with the platform data to rewrite bullet points, improve phrasing, and optimize the resume for ATS (Applicant Tracking Systems).
4. **Formatting (`/api/cv/apply-format`):** The AI Agent generates a professionally designed `.docx` file using predefined templates.
5. **Persistence (`/api/cv/save`):** The final enriched structured data is saved to a Cosmos DB instance for future reuse in job searching.

### Technology Stack
*   **Python Agent (Backend Service):** Runs on port `8005`, executing the heavy LLM tasks and document manipulation. 
*   **NestJS Backend (`agents.controller.ts` & `agents.service.ts`):** Acts as a secure proxy. Ensures the user is authenticated via JWT, injects the correct `userId`, handles file validation (Multer), and forwards requests to the Python agent securely. 
*   **Next.js Frontend (`useCvBooster.ts`):** Employs React Query (`useMutation`, `useQuery`) to manage the state of uploading, loading the extracted data layout on screen, and tracking to fetch the final `.docx` Blob. 

---

## 2. Job Search Agent

**Goal:** The Job Search Agent acts as a personalized career assistant. It assesses a learner's enriched CV, scrapes the internet for relevant job postings, evaluates ATS alignment, and guides the user via an interactive chat.

### How It Works

1. **Profile Management (`/api/job-search/profile`):** Maintains the user's current career aspirations, target salaries, and ideal domains.
2. **Live Scraping Pipeline (`/api/job-search/scan`):** When triggered, an asynchronous job scraping pipeline runs in the background (using tools like Prefect/Scrapy). The agent streams the scraping progress back to the user via Server-Sent Events (SSE) so the UI can update live.
3. **Job Matching (`/api/job-search/jobs`):** Returns scraped opportunities tailored to the user's specific CV and platform credentials.
4. **Skill Gap & Roadmap (`/api/job-search/gap`, `roadmap`):** Analyzes the user's profile against an ideal candidate for their dream job and generates a specific learning roadmap to bridge those gaps.
5. **Career Assistant Chat (`/api/job-search/chat`):** A conversational interface where users can ask the AI questions about their career or specific jobs.

### Technology Stack
*   **Python Agent (Backend Service):** Contains the core logic for LLM orchestration and trigger mechanisms for the job scraping pipeline (integrates with AKS/EKS via the `jobsearchsubul` jobs).
*   **NestJS Backend (`agents.controller.ts` & `job-search-chat.service.ts`):** 
    *   **Proxying:** Authenticates the requests and routes them to the Job Search python microservice.
    *   **Chat History Persistence:** Unlike standard pass-through endpoints, the chat endpoint queries a Postgres database via `JobSearchChatService` to retrieve the entire chat history. This history is appended to the message payload ensuring the python agent understands the full context of the conversation. It subsequently saves the new exchanges back to Postgres allowing continuity between sessions.
*   **Next.js Frontend (`useJobSearch.ts`):** 
    *   Found heavily on the `/dashboard/learner/emploi` route. 
    *   Subscribes to SSE streaming flows, renders the interactive chat interface, and presents visually-rich Job Cards and ATS breakdown ratings efficiently.

---

## The Workflow Cycle (How They Work Together)

1. **Start:** A Learner finishes a Course and achieves a Certification.
2. **CV Upgrade:** The Learner goes to the CV Booster, uploads their old CV, and selects "Include Platform Data" (which seamlessly pulls the newly earned Certification into the AI generation prompt).
3. **Save:** The enriched CV is persisted natively in Cosmos DB by the CV Booster.
4. **Transition:** The Learner heads to the "Job Search" panel (`/emploi`).
5. **Job Automation:** The Job Search Agent automatically pulls that *shiny, updated CV* from Cosmos DB, scans the market, and presents highly-targeted job postings matching the new Certification.
6. **Interaction:** The Learner asks the Chat Assistant: *"How do I prepare for the interview for Job Posting #1?"* and the agent responds using the context of their new resume and the specific job description.
