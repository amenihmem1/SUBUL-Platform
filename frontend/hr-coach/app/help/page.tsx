"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { rhApiPath } from "../../lib/apiPath";
import { SessionHistoryEntry, SessionHistoryResponse } from "../../lib/sessionHistory";
import styles from "../report/[sessionId]/report-dashboard.module.css";
import logoImage from "../../assets/subul-logo-transparent.png";

type Language = "fr" | "en";
type Theme = "light" | "dark";
type SupportMessage = {
  id: string;
  role: "assistant" | "user";
  text: string;
};

function HelpFeatureIcon({
  type,
}: {
  type:
    | "upload"
    | "start"
    | "report"
    | "history"
    | "spark"
    | "check"
    | "compass"
    | "shield"
    | "chart";
}) {
  if (type === "upload") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12 16V5" />
        <path d="m7.5 9.5 4.5-4.5 4.5 4.5" />
        <path d="M5 19h14" />
      </svg>
    );
  }
  if (type === "start") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M8 6.5v11l8-5.5Z" />
      </svg>
    );
  }
  if (type === "report") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M7 3h7l5 5v11a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z" />
        <path d="M14 3v5h5" />
        <path d="M9 13h6" />
        <path d="M9 17h4" />
      </svg>
    );
  }
  if (type === "history") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M4 12a8 8 0 1 0 2.3-5.7" />
        <path d="M4 4v4h4" />
        <path d="M12 8v4l2.5 1.5" />
      </svg>
    );
  }
  if (type === "check") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="m5 12.5 4.2 4.2L19 7" />
      </svg>
    );
  }
  if (type === "compass") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z" />
        <path d="m14.8 9.2-2 5.6-5.6 2 2-5.6 5.6-2Z" />
      </svg>
    );
  }
  if (type === "shield") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12 3 6 5.5v5.7c0 4 2.6 7.7 6 8.8 3.4-1.1 6-4.8 6-8.8V5.5Z" />
        <path d="m9.5 12 1.7 1.7 3.3-3.3" />
      </svg>
    );
  }
  if (type === "chart") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M5 19V9" />
        <path d="M12 19V5" />
        <path d="M19 19v-7" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 3 14.7 8.5 21 9.3l-4.5 4.3 1.1 6.1L12 16.8 6.4 19.7l1.1-6.1L3 9.3l6.3-.8Z" />
    </svg>
  );
}

function SidebarIcon({ type }: { type: "calendar" | "dashboard" | "hire" | "file" | "help" | "interview" | "memory" }) {
  if (type === "memory") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M9 5.5A2.5 2.5 0 0 1 11.5 3h1A2.5 2.5 0 0 1 15 5.5V6h1.5A2.5 2.5 0 0 1 19 8.5v9a2.5 2.5 0 0 1-2.5 2.5h-9A2.5 2.5 0 0 1 5 17.5v-9A2.5 2.5 0 0 1 7.5 6H9Z" />
        <path d="M9 6h6" />
        <path d="M12 10v4" />
        <path d="M10 12h4" />
      </svg>
    );
  }
  if (type === "interview") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M7 6h10a3 3 0 0 1 3 3v6a3 3 0 0 1-3 3h-6l-4 3v-3H7a3 3 0 0 1-3-3V9a3 3 0 0 1 3-3Z" />
        <path d="M9 11h6" />
        <path d="M9 14h4" />
      </svg>
    );
  }
  if (type === "hire") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M3.5 12s3.2-5.5 8.5-5.5S20.5 12 20.5 12 17.3 17.5 12 17.5 3.5 12 3.5 12Z" />
        <circle cx="12" cy="12" r="2.5" />
        <path d="M17.2 5.2 19 3.4" />
        <path d="M18.7 7.7h2.4" />
      </svg>
    );
  }
  if (type === "file") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M7 3h7l5 5v11a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z" />
        <path d="M14 3v5h5" />
        <path d="M9 13h6" />
      </svg>
    );
  }
  if (type === "help") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z" />
        <path d="M9.4 9.2a2.7 2.7 0 1 1 4.2 2.2c-.9.6-1.6 1.1-1.6 2.1" />
        <path d="M12 16.8h.01" />
      </svg>
    );
  }
  if (type === "calendar") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M7 3.5v3" />
        <path d="M17 3.5v3" />
        <path d="M4.5 8.5h15" />
        <path d="M6.5 5.5h11a2 2 0 0 1 2 2v10a3 3 0 0 1-3 3h-9a3 3 0 0 1-3-3v-10a2 2 0 0 1 2-2Z" />
        <path d="M8 12h3" />
        <path d="M13 12h3" />
        <path d="M8 16h3" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4 4h6v6H4Z" />
      <path d="M14 4h6v6h-6Z" />
      <path d="M4 14h6v6H4Z" />
      <path d="M14 14h6v6h-6Z" />
    </svg>
  );
}

