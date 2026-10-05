import React from 'react';
import ReactDOM from 'react-dom/client';
import { VerticalTabs } from './components/VerticalTabs';
import './index.css';

const rootElement = document.getElementById('root');
if (rootElement) {
  ReactDOM.createRoot(rootElement).render(
    <React.StrictMode>
      <VerticalTabs />
    </React.StrictMode>
  );
}
