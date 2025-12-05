import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { checkAuthError } from './apiUtils';
import { API_BASE_URL } from './config';
import TasksSelect from './TasksSelect';
import Dialog from './Dialog';
import './DailyReport.css';

function DailyReport({ isOpen, onClose, tasks, onSuccess }) {
  const { t } = useTranslation();
  // Flatten tasks recursively to include all children
  const flattenTasks = useMemo(() => {
    const flatten = (taskList) => {
      const result = [];
      for (const task of taskList) {
        result.push(task);
        if (task.children && Array.isArray(task.children) && task.children.length > 0) {
          result.push(...flatten(task.children));
        }
      }
      return result;
    };
    return flatten(tasks || []);
  }, [tasks]);
  const [taskHistory, setTaskHistory] = useState({
    task_id: '',
    progress: '0',
    status: 'TODO',
    comment: '',
    files: []
  });
  const [selectedPhotos, setSelectedPhotos] = useState([]);
  const [photoPreviews, setPhotoPreviews] = useState([]);
  const [uploadedPhotoIndices, setUploadedPhotoIndices] = useState(new Set());
  const [photoIndexToFileId, setPhotoIndexToFileId] = useState(new Map());

  useEffect(() => {
    if (!isOpen) {
      // Reset state when dialog closes
      setTaskHistory({
        task_id: '',
        progress: '0',
        status: 'TODO',
        comment: '',
        files: []
      });
      setSelectedPhotos([]);
      setPhotoPreviews([]);
      setUploadedPhotoIndices(new Set());
      setPhotoIndexToFileId(new Map());
    }
  }, [isOpen]);

  const handleClose = useCallback(() => {
    setTaskHistory({
      task_id: '',
      progress: '0',
      status: 'TODO',
      comment: '',
      files: []
    });
    setSelectedPhotos([]);
    setPhotoPreviews([]);
    setUploadedPhotoIndices(new Set());
    setPhotoIndexToFileId(new Map());
    onClose();
  }, [onClose]);

  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && isOpen) {
        handleClose();
      }
    };
    
    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }
    
    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, handleClose]);

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
    if (!selectedPhotos[photoIndex] || !taskHistory.task_id) {
      alert(t('dailyReport.selectTaskAndPhoto'));
      return;
    }

    try {
      const token = localStorage.getItem('access_token');
      
      if (!token) {
        throw new Error(t('errors.noAccessToken'));
      }

    console.log("taskHistory", taskHistory)
      const selectedTask = flattenTasks.find(task => task.id === taskHistory.task_id);

      const formData = new FormData();
      formData.append('file', selectedPhotos[photoIndex]);
      formData.append('workspace_id', selectedTask.workspace.id);

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
        throw new Error(t('dailyReport.errorUploadingPhoto', { status: response.status, statusText: response.statusText }));
      }

      const responseData = await response.json();
      
      // Photo uploaded successfully - mark it as uploaded and add file ID to taskHistory
      setUploadedPhotoIndices(prev => new Set([...prev, photoIndex]));
      
      if (responseData.id) {
        // Store mapping of photo index to file ID
        setPhotoIndexToFileId(prev => new Map(prev).set(photoIndex, responseData.id));
        
        setTaskHistory(prev => ({
          ...prev,
          files: [...prev.files, responseData.id]
        }));
      }
    } catch (err) {
      console.error('Error uploading photo:', err);
      alert(err.message || t('dailyReport.errorUploadingPhotoGeneric'));
    }
  };

  const handleRemovePhoto = (photoIndex) => {
    // If photo was uploaded, remove its file ID from taskHistory.files
    const wasUploaded = uploadedPhotoIndices.has(photoIndex);
    if (wasUploaded) {
      const fileId = photoIndexToFileId.get(photoIndex);
      if (fileId) {
        setTaskHistory(prev => ({
          ...prev,
          files: prev.files.filter(id => id !== fileId)
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

  const handleCreateTaskHistory = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('access_token');
      
      if (!token) {
        throw new Error(t('errors.noAccessToken'));
      }

      const taskHistoryData = {
        progress: parseFloat(taskHistory.progress) || 0,
        status: taskHistory.status,
        notes: taskHistory.comment || '',
        files: taskHistory.files || []
      };

      const response = await fetch(`${API_BASE_URL}/api/tasks/${taskHistory.task_id}/history`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(taskHistoryData),
      });

      if (!response.ok) {
        if (checkAuthError(response)) {
          return;
        }
        throw new Error(t('dailyReport.errorCreatingWithStatus', { status: response.status, statusText: response.statusText }));
      }

      // Close dialog and notify parent
      handleClose();
      if (onSuccess) {
        onSuccess();
      }
    } catch (err) {
      console.error('Error creating task history:', err);
      alert(err.message || t('dailyReport.errorCreating'));
    }
  };

  const formId = 'daily-report-form';
  const footerButtons = [
    {
      type: 'cancel',
      onClick: handleClose
    },
    {
      type: 'save',
      label: t('dailyReport.createTaskHistory'),
      formSubmit: true,
      formId: formId
    }
  ];

  return (
    <Dialog
      isOpen={isOpen}
      title={t('dailyReport.title')}
      onClose={handleClose}
      footerButtons={footerButtons}
    >
      <form id={formId} onSubmit={handleCreateTaskHistory}>
        <div className="dialog-body">
          <div className="task-detail-item">
            <label className="task-detail-label" htmlFor="task-history-task">{t('dailyReport.task')} *</label>
            <TasksSelect
              id="task-history-task"
              tasks={tasks}
              value={taskHistory.task_id}
              onChange={(e) => {
                const selectedTaskId = e.target.value;
                const selectedTask = flattenTasks.find(task => task.id === selectedTaskId);
                console.log("selectedTask", selectedTask)
                
                setTaskHistory({
                  ...taskHistory,
                  task_id: selectedTaskId,
                  progress: selectedTask ? String(selectedTask.progress || 0) : '0',
                  status: selectedTask ? selectedTask.status || 'TODO' : 'TODO'
                });
              }}
              required
            />
          </div>
          
          <div className="task-detail-item">
            <label className="task-detail-label" htmlFor="task-history-status">{t('dailyReport.status')}</label>
            <select
              id="task-history-status"
              className="task-input"
              value={taskHistory.status}
              onChange={(e) => {
                const newStatus = e.target.value;
                setTaskHistory({ 
                  ...taskHistory, 
                  status: newStatus,
                  progress: newStatus === 'DONE' ? '100' : taskHistory.progress
                });
              }}
            >
              <option value="TODO">{t('taskDetails.notStarted')}</option>
              <option value="IN_PROGRESS">{t('taskDetails.inProgress')}</option>
              <option value="DONE">{t('taskDetails.completed')}</option>
            </select>
          </div>
          <div className="task-detail-item">
            <label className="task-detail-label" htmlFor="task-history-progress">
              {t('dailyReport.progress', { progress: taskHistory.progress || '0' })}
            </label>
            <input
              type="range"
              id="task-history-progress"
              className="progress-slider"
              value={taskHistory.progress || '0'}
              onChange={(e) => setTaskHistory({ ...taskHistory, progress: e.target.value })}
              min="0"
              max="100"
              step="1"
            />
          </div>
          <div className="task-detail-item">
            <label className="task-detail-label" htmlFor="task-history-comment">{t('dailyReport.comment')}</label>
            <textarea
              id="task-history-comment"
              className="task-input"
              value={taskHistory.comment}
              onChange={(e) => setTaskHistory({ ...taskHistory, comment: e.target.value })}
              rows="4"
              placeholder={t('dailyReport.commentPlaceholder')}
            />
          </div>
          <div className="task-detail-item">
            <label className="task-detail-label">{t('dailyReport.photos')}</label>
            <div className="photo-upload-container">
              <input
                type="file"
                id="task-history-photo"
                accept="image/*"
                multiple
                onChange={handlePhotoSelect}
                style={{ display: 'none' }}
              />
              <label htmlFor="task-history-photo" className="photo-select-button">
                {t('dailyReport.addPhotos')}
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
                            disabled={!taskHistory.task_id || isUploaded}
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
    </Dialog>
  );
}

export default DailyReport;

