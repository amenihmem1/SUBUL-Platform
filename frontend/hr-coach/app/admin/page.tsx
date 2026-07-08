"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import layoutStyles from "../report/[sessionId]/report-dashboard.module.css";
import styles from "./admin.module.css";
import logoImage from "../../assets/subul-logo-transparent.png";

type Language = "fr" | "en";
type Theme = "light" | "dark";
type Role = "Administrateur" | "RH" | "Technique" | "Candidat";

type AdminUser = {
  id: number;
  name: string;
  email: string;
  role: Role;
  active: boolean;
  lastSeen: string;
};

type AdminIconType =
  | "dashboard"
  | "interview"
  | "calendar"
  | "history"
  | "help"
  | "users"
  | "shield"
  | "report"
  | "activity"
  | "download"
  | "share";

const copy = {
  fr: {
    mainMenu: "Menu principal",
    sidebarWorkspace: "Espace de travail",
    sidebarReports: "Rapports",
    sidebarTools: "Outils",
    dashboard: "Analytique",
    interview: "Entretien",
    rh: "RH",
    insights: "Insights",
    history: "Historique",
    calendar: "Calendrier",
    help: "Aide",
    admin: "Admin",
    title: "Administration",
    subtitle:
      "Pilotez les comptes, les roles, le calendrier des entretiens, les dashboards et les rapports d'evaluation.",
    users: "Utilisateurs",
    activeUsers: "Comptes actifs",
    interviews: "Entretiens",
    reports: "Rapports",
    userManagement: "Gestion des utilisateurs",
    userManagementHint: "Activation, desactivation et attribution des roles.",
    searchUser: "Rechercher un utilisateur",
    allRoles: "Tous les roles",
    active: "Actif",
    inactive: "Desactive",
    activate: "Activer",
    deactivate: "Desactiver",
    calendarManagement: "Gestion du calendrier",
    calendarHint: "Vue rapide des entretiens planifies.",
    supervision: "Supervision du systeme",
    supervisionHint: "Etat operationnel des services critiques.",
    dashboards: "Dashboards utilisateurs",
    dashboardsHint: "Acces aux vues RH et techniques des candidats.",
    reportManagement: "Gestion des rapports",
    reportHint: "Consultation, export et partage des evaluations.",
    export: "Exporter",
    share: "Partager",
    changedRole: "Role mis a jour",
    changedStatus: "Statut du compte mis a jour",
    reportShared: "Rapport partage avec l'equipe",
    reportExported: "Export du rapport prepare",
    noUsers: "Aucun utilisateur ne correspond au filtre.",
  },
  en: {
    mainMenu: "Main menu",
    sidebarWorkspace: "Workspace",
    sidebarReports: "Reports",
    sidebarTools: "Tools",
    dashboard: "Analytics",
    interview: "Interview",
    rh: "HR",
    insights: "Insights",
    history: "History",
    calendar: "Calendar",
    help: "Help",
    admin: "Admin",
    title: "Administration",
    subtitle: "Manage accounts, roles, interview scheduling, user dashboards, and assessment reports.",
    users: "Users",
    activeUsers: "Active accounts",
    interviews: "Interviews",
    reports: "Reports",
    userManagement: "User management",
    userManagementHint: "Activation, deactivation, and role assignment.",
    searchUser: "Search user",
    allRoles: "All roles",
    active: "Active",
    inactive: "Disabled",
    activate: "Activate",
    deactivate: "Disable",
    calendarManagement: "Calendar management",
    calendarHint: "Quick view of planned interviews.",
    supervision: "System supervision",
    supervisionHint: "Operational state of critical services.",
    dashboards: "User dashboards",
    dashboardsHint: "Access HR and technical candidate views.",
    reportManagement: "Report management",
    reportHint: "Review, export, and share evaluations.",
    export: "Export",
    share: "Share",
    changedRole: "Role updated",
    changedStatus: "Account status updated",
    reportShared: "Report shared with the team",
    reportExported: "Report export prepared",
    noUsers: "No user matches the filter.",
  },
} as const;

