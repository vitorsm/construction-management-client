import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { checkAuthError } from './apiUtils';
import { API_BASE_URL } from './config';
import Dialog from './Dialog';
import ItemDetailsDialog from './ItemDetailsDialog';
import TasksSelect from './TasksSelect';
import './ExpenseDetailsDialog.css';

function ExpenseDetailsDialog({ isOpen, expense, onClose, onUpdate, onDelete, onCreate, projectId, availableItems = [], onItemsRefresh, initialTaskId }) {
  const { t } = useTranslation();
  const [isEditMode, setIsEditMode] = useState(false);
  const [editedExpense, setEditedExpense] = useState(null);
  const [selectedPhotos, setSelectedPhotos] = useState([]);
  const [photoPreviews, setPhotoPreviews] = useState([]);
  const [uploadedPhotoIndices, setUploadedPhotoIndices] = useState(new Set());
  const [photoIndexToFileId, setPhotoIndexToFileId] = useState(new Map());
  const [fileUrls, setFileUrls] = useState({});
  const [loadingFiles, setLoadingFiles] = useState({});
  const [selectedImageUrl, setSelectedImageUrl] = useState(null);
  const [itemSearchQuery, setItemSearchQuery] = useState('');
  const [isItemDialogOpen, setIsItemDialogOpen] = useState(false);
  const [localItems, setLocalItems] = useState([]);
  const [isItemSelectOpen, setIsItemSelectOpen] = useState(false);
  const [tasks, setTasks] = useState([]);
  const fileUrlsRef = useRef({});
  const itemsFetchedRef = useRef(false);
  const tasksFetchedRef = useRef(false);
  const itemSelectRef = useRef(null);
  const isCreateMode = !expense;

  useEffect(() => {
    if (!isOpen) {
      setIsEditMode(false);
      setEditedExpense(null);
      setSelectedPhotos([]);
      setPhotoPreviews([]);
      setUploadedPhotoIndices(new Set());
      setPhotoIndexToFileId(new Map());
      setItemSearchQuery('');
      setIsItemDialogOpen(false);
      setIsItemSelectOpen(false);
      itemsFetchedRef.current = false;
      tasksFetchedRef.current = false;
    } else if (isCreateMode) {
      // Initialize form for create mode
      setEditedExpense({
        name: '',
        expense_type: 'MATERIAL',
        expense_class: 'EXECUTION',
        value: '',
        comment: '',
        files: [],
        items: [],
        task_id: initialTaskId || ''
      });
      setIsEditMode(true);
    }
  }, [isOpen, isCreateMode, initialTaskId]);

  // Close item select dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (itemSelectRef.current && !itemSelectRef.current.contains(event.target)) {
        setIsItemSelectOpen(false);
      }
    };

    if (isItemSelectOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isItemSelectOpen]);

  const formatCurrency = (value) => {
    if (!value && value !== 0) return 'N/A';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  };

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
      setLocalItems(data || []);
    } catch (err) {
      console.error('Error fetching items:', err);
      // Don't set error state for items, just log it
    }
  }, []);

  const fetchTasks = useCallback(async () => {
    if (!projectId) return;
    
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
      setTasks(data || []);
    } catch (err) {
      console.error('Error fetching tasks:', err);
      // Don't set error state for tasks, just log it
    }
  }, [projectId]);

  // Fetch items if availableItems is empty when dialog opens
  useEffect(() => {
    if (isOpen && (!availableItems || availableItems.length === 0) && !itemsFetchedRef.current) {
      itemsFetchedRef.current = true;
      fetchItems();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  // Fetch tasks when dialog opens
  useEffect(() => {
    if (isOpen && !tasksFetchedRef.current && projectId) {
      tasksFetchedRef.current = true;
      fetchTasks();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, projectId]);

  const fetchFileDocument = useCallback(async (fileId) => {
    try {
      const token = localStorage.getItem('access_token');
      
      if (!token) {
        throw new Error('No access token found. Please login again.');
      }

      const response = await fetch(`${API_BASE_URL}/api/file-documents/${fileId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        if (checkAuthError(response)) {
          return null;
        }
        throw new Error(`Failed to fetch file: ${response.status} ${response.statusText}`);
      }

      const blob = await response.blob();
      const imageUrl = URL.createObjectURL(blob);
      return imageUrl;
    } catch (err) {
      console.error(`Error fetching file ${fileId}:`, err);
      return null;
    }
  }, []);

  const fetchFilesSequentially = useCallback(async (files) => {
    if (!files || files.length === 0) return;

    setFileUrls({});
    setLoadingFiles({});

    for (let i = 0; i < files.length; i++) {
      const fileId = files[i];
      
      setLoadingFiles(prev => ({ ...prev, [fileId]: true }));
      
      const imageUrl = await fetchFileDocument(fileId);
      
      if (imageUrl) {
        setFileUrls(prev => {
          const newUrls = { ...prev, [fileId]: imageUrl };
          fileUrlsRef.current = newUrls;
          return newUrls;
        });
      }
      
      setLoadingFiles(prev => {
        const newState = { ...prev };
        delete newState[fileId];
        return newState;
      });
    }
  }, [fetchFileDocument]);

  useEffect(() => {
    if (expense && expense.files && expense.files.length > 0 && !isEditMode) {
      fetchFilesSequentially(expense.files);
    }

    return () => {
      Object.values(fileUrlsRef.current).forEach(url => {
        if (url && url.startsWith('blob:')) {
          URL.revokeObjectURL(url);
        }
      });
      fileUrlsRef.current = {};
    };
  }, [expense, isEditMode, fetchFilesSequentially]);

  const openImageModal = (imageUrl) => {
    setSelectedImageUrl(imageUrl);
  };

  const closeImageModal = () => {
    setSelectedImageUrl(null);
  };

  const handleEditExpense = () => {
    setIsEditMode(true);
    setEditedExpense({
      name: expense.name || '',
      expense_type: expense.expense_type || 'MATERIAL',
      expense_class: expense.expense_class || 'EXECUTION',
      value: expense.value || '',
      comment: expense.comment || '',
      files: expense.files || [],
      items: expense.items || [],
      task_id: expense.task?.id || expense.task_id || ''
    });
  };

  const handleCancelEdit = () => {
    setIsEditMode(false);
    setEditedExpense(null);
    setSelectedPhotos([]);
    setPhotoPreviews([]);
    setUploadedPhotoIndices(new Set());
    setPhotoIndexToFileId(new Map());
  };

  const handlePhotoSelect = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length > 0) {
      const newPhotos = [...selectedPhotos, ...files];
      setSelectedPhotos(newPhotos);
      
      // Create preview URLs for all new files
      const previewPromises = files.map((file) => {
        return new Promise((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => {
            resolve(reader.result);
          };
          reader.readAsDataURL(file);
        });
      });
      
      const newPreviews = await Promise.all(previewPromises);
      setPhotoPreviews(prev => [...prev, ...newPreviews]);
      
      // Reset file input
      e.target.value = '';
    }
  };

  const handleUploadPhoto = async (photoIndex) => {
    if (!selectedPhotos[photoIndex]) {
      alert(t('expenseDetails.selectPhotoToUpload'));
      return;
    }

    try {
      const token = localStorage.getItem('access_token');
      
      if (!token) {
        throw new Error('No access token found. Please login again.');
      }

      const formData = new FormData();
      formData.append('file', selectedPhotos[photoIndex]);
      formData.append('workspace_id', 'f0ae47da-7352-455c-a3ad-02e7fb8d29c9');

      const response = await fetch(`${API_BASE_URL}/api/file-documents`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      });

      if (!response.ok) {
        if (checkAuthError(response)) {
          return;
        }
        throw new Error(`Failed to upload photo: ${response.status} ${response.statusText}`);
      }

      const responseData = await response.json();
      
      // Photo uploaded successfully - mark it as uploaded and add file ID to editedExpense
      setUploadedPhotoIndices(prev => new Set([...prev, photoIndex]));
      
      if (responseData.id) {
        // Store mapping of photo index to file ID
        setPhotoIndexToFileId(prev => new Map(prev).set(photoIndex, responseData.id));
        
        setEditedExpense(prev => ({
          ...prev,
          files: [...(prev.files || []), responseData.id]
        }));
      }
    } catch (err) {
      console.error('Error uploading photo:', err);
      alert(err.message || t('expenseDetails.errorUploadingPhoto'));
    }
  };

  const handleRemovePhoto = (photoIndex) => {
    // If photo was uploaded, remove its file ID from editedExpense.files
    const wasUploaded = uploadedPhotoIndices.has(photoIndex);
    if (wasUploaded) {
      const fileId = photoIndexToFileId.get(photoIndex);
      if (fileId) {
        setEditedExpense(prev => ({
          ...prev,
          files: (prev.files || []).filter(id => id !== fileId)
        }));
      }
    }
    
    // Remove photo from arrays
    const newPhotos = selectedPhotos.filter((_, index) => index !== photoIndex);
    const newPreviews = photoPreviews.filter((_, index) => index !== photoIndex);
    setSelectedPhotos(newPhotos);
    setPhotoPreviews(newPreviews);
    
    // Rebuild maps with new indices (since arrays shifted)
    setPhotoIndexToFileId(prev => {
      const newMap = new Map();
      prev.forEach((fileId, oldIndex) => {
        if (oldIndex < photoIndex) {
          newMap.set(oldIndex, fileId);
        } else if (oldIndex > photoIndex) {
          newMap.set(oldIndex - 1, fileId);
        }
      });
      return newMap;
    });
    
    // Rebuild uploaded indices with new indices
    setUploadedPhotoIndices(prev => {
      const newSet = new Set();
      prev.forEach(oldIndex => {
        if (oldIndex < photoIndex) {
          newSet.add(oldIndex);
        } else if (oldIndex > photoIndex) {
          newSet.add(oldIndex - 1);
        }
      });
      return newSet;
    });
  };

  // Use localItems if availableItems is empty, otherwise use availableItems
  const itemsToUse = (availableItems && availableItems.length > 0) ? availableItems : localItems;

  const handleAddItem = (itemId) => {
    const itemToAdd = itemsToUse.find(item => item.id === itemId);
    if (itemToAdd) {
      setEditedExpense(prev => ({
        ...prev,
        items: [...(prev.items || []), { ...itemToAdd }]
      }));
      setItemSearchQuery('');
      setIsItemSelectOpen(false);
    }
  };

  const handleRemoveItem = (itemIndex) => {
    setEditedExpense(prev => ({
      ...prev,
      items: (prev.items || []).filter((_, index) => index !== itemIndex)
    }));
  };

  const getAvailableItemsForSelection = () => {
    const selectedItemIds = new Set((editedExpense?.items || []).map(item => item.id));
    let filtered = itemsToUse.filter(item => !selectedItemIds.has(item.id));
    
    // Filter by search query
    if (itemSearchQuery.trim()) {
      const query = itemSearchQuery.toLowerCase();
      filtered = filtered.filter(item => 
        item.name.toLowerCase().includes(query) ||
        (item.unit_of_measurement && item.unit_of_measurement.toLowerCase().includes(query))
      );
    }
    
    return filtered;
  };

  const handleItemCreate = async () => {
    if (onItemsRefresh) {
      await onItemsRefresh();
    } else {
      await fetchItems();
    }
    setIsItemDialogOpen(false);
  };

  const handleItemUpdate = async () => {
    if (onItemsRefresh) {
      await onItemsRefresh();
    } else {
      await fetchItems();
    }
  };

  const handleItemDelete = async () => {
    if (onItemsRefresh) {
      await onItemsRefresh();
    } else {
      await fetchItems();
    }
  };

  const handleOpenCreateItemDialog = () => {
    setIsItemDialogOpen(true);
  };

  const handleCloseItemDialog = () => {
    setIsItemDialogOpen(false);
  };

  const handleCreateExpense = async (e) => {
    e.preventDefault();
    if (!editedExpense) return;

    try {
      const token = localStorage.getItem('access_token');
      
      if (!token) {
        throw new Error('No access token found. Please login again.');
      }

      const expenseData = {
        name: editedExpense.name,
        expense_type: editedExpense.expense_type,
        expense_class: editedExpense.expense_class,
        value: parseFloat(editedExpense.value) || 0,
        comment: editedExpense.comment || null,
        files: editedExpense.files || [],
        items: editedExpense.items || [],
        workspace: {"id": "f0ae47da-7352-455c-a3ad-02e7fb8d29c9"},
        project: {"id": projectId},
        task_id: editedExpense.task_id ? editedExpense.task_id : null
      };

      const response = await fetch(`${API_BASE_URL}/api/expenses`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(expenseData),
      });

      if (!response.ok) {
        if (checkAuthError(response)) {
          return;
        }
        throw new Error(`Failed to create expense: ${response.status} ${response.statusText}`);
      }

      // Call onCreate callback to refresh expenses list
      if (onCreate) {
        await onCreate();
      }
      
      // Close dialog
      setIsEditMode(false);
      setEditedExpense(null);
      if (onClose) {
        onClose();
      }
    } catch (err) {
      console.error('Error creating expense:', err);
      alert(err.message || t('expenseDetails.errorCreating'));
    }
  };

  const handleUpdateExpense = async (e) => {
    e.preventDefault();
    if (!expense || !editedExpense) return;

    try {
      const token = localStorage.getItem('access_token');
      
      if (!token) {
        throw new Error('No access token found. Please login again.');
      }

      const expenseData = {
        id: expense.id,
        name: editedExpense.name,
        expense_type: editedExpense.expense_type,
        expense_class: editedExpense.expense_class,
        value: parseFloat(editedExpense.value) || 0,
        comment: editedExpense.comment || null,
        files: editedExpense.files || [],
        items: editedExpense.items || [],
        workspace: {"id": "f0ae47da-7352-455c-a3ad-02e7fb8d29c9"},
        project: {"id": projectId},
        task: editedExpense.task_id ? {"id": editedExpense.task_id} : null
      };

      const response = await fetch(`${API_BASE_URL}/api/expenses/${expense.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(expenseData),
      });

      if (!response.ok) {
        if (checkAuthError(response)) {
          return;
        }
        throw new Error(`Failed to update expense: ${response.status} ${response.statusText}`);
      }

      // Call onUpdate callback to refresh expenses list
      if (onUpdate) {
        await onUpdate();
      }
      
      // Close dialog
      setIsEditMode(false);
      setEditedExpense(null);
      if (onClose) {
        onClose();
      }
    } catch (err) {
      console.error('Error updating expense:', err);
      alert(err.message || t('expenseDetails.errorUpdating'));
    }
  };

  const handleDeleteExpense = async () => {
    if (!expense) return;
    
    const confirmed = window.confirm(t('expenseDetails.deleteConfirm', { expenseName: expense.name }));
    
    if (!confirmed) return;

    try {
      const token = localStorage.getItem('access_token');
      
      if (!token) {
        throw new Error('No access token found. Please login again.');
      }

      const response = await fetch(`${API_BASE_URL}/api/expenses/${expense.id}`, {
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
        throw new Error(`Failed to delete expense: ${response.status} ${response.statusText}`);
      }

      // Call onDelete callback to refresh expenses list
      if (onDelete) {
        await onDelete();
      }
      
      // Close dialog
      if (onClose) {
        onClose();
      }
    } catch (err) {
      console.error('Error deleting expense:', err);
      alert(err.message || t('expenseDetails.errorDeleting'));
    }
  };

  const dialogTitle = isCreateMode ? t('expenseDetails.createExpense') : isEditMode ? t('expenseDetails.editExpense') : t('expenseDetails.expenseDetails');

  // Build footer buttons for edit/create mode
  const editModeFooterButtons = isEditMode && editedExpense ? [
    ...(!isCreateMode ? [{ type: 'delete', onClick: handleDeleteExpense, show: true }] : []),
    { 
      type: 'cancel', 
      onClick: isCreateMode ? onClose : handleCancelEdit,
      show: true 
    },
    { 
      type: 'save', 
      label: isCreateMode ? t('expenseDetails.createExpense') : t('common.save'),
      formSubmit: true,
      formId: 'expense-form',
      onClick: undefined,
      show: true 
    }
  ] : [];

  // Build footer buttons for view mode
  const viewModeFooterButtons = expense && !isEditMode ? [
    { type: 'delete', onClick: handleDeleteExpense, show: true },
    { type: 'edit', onClick: handleEditExpense, show: true }
  ] : [];

  const footerButtons = editModeFooterButtons.length > 0 ? editModeFooterButtons : viewModeFooterButtons;

  return (
    <>
      {selectedImageUrl && (
        <div className="image-modal-overlay" onClick={closeImageModal}>
          <div className="image-modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="image-modal-close" onClick={closeImageModal}>×</button>
            <img src={selectedImageUrl} alt={t('expenseDetails.expenseDetails')} />
          </div>
        </div>
      )}
      <Dialog 
        isOpen={isOpen} 
        title={dialogTitle} 
        onClose={onClose}
        footerButtons={footerButtons}
      >
        {isEditMode && editedExpense ? (
          <form id="expense-form" onSubmit={isCreateMode ? handleCreateExpense : handleUpdateExpense}>
            <div className="dialog-body">
              {!isCreateMode && (
                <div className="expense-detail-item">
                  <span className="expense-detail-label">{t('expenseDetails.id')}</span>
                  <span className="expense-detail-value expense-id-value">{expense.id}</span>
                </div>
              )}
              <div className="expense-detail-item">
                <label className="expense-detail-label" htmlFor="edit-expense-name">{t('expenseDetails.name')} *</label>
                <input
                  type="text"
                  id="edit-expense-name"
                  className="expense-input"
                  value={editedExpense.name}
                  onChange={(e) => setEditedExpense({ ...editedExpense, name: e.target.value })}
                  required
                  placeholder={isCreateMode ? t('expenseDetails.namePlaceholder') : ""}
                />
              </div>
              <div className="expense-detail-item">
                <label className="expense-detail-label" htmlFor="edit-expense-type">{t('expenseDetails.expenseType')}</label>
                <select
                  id="edit-expense-type"
                  className="expense-input"
                  value={editedExpense.expense_type}
                  onChange={(e) => setEditedExpense({ ...editedExpense, expense_type: e.target.value })}
                >
                  <option value="MATERIAL">{t('expenseTypes.MATERIAL')}</option>
                  <option value="SERVICE">{t('expenseTypes.SERVICE')}</option>
                  <option value="LABOR">{t('expenseTypes.LABOR')}</option>
                  <option value="PROJECT">{t('expenseTypes.PROJECT')}</option>
                  <option value="DOCUMENT">{t('expenseTypes.DOCUMENT')}</option>
                  <option value="TRANSPORT">{t('expenseTypes.TRANSPORT')}</option>
                </select>
              </div>
              <div className="expense-detail-item">
                <label className="expense-detail-label" htmlFor="edit-expense-class">{t('expenseDetails.expenseClass')}</label>
                <select
                  id="edit-expense-class"
                  className="expense-input"
                  value={editedExpense.expense_class}
                  onChange={(e) => setEditedExpense({ ...editedExpense, expense_class: e.target.value })}
                >
                  <option value="PLANNING">{t('expenseClasses.PLANNING')}</option>
                  <option value="EXECUTION">{t('expenseClasses.EXECUTION')}</option>
                </select>
              </div>
              <div className="expense-detail-item">
                <label className="expense-detail-label" htmlFor="edit-expense-value">{t('expenseDetails.value')} *</label>
                <input
                  type="number"
                  id="edit-expense-value"
                  className="expense-input"
                  value={editedExpense.value}
                  onChange={(e) => setEditedExpense({ ...editedExpense, value: e.target.value })}
                  min="0"
                  step="0.01"
                  required
                  placeholder={isCreateMode ? t('expenseDetails.valuePlaceholder') : ""}
                />
              </div>
              <div className="expense-detail-item">
                <label className="expense-detail-label" htmlFor="edit-expense-task">{t('expenseDetails.task')}</label>
                <TasksSelect
                  id="edit-expense-task"
                  tasks={tasks}
                  value={editedExpense.task_id || ''}
                  onChange={(e) => setEditedExpense({ ...editedExpense, task_id: e.target.value })}
                  required={false}
                  className="expense-input"
                />
              </div>
              <div className="expense-detail-item">
                <label className="expense-detail-label" htmlFor="edit-expense-comment">{t('expenseDetails.comment')}</label>
                <textarea
                  id="edit-expense-comment"
                  className="expense-input expense-textarea"
                  value={editedExpense.comment}
                  onChange={(e) => setEditedExpense({ ...editedExpense, comment: e.target.value })}
                  rows="4"
                  placeholder={isCreateMode ? t('expenseDetails.commentPlaceholder') : ""}
                />
              </div>
              <div className="expense-detail-item">
                <label className="expense-detail-label">{t('expenseDetails.items')}</label>
                <div className="items-container">
                  <div className="items-add-section">
                    <div className="items-select-container" ref={itemSelectRef}>
                      <button
                        type="button"
                        className="items-select-button"
                        onClick={() => setIsItemSelectOpen(!isItemSelectOpen)}
                      >
                        <span>{t('expenseDetails.selectItemToAdd')}</span>
                        <span className="items-select-arrow">{isItemSelectOpen ? '▲' : '▼'}</span>
                      </button>
                      {isItemSelectOpen && (
                        <div className="items-select-dropdown">
                          <div className="items-select-search-container">
                            <input
                              type="text"
                              className="items-select-search-input"
                              placeholder={t('expenseDetails.searchItems')}
                              value={itemSearchQuery}
                              onChange={(e) => setItemSearchQuery(e.target.value)}
                              autoFocus
                            />
                            <button
                              type="button"
                              className="items-create-button-small"
                              onClick={handleOpenCreateItemDialog}
                              title={t('items.createItem')}
                            >
                              {t('expenseDetails.newItem')}
                            </button>
                          </div>
                          <div className="items-select-options">
                            {getAvailableItemsForSelection().length > 0 ? (
                              getAvailableItemsForSelection().map(item => (
                                <div
                                  key={item.id}
                                  className="items-select-option"
                                  onClick={() => handleAddItem(item.id)}
                                >
                                  {item.name} {item.unit_of_measurement ? `(${item.unit_of_measurement})` : ''}
                                </div>
                              ))
                            ) : (
                              <div className="items-select-empty">
                                {itemSearchQuery ? t('expenseDetails.noItemsFound') : t('expenseDetails.noItemsAvailable')}
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                  {editedExpense.items && editedExpense.items.length > 0 ? (
                    <div className="items-list">
                      {editedExpense.items.map((item, index) => (
                        <div key={`${item.id}-${index}`} className="item-row">
                          <div className="item-info">
                            <span className="item-name">{item.name}</span>
                            <span className="item-unit">{item.unit_of_measurement}</span>
                          </div>
                          <button
                            type="button"
                            className="item-remove-btn"
                            onClick={() => handleRemoveItem(index)}
                          >
                            {t('common.remove')}
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <span className="expense-detail-value" style={{ marginTop: '12px', color: '#999' }}>
                      {t('expenseDetails.noItemsAdded')}
                    </span>
                  )}
                </div>
              </div>
              <div className="expense-detail-item">
                <label className="expense-detail-label">{t('expenseDetails.photos')}</label>
                <div className="photo-upload-container">
                  <input
                    type="file"
                    id="expense-photo"
                    accept="image/*"
                    multiple
                    onChange={handlePhotoSelect}
                    style={{ display: 'none' }}
                  />
                  <label htmlFor="expense-photo" className="photo-select-button">
                    {t('expenseDetails.addPhotos')}
                  </label>
                  {photoPreviews.length > 0 && (
                    <div className="photos-preview-list">
                      {photoPreviews.map((preview, index) => {
                        const isUploaded = uploadedPhotoIndices.has(index);
                        return (
                          <div key={index} className="photo-preview-container">
                            <div className="photo-preview-wrapper">
                              <img src={preview} alt={`Preview ${index + 1}`} className="photo-preview" />
                              {isUploaded && (
                                <div className="photo-uploaded-icon">
                                  ✓
                                </div>
                              )}
                            </div>
                            <div className="photo-preview-actions">
                              <button
                                type="button"
                                className="photo-upload-btn"
                                onClick={() => handleUploadPhoto(index)}
                                disabled={isUploaded}
                              >
                                {isUploaded ? t('common.uploaded') : t('common.upload')}
                              </button>
                              <button
                                type="button"
                                className="photo-remove-btn"
                                onClick={() => handleRemovePhoto(index)}
                              >
                                {t('common.remove')}
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>
            </form>
        ) : expense ? (
          <>
            <div className="dialog-body">
              <div className="expense-detail-item">
                <span className="expense-detail-label">{t('expenseDetails.id')}</span>
                <span className="expense-detail-value expense-id-value">{expense.id}</span>
              </div>
              <div className="expense-detail-item">
                <span className="expense-detail-label">{t('expenseDetails.name')}:</span>
                <span className="expense-detail-value">{expense.name}</span>
              </div>
              <div className="expense-detail-item">
                <span className="expense-detail-label">{t('expenseDetails.project')}</span>
                <span className="expense-detail-value">
                  {expense.project?.name || projectId || t('common.noData')}
                </span>
              </div>
              <div className="expense-detail-item">
                <span className="expense-detail-label">{t('expenseDetails.expenseType')}:</span>
                <span className={`expense-type-badge expense-type-${expense.expense_type?.toLowerCase()}`}>
                  {expense.expense_type ? t(`expenseTypes.${expense.expense_type}`) : expense.expense_type}
                </span>
              </div>
              <div className="expense-detail-item">
                <span className="expense-detail-label">{t('expenseDetails.expenseClass')}:</span>
                <span className={`expense-class-badge expense-class-${expense.expense_class?.toLowerCase()}`}>
                  {expense.expense_class ? t(`expenseClasses.${expense.expense_class}`) : expense.expense_class}
                </span>
              </div>
              <div className="expense-detail-item">
                <span className="expense-detail-label">{t('expenseDetails.value')}:</span>
                <span className="expense-detail-value expense-value-value">
                  {formatCurrency(expense.value)}
                </span>
              </div>
              <div className="expense-detail-item">
                <span className="expense-detail-label">{t('expenseDetails.task')}:</span>
                <span className="expense-detail-value">
                  {expense.task?.name || (expense.task_id ? t('common.noData') : t('expenseDetails.noTaskAssigned'))}
                </span>
              </div>
              <div className="expense-detail-item">
                <span className="expense-detail-label">{t('expenseDetails.comment')}:</span>
                <span className="expense-detail-value">
                  {expense.comment || t('common.noData')}
                </span>
              </div>
              <div className="expense-detail-item">
                <span className="expense-detail-label">{t('expenseDetails.items')}:</span>
                {expense.items && expense.items.length > 0 ? (
                  <div className="items-list">
                    {expense.items.map((item, index) => (
                      <div key={item.id || index} className="item-row">
                        <div className="item-info">
                          <span className="item-name">{item.name}</span>
                          <span className="item-unit">{item.unit_of_measurement}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <span className="expense-detail-value">{t('expenseDetails.noItems')}</span>
                )}
              </div>
              <div className="expense-detail-item">
                <span className="expense-detail-label">{t('expenseDetails.photos')}:</span>
                {expense.files && expense.files.length > 0 ? (
                  <div className="expense-files">
                    {expense.files.map((fileId, index) => {
                      const imageUrl = fileUrls[fileId];
                      const isLoading = loadingFiles[fileId];
                      
                      return (
                        <div key={fileId || index} className="expense-file-item">
                          {isLoading ? (
                            <div className="expense-file-loading">
                              <div className="expense-file-loading-spinner"></div>
                              <p>{t('expenseDetails.loading')}</p>
                            </div>
                          ) : imageUrl ? (
                            <img 
                              src={imageUrl} 
                              alt={`${t('expenseDetails.expenseDetails')} ${index + 1}`}
                              onClick={() => openImageModal(imageUrl)}
                              onError={(e) => {
                                e.target.src = 'https://via.placeholder.com/300x200?text=Image+Not+Found';
                              }}
                            />
                          ) : (
                            <div className="expense-file-error">
                              <p>{t('expenseDetails.failedToLoadImage')}</p>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <span className="expense-detail-value">{t('expenseDetails.noPhotos')}</span>
                )}
              </div>
            </div>
          </>
        ) : null}
      </Dialog>
      {/* Item Details Dialog */}
      <ItemDetailsDialog
        isOpen={isItemDialogOpen}
        item={null}
        onClose={handleCloseItemDialog}
        onUpdate={handleItemUpdate}
        onDelete={handleItemDelete}
        onCreate={handleItemCreate}
      />
    </>
  );
}

export default ExpenseDetailsDialog;

