import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'

// Initialize theme before React mounts
try {
  const saved = localStorage.getItem('theme');
  if (saved === 'dark') {
    document.documentElement.classList.add('dark');
  } else if (saved === 'light') {
    document.documentElement.classList.remove('dark');
  }
} catch {}

createRoot(document.getElementById("root")!).render(<App />);
