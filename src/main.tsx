import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'

// Initialize theme before React mounts to prevent flash
try {
  const saved = localStorage.getItem('theme');

  if (saved === 'dark') {
    document.documentElement.classList.add('dark');
  } else if (saved === 'light') {
    document.documentElement.classList.remove('dark');
  } else {
    // No saved preference - use OS preference as default
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    if (prefersDark) {
      document.documentElement.classList.add('dark');
    }
  }

  // Listen for OS preference changes (only if no saved preference)
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
    const saved = localStorage.getItem('theme');
    if (!saved) {
      if (e.matches) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
      window.dispatchEvent(new CustomEvent('themechange', { detail: e.matches ? 'dark' : 'light' }));
    }
  });
} catch { }

createRoot(document.getElementById("root")!).render(<App />);
