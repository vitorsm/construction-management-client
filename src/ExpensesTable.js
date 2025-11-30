import React from 'react';
import EntityTable from './EntityTable';
import './ExpensesTable.css';

function ExpensesTable({ entities, onRowClick, getRowKey, columnsToShow }) {
  const formatCurrency = (value) => {
    if (!value && value !== 0) return 'N/A';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    }).format(date);
  };

  const allColumns = {
    name: {
      header: 'Name',
      attribute: 'name',
      cellClassName: 'expense-name mobile-clickable',
      render: (expense, value) => (
        <span title={value}>{value}</span>
      ),
    },
    type: {
      header: 'Type',
      attribute: 'expense_type',
      hideMobile: true,
      render: (expense, value) => (
        <span className={`expense-type-badge expense-type-${value?.toLowerCase()}`}>
          {value}
        </span>
      ),
      clickable: false,
    },
    class: {
      header: 'Class',
      attribute: 'expense_class',
      hideMobile: true,
      render: (expense, value) => (
        <span className={`expense-class-badge expense-class-${value?.toLowerCase()}`}>
          {value}
        </span>
      ),
      clickable: false,
    },
    value: {
      header: 'Value',
      attribute: 'value',
      cellClassName: 'expense-value-cell',
      format: formatCurrency,
      render: (expense, value, onRowClick, formattedValue) => (
        <span className="expense-value-value">{formattedValue}</span>
      ),
      clickable: false,
    },
    created_at: {
      header: 'Created At',
      attribute: 'created_at',
      hideMobile: true,
      cellClassName: 'expense-date-cell',
      format: formatDate,
      render: (expense, value, onRowClick, formattedValue) => (
        <span className="expense-date-value">{formattedValue}</span>
      ),
      clickable: false,
    },
    details: {
      header: 'Details',
      hideMobile: true,
      render: (expense, value, onRowClick) => (
        <button 
          className="expense-details-button" 
          onClick={(e) => {
            e.stopPropagation();
            if (onRowClick) {
              onRowClick(expense);
            }
          }}
        >
          Details
        </button>
      ),
      clickable: false,
    },
  };

  // Filter columns based on columnsToShow prop
  // If columnsToShow is not provided, show all columns (backward compatibility)
  const columns = columnsToShow && columnsToShow.length > 0
    ? columnsToShow.map(colName => allColumns[colName]).filter(Boolean)
    : Object.values(allColumns);

  return (
    <EntityTable
      entities={entities}
      columns={columns}
      onRowClick={onRowClick}
      getRowKey={getRowKey}
      tableId="expenses-table"
    />
  );
}

export default ExpensesTable;

