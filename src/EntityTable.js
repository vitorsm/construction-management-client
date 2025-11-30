import React, { useState, useEffect } from 'react';
import './EntityTable.css';
import Dialog from './Dialog';

/**
 * Generic EntityTable component that displays a list of entities in a table format
 * 
 * @param {Array} entities - List of entities to display
 * @param {Array} columns - Column configuration array. Each column should have:
 *   - header: string - Column header text
 *   - attribute: string - Path to the attribute in the entity (e.g., "name", "expense_type")
 *   - hideMobile: boolean (optional) - Hide column on mobile devices
 *   - render: function (optional) - Custom render function (entity, value, onRowClick, formattedValue) => JSX
 *   - cellClassName: string (optional) - Custom CSS class for the cell
 *   - format: function (optional) - Format function for the value (value) => formattedValue
 * @param {Function} onRowClick - Optional callback when a row is clicked (entity) => void
 * @param {Function} getRowKey - Optional function to get unique key for each row, defaults to entity.id
 * @param {Function} getRowClassName - Optional function to get className for each row (entity) => string
 * @param {string} tableId - Optional unique identifier for the table to persist column visibility preferences
 */
function EntityTable({ entities, columns, onRowClick, getRowKey, getRowClassName, tableId }) {
  // Generate unique keys for columns
  const getColumnKey = (column, index) => {
    return column.attribute || `col-${index}`;
  };

  // Initialize visible columns state - all columns visible by default
  const [visibleColumns, setVisibleColumns] = useState(() => {
    const defaultVisibility = {};
    columns.forEach((column, index) => {
      const key = getColumnKey(column, index);
      defaultVisibility[key] = true;
    });
    
    // Load saved preferences from localStorage if tableId is provided
    if (tableId) {
      const saved = localStorage.getItem(`entity-table-columns-${tableId}`);
      if (saved) {
        try {
          const savedVisibility = JSON.parse(saved);
          // Merge with default visibility (in case columns changed)
          Object.keys(savedVisibility).forEach(key => {
            if (defaultVisibility.hasOwnProperty(key)) {
              defaultVisibility[key] = savedVisibility[key];
            }
          });
        } catch (e) {
          // Ignore parse errors
        }
      }
    }
    
    return defaultVisibility;
  });

  // Save preferences to localStorage when they change
  useEffect(() => {
    if (tableId) {
      localStorage.setItem(`entity-table-columns-${tableId}`, JSON.stringify(visibleColumns));
    }
  }, [visibleColumns, tableId]);

  const [isConfigOpen, setIsConfigOpen] = useState(false);

  // Filter columns based on visibility
  const visibleColumnsList = columns.filter((column, index) => {
    const key = getColumnKey(column, index);
    return visibleColumns[key] !== false;
  });

  const toggleColumnVisibility = (columnKey) => {
    setVisibleColumns(prev => ({
      ...prev,
      [columnKey]: !prev[columnKey]
    }));
  };

  const getValue = (entity, attribute) => {
    if (!attribute) return null;
    return attribute.split('.').reduce((obj, key) => obj?.[key], entity);
  };

  const getKey = (entity, index) => {
    if (getRowKey) {
      return getRowKey(entity, index);
    }
    return entity?.id || index;
  };

  const handleRowClick = (entity) => {
    if (onRowClick) {
      onRowClick(entity);
    }
  };

  return (
    <div className="entity-table-container">
      <div className="entity-table-header">
        <button 
          className="entity-table-config-button"
          onClick={() => setIsConfigOpen(true)}
          title="Configure columns"
        >
          ⚙️
        </button>
      </div>
      <table className="entity-table">
        <thead>
          <tr>
            {visibleColumnsList.map((column, index) => {
              const originalIndex = columns.indexOf(column);
              return (
                <th 
                  key={originalIndex}
                  className={column.hideMobile ? 'hide-mobile' : ''}
                >
                  {column.header}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {entities.map((entity, rowIndex) => {
            const rowKey = getKey(entity, rowIndex);
            const rowClassName = getRowClassName ? getRowClassName(entity) : undefined;
            return (
              <tr 
                key={rowKey}
                className={rowClassName}
                onClick={onRowClick ? () => handleRowClick(entity) : undefined}
                style={onRowClick ? { cursor: 'pointer' } : undefined}
              >
                {visibleColumnsList.map((column, colIndex) => {
                  const value = getValue(entity, column.attribute);
                  const formattedValue = column.format ? column.format(value) : value;
                  
                  let cellContent;
                  if (column.render) {
                    cellContent = column.render(entity, value, onRowClick, formattedValue);
                  } else {
                    cellContent = formattedValue;
                  }

                  const cellClassName = [
                    column.cellClassName || '',
                    column.hideMobile ? 'hide-mobile' : '',
                  ].filter(Boolean).join(' ');

                  const originalIndex = columns.indexOf(column);

                  return (
                    <td 
                      key={originalIndex}
                      className={cellClassName || undefined}
                      onClick={column.clickable === false ? (e) => e.stopPropagation() : undefined}
                    >
                      {cellContent}
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>

      <Dialog
        isOpen={isConfigOpen}
        title="Configure Columns"
        onClose={() => setIsConfigOpen(false)}
        maxWidth="400px"
      >
        <div className="column-config-dialog">
          <p className="column-config-description">Select which columns to display:</p>
          <div className="column-config-list">
            {columns.map((column, index) => {
              const columnKey = getColumnKey(column, index);
              const isVisible = visibleColumns[columnKey] !== false;
              return (
                <label key={columnKey} className="column-config-item">
                  <input
                    type="checkbox"
                    checked={isVisible}
                    onChange={() => toggleColumnVisibility(columnKey)}
                  />
                  <span>{column.header}</span>
                </label>
              );
            })}
          </div>
        </div>
      </Dialog>
    </div>
  );
}

export default EntityTable;

