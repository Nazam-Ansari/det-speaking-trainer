import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import type { Settings } from '../types';
import { DEFAULT_SETTINGS, loadSettings, saveSettings } from '../storage/db';
import { setGeminiModelListener, setGroqModelListener } from '../services/ai';

interface Ctx {
  settings: Settings;
  loaded: boolean;
  update: (patch: Partial<Settings>) => void;
}

const SettingsContext = createContext<Ctx>({ settings: DEFAULT_SETTINGS, loaded: false, update: () => undefined });

function applyTheme(theme: Settings['theme']) {
  const dark = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  document.documentElement.classList.toggle('dark', dark);
  try {
    localStorage.setItem('det-theme', theme);
  } catch {
    /* storage may be blocked */
  }
}

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    loadSettings().then((s) => {
      setSettings(s);
      setLoaded(true);
    });
  }, []);

  useEffect(() => {
    applyTheme(settings.theme);
    if (settings.theme !== 'system') return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const fn = () => applyTheme('system');
    mq.addEventListener('change', fn);
    return () => mq.removeEventListener('change', fn);
  }, [settings.theme]);

  const update = useCallback((patch: Partial<Settings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...patch };
      saveSettings(next).catch((e) => console.error('Failed to save settings', e));
      return next;
    });
  }, []);

  // Save the replacement when a provider has retired the selected model.
  useEffect(() => {
    setGeminiModelListener((geminiModel) => update({ geminiModel }));
    setGroqModelListener((groqModel) => update({ groqModel }));
    return () => {
      setGeminiModelListener(null);
      setGroqModelListener(null);
    };
  }, [update]);

  return <SettingsContext.Provider value={{ settings, loaded, update }}>{children}</SettingsContext.Provider>;
}

export function useSettings() {
  return useContext(SettingsContext);
}
