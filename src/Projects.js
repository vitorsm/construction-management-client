import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { checkAuthError } from './apiUtils';
import { API_BASE_URL } from './config';
import './Projects.css';

function Projects() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Create project dialog state
  const [isCreateProjectDialogOpen, setIsCreateProjectDialogOpen] = useState(false);
  const [newProject, setNewProject] = useState({
    name: '',
    budget: ''
  });

  const handleCardClick = (projectId) => {
    navigate(`/projects/${projectId}`);
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    try {
      const token = localStorage.getItem('access_token');
      
      if (!token) {
        throw new Error(t('errors.noAccessToken'));
      }

      const response = await fetch(`${API_BASE_URL}/api/projects/workspace/f0ae47da-7352-455c-a3ad-02e7fb8d29c9`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        if (checkAuthError(response)) {
          return;
        }
        throw new Error(t('errors.failedToFetch', { resource: 'projects', status: response.status, statusText: response.statusText }));
      }

      const data = await response.json();
      setProjects(data);
    } catch (err) {
      setError(err.message || t('projects.errorFetching'));
      console.error('Error fetching projects:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatBudget = (budget) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(budget);
  };

  const handleOpenCreateProjectDialog = () => {
    setIsCreateProjectDialogOpen(true);
  };

  const handleCloseCreateProjectDialog = () => {
    setIsCreateProjectDialogOpen(false);
    setNewProject({
      name: '',
      budget: ''
    });
  };

  const handleCreateProject = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('access_token');
      
      if (!token) {
        throw new Error(t('errors.noAccessToken'));
      }

      const projectData = {
        name: newProject.name,
        budget: parseFloat(newProject.budget) || 0,
        workspace: { id: "f0ae47da-7352-455c-a3ad-02e7fb8d29c9" }
      };

      const response = await fetch(`${API_BASE_URL}/api/projects`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(projectData),
      });

      if (!response.ok) {
        if (checkAuthError(response)) {
          return;
        }
        throw new Error(t('errors.failedToCreate', { resource: 'project', status: response.status, statusText: response.statusText }));
      }

      // Refresh projects list and close dialog
      handleCloseCreateProjectDialog();
      await fetchProjects();
    } catch (err) {
      console.error('Error creating project:', err);
      alert(err.message || t('projects.errorCreating'));
    }
  };

  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && isCreateProjectDialogOpen) {
        setIsCreateProjectDialogOpen(false);
        setNewProject({
          name: '',
          budget: ''
        });
      }
    };
    
    if (isCreateProjectDialogOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }
    
    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isCreateProjectDialogOpen]);

  if (loading) {
    return (
      <div className="projects-container">
        <div className="loading-message">{t('projects.loadingProjects')}</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="projects-container">
        <div className="error-message">{error}</div>
      </div>
    );
  }

  return (
    <div className="projects-container">
      <div className="projects-header">
        <h1>{t('projects.title')}</h1>
        <p className="projects-count">{t('projects.projectCount', { count: projects.length, plural: projects.length !== 1 ? 's' : '' })}</p>
      </div>
      
      {projects.length === 0 ? (
        <div className="no-projects">
          <p>{t('projects.noProjects')}</p>
        </div>
      ) : (
        <div className="projects-grid">
          {projects.map((project) => (
            <div 
              key={project.id} 
              className="project-card"
              onClick={() => handleCardClick(project.id)}
            >
              <div className="project-card-header">
                <h2 className="project-name">{project.name}</h2>
              </div>
              <div className="project-card-body">
                <div className="project-info">
                  <span className="project-label">{t('projects.projectId')}</span>
                  <span className="project-value project-id">{project.id}</span>
                </div>
                <div className="project-info">
                  <span className="project-label">{t('projects.projectBudget')}</span>
                  <span className="project-value project-budget">{formatBudget(project.budget)}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      
      <button className="add-project-button" onClick={handleOpenCreateProjectDialog}>
        +
      </button>

      {/* Create Project Dialog */}
      {isCreateProjectDialogOpen && (
        <div className="dialog-overlay" onClick={handleCloseCreateProjectDialog}>
          <div className="dialog-content" onClick={(e) => e.stopPropagation()}>
            <div className="dialog-header">
              <h2>{t('projects.createProject')}</h2>
              <button className="dialog-close-button" onClick={handleCloseCreateProjectDialog}>×</button>
            </div>
            <form onSubmit={handleCreateProject}>
              <div className="dialog-body">
                <div className="task-detail-item">
                  <label className="task-detail-label" htmlFor="project-name">{t('projects.projectName')} *</label>
                  <input
                    type="text"
                    id="project-name"
                    className="task-input"
                    value={newProject.name}
                    onChange={(e) => setNewProject({ ...newProject, name: e.target.value })}
                    required
                    placeholder={t('projects.projectNamePlaceholder')}
                  />
                </div>
                <div className="task-detail-item">
                  <label className="task-detail-label" htmlFor="project-budget">{t('projects.projectBudget')} *</label>
                  <input
                    type="number"
                    id="project-budget"
                    className="task-input"
                    value={newProject.budget}
                    onChange={(e) => setNewProject({ ...newProject, budget: e.target.value })}
                    required
                    min="0"
                    step="0.01"
                    placeholder={t('projects.projectBudgetPlaceholder')}
                  />
                </div>
              </div>
              <div className="dialog-footer">
                <button type="button" className="dialog-cancel-btn" onClick={handleCloseCreateProjectDialog}>
                  {t('common.cancel')}
                </button>
                <button type="submit" className="dialog-close-btn">
                  {t('projects.createProjectButton')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default Projects;

