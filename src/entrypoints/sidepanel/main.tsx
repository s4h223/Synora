import '@fontsource-variable/geist';
import '@fontsource-variable/jetbrains-mono';
import '@/styles/globals.css';

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';

const container = document.getElementById('root');
if (!container) throw new Error('Synora: #root element missing');

createRoot(container).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
