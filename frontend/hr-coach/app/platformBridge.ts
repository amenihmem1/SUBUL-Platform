export const platformBridgeScript = `
(() => {
  const normalizeLanguage = (value) => {
    const next = String(value || "").trim().toLowerCase();
    if (next === "fr" || next.startsWith("fr-")) return "fr";
    if (next === "en" || next.startsWith("en-")) return "en";
    return null;
  };
  const normalizeTheme = (value) => {
    const next = String(value || "").trim().toLowerCase();
    return next === "dark" || next === "light" ? next : null;
  };
  const readStored = (key) => {
    try { return localStorage.getItem(key); } catch { return null; }
  };
  const store = (key, value) => {
    try { localStorage.setItem(key, value); } catch {}
  };
  const normalizeProfile = (value) => {
    if (!value || typeof value !== "object") return null;
    const name = String(value.name || value.fullName || "").trim();
    const email = String(value.email || "").trim();
    if (!name && !email) return null;
    return { name, email };
  };
  const applyProfile = (profile) => {
    const nextProfile = normalizeProfile(profile);
    if (!nextProfile) return;
    store("subul-profile", JSON.stringify(nextProfile));
    if (nextProfile.name) store("subul-profile-name", nextProfile.name);
    if (nextProfile.email) store("subul-profile-email", nextProfile.email);
  };
  const apply = (language, theme, profile) => {
    if (language) {
      store("subul-locale", language);
      store("dashboard-language", language);
      document.documentElement.lang = language;
    }
    if (theme) {
      store("subul-theme", theme);
      store("dashboard-theme", theme);
      store("report-dashboard-theme", theme);
      document.documentElement.dataset.theme = theme;
      document.documentElement.style.colorScheme = theme;
    }
    applyProfile(profile);
    document.documentElement.dataset.subulPlatform = "true";
  };

  const params = new URLSearchParams(location.search);
  apply(
    normalizeLanguage(params.get("locale") || params.get("lang")),
    normalizeTheme(params.get("theme")),
    {
      name: params.get("profileName"),
      email: params.get("profileEmail"),
    },
  );

  addEventListener("message", (event) => {
    const data = event.data || {};
    const language = normalizeLanguage(data.locale || data.lang || data.language);
    const theme = normalizeTheme(data.theme);
    const profile = normalizeProfile(data.profile || data.user || data.currentUser);
    const languageChanged = language && language !== readStored("dashboard-language");
    const themeChanged = theme && theme !== readStored("dashboard-theme");
    const profileChanged = profile && (
      profile.name !== readStored("subul-profile-name") ||
      profile.email !== readStored("subul-profile-email")
    );
    if (!languageChanged && !themeChanged && !profileChanged) return;

    apply(language, theme, profile);
    const nextUrl = new URL(location.href);
    if (language) {
      nextUrl.searchParams.set("locale", language);
      nextUrl.searchParams.set("lang", language);
    }
    if (theme) nextUrl.searchParams.set("theme", theme);
    history.replaceState(null, "", nextUrl);
    location.reload();
  });
})();
`;
