import '@fontsource/manrope/latin-500.css';
import '@fontsource/manrope/cyrillic-500.css';
import '@fontsource/manrope/latin-600.css';
import '@fontsource/manrope/cyrillic-600.css';
import '@fontsource/manrope/latin-700.css';
import '@fontsource/manrope/cyrillic-700.css';
import '@fontsource/manrope/latin-800.css';
import '@fontsource/manrope/cyrillic-800.css';
import '@fontsource/unbounded/latin-500.css';
import '@fontsource/unbounded/cyrillic-500.css';
import '@fontsource/unbounded/latin-600.css';
import '@fontsource/unbounded/cyrillic-600.css';
import '@fontsource/unbounded/latin-700.css';
import '@fontsource/unbounded/cyrillic-700.css';
import './styles.css';

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import { App } from './App';
import { boot } from './store';
import { requestPersistence } from './storage';

registerSW({ immediate: true });
void requestPersistence();

boot().then(() => {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
});
