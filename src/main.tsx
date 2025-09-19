import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { suppressDeprecatedWarnings, suppressDeprecatedErrors } from './utils/suppressWarnings';

// Suprimir avisos de depreciação específicos
suppressDeprecatedWarnings();
suppressDeprecatedErrors();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
