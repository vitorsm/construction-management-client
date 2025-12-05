import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { checkAuthError } from './apiUtils';
import { API_BASE_URL } from './config';
import Dialog from './Dialog';
import './ItemDetailsDialog.css';

function ItemDetailsDialog({ isOpen, item, onClose, onUpdate, onDelete, onCreate }) {
  const { t } = useTranslation();
  const [isEditMode, setIsEditMode] = useState(false);
  const [editedItem, setEditedItem] = useState(null);
  const isCreateMode = !item;

  useEffect(() => {
    if (!isOpen) {
      setIsEditMode(false);
      setEditedItem(null);
    } else if (isCreateMode) {
      // Initialize form for create mode
      setEditedItem({
        name: '',
        unit_of_measurement: ''
      });
      setIsEditMode(true);
    }
  }, [isOpen, isCreateMode]);

  const handleEditItem = () => {
    setIsEditMode(true);
    setEditedItem({
      name: item.name || '',
      unit_of_measurement: item.unit_of_measurement || ''
    });
  };

  const handleCancelEdit = () => {
    setIsEditMode(false);
    setEditedItem(null);
  };

  const handleCreateItem = async (e) => {
    e.preventDefault();
    if (!editedItem) return;

    try {
      const token = localStorage.getItem('access_token');
      
      if (!token) {
        throw new Error('No access token found. Please login again.');
      }

      const itemData = {
        name: editedItem.name,
        unit_of_measurement: editedItem.unit_of_measurement || null,
        workspace: {"id": "f0ae47da-7352-455c-a3ad-02e7fb8d29c9"}
      };

      const response = await fetch(`${API_BASE_URL}/api/items`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(itemData),
      });

      if (!response.ok) {
        if (checkAuthError(response)) {
          return;
        }
        throw new Error(`Failed to create item: ${response.status} ${response.statusText}`);
      }

      // Call onCreate callback to refresh items list
      if (onCreate) {
        await onCreate();
      }
      
      // Close dialog
      setIsEditMode(false);
      setEditedItem(null);
      if (onClose) {
        onClose();
      }
    } catch (err) {
      console.error('Error creating item:', err);
      alert(err.message || t('items.errorCreating'));
    }
  };

  const handleUpdateItem = async (e) => {
    e.preventDefault();
    if (!item || !editedItem) return;

    try {
      const token = localStorage.getItem('access_token');
      
      if (!token) {
        throw new Error('No access token found. Please login again.');
      }

      const itemData = {
        id: item.id,
        name: editedItem.name,
        unit_of_measurement: editedItem.unit_of_measurement || null,
        workspace: {"id": "f0ae47da-7352-455c-a3ad-02e7fb8d29c9"}
      };

      const response = await fetch(`${API_BASE_URL}/api/items/${item.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(itemData),
      });

      if (!response.ok) {
        if (checkAuthError(response)) {
          return;
        }
        throw new Error(`Failed to update item: ${response.status} ${response.statusText}`);
      }

      // Call onUpdate callback to refresh items list
      if (onUpdate) {
        await onUpdate();
      }
      
      // Close dialog
      setIsEditMode(false);
      setEditedItem(null);
      if (onClose) {
        onClose();
      }
    } catch (err) {
      console.error('Error updating item:', err);
      alert(err.message || t('items.errorUpdating'));
    }
  };

  const handleDeleteItem = async () => {
    if (!item) return;
    
    const confirmed = window.confirm(t('items.deleteConfirm', { itemName: item.name }));
    
    if (!confirmed) return;

    try {
      const token = localStorage.getItem('access_token');
      
      if (!token) {
        throw new Error('No access token found. Please login again.');
      }

      const response = await fetch(`${API_BASE_URL}/api/items/${item.id}`, {
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
        throw new Error(`Failed to delete item: ${response.status} ${response.statusText}`);
      }

      // Call onDelete callback to refresh items list
      if (onDelete) {
        await onDelete();
      }
      
      // Close dialog
      if (onClose) {
        onClose();
      }
    } catch (err) {
      console.error('Error deleting item:', err);
      alert(err.message || t('items.errorDeleting'));
    }
  };

  const dialogTitle = isCreateMode ? t('items.createItem') : isEditMode ? t('items.editItem') : t('items.itemDetails');

  // Build footer buttons for edit/create mode
  const editModeFooterButtons = isEditMode && editedItem ? [
    ...(!isCreateMode ? [{ type: 'delete', onClick: handleDeleteItem, show: true }] : []),
    { 
      type: 'cancel', 
      onClick: isCreateMode ? onClose : handleCancelEdit,
      show: true 
    },
    { 
      type: 'save', 
      label: isCreateMode ? t('items.createItem') : t('common.save'),
      formSubmit: true,
      formId: 'item-form',
      onClick: undefined,
      show: true 
    }
  ] : [];

  // Build footer buttons for view mode
  const viewModeFooterButtons = item && !isEditMode ? [
    { type: 'delete', onClick: handleDeleteItem, show: true },
    { type: 'edit', onClick: handleEditItem, show: true }
  ] : [];

  const footerButtons = editModeFooterButtons.length > 0 ? editModeFooterButtons : viewModeFooterButtons;

  return (
    <Dialog 
      isOpen={isOpen} 
      title={dialogTitle} 
      onClose={onClose}
      footerButtons={footerButtons}
    >
      {isEditMode && editedItem ? (
          <form id="item-form" onSubmit={isCreateMode ? handleCreateItem : handleUpdateItem}>
            <div className="dialog-body">
              {!isCreateMode && (
                <div className="task-detail-item">
                  <span className="task-detail-label">{t('items.id')}</span>
                  <span className="task-detail-value task-id-value">{item.id}</span>
                </div>
              )}
              <div className="task-detail-item">
                <label className="task-detail-label" htmlFor="edit-item-name">{t('items.name')} *</label>
                <input
                  type="text"
                  id="edit-item-name"
                  className="task-input"
                  value={editedItem.name}
                  onChange={(e) => setEditedItem({ ...editedItem, name: e.target.value })}
                  required
                  placeholder={isCreateMode ? t('items.namePlaceholder') : ""}
                />
              </div>
              <div className="task-detail-item">
                <label className="task-detail-label" htmlFor="edit-item-unit">{t('items.unitOfMeasurement')}</label>
                <input
                  type="text"
                  id="edit-item-unit"
                  className="task-input"
                  value={editedItem.unit_of_measurement}
                  onChange={(e) => setEditedItem({ ...editedItem, unit_of_measurement: e.target.value })}
                  placeholder={isCreateMode ? t('items.unitPlaceholder') : ""}
                />
              </div>
            </div>
          </form>
        ) : item ? (
          <>
            <div className="dialog-body">
              <div className="task-detail-item">
                <span className="task-detail-label">{t('items.id') || 'ID:'}</span>
                <span className="task-detail-value task-id-value">{item.id}</span>
              </div>
              <div className="task-detail-item">
                <span className="task-detail-label">{t('items.name')}:</span>
                <span className="task-detail-value">{item.name}</span>
              </div>
              <div className="task-detail-item">
                <span className="task-detail-label">{t('items.unitOfMeasurement')}:</span>
                <span className="task-detail-value">{item.unit_of_measurement || t('common.noData')}</span>
              </div>
            </div>
          </>
        ) : null}
    </Dialog>
  );
}

export default ItemDetailsDialog;