const helpTranslations = {
  fr: {
    mainMenu: "Menu principal",
    sidebarWorkspace: "Espace de travail",
    sidebarReports: "Rapports",
    sidebarTools: "Outils",
    analytics: "Analytique",
    interview: "Entretien",
    hr: "RH",
    insights: "Insights",
    calendar: "Calendrier",
    history: "Historique",
    help: "Aide",
    lightMode: "Clair",
    darkMode: "Sombre",
    title: "Centre d'aide",
    subtitle:
      "Retrouvez ici le parcours ideal pour lancer un entretien, ouvrir les rapports RH et Insights, puis exploiter l'historique candidat.",
    quickStart: "Demarrage rapide",
    quickStartHint: "Les 4 etapes les plus utiles pour utiliser l'application.",
    quickStartLabel: "Etape",
    uploadCv: "Importer un CV",
    uploadCvHint: "Chargez un fichier PDF, DOCX ou TXT pour initialiser le profil candidat.",
    launchInterview: "Lancer l'entretien",
    launchInterviewHint: "Envoyez un message ou utilisez le micro pour parler; la transcription alimente ensuite l'echange.",
    openReports: "Ouvrir les rapports",
    openReportsHint: "La vue RH et la vue Insights deviennent accessibles une fois la session finalisee.",
    reviewHistory: "Consulter l'historique",
    reviewHistoryHint: "Retrouvez les entretiens precedents, les scores et les conversations epinglees.",
    workflowTitle: "Workflow recommande",
    workflowSubtitle: "Un chemin simple pour ne rien oublier pendant une session.",
    workflowOneTitle: "1. Charger le CV",
    workflowOneText: "Ajoutez le CV du candidat avant l'entretien pour enrichir le contexte et le rapport final.",
    workflowTwoTitle: "2. Mener l'echange",
    workflowTwoText: "Menez l'echange avec le chat ou le micro. La camera peut alimenter les signaux visuels si elle est active.",
    workflowThreeTitle: "3. Finaliser la session",
    workflowThreeText: "Terminez l'entretien depuis le panneau de controle afin de generer le rapport complet.",
    workflowFourTitle: "4. Explorer les resultats",
    workflowFourText: "Ouvrez le rapport RH, le rapport Insights et l'Historique pour relire les sessions et comparer les candidats.",
    workflowCardTitle: "Parcours recommande",
    navigationTitle: "Que contient chaque page ?",
    navigationSubtitle: "Resume rapide des sections disponibles dans le menu.",
    navInterviewTitle: "Entretien",
    navInterviewText: "Page de conduite d'entretien avec upload CV, chat, transcription, micro et camera.",
    navHrTitle: "RH",
    navHrText: "Rapport RH avec score global, competences, recommandations et alertes surveillance.",
    navInsightsTitle: "Insights",
    navInsightsText: "Rapport visuel et vocal avec emotions, objets detectes, signaux audio et stress indicatif.",
    navHistoryTitle: "Historique",
    navHistoryText: "Liste des sessions, recherche, archivage, epinglage et reprise rapide.",
    tipsTitle: "Bonnes pratiques",
    tipsSubtitle: "Quelques reperes pour des sessions plus fluides.",
    unlockTitle: "Ce qui debloque les rapports",
    unlockSubtitle: "Les vues RH et Insights s'activent lorsque le cycle de session est complet.",
    unlockOneTitle: "CV charge",
    unlockOneText: "Le profil candidat est initialise et le contexte est enrichi.",
    unlockTwoTitle: "Entretien mene",
    unlockTwoText: "Les echanges, le micro, la camera et les alertes surveillance alimentent l'analyse.",
    unlockThreeTitle: "Session finalisee",
    unlockThreeText: "Le rapport complet et les vues d'analyse deviennent disponibles.",
    tipOne: "Importer le CV avant d'envoyer le premier message permet un meilleur contexte des reponses.",
    tipTwo: "Finaliser proprement la session est necessaire pour debloquer les vues RH et Insights.",
    tipThree: "L'historique est utile pour retrouver les sessions actives, les rapports finalises et les favoris.",
    tipFour: "En mode micro, cliquez une premiere fois pour enregistrer votre reponse puis une seconde fois pour arreter et envoyer la transcription.",
    supportTitle: "Assistant d'aide",
    supportSubtitle: "Posez une question rapide sur l'utilisation de la plateforme.",
    supportInitial: "Bonjour, je peux vous aider sur le CV, le micro, les rapports, l'historique ou le calendrier.",
    supportPlaceholder: "Ex: Comment debloquer le rapport RH ?",
    supportSend: "Envoyer",
    supportInputLabel: "Question support",
    supportQuickCv: "Importer CV",
    supportQuickReports: "Debloquer rapports",
    supportQuickCalendar: "Planifier entretien",
    supportQuickMic: "Utiliser micro",
    supportQuickAlerts: "Alertes surveillance",
    supportCollapse: "Reduire l'assistant",
    supportExpand: "Ouvrir l'assistant",
    supportFallback:
      "Je peux vous guider sur le CV, le micro, les rapports RH/Insights, les alertes surveillance, l'historique ou le calendrier. Reformulez avec un de ces mots cles.",
  },
  en: {
    mainMenu: "Main menu",
    sidebarWorkspace: "Workspace",
    sidebarReports: "Reports",
    sidebarTools: "Tools",
    analytics: "Analytics",
    interview: "Interview",
    hr: "HR",
    insights: "Insights",
    calendar: "Calendar",
    history: "History",
    help: "Help",
    lightMode: "Light",
    darkMode: "Dark",
    title: "Help Center",
    subtitle:
      "Find the ideal flow to launch an interview, open the HR and Insights reports, and make the most of candidate history.",
    quickStart: "Quick start",
    quickStartHint: "The 4 most useful steps to use the application.",
    quickStartLabel: "Step",
    uploadCv: "Upload a CV",
    uploadCvHint: "Load a PDF, DOCX, or TXT file to initialize the candidate profile.",
    launchInterview: "Start the interview",
    launchInterviewHint: "Send a message or use the microphone to speak; transcription then feeds the exchange.",
    openReports: "Open reports",
    openReportsHint: "The HR and Insights views become available once the session is finalized.",
    reviewHistory: "Review history",
    reviewHistoryHint: "Find previous interviews, scores, and pinned conversations.",
    workflowTitle: "Recommended workflow",
    workflowSubtitle: "A simple path to avoid missing anything during a session.",
    workflowOneTitle: "1. Upload the CV",
    workflowOneText: "Add the candidate resume before the interview to enrich context and the final report.",
    workflowTwoTitle: "2. Run the exchange",
    workflowTwoText: "Run the exchange with chat or microphone. The camera can feed visual signals when enabled.",
    workflowThreeTitle: "3. Finalize the session",
    workflowThreeText: "End the interview from the control panel to generate the complete report.",
    workflowFourTitle: "4. Explore the results",
    workflowFourText: "Open the HR report, Insights report, and History to revisit sessions and compare candidates.",
    workflowCardTitle: "Recommended journey",
    navigationTitle: "What does each page contain?",
    navigationSubtitle: "Quick summary of the sections available in the menu.",
    navInterviewTitle: "Interview",
    navInterviewText: "Interview workspace with CV upload, transcript, microphone, and camera.",
    navHrTitle: "HR",
    navHrText: "HR report with overall score, competencies, recommendations, and proctoring alerts.",
    navInsightsTitle: "Insights",
    navInsightsText: "Visual and vocal report with emotions, detected objects, audio signals, and indicative stress.",
    navHistoryTitle: "History",
    navHistoryText: "Session list, search, archive, pinning, and quick resume.",
    tipsTitle: "Best practices",
    tipsSubtitle: "A few simple cues for smoother sessions.",
    unlockTitle: "What unlocks reports",
    unlockSubtitle: "The HR and Insights views activate once the session cycle is complete.",
    unlockOneTitle: "CV uploaded",
    unlockOneText: "The candidate profile is initialized and context is enriched.",
    unlockTwoTitle: "Interview completed",
    unlockTwoText: "Conversation, microphone, camera, and proctoring alerts feed the analysis.",
    unlockThreeTitle: "Session finalized",
    unlockThreeText: "The full report and analysis views become available.",
    tipOne: "Uploading the CV before the first message gives the assistant better context for replies.",
    tipTwo: "Properly finalizing the session is required to unlock the HR and Insights views.",
    tipThree: "History is useful for finding active sessions, completed reports, and favorites.",
    tipFour: "In microphone mode, click once to record your answer, then click again to stop and send the transcription.",
    supportTitle: "Help assistant",
    supportSubtitle: "Ask a quick question about using the platform.",
    supportInitial: "Hi, I can help with CV upload, microphone, reports, history, or calendar scheduling.",
    supportPlaceholder: "Ex: How do I unlock the HR report?",
    supportSend: "Send",
    supportInputLabel: "Support question",
    supportQuickCv: "Upload CV",
    supportQuickReports: "Unlock reports",
    supportQuickCalendar: "Schedule interview",
    supportQuickMic: "Use microphone",
    supportQuickAlerts: "Proctoring alerts",
    supportCollapse: "Collapse assistant",
    supportExpand: "Open assistant",
    supportFallback:
      "I can guide you on CV upload, microphone, HR/Insights reports, proctoring alerts, history, or calendar. Try one of those keywords.",
  },
} as const;

