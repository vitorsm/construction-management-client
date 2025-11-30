import React, { useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { checkAuthError } from './apiUtils';
import { API_BASE_URL } from './config';
import TaskDetailsDialog from './TaskDetailsDialog';
import TasksTable from './TasksTable';
import EntitiesScreen from './EntitiesScreen';
import './TasksScreen.css';

function TasksScreen() {
  const { projectId } = useParams();

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


  const filterEntities = useCallback((tasks, filterStates) => {
    // Apply filters to the original tree structure
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

    // Return the filtered tree (TasksTable will handle flattening)
    return filterTaskTree(tasks);
  }, []);

  // Flatten tasks tree for summary counting
  const flattenTasksForSummary = useCallback((tasks) => {
    const result = [];
    tasks.forEach(task => {
      result.push(task);
      if (task.children && Array.isArray(task.children)) {
        result.push(...flattenTasksForSummary(task.children));
      }
    });
    return result;
  }, []);

  const getSummaryStats = useCallback((entities) => {
    // entities here are the filtered tree, flatten for counting
    const flattened = flattenTasksForSummary(entities);
    const total = flattened.length;
    const completed = flattened.filter(task => task.status === 'DONE' || task.status === 'COMPLETED').length;
    const inProgress = flattened.filter(task => task.status === 'IN_PROGRESS').length;
    const todo = flattened.filter(task => task.status === 'TODO' || task.status === 'NOT_STARTED').length;
    
    return [
      { label: 'Total Tasks', value: total },
      { label: 'Completed', value: completed, className: 'tasks-summary-completed' },
      { label: 'In Progress', value: inProgress, className: 'tasks-summary-in-progress' },
      { label: 'To Do', value: todo, className: 'tasks-summary-todo' },
    ];
  }, [flattenTasksForSummary]);

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

  return (
    <EntitiesScreen
      title="Tasks"
      entityName="tasks"
      backPath={`/projects/${projectId}/dashboard`}
      fetchEntities={fetchTasks}
      filterConfig={filterConfig}
      summaryConfig={getSummaryConfig}
      createButtonText="+ Create Task"
      detailsDialog={TaskDetailsDialog}
      emptyMessage="No tasks found. Create your first task to get started."
      noFilterMatchMessage="No tasks match the current filters."
      loadingMessage="Loading tasks..."
      filterEntities={filterEntities}
      tableComponent={TasksTable}
    />
  );
}

export default TasksScreen;

