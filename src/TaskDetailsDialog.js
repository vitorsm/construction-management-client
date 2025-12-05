import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { checkAuthError } from './apiUtils';
import { API_BASE_URL } from './config';
import Dialog from './Dialog';
import ExpenseDetailsDialog from './ExpenseDetailsDialog';
import ExpensesTable from './ExpensesTable';
import './TaskDetailsDialog.css';

function TaskDetailsDialog({ isOpen, task, onClose, onUpdate, onDelete, onCreate, projectId, parentTaskId }) {
  const { t } = useTranslation();
  const [isEditMode, setIsEditMode] = useState(false);
  const [editedTask, setEditedTask] = useState(null);
  const [viewingChildTask, setViewingChildTask] = useState(null);
  const [isCreatingChildTask, setIsCreatingChildTask] = useState(false);
  const [isExpenseDialogOpen, setIsExpenseDialogOpen] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState(null);
  const [expenses, setExpenses] = useState([]);
  const [loadingExpenses, setLoadingExpenses] = useState(false);
  const isCreateMode = !task || isCreatingChildTask;

  useEffect(() => {
    if (!isOpen) {
      setIsEditMode(false);
      setEditedTask(null);
      setViewingChildTask(null);
      setIsCreatingChildTask(false);
      setIsExpenseDialogOpen(false);
      setSelectedExpense(null);
      setExpenses([]);
    } else if (isCreateMode) {
      // Initialize form for create mode
      setEditedTask({
        name: '',
        planned_start_date: '',
        planned_end_date: '',
        actual_start_date: '',
        actual_end_date: '',
        progress: 0,
        status: 'TODO'
      });
      setIsEditMode(true);
    }
  }, [isOpen, isCreateMode]);

  const fetchTaskExpenses = useCallback(async (taskId) => {
    if (!taskId) {
      setExpenses([]);
      return;
    }

    setLoadingExpenses(true);
    try {
      const token = localStorage.getItem('access_token');
      
      if (!token) {
        throw new Error('No access token found. Please login again.');
      }

      const response = await fetch(`${API_BASE_URL}/api/tasks/${taskId}/expenses`, {
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
        throw new Error(`Failed to fetch expenses: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      setExpenses(data || []);
    } catch (err) {
      console.error('Error fetching task expenses:', err);
      setExpenses([]);
    } finally {
      setLoadingExpenses(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen && !isEditMode && !isCreateMode) {
      const currentTask = viewingChildTask || task;
      if (currentTask && currentTask.id) {
        fetchTaskExpenses(currentTask.id);
      }
    }
  }, [isOpen, isEditMode, isCreateMode, task, viewingChildTask, fetchTaskExpenses]);

  const formatDate = (date) => {
    if (!date) return 'N/A';
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }).format(new Date(date));
  };

  const getCurrentTask = () => {
    return viewingChildTask || task;
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
    if (task.status.toLowerCase() !== 'done' && task.status.toLowerCase() !== 'completed') {
      return plannedEnd < today;
    } else if (task.actual_end_date) {
      const actualEnd = new Date(task.actual_end_date);
      actualEnd.setHours(0, 0, 0, 0);
      return actualEnd > plannedEnd;
    }
    return false;
  };

  const renderPieChart = (progress) => {
    const size = 120;
    const radius = 50;
    const circumference = 2 * Math.PI * radius;
    const progressValue = Math.min(Math.max(progress, 0), 100);
    const strokeDasharray = circumference;
    const strokeDashoffset = circumference - (progressValue / 100) * circumference;
    
    return (
      <div className="pie-chart-container">
        <svg width={size} height={size} className="pie-chart">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="#e9ecef"
            strokeWidth="12"
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={progressValue >= 100 ? "#51cf66" : progressValue >= 50 ? "#4dabf7" : "#ff6b6b"}
            strokeWidth="12"
            strokeDasharray={strokeDasharray}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
            className="pie-chart-progress"
          />
          <text
            x={size / 2}
            y={size / 2}
            textAnchor="middle"
            dominantBaseline="middle"
            className="pie-chart-text"
          >
            {progressValue}%
          </text>
        </svg>
      </div>
    );
  };

  const handleEditTask = () => {
    const currentTask = getCurrentTask();
    setIsEditMode(true);
    setEditedTask({
      name: currentTask.name || '',
      planned_start_date: currentTask.planned_start_date ? new Date(currentTask.planned_start_date).toISOString().split('T')[0] : '',
      planned_end_date: currentTask.planned_end_date ? new Date(currentTask.planned_end_date).toISOString().split('T')[0] : '',
      actual_start_date: currentTask.actual_start_date ? new Date(currentTask.actual_start_date).toISOString().split('T')[0] : '',
      actual_end_date: currentTask.actual_end_date ? new Date(currentTask.actual_end_date).toISOString().split('T')[0] : '',
      progress: currentTask.progress || 0,
      status: currentTask.status || 'TODO'
    });
  };

  const handleCancelEdit = () => {
    setIsEditMode(false);
    setEditedTask(null);
  };

  const handleCreateTask = async (e) => {
    e.preventDefault();
    if (!editedTask) return;

    try {
      const token = localStorage.getItem('access_token');
      
      if (!token) {
        throw new Error('No access token found. Please login again.');
      }

      const taskData = {
        name: editedTask.name,
        planned_start_date: editedTask.planned_start_date || null,
        planned_end_date: editedTask.planned_end_date || null,
        actual_start_date: editedTask.actual_start_date || null,
        actual_end_date: editedTask.actual_end_date || null,
        progress: parseInt(editedTask.progress) || 0,
        status: editedTask.status,
        workspace: {"id": "f0ae47da-7352-455c-a3ad-02e7fb8d29c9"},
        project: {"id": projectId}
      };

      // Add parent_task_id if creating a child task
      if (isCreatingChildTask && task) {
        taskData.parent_task_id = task.id;
      } else if (parentTaskId) {
        taskData.parent_task_id = parentTaskId;
      }

      const response = await fetch(`${API_BASE_URL}/api/tasks`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(taskData),
      });

      if (!response.ok) {
        if (checkAuthError(response)) {
          return;
        }
        throw new Error(`Failed to create task: ${response.status} ${response.statusText}`);
      }

      // Call onCreate callback to refresh tasks list
      if (onCreate) {
        await onCreate();
      }
      
      // If creating a child task, go back to viewing the parent task
      if (isCreatingChildTask && task) {
        setIsCreatingChildTask(false);
        setIsEditMode(false);
        setEditedTask(null);
        // Refresh the task data by calling onUpdate
        if (onUpdate) {
          await onUpdate();
        }
      } else {
        // Close dialog for regular create
        setIsEditMode(false);
        setEditedTask(null);
        if (onClose) {
          onClose();
        }
      }
    } catch (err) {
      console.error('Error creating task:', err);
      alert(err.message || t('taskDetails.errorCreating'));
    }
  };

  const handleUpdateTask = async (e) => {
    e.preventDefault();
    const currentTask = getCurrentTask();
    if (!currentTask || !editedTask) return;

    try {
      const token = localStorage.getItem('access_token');
      
      if (!token) {
        throw new Error('No access token found. Please login again.');
      }

      const taskData = {
        id: currentTask.id,
        name: editedTask.name,
        planned_start_date: editedTask.planned_start_date || null,
        planned_end_date: editedTask.planned_end_date || null,
        actual_start_date: editedTask.actual_start_date || null,
        actual_end_date: editedTask.actual_end_date || null,
        progress: parseInt(editedTask.progress) || 0,
        status: editedTask.status,
        workspace: {"id": "f0ae47da-7352-455c-a3ad-02e7fb8d29c9"},
        project: {"id": projectId},
        parent_task_id: currentTask.parent_task_id || null
      };

      const response = await fetch(`${API_BASE_URL}/api/tasks/${currentTask.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(taskData),
      });

      if (!response.ok) {
        if (checkAuthError(response)) {
          return;
        }
        throw new Error(`Failed to update task: ${response.status} ${response.statusText}`);
      }

      // Call onUpdate callback to refresh tasks list
      if (onUpdate) {
        await onUpdate();
      }
      
      // Close dialog or go back to parent if viewing child
      setIsEditMode(false);
      setEditedTask(null);
      if (viewingChildTask) {
        setViewingChildTask(null);
      } else if (onClose) {
        onClose();
      }
    } catch (err) {
      console.error('Error updating task:', err);
      alert(err.message || t('taskDetails.errorUpdating'));
    }
  };

  const handleDeleteTask = async () => {
    const currentTask = getCurrentTask();
    if (!currentTask) return;
    
    const confirmed = window.confirm(t('taskDetails.deleteConfirm', { taskName: currentTask.name }));
    
    if (!confirmed) return;

    try {
      const token = localStorage.getItem('access_token');
      
      if (!token) {
        throw new Error('No access token found. Please login again.');
      }

      const response = await fetch(`${API_BASE_URL}/api/tasks/${currentTask.id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        if (checkAuthError(response)) {
          return;
        }
        throw new Error(`Failed to delete task: ${response.status} ${response.statusText}`);
      }

      // Call onDelete callback to refresh tasks list
      if (onDelete) {
        await onDelete();
      }
      
      // Close dialog or go back to parent if viewing child
      if (viewingChildTask) {
        setViewingChildTask(null);
      } else if (onClose) {
        onClose();
      }
    } catch (err) {
      console.error('Error deleting task:', err);
      alert(err.message || t('taskDetails.errorDeleting'));
    }
  };

  const handleViewChildTask = (childTask) => {
    setViewingChildTask(childTask);
  };

  const handleBackToParent = () => {
    setViewingChildTask(null);
  };

  const handleCreateChildTask = () => {
    setIsCreatingChildTask(true);
    setIsEditMode(true);
    setEditedTask({
      name: '',
      planned_start_date: '',
      planned_end_date: '',
      actual_start_date: '',
      actual_end_date: '',
      progress: 0,
      status: 'TODO'
    });
  };

  const handleCancelCreateChildTask = () => {
    setIsCreatingChildTask(false);
    setIsEditMode(false);
    setEditedTask(null);
  };

  const hasChildren = (task) => {
    return task && task.children && Array.isArray(task.children) && task.children.length > 0;
  };

  const handleCreateExpense = () => {
    setSelectedExpense(null);
    setIsExpenseDialogOpen(true);
  };

  const handleCloseExpenseDialog = () => {
    setIsExpenseDialogOpen(false);
    setSelectedExpense(null);
    // Refresh expenses when dialog closes
    const currentTask = getCurrentTask();
    if (currentTask && currentTask.id) {
      fetchTaskExpenses(currentTask.id);
    }
  };

  const handleExpenseClick = (expense) => {
    setSelectedExpense(expense);
    setIsExpenseDialogOpen(true);
  };

  const handleExpenseUpdate = () => {
    // Refresh expenses after update
    const currentTask = getCurrentTask();
    if (currentTask && currentTask.id) {
      fetchTaskExpenses(currentTask.id);
    }
  };

  const handleExpenseDelete = () => {
    // Refresh expenses after delete
    const currentTask = getCurrentTask();
    if (currentTask && currentTask.id) {
      fetchTaskExpenses(currentTask.id);
    }
  };

  const dialogTitle = isCreateMode 
    ? (isCreatingChildTask ? t('taskDetails.createChildTask') : t('taskDetails.createTask'))
    : isEditMode 
      ? t('taskDetails.editTask')
      : t('taskDetails.taskDetails');

  // Build footer buttons for edit/create mode
  const editModeFooterButtons = isEditMode && editedTask ? [
    ...(!isCreateMode ? [{ type: 'delete', onClick: handleDeleteTask, show: true }] : []),
    { 
      type: 'cancel', 
      onClick: isCreatingChildTask ? handleCancelCreateChildTask : (isCreateMode ? onClose : handleCancelEdit),
      show: true 
    },
    { 
      type: 'save', 
      label: isCreateMode ? (isCreatingChildTask ? t('taskDetails.createChildTask') : t('taskDetails.createTask')) : t('common.save'),
      formSubmit: true,
      formId: 'task-form',
      onClick: undefined,
      show: true 
    }
  ] : [];

  // Build footer buttons for view mode
  const viewModeFooterButtons = task && !isEditMode ? [
    { type: 'delete', onClick: handleDeleteTask, show: true },
    { type: 'edit', onClick: handleEditTask, show: true }
  ] : [];

  const footerButtons = editModeFooterButtons.length > 0 ? editModeFooterButtons : viewModeFooterButtons;

  return (
    <>
    <Dialog 
      isOpen={isOpen} 
      title={dialogTitle} 
      onClose={onClose}
      footerButtons={footerButtons}
    >
      {isEditMode && editedTask ? (
          <form id="task-form" onSubmit={isCreateMode ? handleCreateTask : handleUpdateTask}>
            <div className="dialog-body">
              {isCreatingChildTask && task && (
                <div className="creating-child-task-notice">
                  {t('taskDetails.creatingChildTaskFor', { taskName: task.name })}
                </div>
              )}
              <div className="task-detail-item">
                <label className="task-detail-label" htmlFor="edit-task-name">{t('taskDetails.name')} *</label>
                <input
                  type="text"
                  id="edit-task-name"
                  className="task-input"
                  value={editedTask.name}
                  onChange={(e) => setEditedTask({ ...editedTask, name: e.target.value })}
                  required
                  placeholder={isCreateMode ? t('taskDetails.namePlaceholder') : ""}
                />
              </div>
              <div className="task-detail-item">
                <label className="task-detail-label" htmlFor="edit-task-status">{t('taskDetails.status')}</label>
                <select
                  id="edit-task-status"
                  className="task-input"
                  value={editedTask.status}
                  onChange={(e) => {
                    const newStatus = e.target.value;
                    setEditedTask({ 
                      ...editedTask, 
                      status: newStatus,
                      progress: newStatus === 'DONE' ? 100 : editedTask.progress
                    });
                  }}
                >
                  <option value="TODO">{t('taskDetails.notStarted')}</option>
                  <option value="IN_PROGRESS">{t('taskDetails.inProgress')}</option>
                  <option value="DONE">{t('taskDetails.completed')}</option>
                </select>
              </div>
              <div className="task-detail-item">
                <label className="task-detail-label" htmlFor="edit-task-progress">{t('taskDetails.progress')}</label>
                <input
                  type="number"
                  id="edit-task-progress"
                  className="task-input"
                  value={editedTask.progress}
                  onChange={(e) => setEditedTask({ ...editedTask, progress: e.target.value })}
                  min="0"
                  max="100"
                  placeholder={isCreateMode ? t('taskDetails.progressPlaceholder') : ""}
                />
              </div>
              <div className="task-detail-item">
                <label className="task-detail-label" htmlFor="edit-task-planned-start">{t('taskDetails.plannedStartDate')}</label>
                <input
                  type="date"
                  id="edit-task-planned-start"
                  className="task-input"
                  value={editedTask.planned_start_date}
                  onChange={(e) => setEditedTask({ ...editedTask, planned_start_date: e.target.value })}
                />
              </div>
              <div className="task-detail-item">
                <label className="task-detail-label" htmlFor="edit-task-planned-end">{t('taskDetails.plannedEndDate')}</label>
                <input
                  type="date"
                  id="edit-task-planned-end"
                  className="task-input"
                  value={editedTask.planned_end_date}
                  onChange={(e) => setEditedTask({ ...editedTask, planned_end_date: e.target.value })}
                />
              </div>
              <div className="task-detail-item">
                <label className="task-detail-label" htmlFor="edit-task-actual-start">{t('taskDetails.actualStartDate')}</label>
                <input
                  type="date"
                  id="edit-task-actual-start"
                  className="task-input"
                  value={editedTask.actual_start_date}
                  onChange={(e) => setEditedTask({ ...editedTask, actual_start_date: e.target.value })}
                />
              </div>
              <div className="task-detail-item">
                <label className="task-detail-label" htmlFor="edit-task-actual-end">{t('taskDetails.actualEndDate')}</label>
                <input
                  type="date"
                  id="edit-task-actual-end"
                  className="task-input"
                  value={editedTask.actual_end_date}
                  onChange={(e) => setEditedTask({ ...editedTask, actual_end_date: e.target.value })}
                />
              </div>
              {!isCreateMode && (
                <div className="task-detail-item">
                  <span className="task-detail-label">ID:</span>
                  <span className="task-detail-value task-id-value">{getCurrentTask().id}</span>
                </div>
              )}
            </div>
            </form>
        ) : task ? (
          <>
            <div className="dialog-body">
              {viewingChildTask && (
                <button className="task-back-button" onClick={handleBackToParent}>
                  {t('taskDetails.backToParent')}
                </button>
              )}
              {isTaskDelayed(getCurrentTask()) && (
                <div className="delayed-label">
                  {t('taskDetails.taskDelayed')}
                </div>
              )}
              <div className="task-detail-item">
                <span className="task-detail-label">{t('taskDetails.name')}:</span>
                <span className="task-detail-value">{getCurrentTask().name}</span>
              </div>
              <div className="task-detail-item">
                <span className="task-detail-label">{t('taskDetails.progress')}:</span>
                {renderPieChart(getCurrentTask().progress || 0)}
              </div>
              <div className="task-detail-item">
                <span className="task-detail-label">{t('taskDetails.status')}:</span>
                <span className={`status-badge status-${getCurrentTask().status?.toLowerCase().replace(/\s+/g, '-')}`}>
                  {getCurrentTask().status}
                </span>
              </div>
              <div className="task-detail-item">
                <span className="task-detail-label">{t('taskDetails.plannedStartDate')}:</span>
                <span className="task-detail-value">
                  {getCurrentTask().planned_start_date ? formatDate(getCurrentTask().planned_start_date) : t('common.noData')}
                </span>
              </div>
              <div className="task-detail-item">
                <span className="task-detail-label">{t('taskDetails.plannedEndDate')}:</span>
                <span className="task-detail-value">
                  {getCurrentTask().planned_end_date ? formatDate(getCurrentTask().planned_end_date) : t('common.noData')}
                </span>
              </div>
              <div className="task-detail-item">
                <span className="task-detail-label">{t('taskDetails.actualStartDate')}:</span>
                <span className="task-detail-value">
                  {getCurrentTask().actual_start_date ? formatDate(getCurrentTask().actual_start_date) : t('common.noData')}
                </span>
              </div>
              <div className="task-detail-item">
                <span className="task-detail-label">{t('taskDetails.actualEndDate')}:</span>
                <span className="task-detail-value">
                  {getCurrentTask().actual_end_date ? formatDate(getCurrentTask().actual_end_date) : t('common.noData')}
                </span>
              </div>
              {getCurrentTask().expenses_values && getCurrentTask().expenses_values !== 0 && (
                <div className="task-detail-item">
                  <span className="task-detail-label">{t('taskDetails.cost')}</span>
                  <span className="task-detail-value">
                    {typeof getCurrentTask().expenses_values === 'number' 
                      ? `$${getCurrentTask().expenses_values.toFixed(2)}`
                      : `$${parseFloat(getCurrentTask().expenses_values || 0).toFixed(2)}`}
                  </span>
                </div>
              )}
              {!viewingChildTask && hasChildren(task) && (
                <div className="task-detail-item task-children-section">
                  <div className="task-children-header">
                    <span className="task-detail-label">{t('taskDetails.childrenTasks')}</span>
                    <button 
                      className="create-child-task-button"
                      onClick={handleCreateChildTask}
                    >
                      {t('taskDetails.createChildTaskButton')}
                    </button>
                  </div>
                  <div className="task-children-table-container">
                    <table className="task-children-table">
                      <thead>
                        <tr>
                          <th>{t('taskDetails.taskName')}</th>
                          <th>{t('taskDetails.progress')}</th>
                          <th>{t('common.details')}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {task.children.map((childTask) => (
                          <tr key={childTask.id}>
                            <td className="child-task-name">{childTask.name}</td>
                            <td className="child-task-progress">
                              <div className="child-task-progress-container">
                                <div className="child-task-progress-bar">
                                  <div 
                                    className="child-task-progress-fill"
                                    style={{ 
                                      width: `${Math.min(Math.max(childTask.progress || 0, 0), 100)}%`,
                                      backgroundColor: (childTask.progress || 0) >= 100 ? '#51cf66' : (childTask.progress || 0) >= 50 ? '#4dabf7' : '#ff6b6b'
                                    }}
                                  />
                                </div>
                                <span className="child-task-progress-text">{childTask.progress || 0}%</span>
                              </div>
                            </td>
                            <td>
                              <button 
                                className="child-task-details-button" 
                                onClick={() => handleViewChildTask(childTask)}
                              >
                                {t('common.details')}
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
              {!viewingChildTask && !hasChildren(task) && (
                <div className="task-detail-item task-children-section">
                  <div className="task-children-header">
                    <span className="task-detail-label">{t('taskDetails.childrenTasks')}</span>
                    <button 
                      className="create-child-task-button"
                      onClick={handleCreateChildTask}
                    >
                      {t('taskDetails.createChildTaskButton')}
                    </button>
                  </div>
                  <div className="no-children-message">
                    {t('taskDetails.noChildTasks')}
                  </div>
                </div>
              )}
              <div className="task-detail-item">
                <button 
                  className="create-expense-button"
                  onClick={handleCreateExpense}
                >
                  {t('taskDetails.registerNewExpense')}
                </button>
              </div>
              {!viewingChildTask && (
                <div className="task-detail-item task-expenses-section">
                  <div className="task-children-header">
                    <span className="task-detail-label">{t('taskDetails.expenses')}</span>
                  </div>
                  {loadingExpenses ? (
                    <div className="no-children-message">
                      {t('taskDetails.loadingExpenses')}
                    </div>
                  ) : expenses.length === 0 ? (
                    <div className="no-children-message">
                      {t('taskDetails.noExpenses')}
                    </div>
                  ) : (
                    <div className="task-expenses-table-container">
                      <ExpensesTable
                        entities={expenses}
                        onRowClick={handleExpenseClick}
                        getRowKey={(expense) => expense.id}
                        columnsToShow={['name', 'class', 'value']}
                      />
                    </div>
                  )}
                </div>
              )}
              {!isCreateMode && (
                <div className="task-detail-item">
                  <span className="task-detail-label">{t('taskDetails.id')}</span>
                  <span className="task-detail-value task-id-value">{getCurrentTask().id}</span>
                </div>
              )}
            </div>
          </>
        ) : null}
    </Dialog>
    <ExpenseDetailsDialog
      isOpen={isExpenseDialogOpen}
      expense={selectedExpense}
      onClose={handleCloseExpenseDialog}
      onUpdate={handleExpenseUpdate}
      onDelete={handleExpenseDelete}
      onCreate={handleExpenseUpdate}
      projectId={projectId}
      initialTaskId={getCurrentTask()?.id}
    />
    </>
  );
}

export default TaskDetailsDialog;

