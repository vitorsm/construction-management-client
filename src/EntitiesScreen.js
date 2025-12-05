import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { checkAuthError } from './apiUtils';
import { API_BASE_URL } from './config';
import MultiSelect from './MultiSelect';
import EntityTable from './EntityTable';
import GenericScreen from './GenericScreen';
import './EntitiesScreen.css';

function EntitiesScreen({
  title,
  entityName,
  backPath,
  fetchEntities,
  filterConfig = [],
  tableConfig,
  summaryConfig,
  createButtonText,
  onCreateClick,
  detailsDialog: DetailsDialog,
  detailsDialogProps = {},
  emptyMessage,
  noFilterMatchMessage,
  loadingMessage,
  errorMessage,
  filterEntities,
  projectId: propProjectId,
  tableComponent: TableComponent,
}) {
  const { t } = useTranslation();
  const { projectId: paramProjectId } = useParams();
  const projectId = propProjectId || paramProjectId;
  
  const [project, setProject] = useState(null);
  const [entities, setEntities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const [selectedEntity, setSelectedEntity] = useState(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  
  // Filter states
  const [showFilters, setShowFilters] = useState(false);
  const [filterStates, setFilterStates] = useState({});

  // Initialize filter states from filterConfig
  useEffect(() => {
    const initialFilterStates = {};
    filterConfig.forEach(filter => {
      if (filter.stateKey) {
        if (filter.type === 'date-range') {
          initialFilterStates[filter.stateKey + '_from'] = '';
          initialFilterStates[filter.stateKey + '_to'] = '';
        } else {
          initialFilterStates[filter.stateKey] = filter.initialValue || [];
        }
      }
    });
    setFilterStates(initialFilterStates);
  }, [filterConfig]);

  const fetchProject = useCallback(async () => {
    try {
      const token = localStorage.getItem('access_token');
      
      if (!token) {
        throw new Error(t('errors.noAccessToken'));
      }

      const response = await fetch(`${API_BASE_URL}/api/projects/${projectId}`, {
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
        throw new Error(t('entitiesScreen.failedToFetchProject', { status: response.status, statusText: response.statusText }));
      }

      const data = await response.json();
      setProject(data);
    } catch (err) {
      console.error('Error fetching project:', err);
    }
  }, [projectId, t]);

  const loadEntities = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const data = await fetchEntities(projectId);
      setEntities(data || []);
    } catch (err) {
      setError(err.message || errorMessage || t('entities.error'));
      console.error(`Error fetching ${entityName}:`, err);
    } finally {
      setLoading(false);
    }
  }, [fetchEntities, projectId, entityName, errorMessage, t]);

  useEffect(() => {
    fetchProject();
    loadEntities();
  }, [fetchProject, loadEntities]);

  const handleEntityClick = (entity) => {
    setSelectedEntity(entity);
    setIsDialogOpen(true);
  };

  const handleOpenCreateDialog = () => {
    setSelectedEntity(null);
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setSelectedEntity(null);
  };

  const handleEntityCreate = async () => {
    await loadEntities();
  };

  const handleEntityUpdate = async () => {
    await loadEntities();
  };

  const handleEntityDelete = async () => {
    await loadEntities();
  };

  const handleClearFilters = () => {
    const clearedStates = {};
    filterConfig.forEach(filter => {
      if (filter.stateKey) {
        if (filter.type === 'date-range') {
          clearedStates[filter.stateKey + '_from'] = '';
          clearedStates[filter.stateKey + '_to'] = '';
        } else {
          clearedStates[filter.stateKey] = filter.initialValue || [];
        }
      }
    });
    setFilterStates(clearedStates);
  };

  const hasActiveFilters = () => {
    return filterConfig.some(filter => {
      if (!filter.stateKey) return false;
      if (filter.type === 'date-range') {
        const fromValue = filterStates[filter.stateKey + '_from'];
        const toValue = filterStates[filter.stateKey + '_to'];
        return (fromValue !== '' && fromValue !== null && fromValue !== undefined) ||
               (toValue !== '' && toValue !== null && toValue !== undefined);
      }
      const value = filterStates[filter.stateKey];
      if (Array.isArray(value)) {
        return value.length > 0;
      }
      return value !== '' && value !== null && value !== undefined;
    });
  };

  const handleRefresh = () => {
    loadEntities();
  };

  // Filter entities based on active filters
  const filteredEntities = filterEntities 
    ? filterEntities(entities, filterStates)
    : entities;

  const updateFilterState = (stateKey, value) => {
    setFilterStates(prev => ({
      ...prev,
      [stateKey]: value
    }));
  };

  const screenTitle = project ? `${project.name} - ${title}` : title;
  const finalBackPath = backPath || `/projects/${projectId}/dashboard`;

  return (
    <>
      <GenericScreen
        title={screenTitle}
        backPath={finalBackPath}
      >
        {/* Filter Toggle Button */}
        {filterConfig.length > 0 && (
          <div className="entities-filter-toggle-container">
            <button
              className="entities-filter-toggle-button"
              onClick={() => setShowFilters(!showFilters)}
            >
              {showFilters ? t('entitiesScreen.hideFilters') : t('entitiesScreen.showFilters')}
            </button>
          </div>
        )}
        
        {/* Filter Section */}
        {showFilters && filterConfig.length > 0 && (
          <div className="entities-filter-section">
            {filterConfig.map((filter, index) => (
              <div key={index} className={`entities-filter-group ${filter.fullWidth ? 'entities-filter-date-group' : ''}`}>
                <label className="entities-filter-label">{filter.label}</label>
                {filter.type === 'multiselect' && (
                  <MultiSelect
                    options={filter.options}
                    selectedValues={filterStates[filter.stateKey] || []}
                    onChange={(value) => updateFilterState(filter.stateKey, value)}
                    placeholder={filter.placeholder}
                    getOptionLabel={filter.getOptionLabel}
                    getOptionValue={filter.getOptionValue}
                  />
                )}
                {filter.type === 'date-range' && (
                  <div className="entities-date-inputs">
                    <div className="entities-date-input-wrapper">
                      <label className="entities-date-label">{t('entitiesScreen.from')}</label>
                      <input
                        type="date"
                        className="entities-date-input"
                        value={filterStates[filter.stateKey + '_from'] || ''}
                        onChange={(e) => updateFilterState(filter.stateKey + '_from', e.target.value)}
                      />
                    </div>
                    <div className="entities-date-input-wrapper">
                      <label className="entities-date-label">{t('entitiesScreen.to')}</label>
                      <input
                        type="date"
                        className="entities-date-input"
                        value={filterStates[filter.stateKey + '_to'] || ''}
                        onChange={(e) => updateFilterState(filter.stateKey + '_to', e.target.value)}
                        min={filterStates[filter.stateKey + '_from'] || undefined}
                      />
                    </div>
                  </div>
                )}
              </div>
            ))}
            
            <div className="entities-filter-actions">
              {hasActiveFilters() && (
                <button
                  className="entities-filter-refresh-button"
                  onClick={handleRefresh}
                  title={t('entities.refreshWithFilters', { entityName })}
                >
                  {t('common.refresh')}
                </button>
              )}
              <button
                className="entities-filter-clear-button"
                onClick={handleClearFilters}
                disabled={!hasActiveFilters()}
              >
                {t('entitiesScreen.clearFilters')}
              </button>
            </div>
          </div>
        )}
        
        <div className="entities-screen-header">
          {summaryConfig && (() => {
            const summaryData = typeof summaryConfig === 'function' 
              ? summaryConfig(entities) 
              : summaryConfig;
            return summaryData && summaryData.length > 0 ? (
              <div className="entities-summary">
                {summaryData.map((summary, index) => (
                  <div key={index} className="entities-summary-item">
                    <span className="entities-summary-label">{summary.label}</span>
                    <span className={`entities-summary-value ${summary.className || ''}`}>
                      {summary.value}
                    </span>
                  </div>
                ))}
              </div>
            ) : null;
          })()}
          {createButtonText && (
            <button 
              className="entities-screen-create-button"
              onClick={handleOpenCreateDialog}
            >
              {createButtonText}
            </button>
          )}
        </div>

        <div className="entities-section">
          {loading ? (
            <div className="entities-loading">{loadingMessage || t('entities.loading', { entityName })}</div>
          ) : error ? (
            <div className="entities-error">{error}</div>
          ) : (
            filteredEntities.length === 0 ? (
              <div className="no-entities">
                {entities.length === 0 
                  ? (emptyMessage || t('entities.noEntities', { entityName }))
                  : (noFilterMatchMessage || t('entities.noFilterMatch', { entityName }))}
              </div>
            ) : (
              // Use custom table component if provided, otherwise check if tableConfig uses EntityTable (columns have 'attribute' property) or renderRows
              TableComponent ? (
                <TableComponent
                  entities={filteredEntities}
                  onRowClick={handleEntityClick}
                  getRowKey={tableConfig?.getRowKey}
                />
              ) : (
                <EntityTable
                  entities={filteredEntities}
                  columns={tableConfig.columns}
                  onRowClick={handleEntityClick}
                  getRowClassName={tableConfig.getRowClassName}
                  getRowKey={tableConfig.getRowKey}
                  tableId={tableConfig.tableId}
                />
              )
            )
          )}
        </div>
      </GenericScreen>

      {/* Details Dialog */}
      {DetailsDialog && (
        <DetailsDialog
          isOpen={isDialogOpen}
          {...detailsDialogProps}
          {...{
            [entityName.slice(0, -1)]: selectedEntity, // e.g., task, expense
            onClose: handleCloseDialog,
            onUpdate: handleEntityUpdate,
            onDelete: handleEntityDelete,
            onCreate: handleEntityCreate,
            projectId: projectId,
          }}
        />
      )}
    </>
  );
}

export default EntitiesScreen;

