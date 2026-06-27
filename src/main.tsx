import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
// import {registerSW} from 'virtual:pwa-register';

/* if (typeof window !== 'undefined' && 'serviceWorker' in navigator && window.self === window.top) {
  try {
    registerSW({
      immediate: true,
      onRegisterError(error) {
        console.warn('PWA service worker registration failed (expected in iframes/sandboxes):', error);
      }
    });
  } catch (err) {
    console.warn('PWA service worker registration crashed:', err);
  }
} */

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