function buildSupportReply(question: string, language: Language) {
  const value = question.toLowerCase();
  const isFrench = language === "fr";

  if (value.includes("cv") || value.includes("resume") || value.includes("import")) {
    return isFrench
      ? "Pour importer un CV, allez sur Entretien, ajoutez un fichier PDF, DOCX ou TXT, puis lancez l'entretien. Le CV enrichit le contexte du candidat et le rapport final."
      : "To upload a CV, go to Interview, add a PDF, DOCX, or TXT file, then start the interview. The CV enriches candidate context and the final report.";
  }

  if (value.includes("rapport") || value.includes("report") || value.includes("rh") || value.includes("insight")) {
    return isFrench
      ? "Les rapports RH et Insights se debloquent apres une session finalisee. Le rapport RH contient score, competences, recommandations et alertes surveillance; Insights contient signaux visuels, vocaux, emotions et objets detectes."
      : "HR and Insights reports unlock after a finalized session. The HR report includes score, competencies, recommendations, and proctoring alerts; Insights includes visual signals, voice signals, emotions, and detected objects.";
  }

  if (value.includes("micro") || value.includes("mic") || value.includes("audio") || value.includes("parler")) {
    return isFrench
      ? "En mode micro, cliquez une premiere fois pour enregistrer, parlez, puis cliquez une seconde fois pour arreter et envoyer la transcription."
      : "In microphone mode, click once to record, speak, then click again to stop and send the transcription.";
  }

  if (
    value.includes("surveillance") ||
    value.includes("alerte") ||
    value.includes("alert") ||
    value.includes("objet") ||
    value.includes("object") ||
    value.includes("emotion") ||
    value.includes("camera")
  ) {
    return isFrench
      ? "Les alertes surveillance signalent les changements d'onglet, pertes de focus, reductions de fenetre, DevTools ou multi-ecrans. La camera alimente aussi les emotions et les objets detectes dans le rapport Insights."
      : "Proctoring alerts flag tab switches, focus loss, window resizing, DevTools, or multiple screens. The camera also feeds emotions and detected objects in the Insights report.";
  }

  if (value.includes("calendar") || value.includes("calendrier") || value.includes("planifier") || value.includes("date")) {
    return isFrench
      ? "Dans Calendrier, cliquez sur une date libre pour planifier un entretien. La date du popup reprend le jour clique et reste verrouille; vous pouvez modifier l'heure."
      : "In Calendar, click an available date to schedule an interview. The popup date uses the clicked day and stays locked; you can edit the time.";
  }

  if (value.includes("historique") || value.includes("history") || value.includes("session")) {
    return isFrench
      ? "Dans Historique, vous pouvez retrouver les sessions, chercher un candidat, ouvrir les rapports finalises et reprendre les entretiens actifs."
      : "In History, you can find sessions, search candidates, open finalized reports, and resume active interviews.";
  }

  return helpTranslations[language].supportFallback;
}

