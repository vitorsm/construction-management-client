import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import Login from './Login';
import Projects from './Projects';
import ProjectScreen from './ProjectScreen';
import ProjectDetail from './ProjectDetail';
import Feed from './Feed';
import ExpensesScreen from './ExpensesScreen';
import TasksScreen from './TasksScreen';
import './App.css';

function UserMenu() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const location = useLocation();
  const hasToken = !!localStorage.getItem('access_token');

  const handleLogout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('selectedProject');
    setIsMenuOpen(false);
    window.location.href = '/login';
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
          <button className="user-menu-item" onClick={handleLogout}>
            Logout
          </button>
        </div>
      )}
    </div>
  );
}

function RootRedirect() {
  const hasAccessToken = !!localStorage.getItem('access_token');
  
  const getSelectedProjectId = () => {
    try {
      const selectedProject = localStorage.getItem('selectedProject');
      return selectedProject;
    } catch (err) {
      console.error('Error parsing selectedProject:', err);
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
