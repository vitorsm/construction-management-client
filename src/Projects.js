import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { checkAuthError } from './apiUtils';
import { API_BASE_URL } from './config';
import './Projects.css';

function Projects() {
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
        throw new Error('No access token found. Please login again.');
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
        throw new Error(`Failed to fetch projects: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      setProjects(data);
    } catch (err) {
      setError(err.message || 'An error occurred while fetching projects');
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
        throw new Error('No access token found. Please login again.');
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
        throw new Error(`Failed to create project: ${response.status} ${response.statusText}`);
      }

      // Refresh projects list and close dialog
      handleCloseCreateProjectDialog();
      await fetchProjects();
    } catch (err) {
      console.error('Error creating project:', err);
      alert(err.message || 'An error occurred while creating the project');
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
        <div className="loading-message">Loading projects...</div>
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
        <h1>Projects</h1>
        <p className="projects-count">{projects.length} project{projects.length !== 1 ? 's' : ''}</p>
      </div>
      
      {projects.length === 0 ? (
        <div className="no-projects">
          <p>No projects found.</p>
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
                  <span className="project-label">ID:</span>
                  <span className="project-value project-id">{project.id}</span>
                </div>
                <div className="project-info">
                  <span className="project-label">Budget:</span>
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
              <h2>Create Project</h2>
              <button className="dialog-close-button" onClick={handleCloseCreateProjectDialog}>×</button>
            </div>
            <form onSubmit={handleCreateProject}>
              <div className="dialog-body">
                <div className="task-detail-item">
                  <label className="task-detail-label" htmlFor="project-name">Name *</label>
                  <input
                    type="text"
                    id="project-name"
                    className="task-input"
                    value={newProject.name}
                    onChange={(e) => setNewProject({ ...newProject, name: e.target.value })}
                    required
                    placeholder="Enter project name"
                  />
                </div>
                <div className="task-detail-item">
                  <label className="task-detail-label" htmlFor="project-budget">Budget *</label>
                  <input
                    type="number"
                    id="project-budget"
                    className="task-input"
                    value={newProject.budget}
                    onChange={(e) => setNewProject({ ...newProject, budget: e.target.value })}
                    required
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                  />
                </div>
              </div>
              <div className="dialog-footer">
                <button type="button" className="dialog-cancel-btn" onClick={handleCloseCreateProjectDialog}>
                  Cancel
                </button>
                <button type="submit" className="dialog-close-btn">
                  Create Project
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

