import { useEffect, useState } from "react";

export type DashboardTheme =
  | "office-blue"
  | "m365-light"
  | "fluent-dark"
  | "copilot-dark"
  | "office-silver";

const STORAGE_KEY = "personal-agent-dashboard-theme";

const DEFAULT_THEME: DashboardTheme = "office-blue";

function isValidTheme(value: string | null): value is DashboardTheme {
  return (
    value === "office-blue" ||
    value === "m365-light" ||
    value === "fluent-dark" ||
    value === "copilot-dark" ||
    value === "office-silver"
  );
}

export function useTheme() {
  const [theme, setThemeState] = useState<DashboardTheme>(() => {
    const savedTheme = localStorage.getItem(STORAGE_KEY);

    if (isValidTheme(savedTheme)) {
      return savedTheme;
    }

    return DEFAULT_THEME;
  });

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem(STORAGE_KEY, theme);
  }, [theme]);

  function setTheme(nextTheme: DashboardTheme) {
    setThemeState(nextTheme);
  }

  return {
    theme,
    setTheme,
  };
}