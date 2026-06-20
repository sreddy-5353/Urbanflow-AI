import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { MobilityProvider } from './context/MobilityContext';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <MobilityProvider>
      <App />
    </MobilityProvider>
  </React.StrictMode>,
);
