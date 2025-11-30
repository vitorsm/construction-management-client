import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { checkAuthError } from './apiUtils';
import { API_BASE_URL } from './config';
import DailyReport from './DailyReport';
import TaskDetailsDialog from './TaskDetailsDialog';
import ExpenseDetailsDialog from './ExpenseDetailsDialog';
import './ProjectScreen.css';

function ProjectScreen() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const [project, setProject] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [isDailyReportDialogOpen, setIsDailyReportDialogOpen] = useState(false);
  const [isTaskDialogOpen, setIsTaskDialogOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [isExpenseDialogOpen, setIsExpenseDialogOpen] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState(null);

  const fetchProject = useCallback(async () => {
    try {
      const token = localStorage.getItem('access_token');
      
      if (!token) {
        throw new Error('No access token found. Please login again.');
      }

      const response = await fetch(`${API_BASE_URL}/api/projects/${projectId}`, {
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
        throw new Error(`Failed to fetch project: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      setProject(data);
    } catch (err) {
      console.error('Error fetching project:', err);
    }
  }, [projectId]);

  const fetchTasks = useCallback(async () => {
    try {
      const token = localStorage.getItem('access_token');
      
      if (!token) {
        throw new Error('No access token found. Please login again.');
      }

      const response = await fetch(`${API_BASE_URL}/api/projects/${projectId}/tasks`, {
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
        throw new Error(`Failed to fetch tasks: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      
      // Parse date strings to Date objects
      const parsedTasks = data.map(task => ({
        ...task,
        planned_start_date: task.planned_start_date ? new Date(task.planned_start_date) : null,
        planned_end_date: task.planned_end_date ? new Date(task.planned_end_date) : null,
        actual_start_date: task.actual_start_date ? new Date(task.actual_start_date) : null,
        actual_end_date: task.actual_end_date ? new Date(task.actual_end_date) : null,
      }));
      
      setTasks(parsedTasks);
    } catch (err) {
      console.error('Error fetching tasks:', err);
    }
  }, [projectId]);

  const handleOpenDailyReportDialog = () => {
    setIsDailyReportDialogOpen(true);
  };

  const handleCloseDailyReportDialog = () => {
    setIsDailyReportDialogOpen(false);
  };

  const handleOpenCreateTaskDialog = () => {
    setSelectedTask(null);
    setIsTaskDialogOpen(true);
  };

  const handleCloseTaskDialog = () => {
    setIsTaskDialogOpen(false);
    setSelectedTask(null);
  };

  const handleTaskCreate = async () => {
    await fetchTasks();
  };

  const handleTaskUpdate = async () => {
    await fetchTasks();
  };

  const handleTaskDelete = async () => {
    await fetchTasks();
  };

  const handleOpenCreateExpenseDialog = () => {
    setSelectedExpense(null);
    setIsExpenseDialogOpen(true);
  };

  const handleCloseExpenseDialog = () => {
    setIsExpenseDialogOpen(false);
    setSelectedExpense(null);
  };

  const handleExpenseCreate = async () => {
    // Refresh expenses list if needed
    // For now, we'll just close the dialog
  };

  const handleExpenseUpdate = async () => {
    // Refresh expenses list if needed
  };

  const handleExpenseDelete = async () => {
    // Refresh expenses list if needed
  };

  useEffect(() => {
    fetchProject();
    fetchTasks();
  }, [fetchProject, fetchTasks]);

  return (
    <div className="project-screen-container">
      <div className="project-screen-content">
        <button 
          className="project-screen-back-button"
          onClick={() => navigate('/projects')}
        >
          ← Back to Projects
        </button>
        <h1>{project?.name || 'Project Screen'}</h1>
        <p>This is the main project screen. Content will be added here.</p>
        
        <div className="project-screen-buttons">
          <button 
            className="project-screen-button"
            onClick={handleOpenCreateExpenseDialog}
          >
            Create Expense
          </button>
          
          <button 
            className="project-screen-button"
            onClick={handleOpenDailyReportDialog}
          >
            Daily Report
          </button>
          
          <button 
            className="project-screen-button"
            onClick={handleOpenCreateTaskDialog}
          >
            Create Task
          </button>
          
          <button 
            className="project-screen-button"
            onClick={() => navigate(`/projects/${projectId}/feed`)}
          >
            Feed
          </button>
          
          <button 
            className="project-screen-button"
            onClick={() => navigate(`/projects/${projectId}/dashboard`)}
          >
            Dashboard
          </button>
        </div>
      </div>
      
      {/* Daily Report Dialog */}
      <DailyReport
        isOpen={isDailyReportDialogOpen}
        onClose={handleCloseDailyReportDialog}
        tasks={tasks}
        onSuccess={fetchTasks}
      />
      
      {/* Task Details Dialog */}
      <TaskDetailsDialog
        isOpen={isTaskDialogOpen}
        task={selectedTask}
        onClose={handleCloseTaskDialog}
        onUpdate={handleTaskUpdate}
        onDelete={handleTaskDelete}
        onCreate={handleTaskCreate}
        projectId={projectId}
      />
      
      {/* Expense Details Dialog */}
      <ExpenseDetailsDialog
        isOpen={isExpenseDialogOpen}
        expense={selectedExpense}
        onClose={handleCloseExpenseDialog}
        onUpdate={handleExpenseUpdate}
        onDelete={handleExpenseDelete}
        onCreate={handleExpenseCreate}
        projectId={projectId}
      />
    </div>
  );
}

export default ProjectScreen;

