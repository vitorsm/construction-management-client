import React, { useState, useCallback } from 'react';
import EntityTable from './EntityTable';
import './TasksTable.css';

function TasksTable({ entities, onRowClick, getRowKey, columnsFilter }) {
  // Tree expansion state
  const [expandedTasks, setExpandedTasks] = useState(new Set());
  console.log('TasksTable.entities', entities)

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
    if (!task.actual_expenses_values) return 0;
    return parseFloat(task.actual_expenses_values) || 0;
  };

  const getTaskPlannedCost = (task) => {
    if (!task.planned_expenses_values) return 0;
    return parseFloat(task.planned_expenses_values) || 0;
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

  const getRowClassName = (task) => {
    return task._level > 0 ? 'task-child-row' : '';
  };

  // Flatten the tasks tree for display
  const flattenedTasks = entities && entities.length > 0 ? flattenTasks(entities) : [];

  const columns = [
    {
      header: 'Name',
      attribute: 'name',
      cellClassName: 'task-name-cell',
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
      attribute: 'actual_expenses_values',
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
      header: 'Planned Cost',
      attribute: 'planned_expenses_values',
      hideMobile: true,
      cellClassName: 'task-cost-cell',
      render: (task, value) => {
        const cost = getTaskPlannedCost(task);
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
  ];

  // Filter columns based on columnsFilter parameter
  let filteredColumns = columns;
  if (columnsFilter && Array.isArray(columnsFilter) && columnsFilter.length > 0) {
    // Filter columns to only include those in the columnsFilter array
    filteredColumns = columns.filter(col => columnsFilter.includes(col.attribute));
  }

  return (
    <EntityTable
      entities={flattenedTasks}
      columns={filteredColumns}
      onRowClick={onRowClick}
      getRowKey={getRowKey}
      getRowClassName={getRowClassName}
      tableId="tasks-table"
    />
  );
}

export default TasksTable;

