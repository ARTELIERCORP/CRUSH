import React from 'react';
import ReactDOM from 'react-dom/client';
import { UdmDrawer } from './components/UdmDrawer';
import './index.css';

const rootElement = document.getElementById('root');
if (rootElement) {
  ReactDOM.createRoot(rootElement).render(
    <React.StrictMode>
      <div className="p-4 bg-transparent flex justify-center items-start min-h-screen">
        <UdmDrawer />
      </div>
    </React.StrictMode>
  );
}
