import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import './GenericScreen.css';

function GenericScreen({ 
  title, 
  backPath, 
  optionsMenu = [],
  children 
}) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (isMenuOpen && !e.target.closest('.generic-screen-options-menu-container')) {
        setIsMenuOpen(false);
      }
    };

    if (isMenuOpen) {
      document.addEventListener('click', handleClickOutside);
    }

    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, [isMenuOpen]);

  const handleBackClick = () => {
    if (backPath) {
      navigate(backPath);
    }
  };

  return (
    <div className="generic-screen-container">
      <div className="generic-screen-content">
        {backPath && (
          <button 
            className="generic-screen-back-button"
            onClick={handleBackClick}
          >
            {t('common.back')}
          </button>
        )}
        
        {optionsMenu.length > 0 && (
          <div className="generic-screen-options-menu-container">
            <button 
              className="generic-screen-options-menu-button"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
            >
              ☰
            </button>
            {isMenuOpen && (
              <div className="generic-screen-options-menu-dropdown">
                {optionsMenu.map((option, index) => (
                  <button
                    key={index}
                    className="generic-screen-options-menu-item"
                    onClick={() => {
                      if (option.onClick) {
                        option.onClick();
                      }
                      setIsMenuOpen(false);
                    }}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {title && (
          <h1>{title}</h1>
        )}

        <div className="generic-screen-body">
          {children}
        </div>
      </div>
    </div>
  );
}

export default GenericScreen;

