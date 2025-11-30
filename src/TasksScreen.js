import React, { useState, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { checkAuthError } from './apiUtils';
import { API_BASE_URL } from './config';
import TaskDetailsDialog from './TaskDetailsDialog';
import EntitiesScreen from './EntitiesScreen';
import './TasksScreen.css';

function TasksScreen() {
  const { projectId } = useParams();
  
  // Tree expansion state
  const [expandedTasks, setExpandedTasks] = useState(new Set());

  const fetchTasks = useCallback(async (projectId) => {
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
        return [];
      }
      throw new Error(`Failed to fetch tasks: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    
    // Recursive function to parse dates for task and its children
    const parseTaskDates = (task) => {
      const parsedTask = {
        ...task,
        planned_start_date: task.planned_start_date ? new Date(task.planned_start_date) : null,
        planned_end_date: task.planned_end_date ? new Date(task.planned_end_date) : null,
        actual_start_date: task.actual_start_date ? new Date(task.actual_start_date) : null,
        actual_end_date: task.actual_end_date ? new Date(task.actual_end_date) : null,
      };
      
      // Recursively parse children if they exist
      if (task.children && Array.isArray(task.children)) {
        parsedTask.children = task.children.map(child => parseTaskDates(child));
      }
      
      return parsedTask;
    };
    
    // Parse date strings to Date objects for all tasks and their children
    return data.map(task => parseTaskDates(task));
  }, []);

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    }).format(date);
  };

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

  const toggleTaskExpansion = (taskId, event) => {
    event.stopPropagation();
    setExpandedTasks(prev => {
      const newSet = new Set(prev);
      if (newSet.has(taskId)) {
        newSet.delete(taskId);
      } else {
        newSet.add(taskId);
      }
      return newSet;
    });
  };

  const hasChildren = useCallback((task) => {
    return task.children && Array.isArray(task.children) && task.children.length > 0;
  }, []);

  const isExpanded = useCallback((taskId) => {
    return expandedTasks.has(taskId);
  }, [expandedTasks]);

  const isTaskDelayed = (task) => {
    if (!task.planned_end_date) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const plannedEnd = new Date(task.planned_end_date);
    plannedEnd.setHours(0, 0, 0, 0);
    
    if (task.status !== 'DONE' && task.status !== 'COMPLETED') {
      return plannedEnd < today;
    } else if (task.actual_end_date) {
      const actualEnd = new Date(task.actual_end_date);
      actualEnd.setHours(0, 0, 0, 0);
      return actualEnd > plannedEnd;
    }
    return false;
  };

  // Flatten tasks tree into a list with level information
  const flattenTasks = useCallback((tasks, level = 0, parentExpanded = true) => {
    const result = [];
    tasks.forEach(task => {
      const hasChildTasks = hasChildren(task);
      const expanded = isExpanded(task.id);
      const isVisible = level === 0 || parentExpanded;
      
      if (isVisible) {
        result.push({
          ...task,
          _level: level,
          _hasChildren: hasChildTasks,
          _expanded: expanded,
        });
        
        // Add children if expanded
        if (hasChildTasks && expanded && task.children) {
          result.push(...flattenTasks(task.children, level + 1, expanded));
        }
      }
    });
    return result;
  }, [isExpanded, hasChildren]);


  const filterEntities = useCallback((tasks, filterStates) => {
    // First apply filters to the original tree structure
    const filterTask = (task) => {
      // Status filter
      if (filterStates.selectedStatuses && filterStates.selectedStatuses.length > 0) {
        if (!filterStates.selectedStatuses.includes(task.status)) {
          return false;
        }
      }

      // Date filter (check planned dates)
      if (filterStates.dateInterval_from) {
        const fromDate = new Date(filterStates.dateInterval_from);
        fromDate.setHours(0, 0, 0, 0);
        const taskDate = task.planned_start_date ? new Date(task.planned_start_date) : null;
        if (!taskDate || taskDate < fromDate) {
          return false;
        }
      }

      if (filterStates.dateInterval_to) {
        const toDate = new Date(filterStates.dateInterval_to);
        toDate.setHours(23, 59, 59, 999);
        const taskDate = task.planned_end_date ? new Date(task.planned_end_date) : null;
        if (!taskDate || taskDate > toDate) {
          return false;
        }
      }

      return true;
    };

    // Recursively filter tasks and their children
    const filterTaskTree = (taskList) => {
      return taskList.filter(task => {
        const taskMatches = filterTask(task);
        if (task.children && Array.isArray(task.children)) {
          task.children = filterTaskTree(task.children);
          // Keep task if it matches or has matching children
          return taskMatches || (task.children.length > 0);
        }
        return taskMatches;
      });
    };

    // Filter the tree first
    const filteredTree = filterTaskTree(tasks);
    
    // Then flatten the filtered tree for EntityTable
    return flattenTasks(filteredTree);
  }, [flattenTasks]);

  // Helper to count all tasks in a tree (including children)
  const countAllTasks = useCallback((tasks) => {
    let count = 0;
    tasks.forEach(task => {
      count++;
      if (task.children && Array.isArray(task.children)) {
        count += countAllTasks(task.children);
      }
    });
    return count;
  }, []);

  // Helper to count tasks by status in a tree
  const countTasksByStatus = useCallback((tasks, statuses) => {
    let count = 0;
    tasks.forEach(task => {
      if (statuses.includes(task.status)) {
        count++;
      }
      if (task.children && Array.isArray(task.children)) {
        count += countTasksByStatus(task.children, statuses);
      }
    });
    return count;
  }, []);

  const getSummaryStats = useCallback((entities) => {
    // entities here are flattened, but we need to count all tasks in the original tree
    // Since we're getting flattened entities, we'll count unique tasks
    // For a more accurate count, we'd need access to the original tree
    // For now, count the flattened entities (which may not include collapsed children)
    const total = entities.length;
    const completed = entities.filter(task => task.status === 'DONE' || task.status === 'COMPLETED').length;
    const inProgress = entities.filter(task => task.status === 'IN_PROGRESS').length;
    const todo = entities.filter(task => task.status === 'TODO' || task.status === 'NOT_STARTED').length;
    
    return [
      { label: 'Total Tasks', value: total },
      { label: 'Completed', value: completed, className: 'tasks-summary-completed' },
      { label: 'In Progress', value: inProgress, className: 'tasks-summary-in-progress' },
      { label: 'To Do', value: todo, className: 'tasks-summary-todo' },
    ];
  }, []);

  // This will be called by EntitiesScreen with the current entities
  const getSummaryConfig = (entities) => {
    return getSummaryStats(entities);
  };

  const filterConfig = [
    {
      type: 'multiselect',
      label: 'Status',
      stateKey: 'selectedStatuses',
      options: ['TODO', 'IN_PROGRESS', 'DONE'],
      placeholder: 'Select statuses...',
    },
    {
      type: 'date-range',
      label: 'Date Interval (Planned Dates)',
      stateKey: 'dateInterval',
      fullWidth: true,
    },
  ];

  const tableConfig = {
    columns: [
      {
        header: 'Name',
        attribute: 'name',
        render: (task, value, onRowClick) => {
          const hasChildTasks = task._hasChildren;
          const expanded = task._expanded;
          const indentLevel = task._level * 24;
          
          return (
            <div 
              className="task-name mobile-clickable" 
              title={task.name}
              onClick={() => onRowClick && onRowClick(task)}
              style={{ paddingLeft: `${16 + indentLevel}px` }}
            >
              <div className="task-name-content">
                {hasChildTasks && (
                  <button
                    className="task-expand-button"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleTaskExpansion(task.id, e);
                    }}
                    aria-label={expanded ? 'Collapse' : 'Expand'}
                  >
                    {expanded ? '▼' : '▶'}
                  </button>
                )}
                {!hasChildTasks && <span className="task-expand-spacer" />}
                <span className="task-name-text">{task.name}</span>
                {isTaskDelayed(task) && (
                  <span className="task-delayed-badge" title="Task is delayed">⚠️</span>
                )}
              </div>
            </div>
          );
        },
      },
      {
        header: 'Status',
        attribute: 'status',
        hideMobile: true,
        render: (task, value) => (
          <span className={`task-status-badge task-status-${task.status?.toLowerCase().replace(/\s+/g, '-')}`}>
            {task.status}
          </span>
        ),
      },
      {
        header: 'Progress',
        attribute: 'progress',
        hideMobile: true,
        cellClassName: 'task-progress-cell',
        render: (task, value) => {
          const progress = Math.min(Math.max(task.progress || 0, 0), 100);
          return (
            <div className="task-progress-container">
              <div className="task-progress-bar">
                <div 
                  className="task-progress-fill"
                  style={{ 
                    width: `${progress}%`,
                    backgroundColor: progress >= 100 ? '#51cf66' : progress >= 50 ? '#4dabf7' : '#ff6b6b'
                  }}
                />
              </div>
              <span className="task-progress-text">{progress}%</span>
            </div>
          );
        },
      },
      {
        header: 'Cost',
        attribute: 'expenses_values',
        hideMobile: true,
        cellClassName: 'task-cost-cell',
        render: (task, value) => {
          const cost = getTaskCost(task);
          return (
            <span className="task-cost-value">{formatCurrency(cost)}</span>
          );
        },
        clickable: false,
      },
      {
        header: 'Start Date',
        attribute: 'start_date',
        hideMobile: true,
        cellClassName: 'task-date-cell',
        format: (value) => formatDate(value),
      },
      {
        header: 'End Date',
        attribute: 'end_date',
        hideMobile: true,
        cellClassName: 'task-date-cell',
        format: (value) => formatDate(value),
      },
      {
        header: 'Details',
        hideMobile: true,
        render: (task, value, onRowClick) => (
          <button 
            className="task-details-button" 
            onClick={(e) => {
              e.stopPropagation();
              onRowClick && onRowClick(task);
            }}
          >
            Details
          </button>
        ),
        clickable: false,
      },
    ],
  };

  // Check if we need to pass getRowClassName to EntityTable
  // Since EntitiesScreen uses EntityTable internally, we need to pass it through tableConfig
  const getRowClassName = (task) => {
    return task._level > 0 ? 'task-child-row' : '';
  };

  return (
    <EntitiesScreen
      title="Tasks"
      entityName="tasks"
      backPath={`/projects/${projectId}/dashboard`}
      fetchEntities={fetchTasks}
      filterConfig={filterConfig}
      tableConfig={{
        ...tableConfig,
        getRowClassName,
      }}
      summaryConfig={getSummaryConfig}
      createButtonText="+ Create Task"
      detailsDialog={TaskDetailsDialog}
      emptyMessage="No tasks found. Create your first task to get started."
      noFilterMatchMessage="No tasks match the current filters."
      loadingMessage="Loading tasks..."
      filterEntities={filterEntities}
    />
  );
}

export default TasksScreen;

