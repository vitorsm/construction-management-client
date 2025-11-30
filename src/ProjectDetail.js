import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { checkAuthError } from './apiUtils';
import { API_BASE_URL } from './config';
import TaskDetailsDialog from './TaskDetailsDialog';
import DailyReport from './DailyReport';
import PieChart from './PieChart';
import EntityTable from './EntityTable';
import ExpenseDetailsDialog from './ExpenseDetailsDialog';
import './ProjectDetail.css';

function ProjectDetail() {
  const { projectId } = useParams();
  const navigate = useNavigate();

  // Project state
  const [project, setProject] = useState(null);
  
  // Dashboard state
  const [dashboard, setDashboard] = useState(null);
  
  // Get budget from project
  const budget = project?.budget || 0;
  
  // Get dates from dashboard
  const plannedStartDate = dashboard?.tasks?.planned_start_date ? new Date(dashboard.tasks.planned_start_date) : null;
  const plannedEndDate = dashboard?.tasks?.planned_end_date ? new Date(dashboard.tasks.planned_end_date) : null;
  const actualStartDate = dashboard?.tasks?.actual_start_date ? new Date(dashboard.tasks.actual_start_date) : null;
  const actualEndDate = dashboard?.tasks?.actual_end_date ? new Date(dashboard.tasks.actual_end_date) : null;
  
  // Get costs from dashboard
  const plannedCost = dashboard?.expenses?.planned_cost || 0;
  const actualCost = dashboard?.expenses?.actual_cost || 0;
  
  // Get task progress from dashboard
  const actualTasksFinished = dashboard?.tasks?.number_tasks_finished_now || 0;
  const plannedTasksFinished = dashboard?.tasks?.number_tasks_planned_to_finish_now || 0;
  const notPlannedTasks = dashboard?.tasks?.number_not_planned_tasks || 0;
  
  // Tasks state
  const [tasks, setTasks] = useState([]);
  const [tasksLoading, setTasksLoading] = useState(true);
  const [tasksError, setTasksError] = useState('');
  
  // Dialog state
  const [selectedTask, setSelectedTask] = useState(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  
  // Add button menu state
  const [isAddMenuOpen, setIsAddMenuOpen] = useState(false);
  
  // Daily report dialog state
  const [isDailyReportDialogOpen, setIsDailyReportDialogOpen] = useState(false);
  
  // Expense dialog state
  const [isExpenseDialogOpen, setIsExpenseDialogOpen] = useState(false);

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
      
      // Save selected project to localStorage
      localStorage.setItem('selectedProject', data.id);
    } catch (err) {
      console.error('Error fetching project:', err);
    }
  }, [projectId]);

  const fetchTasks = useCallback(async () => {
    try {
      setTasksLoading(true);
      setTasksError('');
      
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
      setTasksError(err.message || 'An error occurred while fetching tasks');
      console.error('Error fetching tasks:', err);
    } finally {
      setTasksLoading(false);
    }
  }, [projectId]);

  const fetchDashboard = useCallback(async () => {
    try {
      const token = localStorage.getItem('access_token');
      
      if (!token) {
        throw new Error('No access token found. Please login again.');
      }

      const response = await fetch(`${API_BASE_URL}/api/projects/${projectId}/dashboard`, {
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
        throw new Error(`Failed to fetch dashboard: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      setDashboard(data);
    } catch (err) {
      console.error('Error fetching dashboard:', err);
    }
  }, [projectId]);

  useEffect(() => {
    fetchProject();
    fetchTasks();
    fetchDashboard();
  }, [projectId, fetchProject, fetchTasks, fetchDashboard]);

  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && isDialogOpen) {
        handleCloseDialog();
      }
      if (e.key === 'Escape' && isAddMenuOpen) {
        setIsAddMenuOpen(false);
      }
    };
    
    const handleClickOutside = (e) => {
      if (isAddMenuOpen && !e.target.closest('.add-button-container')) {
        setIsAddMenuOpen(false);
      }
    };
    
    if (isAddMenuOpen) {
      document.addEventListener('keydown', handleEscape);
      document.addEventListener('click', handleClickOutside);
    }
    
    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.removeEventListener('click', handleClickOutside);
      document.body.style.overflow = 'unset';
    };
  }, [isDialogOpen, isAddMenuOpen]);
  
  const isOverBudget = actualCost > plannedCost;
  const isBehindSchedule = plannedTasksFinished > actualTasksFinished;
  const taskProgress = plannedTasksFinished > 0 ? (actualTasksFinished / plannedTasksFinished) * 100 : 0;

  const formatCurrency = (value) => {
    if (!value && value !== 0) return 'N/A';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  };

  const getTaskCost = (task) => {
    if (!task.expenses_values) return 0;
    if (Array.isArray(task.expenses_values)) {
      return task.expenses_values.reduce((sum, val) => sum + (parseFloat(val) || 0), 0);
    }
    return parseFloat(task.expenses_values) || 0;
  };

  const formatDate = (date) => {
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }).format(date);
  };

  const formatDateShort = (date) => {
    if (!date) return 'N/A';
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    }).format(date);
  };

  const getStartDate = (task) => {
    return task.actual_start_date || task.planned_start_date;
  };

  const getEndDate = (task) => {
    return task.actual_end_date || task.planned_end_date;
  };

  const isTaskDelayed = (task) => {
    if (!task.planned_end_date) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const plannedEnd = new Date(task.planned_end_date);
    plannedEnd.setHours(0, 0, 0, 0);
    
    // Task is delayed if:
    // 1. It's not completed and past the planned end date, OR
    // 2. It's completed but the actual end date is after the planned end date
    if (task.status.toLowerCase() !== 'completed') {
      return plannedEnd < today;
    } else if (task.actual_end_date) {
      const actualEnd = new Date(task.actual_end_date);
      actualEnd.setHours(0, 0, 0, 0);
      return actualEnd > plannedEnd;
    }
    return false;
  };

  const handleDetailsClick = (task) => {
    setSelectedTask(task);
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setSelectedTask(null);
  };

  const handleTaskUpdate = async () => {
    await fetchTasks();
  };

  const handleTaskDelete = async () => {
    await fetchTasks();
  };

  const handleOpenCreateTaskDialog = () => {
    setIsAddMenuOpen(false);
    setSelectedTask(null);
    setIsDialogOpen(true);
  };

  const handleTaskCreate = async () => {
    await fetchTasks();
  };

  const handleOpenDailyReportDialog = () => {
    setIsAddMenuOpen(false);
    setIsDailyReportDialogOpen(true);
  };

  const handleCloseDailyReportDialog = () => {
    setIsDailyReportDialogOpen(false);
  };

  const handleOpenCreateExpenseDialog = () => {
    setIsAddMenuOpen(false);
    setIsExpenseDialogOpen(true);
  };

  const handleCloseExpenseDialog = () => {
    setIsExpenseDialogOpen(false);
  };

  const handleExpenseCreate = async () => {
    await fetchDashboard();
  };

  // Status colors mapping for tasks
  const taskStatusColors = {
    'TODO': '#ff6b6b',
    'NOT_STARTED': '#ff6b6b',
    'IN_PROGRESS': '#4dabf7',
    'DONE': '#51cf66',
    'COMPLETED': '#51cf66',
  };

  // Colors mapping for expense types
  const expenseTypeColors = {
    'MATERIAL': '#667eea',
    'LABOR': '#f093fb',
    'EQUIPMENT': '#4facfe',
    'SUBCONTRACTOR': '#43e97b',
    'OTHER': '#fa709a',
    'OVERHEAD': '#fee140',
    'TRANSPORTATION': '#30cfd0',
  };
  console.log(project);
  return (
    <div className="project-detail-container">
      <div className="project-detail-content">
        <button className="back-button" onClick={() => navigate(`/projects/${projectId}`)}>
          ← Back
        </button>
        <h1>{project ? project.name : 'Project Detail'}</h1>
                
        <div className="project-summary">
          <h2>Project Summary</h2>
          
          <div className="summary-cards">
            <div className="summary-card">
              <div className="summary-card-label">Budget</div>
              <div className="summary-card-value budget-value">{formatCurrency(budget)}</div>
            </div>
            
            <div 
              className="summary-card" 
              onClick={() => navigate(`/projects/${projectId}/expenses`)}
              style={{ cursor: 'pointer' }}
            >
              <div className="summary-card-label">Planned Cost</div>
              <div className="summary-card-value planned-value">{formatCurrency(plannedCost)}</div>
            </div>
            
            <div 
              className={`summary-card ${isOverBudget ? 'over-budget' : 'under-budget'}`}
              onClick={() => navigate(`/projects/${projectId}/expenses`)}
              style={{ cursor: 'pointer' }}
            >
              <div className="summary-card-label">Actual Cost</div>
              <div className={`summary-card-value actual-value ${isOverBudget ? 'red' : 'green'}`}>
                {formatCurrency(actualCost)}
              </div>
            </div>
          </div>
        </div>

        <div className="project-progress">
          <h2>Project Progress</h2>
          
          <div className="progress-cards"  style={{ cursor: 'pointer' }}>
            <div className={`progress-card tasks-card ${isBehindSchedule ? 'behind-schedule' : 'on-schedule'}`} onClick={() => navigate(`/projects/${projectId}/feed`)}>
              <div className="progress-card-header">
                <div className="progress-card-label">Tasks Progress</div>
                <div className={`progress-status ${isBehindSchedule ? 'red' : 'green'}`}>
                  {isBehindSchedule ? 'Behind Schedule' : 'On Schedule'}
                </div>
              </div>
              <div className="progress-stats">
                <div className="progress-stat">
                  <span className="progress-stat-label">Actual Tasks Finished</span>
                  <span className={`progress-stat-value ${isBehindSchedule ? 'red' : 'green'}`}>
                    {actualTasksFinished}
                  </span>
                </div>
                <div className="progress-stat">
                  <span className="progress-stat-label">Planned Tasks Finished</span>
                  <span className="progress-stat-value planned">{plannedTasksFinished}</span>
                </div>
                <div className="progress-stat">
                  <span className="progress-stat-label">Not Planned Tasks</span>
                  <span className="progress-stat-value planned">{notPlannedTasks}</span>
                </div>
              </div>
              <div className="progress-bar-container">
                <div className="progress-bar-bg">
                  <div 
                    className={`progress-bar-fill ${isBehindSchedule ? 'red' : 'green'}`}
                    style={{ width: `${Math.min(taskProgress, 100)}%` }}
                  >
                    <span className="progress-bar-text">
                      {Math.round(taskProgress)}%
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="progress-card dates-card" onClick={() => navigate(`/projects/${projectId}/tasks`)}>
              <div className="progress-card-header">
                <div className="progress-card-label">Project Timeline</div>
              </div>
              <div className="date-info">
                <div className="date-box">
                  <div className="date-box-title">Planned Dates</div>
                  <div className="date-item">
                    <span className="date-label">Start Date</span>
                    <span className="date-value">{plannedStartDate ? formatDate(plannedStartDate) : 'N/A'}</span>
                  </div>
                  <div className="date-item">
                    <span className="date-label">End Date</span>
                    <span className="date-value">{plannedEndDate ? formatDate(plannedEndDate) : 'N/A'}</span>
                  </div>
                </div>
                <div className="date-box">
                  <div className="date-box-title">Actual Dates</div>
                  <div className="date-item">
                    <span className="date-label">Start Date</span>
                    <span className="date-value">{actualStartDate ? formatDate(actualStartDate) : 'N/A'}</span>
                  </div>
                  <div className="date-item">
                    <span className="date-label">End Date</span>
                    <span className="date-value">{actualEndDate ? formatDate(actualEndDate) : 'N/A'}</span>
                  </div>
                </div>
              </div>
            </div>

            <div 
              className="progress-card tasks-status-card"
              onClick={() => navigate(`/projects/${projectId}/tasks`)}
              style={{ cursor: 'pointer' }}
            >
              <div className="progress-card-header">
                <div className="progress-card-label">Tasks by Status</div>
              </div>
              <div className="tasks-status-chart-container">
                <PieChart
                  data={dashboard?.tasks?.qnt_tasks_by_status || {}}
                  colorMap={taskStatusColors}
                  size={200}
                  radius={80}
                  showLegend={true}
                  emptyMessage="No task data available"
                />
              </div>
            </div>

            <div 
              className="progress-card expenses-type-card"
              onClick={() => navigate(`/projects/${projectId}/expenses`)}
            >
              <div className="progress-card-header">
                <div className="progress-card-label">Expenses by Type</div>
              </div>
              <div className="expenses-type-chart-container">
                <PieChart
                  data={dashboard?.expenses?.expenses_value_by_type || {}}
                  colorMap={expenseTypeColors}
                  size={200}
                  radius={80}
                  showLegend={true}
                  emptyMessage="No expense data available"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="tasks-section">
          <h2>Tasks overview</h2>
          {tasksLoading ? (
            <div className="tasks-loading">Loading tasks...</div>
          ) : tasksError ? (
            <div className="tasks-error">{tasksError}</div>
          ) : tasks.length === 0 ? (
            <div className="no-tasks">No tasks found.</div>
          ) : (
            <div className="tasks-table-container">
              <EntityTable
                entities={tasks}
                columns={[
                  {
                    header: 'Name',
                    attribute: 'name',
                    cellClassName: 'task-name mobile-clickable',
                    render: (task) => (
                      <span title={task.name}>{task.name}</span>
                    ),
                  },
                  {
                    header: 'Start Date',
                    attribute: 'start_date',
                    hideMobile: true,
                    render: (task) => formatDateShort(getStartDate(task)),
                  },
                  {
                    header: 'End Date',
                    attribute: 'end_date',
                    hideMobile: true,
                    render: (task) => formatDateShort(getEndDate(task)),
                  },
                  {
                    header: 'Status',
                    attribute: 'status',
                    hideMobile: true,
                    render: (task) => (
                      <span className={`status-badge status-${task.status.toLowerCase().replace(/\s+/g, '-')}`}>
                        {task.status}
                      </span>
                    ),
                  },
                  {
                    header: 'Progress',
                    attribute: 'progress',
                    hideMobile: true,
                    render: (task) => (
                      <div className="progress-cell">
                        <div className="progress-bar-small">
                          <div 
                            className="progress-bar-fill-small" 
                            style={{ width: `${task.progress}%` }}
                          ></div>
                        </div>
                        <span className="progress-text">{task.progress}%</span>
                      </div>
                    ),
                    clickable: false,
                  },
                  {
                    header: 'Cost',
                    attribute: 'expenses_values',
                    hideMobile: true,
                    render: (task) => {
                      const cost = getTaskCost(task);
                      return (
                        <span className="task-cost-value">{formatCurrency(cost)}</span>
                      );
                    },
                    clickable: false,
                  },
                  {
                    header: 'Details',
                    attribute: 'details',
                    hideMobile: true,
                    render: (task, value, onRowClick) => (
                      <button 
                        className="details-button" 
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDetailsClick(task);
                        }}
                      >
                        Details
                      </button>
                    ),
                    clickable: false,
                  },
                ]}
                onRowClick={handleDetailsClick}
                tableId="project-tasks"
              />
            </div>
          )}
        </div>
      </div>

      <div className="add-button-container">
        {isAddMenuOpen && (
          <div className="add-menu-buttons">
            <button 
              className="add-menu-button create-task-button"
              onClick={handleOpenCreateTaskDialog}
            >
              <span className="add-menu-button-label">Create Task</span>
            </button>
            <button 
              className="add-menu-button create-expense-button"
              onClick={handleOpenCreateExpenseDialog}
            >
              <span className="add-menu-button-label">Create Expense</span>
            </button>
            <button 
              className="add-menu-button daily-report-button"
              onClick={handleOpenDailyReportDialog}
            >
              <span className="add-menu-button-label">Daily Report</span>
            </button>
          </div>
        )}
        <button 
          className={`add-button ${isAddMenuOpen ? 'expanded' : ''}`}
          onClick={() => setIsAddMenuOpen(!isAddMenuOpen)}
        >
          {isAddMenuOpen ? '×' : '+'}
        </button>
      </div>

      {/* Task Details Dialog */}
      <TaskDetailsDialog
        isOpen={isDialogOpen}
        task={selectedTask}
        onClose={handleCloseDialog}
        onUpdate={handleTaskUpdate}
        onDelete={handleTaskDelete}
        onCreate={handleTaskCreate}
        projectId={projectId}
      />

      {/* Daily Report Dialog */}
      <DailyReport
        isOpen={isDailyReportDialogOpen}
        onClose={handleCloseDailyReportDialog}
        tasks={tasks}
        onSuccess={fetchTasks}
      />

      {/* Expense Details Dialog */}
      <ExpenseDetailsDialog
        isOpen={isExpenseDialogOpen}
        expense={null}
        onClose={handleCloseExpenseDialog}
        onCreate={handleExpenseCreate}
        projectId={projectId}
      />
    </div>
  );
}

export default ProjectDetail;

