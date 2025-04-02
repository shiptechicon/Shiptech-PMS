import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';

createRoot(document.getElementById('root')!).render(
  // <StrictMode>
    <Router>
      <App />
    </Router>
  // </StrictMode>
);
