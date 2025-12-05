import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Login from './Login';
import Projects from './Projects';
import ProjectScreen from './ProjectScreen';
import ProjectDetail from './ProjectDetail';
import Feed from './Feed';
import ExpensesScreen from './ExpensesScreen';
import TasksScreen from './TasksScreen';
import './App.css';

function UserMenu() {
  const { t, i18n: i18nInstance } = useTranslation();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [currentLanguage, setCurrentLanguage] = useState(i18nInstance.language || 'en');
  const location = useLocation();
  const hasToken = !!localStorage.getItem('access_token');

  useEffect(() => {
    // Load saved language preference
    const savedLanguage = localStorage.getItem('preferredLanguage');
    if (savedLanguage && (savedLanguage === 'en' || savedLanguage === 'pt-BR')) {
      i18nInstance.changeLanguage(savedLanguage);
      setCurrentLanguage(savedLanguage);
    }
  }, [i18nInstance]);

  const handleLogout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('selectedProject');
    setIsMenuOpen(false);
    window.location.href = '/login';
  };

  const handleLanguageChange = (lang) => {
    i18nInstance.changeLanguage(lang);
    setCurrentLanguage(lang);
    localStorage.setItem('preferredLanguage', lang);
    setIsMenuOpen(false);
  };

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (isMenuOpen && !e.target.closest('.user-menu-container')) {
        setIsMenuOpen(false);
      }
    };

    if (isMenuOpen) {
      document.addEventListener('click', handleClickOutside);
    }

    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, [isMenuOpen]);

  // Don't show user menu on login page
  if (!hasToken || location.pathname === '/login') {
    return null;
  }

  return (
    <div className="user-menu-container">
      <button 
        className="user-menu-button"
        onClick={() => setIsMenuOpen(!isMenuOpen)}
      >
        ☰
      </button>
      {isMenuOpen && (
        <div className="user-menu-dropdown">
          <div className="user-menu-section">
            <div className="user-menu-section-label">{t('common.language')}</div>
            <button 
              className={`user-menu-item language-item ${currentLanguage === 'en' ? 'active' : ''}`}
              onClick={() => handleLanguageChange('en')}
            >
              English
            </button>
            <button 
              className={`user-menu-item language-item ${currentLanguage === 'pt-BR' ? 'active' : ''}`}
              onClick={() => handleLanguageChange('pt-BR')}
            >
              Português
            </button>
          </div>
          <div className="user-menu-divider"></div>
          <button className="user-menu-item" onClick={handleLogout}>
            {t('common.logout')}
          </button>
        </div>
      )}
    </div>
  );
}

function RootRedirect() {
  const { t } = useTranslation();
  const hasAccessToken = !!localStorage.getItem('access_token');
  
  const getSelectedProjectId = () => {
    try {
      const selectedProject = localStorage.getItem('selectedProject');
      return selectedProject;
    } catch (err) {
      console.error(t('errors.errorParsing', { error: err.message }));
      localStorage.removeItem('selectedProject');
    }
    return null;
  };

  if (hasAccessToken) {
    const selectedProjectId = getSelectedProjectId();
    if (selectedProjectId) {
      return <Navigate to={`/projects/${selectedProjectId}`} replace />;
    }
    return <Navigate to="/projects" replace />;
  }
  
  return <Navigate to="/login" replace />;
}

function AppRoutes() {
  const hasAccessToken = () => {
    return !!localStorage.getItem('access_token');
  };

  const hasSelectedProject = () => {
    return !!localStorage.getItem('selectedProject');
  };

  console.log(hasAccessToken(), hasSelectedProject());

  return (
    <>
      <UserMenu />
      <Routes>
        <Route path="/" element={<RootRedirect />} />
        <Route 
          path="/login" 
          element={
            hasAccessToken() ? (
              <Navigate to="/projects" replace />
            ) : (
              <Login />
            )
          } 
        />
        <Route path="/projects" element={<Projects />} />
        <Route path="/projects/:projectId" element={<ProjectScreen />} />
        <Route path="/projects/:projectId/dashboard" element={<ProjectDetail />} />
        <Route path="/projects/:projectId/feed" element={<Feed />} />
        <Route path="/projects/:projectId/expenses" element={<ExpensesScreen />} />
        <Route path="/projects/:projectId/tasks" element={<TasksScreen />} />
      </Routes>
    </>
  );
}

function App() {
  return (
    <BrowserRouter>
      <div className="App">
        <AppRoutes />
      </div>
    </BrowserRouter>
  );
}

export default App;
