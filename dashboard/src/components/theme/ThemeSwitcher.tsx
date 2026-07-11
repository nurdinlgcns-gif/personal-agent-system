import { useTheme, type DashboardTheme } from "../../hooks/useTheme";

const themes: Array<{
  value: DashboardTheme;
  label: string;
}> = [
  {
    value: "office-blue",
    label: "Office Blue",
  },
  {
    value: "m365-light",
    label: "M365 Light",
  },
  {
    value: "fluent-dark",
    label: "Fluent Dark",
  },
  {
    value: "copilot-dark",
    label: "Copilot Dark",
  },
  {
    value: "office-silver",
    label: "Office Silver",
  },
];

export function ThemeSwitcher() {
  const { theme, setTheme } = useTheme();

  return (
    <div className="theme-switcher">
      <span>Theme</span>

      <select
        value={theme}
        onChange={(event) => setTheme(event.target.value as DashboardTheme)}
        aria-label="Dashboard theme selector"
      >
        {themes.map((themeOption) => (
          <option key={themeOption.value} value={themeOption.value}>
            {themeOption.label}
          </option>
        ))}
      </select>
    </div>
  );
}