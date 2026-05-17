import { Moon, Sun } from "lucide-react";

export default function ThemeToggle() {
  return (
    <button
      type="button"
      data-theme-toggle
      className="theme-toggle inline-flex size-10 items-center justify-center rounded-lg border shadow-lg transition"
      aria-label="Toggle theme"
      title="Toggle theme"
    >
      <Sun className="theme-toggle-sun size-4" />
      <Moon className="theme-toggle-moon size-4" />
    </button>
  );
}
