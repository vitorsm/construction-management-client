import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { checkAuthError } from './apiUtils';
import { API_BASE_URL } from './config';
import ExpenseDetailsDialog from './ExpenseDetailsDialog';
import EntitiesScreen from './EntitiesScreen';
import ExpensesTable from './ExpensesTable';
import './ExpensesScreen.css';

function ExpensesScreen() {
  const { t } = useTranslation();
  const { projectId } = useParams();
  const [items, setItems] = useState([]);

  const fetchExpenses = useCallback(async (projectId) => {
    const token = localStorage.getItem('access_token');
    
    if (!token) {
      throw new Error('No access token found. Please login again.');
    }

    const response = await fetch(`${API_BASE_URL}/api/projects/${projectId}/expenses`, {
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
      throw new Error(`Failed to fetch expenses: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return data || [];
  }, []);

  const fetchItems = useCallback(async () => {
    try {
      const token = localStorage.getItem('access_token');
      
      if (!token) {
        throw new Error('No access token found. Please login again.');
      }

      const response = await fetch(`${API_BASE_URL}/api/items/workspace/f0ae47da-7352-455c-a3ad-02e7fb8d29c9`, {
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
        throw new Error(`Failed to fetch items: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      setItems(data || []);
    } catch (err) {
      console.error('Error fetching items:', err);
    }
  }, []);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  const filterEntities = (expenses, filterStates) => {
    return expenses.filter(expense => {
      // Expense class filter
      if (filterStates.selectedExpenseClasses && filterStates.selectedExpenseClasses.length > 0) {
        if (!filterStates.selectedExpenseClasses.includes(expense.expense_class)) {
          return false;
        }
      }

      // Expense type filter
      if (filterStates.selectedExpenseTypes && filterStates.selectedExpenseTypes.length > 0) {
        if (!filterStates.selectedExpenseTypes.includes(expense.expense_type)) {
          return false;
        }
      }

      // Items filter
      if (filterStates.selectedItemIds && filterStates.selectedItemIds.length > 0) {
        // Assuming expense has an item_id or items array
        const expenseItemIds = expense.items ? expense.items.map(item => item.id) : (expense.item_id ? [expense.item_id] : []);
        const hasMatchingItem = filterStates.selectedItemIds.some(itemId => expenseItemIds.includes(itemId));
        if (!hasMatchingItem) {
          return false;
        }
      }

      // Date filter
      if (filterStates.dateInterval_from) {
        const fromDate = new Date(filterStates.dateInterval_from);
        fromDate.setHours(0, 0, 0, 0);
        const expenseDate = expense.created_at ? new Date(expense.created_at) : null;
        if (!expenseDate || expenseDate < fromDate) {
          return false;
        }
      }

      if (filterStates.dateInterval_to) {
        const toDate = new Date(filterStates.dateInterval_to);
        toDate.setHours(23, 59, 59, 999);
        const expenseDate = expense.created_at ? new Date(expense.created_at) : null;
        if (!expenseDate || expenseDate > toDate) {
          return false;
        }
      }

      return true;
    });
  };

  const formatCurrency = (value) => {
    if (!value && value !== 0) return t('common.noData');
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  };

  const getSummaryStats = (expenses) => {
    const total = expenses.reduce((sum, expense) => sum + (parseFloat(expense.value) || 0), 0);
    const count = expenses.length;
    
    return [
      { label: t('expenses.totalExpenses'), value: formatCurrency(total) },
      { label: t('expenses.numberOfExpenses'), value: count },
    ];
  };

  const getSummaryConfig = (entities) => {
    return getSummaryStats(entities);
  };

  const filterConfig = [
    {
      type: 'multiselect',
      label: t('expenses.expenseClass'),
      stateKey: 'selectedExpenseClasses',
      options: ['PLANNING', 'EXECUTION'],
      placeholder: t('expenses.selectExpenseClasses'),
    },
    {
      type: 'multiselect',
      label: t('expenses.expenseType'),
      stateKey: 'selectedExpenseTypes',
      options: ['MATERIAL', 'SERVICE', 'LABOR', 'PROJECT', 'DOCUMENT', 'TRANSPORT'],
      placeholder: t('expenses.selectExpenseTypes'),
    },
    {
      type: 'multiselect',
      label: t('expenses.items'),
      stateKey: 'selectedItemIds',
      options: items,
      placeholder: t('expenses.selectItems'),
      getOptionLabel: (item) => item.name,
      getOptionValue: (item) => item.id,
    },
    {
      type: 'date-range',
      label: t('expenses.dateInterval'),
      stateKey: 'dateInterval',
      fullWidth: true,
    },
  ];

  return (
    <EntitiesScreen
      title={t('expenses.title')}
      entityName="expenses"
      backPath={`/projects/${projectId}/dashboard`}
      fetchEntities={fetchExpenses}
      filterConfig={filterConfig}
      tableComponent={ExpensesTable}
      summaryConfig={getSummaryConfig}
      createButtonText={t('expenses.createExpense')}
      detailsDialog={ExpenseDetailsDialog}
      detailsDialogProps={{
        availableItems: items,
        onItemsRefresh: fetchItems,
      }}
      emptyMessage={t('expenses.noExpenses')}
      loadingMessage={t('expenses.loadingExpenses')}
      filterEntities={filterEntities}
    />
  );
}

export default ExpensesScreen;