export default function HelpPage() {
  const [language, setLanguage] = useState<Language>("fr");
  const [theme, setTheme] = useState<Theme>("light");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [historySessions, setHistorySessions] = useState<SessionHistoryEntry[]>([]);
  const [supportMessages, setSupportMessages] = useState<SupportMessage[]>([
    { id: "support-initial", role: "assistant", text: helpTranslations.fr.supportInitial },
  ]);
  const [supportQuestion, setSupportQuestion] = useState("");
  const [supportChatOpen, setSupportChatOpen] = useState(true);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const storedTheme = window.localStorage.getItem("report-dashboard-theme");
    if (storedTheme === "light" || storedTheme === "dark") {
      setTheme(storedTheme);
    } else if (window.matchMedia("(prefers-color-scheme: dark)").matches) {
      setTheme("dark");
    }

    const storedLanguage = window.localStorage.getItem("dashboard-language");
    if (storedLanguage === "fr" || storedLanguage === "en") {
      setLanguage(storedLanguage);
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem("report-dashboard-theme", theme);
  }, [theme]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem("dashboard-language", language);
  }, [language]);

  useEffect(() => {
    setSupportMessages((current) => {
      if (current.length !== 1 || current[0]?.id !== "support-initial") return current;
      return [{ id: "support-initial", role: "assistant", text: helpTranslations[language].supportInitial }];
    });
  }, [language]);

  useEffect(() => {
    const loadHistory = async () => {
      try {
        const res = await fetch(rhApiPath("/api/rh/sessions?limit=80"), { method: "GET", cache: "no-store" });
        const data = (await res.json()) as SessionHistoryResponse & { error?: string };
        if (!res.ok) {
          return;
        }
        setHistorySessions(Array.isArray(data?.sessions) ? data.sessions : []);
      } catch {
        // Keep the help page usable even if history is temporarily unavailable.
      }
    };

    void loadHistory();
  }, []);

  const copy = helpTranslations[language];
  const latestSessionId = historySessions[0]?.session_id || "";
  const latestSessionCompleted = historySessions[0]?.status === "completed";
  const rhHref = latestSessionId ? `/report/${encodeURIComponent(latestSessionId)}?view=rh` : "/";
  const insightsHref = latestSessionId ? `/report/${encodeURIComponent(latestSessionId)}?view=insights` : "/";

  const quickStartCards = [
    { title: copy.uploadCv, helper: copy.uploadCvHint, icon: "upload" as const },
    { title: copy.launchInterview, helper: copy.launchInterviewHint, icon: "start" as const },
    { title: copy.openReports, helper: copy.openReportsHint, icon: "report" as const },
    { title: copy.reviewHistory, helper: copy.reviewHistoryHint, icon: "history" as const },
  ];

  const workflowItems = [
    { title: copy.workflowOneTitle, text: copy.workflowOneText },
    { title: copy.workflowTwoTitle, text: copy.workflowTwoText },
    { title: copy.workflowThreeTitle, text: copy.workflowThreeText },
    { title: copy.workflowFourTitle, text: copy.workflowFourText },
  ];

  const navigationItems = [
    { title: copy.navInterviewTitle, text: copy.navInterviewText, icon: "compass" as const },
    { title: copy.navHrTitle, text: copy.navHrText, icon: "chart" as const },
    { title: copy.navInsightsTitle, text: copy.navInsightsText, icon: "spark" as const },
    { title: copy.navHistoryTitle, text: copy.navHistoryText, icon: "history" as const },
  ];

  const tips = [copy.tipOne, copy.tipTwo, copy.tipThree, copy.tipFour];
  const unlockItems = [
    { title: copy.unlockOneTitle, text: copy.unlockOneText },
    { title: copy.unlockTwoTitle, text: copy.unlockTwoText },
    { title: copy.unlockThreeTitle, text: copy.unlockThreeText },
  ];
  const supportPrompts = [copy.supportQuickCv, copy.supportQuickReports, copy.supportQuickAlerts, copy.supportQuickMic, copy.supportQuickCalendar];

  const sendSupportQuestion = (question: string) => {
    const cleanQuestion = question.trim();
    if (!cleanQuestion) return;

    const timestamp = Date.now();
    setSupportMessages((current) => [
      ...current,
      { id: `support-user-${timestamp}`, role: "user", text: cleanQuestion },
      { id: `support-assistant-${timestamp}`, role: "assistant", text: buildSupportReply(cleanQuestion, language) },
    ]);
    setSupportQuestion("");
  };

  const supportChatPanel = (
    <section className={`${styles.supportChatSection} ${supportChatOpen ? "" : styles.supportChatSectionCollapsed}`}>
      <div className={styles.supportChatHeader}>
        <div>
          <h2>{copy.supportTitle}</h2>
          <p>{copy.supportSubtitle}</p>
        </div>
        <button
          type="button"
          className={styles.supportChatToggle}
          onClick={() => setSupportChatOpen((current) => !current)}
          aria-expanded={supportChatOpen}
          aria-label={supportChatOpen ? copy.supportCollapse : copy.supportExpand}
          title={supportChatOpen ? copy.supportCollapse : copy.supportExpand}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            {supportChatOpen ? <path d="M6 12h12" /> : <path d="M12 5v14M5 12h14" />}
          </svg>
        </button>
      </div>

      {supportChatOpen ? (
        <>
          <div className={styles.supportChatMessages}>
            {supportMessages.map((message) => (
              <div
                key={message.id}
                className={`${styles.supportChatMessage} ${
                  message.role === "user" ? styles.supportChatMessageUser : styles.supportChatMessageAssistant
                }`}
              >
                {message.text}
              </div>
            ))}
          </div>

          <div className={styles.supportChatPrompts}>
            {supportPrompts.map((prompt) => (
              <button type="button" key={prompt} onClick={() => sendSupportQuestion(prompt)}>
                {prompt}
              </button>
            ))}
          </div>

          <form
            className={styles.supportChatForm}
            onSubmit={(event) => {
              event.preventDefault();
              sendSupportQuestion(supportQuestion);
            }}
          >
            <label className={styles.srOnly} htmlFor="support-chat-question">
              {copy.supportInputLabel}
            </label>
            <input
              id="support-chat-question"
              value={supportQuestion}
              onChange={(event) => setSupportQuestion(event.target.value)}
              placeholder={copy.supportPlaceholder}
            />
            <button type="submit" aria-label={copy.supportSend} title={copy.supportSend}>
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M5 12h13" />
                <path d="m13 6 6 6-6 6" />
              </svg>
            </button>
          </form>
        </>
      ) : null}
    </section>
  );

  return (
    <div className={`${styles.shell} ${sidebarOpen ? styles.sidebarVisible : ""} ${theme === "dark" ? styles.themeDark : styles.themeLight}`}>
      <button
        type="button"
        className={styles.sidebarToggle}
        onClick={() => setSidebarOpen((open) => !open)}
        aria-label={sidebarOpen ? "Fermer le menu" : "Ouvrir le menu"}
        aria-expanded={sidebarOpen}
      >
        <span />
        <span />
        <span />
      </button>

      {sidebarOpen && (
        <button type="button" className={styles.sidebarBackdrop} onClick={() => setSidebarOpen(false)} aria-label="Fermer le menu" />
      )}

      <aside className={`${styles.sidebar} ${sidebarOpen ? styles.sidebarOpen : ""}`}>
        <div className={styles.sidebarTop}>
          <Image className={styles.logoImage} src={logoImage} alt="SUBUL" priority />
        </div>

        <div className={styles.menuBlock}>
          <p className={styles.menuTitle}>{copy.mainMenu}</p>
          <nav className={styles.nav}>
            <span className={styles.navGroupTitle}>{copy.sidebarWorkspace}</span>
            <Link className={styles.navItem} href="/dashboard">
              <SidebarIcon type="dashboard" />
              {copy.analytics}
            </Link>
            <Link className={styles.navItem} href="/">
              <SidebarIcon type="interview" />
              {copy.interview}
            </Link>
            <span className={styles.navGroupTitle}>{copy.sidebarReports}</span>
            {latestSessionCompleted ? (
              <Link className={styles.navItem} href={rhHref}>
                <SidebarIcon type="file" />
                {copy.hr}
              </Link>
            ) : (
              <button type="button" className={`${styles.navItem} ${styles.navButton} ${styles.navItemDisabled}`} disabled>
                <SidebarIcon type="file" />
                {copy.hr}
              </button>
            )}
            {latestSessionCompleted ? (
              <Link className={styles.navItem} href={insightsHref}>
                <SidebarIcon type="hire" />
                {copy.insights}
              </Link>
            ) : (
              <button type="button" className={`${styles.navItem} ${styles.navButton} ${styles.navItemDisabled}`} disabled>
                <SidebarIcon type="hire" />
                {copy.insights}
              </button>
            )}
            <span className={styles.navGroupTitle}>{copy.sidebarTools}</span>
            <Link className={styles.navItem} href="/history">
              <SidebarIcon type="memory" />
              {copy.history}
            </Link>
            <Link className={styles.navItem} href="/calendar">
              <SidebarIcon type="calendar" />
              {copy.calendar}
            </Link>
            <Link className={`${styles.navItem} ${styles.navItemActive}`} href="/help">
              <SidebarIcon type="help" />
              {copy.help}
            </Link>
          </nav>
        </div>
      </aside>

      <main className={styles.main}>
        <section className={styles.helpHero}>
          <div className={styles.helpHeroMain}>
            <div className={styles.helpHeroCopy}>
              <h1>{copy.title}</h1>
              <p>{copy.subtitle}</p>
            </div>
          </div>

          <div className={styles.helpHeroControls}>
            <div className={`${styles.themeToggle} ${styles.compactToggle}`}>
              <button
                type="button"
                className={`${styles.themeButton} ${styles.compactToggleButton} ${theme === "light" ? styles.themeButtonActive : ""}`}
                onClick={() => setTheme("light")}
                aria-label={copy.lightMode}
                title={copy.lightMode}
              >
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <circle cx="12" cy="12" r="4" />
                  <path d="M12 2.5v2.5" />
                  <path d="M12 19v2.5" />
                  <path d="M4.9 4.9 6.7 6.7" />
                  <path d="M17.3 17.3 19.1 19.1" />
                  <path d="M2.5 12H5" />
                  <path d="M19 12h2.5" />
                  <path d="M4.9 19.1 6.7 17.3" />
                  <path d="M17.3 6.7 19.1 4.9" />
                </svg>
              </button>
              <button
                type="button"
                className={`${styles.themeButton} ${styles.compactToggleButton} ${theme === "dark" ? styles.themeButtonActive : ""}`}
                onClick={() => setTheme("dark")}
                aria-label={copy.darkMode}
                title={copy.darkMode}
              >
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M20 14.5A8.5 8.5 0 1 1 9.5 4 7 7 0 0 0 20 14.5Z" />
                </svg>
              </button>
            </div>
            <div className={`${styles.languageToggle} ${styles.compactToggle}`}>
              <button
                type="button"
                className={`${styles.languageButton} ${styles.compactToggleButton} ${language === "fr" ? styles.languageButtonActive : ""}`}
                onClick={() => setLanguage("fr")}
              >
                FR
              </button>
              <button
                type="button"
                className={`${styles.languageButton} ${styles.compactToggleButton} ${language === "en" ? styles.languageButtonActive : ""}`}
                onClick={() => setLanguage("en")}
              >
                EN
              </button>
            </div>
          </div>
        </section>

        <section className={styles.helpSupportLayout}>
          <div className={styles.helpSupportMain}>
            <section className={styles.helpFeatureGrid}>
              {quickStartCards.map((item, index) => (
                <article key={item.title} className={styles.helpFeatureCard}>
                  <div className={styles.helpFeatureTop}>
                    <span className={styles.helpFeatureIcon}>
                      <HelpFeatureIcon type={item.icon} />
                    </span>
                    <span className={styles.helpFeatureStep}>
                      {copy.quickStartLabel} {index + 1}
                    </span>
                  </div>
                  <strong className={styles.helpFeatureTitle}>{item.title}</strong>
                  <p className={styles.helpFeatureText}>{item.helper}</p>
                  <span className={styles.helpFeatureGlow} aria-hidden="true" />
                </article>
              ))}
            </section>

            <section className={styles.helpGrid}>
              <article className={styles.helpSection}>
                <div className={styles.helpSectionHeader}>
                  <h2>{copy.workflowCardTitle}</h2>
                  <p>{copy.workflowSubtitle}</p>
                </div>
                <div className={styles.helpTimeline}>
                  {workflowItems.map((item, index) => (
                    <div key={item.title} className={styles.helpTimelineItem}>
                      <span className={styles.helpTimelineIndex}>0{index + 1}</span>
                      <div className={styles.helpTimelineBody}>
                        <strong>{item.title}</strong>
                        <p>{item.text}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </article>

              <article className={styles.helpSection}>
                <div className={styles.helpSectionHeader}>
                  <h2>{copy.unlockTitle}</h2>
                  <p>{copy.unlockSubtitle}</p>
                </div>
                <div className={styles.helpList}>
                  {unlockItems.map((item) => (
                    <div key={item.title} className={styles.helpListItem}>
                      <div className={styles.helpInlineTitle}>
                        <span className={styles.helpInlineIcon}>
                          <HelpFeatureIcon type="check" />
                        </span>
                        <strong>{item.title}</strong>
                      </div>
                      <p>{item.text}</p>
                    </div>
                  ))}
                </div>
              </article>
            </section>

            <section className={styles.helpGrid}>
              <article className={styles.helpSection}>
                <div className={styles.helpSectionHeader}>
                  <h2>{copy.navigationTitle}</h2>
                  <p>{copy.navigationSubtitle}</p>
                </div>
                <div className={styles.helpNavGrid}>
                  {navigationItems.map((item) => (
                    <div key={item.title} className={styles.helpNavCard}>
                      <span className={styles.helpNavIcon}>
                        <HelpFeatureIcon type={item.icon} />
                      </span>
                      <strong>{item.title}</strong>
                      <p>{item.text}</p>
                    </div>
                  ))}
                </div>
              </article>

              <article className={styles.helpSection}>
                <div className={styles.helpSectionHeader}>
                  <h2>{copy.tipsTitle}</h2>
                  <p>{copy.tipsSubtitle}</p>
                </div>
                <div className={styles.helpList}>
                  {tips.map((item) => (
                    <div key={item} className={styles.helpListItem}>
                      <div className={styles.helpInlineTitle}>
                        <span className={styles.helpInlineIcon}>
                          <HelpFeatureIcon type="spark" />
                        </span>
                        <strong>{copy.tipsTitle}</strong>
                      </div>
                      <p>{item}</p>
                    </div>
                  ))}
                </div>
              </article>
            </section>
          </div>

          <aside className={styles.helpSupportAside}>{supportChatPanel}</aside>
        </section>

      </main>
    </div>
  );
}
