"use client";

import * as React from "react";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";

export function ThemeToggle() {
    const { setTheme, theme, resolvedTheme } = useTheme();
    const [mounted, setMounted] = React.useState(false);

    React.useEffect(() => {
        setMounted(true);
    }, []);

    // Sync theme to cookie "mode"
    React.useEffect(() => {
        if (theme) {
            document.cookie = `mode=${theme}; path=/; max-age=31536000`; // 1 year
        }
    }, [theme]);

    if (!mounted) {
        return (
            <button type="button" aria-label="Toggle theme" className="p-2 rounded-lg text-slate-400 opacity-50 cursor-default">
                <Sun className="h-5 w-5" />
            </button>
        ); // Placeholder to avoid layout shift
    }

    return (
        <button
            onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
            className="cursor-pointer p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-muted transition-colors relative"
            aria-label="Toggle theme"
        >
            <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
            <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100 top-2 left-2" />
            <span className="sr-only">Toggle theme</span>
        </button>
    );
}