const initialUsers: AdminUser[] = [
  { id: 1, name: "Amina Beldi", email: "amina.beldi@subul.ai", role: "Administrateur", active: true, lastSeen: "Aujourd'hui 09:20" },
  { id: 2, name: "Karim Haddad", email: "karim.haddad@subul.ai", role: "RH", active: true, lastSeen: "Aujourd'hui 08:45" },
  { id: 3, name: "Sarra Mansour", email: "sarra.mansour@example.com", role: "Candidat", active: true, lastSeen: "Hier 18:10" },
  { id: 4, name: "Nour Ben Ali", email: "nour.benali@example.com", role: "Technique", active: false, lastSeen: "03/07/2026" },
  { id: 5, name: "Mehdi Kallel", email: "mehdi.kallel@example.com", role: "Candidat", active: true, lastSeen: "02/07/2026" },
];

const interviews = [
  { day: "08", month: "JUL", candidate: "Sarra Mansour", owner: "Karim Haddad", time: "10:30", status: "RH" },
  { day: "09", month: "JUL", candidate: "Mehdi Kallel", owner: "Nour Ben Ali", time: "14:00", status: "Technique" },
  { day: "11", month: "JUL", candidate: "Yasmine Trabelsi", owner: "Karim Haddad", time: "09:15", status: "RH + Tech" },
];

const systemHealth = [
  { label: "API RH Coach", detail: "Latence moyenne 118 ms", value: 94, warn: false },
  { label: "Sessions entretien", detail: "3 sessions actives", value: 72, warn: false },
  { label: "Rappels email", detail: "SMTP a verifier", value: 48, warn: true },
];

const dashboardLinks = [
  { title: "Dashboard RH", detail: "Scores, soft skills, emotions, alertes", href: "/dashboard" },
  { title: "Dashboard Technique", detail: "Acces au rapport technique candidat", href: "/report/demo-tech-session" },
  { title: "Dashboard Candidat", detail: "Historique et progression des entretiens", href: "/history" },
];

const reports = [
  { title: "Evaluation RH - Sarra Mansour", detail: "Score 86/100 - 08/07/2026", status: "Finalise" },
  { title: "Insights entretien - Mehdi Kallel", detail: "Communication, motivation, vigilance", status: "A partager" },
  { title: "Rapport technique - Yasmine Trabelsi", detail: "Architecture, code, raisonnement", status: "Brouillon" },
];

function Icon({ type }: { type: AdminIconType }) {
  if (type === "users") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M8 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z" />
        <path d="M2.5 21a5.5 5.5 0 0 1 11 0" />
        <path d="M17 10a3 3 0 1 0 0-6" />
        <path d="M16 15.5a5 5 0 0 1 5.5 5.5" />
      </svg>
    );
  }
  if (type === "shield") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12 3 19 6v5c0 4.5-2.8 8.2-7 10-4.2-1.8-7-5.5-7-10V6Z" />
        <path d="m9 12 2 2 4-5" />
      </svg>
    );
  }
  if (type === "calendar") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M7 4v3" />
        <path d="M17 4v3" />
        <path d="M4.5 9h15" />
        <path d="M6.5 5.5h11A2.5 2.5 0 0 1 20 8v9.5A2.5 2.5 0 0 1 17.5 20h-11A2.5 2.5 0 0 1 4 17.5V8a2.5 2.5 0 0 1 2.5-2.5Z" />
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
  if (type === "history" || type === "report") {
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
  if (type === "activity") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M4 17h3l3-9 4 12 3-7h3" />
      </svg>
    );
  }
  if (type === "download") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12 3v12" />
        <path d="m7 10 5 5 5-5" />
        <path d="M5 21h14" />
      </svg>
    );
  }
  if (type === "share") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M18 8a3 3 0 1 0-2.8-4" />
        <path d="M6 14a3 3 0 1 0 0 6 3 3 0 0 0 0-6Z" />
        <path d="M18 16a3 3 0 1 0 0 6 3 3 0 0 0 0-6Z" />
        <path d="m8.7 15.4 6.6-3.8" />
        <path d="m8.7 18.6 6.6 3.8" />
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

