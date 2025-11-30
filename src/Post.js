import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams } from 'react-router-dom';
import TaskDetailsDialog from './TaskDetailsDialog';
import { checkAuthError } from './apiUtils';
import { API_BASE_URL } from './config';
import './Post.css';

function Post({ post }) {
  const { notes, status, progress, files = [], task, created_at, created_by, source, type } = post;
  const { projectId } = useParams();
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [isSourceModalOpen, setIsSourceModalOpen] = useState(false);
  const [isTaskDetailsDialogOpen, setIsTaskDetailsDialogOpen] = useState(false);
  const [fileUrls, setFileUrls] = useState({});
  const [loadingFiles, setLoadingFiles] = useState({});
  const [selectedImageUrl, setSelectedImageUrl] = useState(null);
  const fileUrlsRef = useRef({});

  const formatDate = (dateString) => {
    if (!dateString) return 'Not set';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  const formatDateTime = (dateString) => {
    if (!dateString) return 'Not set';
    const date = new Date(dateString);
    return date.toLocaleString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const openTaskModal = () => {
    setIsTaskModalOpen(true);
  };

  const closeTaskModal = () => {
    setIsTaskModalOpen(false);
  };

  const openSourceModal = () => {
    if (type === 'TASK_HISTORY' && source) {
      setIsTaskDetailsDialogOpen(true);
    } else {
      setIsSourceModalOpen(true);
    }
  };

  const closeSourceModal = () => {
    setIsSourceModalOpen(false);
  };

  const closeTaskDetailsDialog = () => {
    setIsTaskDetailsDialogOpen(false);
  };

  const openImageModal = (imageUrl) => {
    setSelectedImageUrl(imageUrl);
  };

  const closeImageModal = () => {
    setSelectedImageUrl(null);
  };

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

      // Assuming the API returns a blob or the image data
      // If it returns JSON with a URL, adjust accordingly
      const blob = await response.blob();
      const imageUrl = URL.createObjectURL(blob);
      return imageUrl;
    } catch (err) {
      console.error(`Error fetching file ${fileId}:`, err);
      return null;
    }
  }, []);

  const fetchFilesSequentially = useCallback(async () => {
    if (!files || files.length === 0) return;

    // Reset state
    setFileUrls({});
    setLoadingFiles({});

    // Fetch files one at a time
    for (let i = 0; i < files.length; i++) {
      const fileId = files[i];
      
      // Mark as loading
      setLoadingFiles(prev => ({ ...prev, [fileId]: true }));
      
      // Fetch the file
      const imageUrl = await fetchFileDocument(fileId);
      
      // Update state with the result
      if (imageUrl) {
        setFileUrls(prev => {
          const newUrls = { ...prev, [fileId]: imageUrl };
          fileUrlsRef.current = newUrls;
          return newUrls;
        });
      }
      
      // Mark as not loading
      setLoadingFiles(prev => {
        const newState = { ...prev };
        delete newState[fileId];
        return newState;
      });
    }
  }, [files, fetchFileDocument]);

  useEffect(() => {
    if (files && files.length > 0) {
      fetchFilesSequentially();
    }

    // Cleanup: revoke object URLs when component unmounts or files change
    return () => {
      Object.values(fileUrlsRef.current).forEach(url => {
        if (url && url.startsWith('blob:')) {
          URL.revokeObjectURL(url);
        }
      });
      fileUrlsRef.current = {};
    };
  }, [files, fetchFilesSequentially]);

  const renderSourceContent = () => {
    if (type === 'TASK_HISTORY') {
      return (
        <div className="source-modal-content">
          {/* TASK_HISTORY content will be added here */}
        </div>
      );
    }
    // Add other types here in the future
    return null;
  };

  return (
    <>
      <div className="post-container">
        <div className="post-meta">
          {created_by && (
            <div className="post-author">
              <span className="post-author-label">Posted by:</span>
              <span className="post-author-name">{created_by.name || 'Unknown'}</span>
            </div>
          )}
          {created_at && (
            <div className="post-date">
              <span className="post-date-label">Posted on:</span>
              <span className="post-date-value">{formatDateTime(created_at)}</span>
            </div>
          )}
        </div>
        
        <div className="post-header">
          <div className="post-status">
            <span className={`status-badge status-${status?.toLowerCase() || 'pending'}`}>
              {status || 'Pending'}
            </span>
          </div>
          <div className="post-progress">
            <div className="progress-label">Progress: {progress || 0}%</div>
            <div className="progress-bar">
              <div 
                className="progress-fill" 
                style={{ width: `${progress || 0}%` }}
              ></div>
            </div>
          </div>
        </div>
        
        <div className="post-notes">
          <p>{notes || 'No notes provided'}</p>
        </div>
        
        {source && (
          <div className="post-task-section">
            <div className="task-name-display">
              <span className="task-name-label">Task:</span>
              <span className="task-name-value">{source.name || 'Unnamed Task'}</span>
            </div>
            <button className="task-dates-button" onClick={openSourceModal}>
              View Details
            </button>
          </div>
        )}
      
      {files && files.length > 0 && (
        <div className="post-files">
          {files.map((fileId, index) => {
            const imageUrl = fileUrls[fileId];
            const isLoading = loadingFiles[fileId];
            
            return (
              <div key={fileId || index} className="file-item">
                {isLoading ? (
                  <div className="file-loading">
                    <div className="file-loading-spinner"></div>
                    <p>Loading...</p>
                  </div>
                ) : imageUrl ? (
                  <img 
                    src={imageUrl} 
                    alt={`Post file ${index + 1}`}
                    onClick={() => openImageModal(imageUrl)}
                    onError={(e) => {
                      e.target.src = 'https://via.placeholder.com/300x200?text=Image+Not+Found';
                    }}
                  />
                ) : (
                  <div className="file-error">
                    <p>Failed to load image</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
      </div>

      {isTaskModalOpen && task && (
        <div className="modal-overlay" onClick={closeTaskModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">{task.name || 'Task Details'}</h2>
              <button className="modal-close-button" onClick={closeTaskModal}>×</button>
            </div>
            <div className="modal-body">
              <div className="task-dates">
                <div className="task-date-group">
                  <div className="task-date-row">
                    <span className="task-date-label">Planned Start:</span>
                    <span className="task-date-value">{formatDate(task.plannedStartDate)}</span>
                  </div>
                  <div className="task-date-row">
                    <span className="task-date-label">Planned End:</span>
                    <span className="task-date-value">{formatDate(task.plannedEndDate)}</span>
                  </div>
                </div>
                <div className="task-date-group">
                  <div className="task-date-row">
                    <span className="task-date-label">Actual Start:</span>
                    <span className="task-date-value">{formatDate(task.actualStartDate)}</span>
                  </div>
                  <div className="task-date-row">
                    <span className="task-date-label">Actual End:</span>
                    <span className="task-date-value">{formatDate(task.actualEndDate)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {isSourceModalOpen && source && type !== 'TASK_HISTORY' && (
        <div className="modal-overlay" onClick={closeSourceModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">{source.name || 'Source Information'}</h2>
              <button className="modal-close-button" onClick={closeSourceModal}>×</button>
            </div>
            <div className="modal-body">
              {renderSourceContent()}
            </div>
          </div>
        </div>
      )}

      {isTaskDetailsDialogOpen && type === 'TASK_HISTORY' && source && (
        <TaskDetailsDialog
          isOpen={isTaskDetailsDialogOpen}
          task={source}
          onClose={closeTaskDetailsDialog}
          onUpdate={() => {}}
          onDelete={() => {}}
          projectId={projectId}
        />
      )}

      {selectedImageUrl && (
        <div className="image-modal-overlay" onClick={closeImageModal}>
          <div className="image-modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="image-modal-close" onClick={closeImageModal}>×</button>
            <img 
              src={selectedImageUrl} 
              alt="Full size"
              className="image-modal-image"
            />
          </div>
        </div>
      )}
    </>
  );
}

export default Post;

