import React, { useState, useRef, useEffect } from 'react';
import './TasksSelect.css';

function TasksSelect({ tasks, value, onChange, required = true, id = 'task-select', className = 'task-input' }) {
  const [isOpen, setIsOpen] = useState(false);
  const [expandedTasks, setExpandedTasks] = useState(new Set());
  const dropdownRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Find selected task name
  const findTaskName = (taskList, taskId) => {
    if (!taskList || !Array.isArray(taskList)) return null;
    for (const task of taskList) {
      if (task.id === taskId) {
        return task.name;
      }
      if (task.children && Array.isArray(task.children)) {
        const found = findTaskName(task.children, taskId);
        if (found) return found;
      }
    }
    return null;
  };

  const selectedTaskName = value ? findTaskName(tasks, value) : null;

  const toggleExpansion = (taskId, event) => {
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

  const hasChildren = (task) => {
    return task.children && Array.isArray(task.children) && task.children.length > 0;
  };

  const isExpanded = (taskId) => {
    return expandedTasks.has(taskId);
  };

  const handleTaskSelect = (taskId) => {
    // Create a synthetic event object to match the expected onChange signature
    const syntheticEvent = {
      target: {
        value: taskId
      }
    };
    onChange(syntheticEvent);
    setIsOpen(false);
  };

  // Recursive function to render tree nodes
  const renderTreeNode = (task, level = 0) => {
    const hasChildTasks = hasChildren(task);
    const expanded = isExpanded(task.id);
    const isSelected = value === task.id;
    const indentLevel = level * 24;

    return (
      <div key={task.id}>
        <div
          className={`task-select-option ${isSelected ? 'task-select-option-selected' : ''}`}
          style={{ paddingLeft: `${14 + indentLevel}px` }}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            handleTaskSelect(task.id);
          }}
        >
          <div className="task-select-option-content">
            {hasChildTasks ? (
              <button
                type="button"
                className="task-select-expand-button"
                onClick={(e) => toggleExpansion(task.id, e)}
                aria-label={expanded ? 'Collapse' : 'Expand'}
              >
                {expanded ? '▼' : '▶'}
              </button>
            ) : (
              <span className="task-select-expand-spacer" />
            )}
            <span className="task-select-option-text">{task.name}</span>
          </div>
        </div>
        {hasChildTasks && expanded && task.children && (
          <div className="task-select-children">
            {task.children.map(child => renderTreeNode(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className={`task-select-container ${className}`} ref={dropdownRef} id={id}>
      <button
        type="button"
        className={`task-select-input ${isOpen ? 'task-select-open' : ''}`}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setIsOpen(!isOpen);
        }}
      >
        <div className="task-select-selected">
          {selectedTaskName ? (
            <span className="task-select-value">{selectedTaskName}</span>
          ) : (
            <span className="task-select-placeholder">Select a task</span>
          )}
        </div>
        <span className="task-select-arrow">{isOpen ? '▲' : '▼'}</span>
      </button>

      {isOpen && (
        <div className="task-select-dropdown">
          {!tasks || tasks.length === 0 ? (
            <div className="task-select-empty">No tasks available</div>
          ) : (
            <div className="task-select-tree">
              {tasks.map(task => renderTreeNode(task, 0))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default TasksSelect;