export default function AdminPage() {
  const [language, setLanguage] = useState<Language>("fr");
  const [theme, setTheme] = useState<Theme>("light");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [users, setUsers] = useState(initialUsers);
  const [query, setQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<Role | "all">("all");
  const [toast, setToast] = useState("");
  const t = copy[language];

  useEffect(() => {
    if (typeof window === "undefined") return;
    const storedLanguage = window.localStorage.getItem("dashboard-language");
    const storedTheme = window.localStorage.getItem("dashboard-theme") || window.localStorage.getItem("report-dashboard-theme");
    if (storedLanguage === "fr" || storedLanguage === "en") setLanguage(storedLanguage);
    if (storedTheme === "light" || storedTheme === "dark") setTheme(storedTheme);
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem("dashboard-language", language);
      window.localStorage.setItem("dashboard-theme", theme);
    }
  }, [language, theme]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(""), 2400);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const filteredUsers = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return users.filter((user) => {
      const matchesQuery = !normalized || `${user.name} ${user.email}`.toLowerCase().includes(normalized);
      const matchesRole = roleFilter === "all" || user.role === roleFilter;
      return matchesQuery && matchesRole;
    });
  }, [query, roleFilter, users]);

  const activeCount = users.filter((user) => user.active).length;
  const adminCount = users.filter((user) => user.role === "Administrateur").length;

  const updateRole = (id: number, role: Role) => {
    setUsers((current) => current.map((user) => (user.id === id ? { ...user, role } : user)));
    setToast(t.changedRole);
  };

  const toggleStatus = (id: number) => {
    setUsers((current) => current.map((user) => (user.id === id ? { ...user, active: !user.active } : user)));
    setToast(t.changedStatus);
  };

  return (
    <div
      className={`${layoutStyles.shell} ${sidebarOpen ? layoutStyles.sidebarVisible : ""} ${
        theme === "dark" ? `${layoutStyles.themeDark} ${styles.dark}` : layoutStyles.themeLight
      }`}
    >
      <button
        type="button"
        className={layoutStyles.sidebarToggle}
        onClick={() => setSidebarOpen((current) => !current)}
        aria-label={sidebarOpen ? "Fermer le menu" : "Ouvrir le menu"}
        aria-expanded={sidebarOpen}
      >
        <span />
        <span />
        <span />
      </button>

      {sidebarOpen ? (
        <button type="button" className={layoutStyles.sidebarBackdrop} onClick={() => setSidebarOpen(false)} aria-label="Fermer le menu" />
      ) : null}

      <aside className={`${layoutStyles.sidebar} ${sidebarOpen ? layoutStyles.sidebarOpen : ""}`}>
        <div className={layoutStyles.sidebarTop}>
          <Image src={logoImage} alt="Subul" className={layoutStyles.logoImage} priority />
          <nav className={layoutStyles.nav} aria-label={t.mainMenu}>
            <span className={layoutStyles.navGroupTitle}>{t.sidebarWorkspace}</span>
            <Link className={layoutStyles.navItem} href="/dashboard">
              <Icon type="dashboard" />
              {t.dashboard}
            </Link>
            <Link className={layoutStyles.navItem} href="/">
              <Icon type="interview" />
              {t.interview}
            </Link>
            <Link className={`${layoutStyles.navItem} ${layoutStyles.navItemActive}`} href="/admin" aria-current="page">
              <Icon type="shield" />
              {t.admin}
            </Link>

            <span className={layoutStyles.navGroupTitle}>{t.sidebarReports}</span>
            <Link className={layoutStyles.navItem} href="/dashboard">
              <Icon type="dashboard" />
              {t.rh}
            </Link>
            <Link className={layoutStyles.navItem} href="/history">
              <Icon type="report" />
              {t.insights}
            </Link>

            <span className={layoutStyles.navGroupTitle}>{t.sidebarTools}</span>
            <Link className={layoutStyles.navItem} href="/history">
              <Icon type="history" />
              {t.history}
            </Link>
            <Link className={layoutStyles.navItem} href="/calendar">
              <Icon type="calendar" />
              {t.calendar}
            </Link>
            <Link className={layoutStyles.navItem} href="/help">
              <Icon type="help" />
              {t.help}
            </Link>
          </nav>
        </div>
      </aside>

      <main className={styles.adminMain}>
        <header className={styles.adminHeader}>
          <div>
            <h1>{t.title}</h1>
            <p>{t.subtitle}</p>
          </div>
          <div className={styles.headerActions}>
            <div className={styles.languageToggle} aria-label="Langue">
              <button className={`${styles.toggleButton} ${language === "fr" ? styles.toggleButtonActive : ""}`} type="button" onClick={() => setLanguage("fr")}>
                FR
              </button>
              <button className={`${styles.toggleButton} ${language === "en" ? styles.toggleButtonActive : ""}`} type="button" onClick={() => setLanguage("en")}>
                EN
              </button>
            </div>
            <div className={styles.themeToggle} aria-label="Theme">
              <button className={`${styles.toggleButton} ${theme === "light" ? styles.toggleButtonActive : ""}`} type="button" onClick={() => setTheme("light")}>
                ☼
              </button>
              <button className={`${styles.toggleButton} ${theme === "dark" ? styles.toggleButtonActive : ""}`} type="button" onClick={() => setTheme("dark")}>
                ◐
              </button>
            </div>
          </div>
        </header>

        <section className={styles.kpiGrid} aria-label="Statistiques globales">
          <article className={styles.kpiCard}>
            <div className={styles.kpiTop}>
              <span>{t.users}</span>
              <span className={styles.kpiIcon}><Icon type="users" /></span>
            </div>
            <strong>{users.length}</strong>
            <span>{adminCount} admin</span>
          </article>
          <article className={styles.kpiCard}>
            <div className={styles.kpiTop}>
              <span>{t.activeUsers}</span>
              <span className={styles.kpiIcon}><Icon type="shield" /></span>
            </div>
            <strong>{activeCount}</strong>
            <span>{users.length - activeCount} {t.inactive.toLowerCase()}</span>
          </article>
          <article className={styles.kpiCard}>
            <div className={styles.kpiTop}>
              <span>{t.interviews}</span>
              <span className={styles.kpiIcon}><Icon type="calendar" /></span>
            </div>
            <strong>{interviews.length}</strong>
            <span>7 prochains jours</span>
          </article>
          <article className={styles.kpiCard}>
            <div className={styles.kpiTop}>
              <span>{t.reports}</span>
              <span className={styles.kpiIcon}><Icon type="report" /></span>
            </div>
            <strong>{reports.length}</strong>
            <span>2 finalises</span>
          </article>
        </section>

        <section className={styles.contentGrid}>
          <article className={styles.panel}>
            <div className={styles.panelHead}>
              <div>
                <h2>{t.userManagement}</h2>
                <p>{t.userManagementHint}</p>
              </div>
              <div className={styles.toolbar}>
                <input className={styles.input} value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t.searchUser} />
                <select className={styles.select} value={roleFilter} onChange={(event) => setRoleFilter(event.target.value as Role | "all")}>
                  <option value="all">{t.allRoles}</option>
                  <option value="Administrateur">Administrateur</option>
                  <option value="RH">RH</option>
                  <option value="Technique">Technique</option>
                  <option value="Candidat">Candidat</option>
                </select>
              </div>
            </div>

            <div className={styles.userList}>
              {filteredUsers.length ? (
                filteredUsers.map((user) => (
                  <div className={styles.userRow} key={user.id}>
                    <div className={styles.userIdentity}>
                      <strong>{user.name}</strong>
                      <span>{user.email} · {user.lastSeen}</span>
                    </div>
                    <div className={styles.inlineActions}>
                      <span className={`${styles.statusBadge} ${!user.active ? styles.statusBadgeOff : ""}`}>
                        {user.active ? t.active : t.inactive}
                      </span>
                      <select className={styles.select} value={user.role} onChange={(event) => updateRole(user.id, event.target.value as Role)}>
                        <option value="Administrateur">Administrateur</option>
                        <option value="RH">RH</option>
                        <option value="Technique">Technique</option>
                        <option value="Candidat">Candidat</option>
                      </select>
                      <button className={user.active ? styles.dangerButton : styles.secondaryButton} type="button" onClick={() => toggleStatus(user.id)}>
                        {user.active ? t.deactivate : t.activate}
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <div className={styles.userRow}>{t.noUsers}</div>
              )}
            </div>
          </article>

          <article className={styles.panel}>
            <div className={styles.panelHead}>
              <div>
                <h2>{t.calendarManagement}</h2>
                <p>{t.calendarHint}</p>
              </div>
              <Link className={styles.secondaryButton} href="/calendar">
                <Icon type="calendar" />
                {t.calendar}
              </Link>
            </div>
            <div className={styles.calendarList}>
              {interviews.map((item) => (
                <div className={styles.calendarRow} key={`${item.day}-${item.candidate}`}>
                  <div className={styles.dateBox}>
                    {item.day}
                    <small>{item.month}</small>
                  </div>
                  <div className={styles.calendarMeta}>
                    <strong>{item.candidate}</strong>
                    <span>{item.time} · {item.owner}</span>
                  </div>
                  <span className={styles.badge}>{item.status}</span>
                </div>
              ))}
            </div>
          </article>

          <article className={styles.panel}>
            <div className={styles.panelHead}>
              <div>
                <h2>{t.supervision}</h2>
                <p>{t.supervisionHint}</p>
              </div>
              <span className={styles.badge}>Live</span>
            </div>
            <div className={styles.systemList}>
              {systemHealth.map((item) => (
                <div className={styles.systemRow} key={item.label}>
                  <span className={`${styles.statusDot} ${item.warn ? styles.statusWarn : ""}`} />
                  <div>
                    <strong>{item.label}</strong>
                    <span>{item.detail}</span>
                  </div>
                  <div className={styles.progressTrack} aria-label={`${item.value}%`}>
                    <span style={{ width: `${item.value}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </article>

          <article className={styles.panel}>
            <div className={styles.panelHead}>
              <div>
                <h2>{t.dashboards}</h2>
                <p>{t.dashboardsHint}</p>
              </div>
            </div>
            <div className={styles.dashboardList}>
              {dashboardLinks.map((item) => (
                <Link className={styles.dashboardRow} href={item.href} key={item.title}>
                  <span className={styles.kpiIcon}><Icon type="dashboard" /></span>
                  <div>
                    <strong>{item.title}</strong>
                    <span>{item.detail}</span>
                  </div>
                  <span className={styles.badge}>Open</span>
                </Link>
              ))}
            </div>
          </article>

          <article className={`${styles.panel} ${styles.widePanel}`}>
            <div className={styles.panelHead}>
              <div>
                <h2>{t.reportManagement}</h2>
                <p>{t.reportHint}</p>
              </div>
              <Link className={styles.secondaryButton} href="/history">
                <Icon type="history" />
                {t.history}
              </Link>
            </div>
            <div className={styles.reportList}>
              {reports.map((item) => (
                <div className={styles.reportRow} key={item.title}>
                  <span className={styles.kpiIcon}><Icon type="report" /></span>
                  <div className={styles.reportMeta}>
                    <strong>{item.title}</strong>
                    <span>{item.detail}</span>
                  </div>
                  <div className={styles.reportActions}>
                    <span className={styles.roleBadge}>{item.status}</span>
                    <button className={styles.iconButton} type="button" aria-label={t.export} title={t.export} onClick={() => setToast(t.reportExported)}>
                      <Icon type="download" />
                    </button>
                    <button className={styles.iconButton} type="button" aria-label={t.share} title={t.share} onClick={() => setToast(t.reportShared)}>
                      <Icon type="share" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </article>
        </section>
      </main>

      {toast ? <div className={styles.toast} role="status">{toast}</div> : null}
    </div>
  );
}
