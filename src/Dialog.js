import React from 'react';
import './Dialog.css';

function Dialog({ isOpen, title, onClose, children, maxWidth = '600px', footerButtons = [] }) {
  if (!isOpen) {
    return null;
  }

  const getButtonClassName = (type) => {
    switch (type) {
      case 'delete':
        return 'dialog-delete-btn';
      case 'edit':
        return 'dialog-edit-btn';
      case 'close':
        return 'dialog-close-btn';
      case 'cancel':
        return 'dialog-cancel-btn';
      case 'save':
        return 'dialog-close-btn';
      default:
        return 'dialog-close-btn';
    }
  };

  const getButtonLabel = (button) => {
    if (button.label) {
      return button.label;
    }
    switch (button.type) {
      case 'delete':
        return 'Delete';
      case 'edit':
        return 'Edit';
      case 'close':
        return 'Close';
      case 'cancel':
        return 'Cancel';
      case 'save':
        return 'Save';
      default:
        return button.type;
    }
  };

  return (
    <div className="generic-dialog-overlay" onClick={onClose}>
      <div 
        className="generic-dialog-content"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="dialog-header">
          <h2>{title}</h2>
          <button className="dialog-close-button" onClick={onClose}>×</button>
        </div>
        <div className="dialog-body-wrapper">
          {children}
        </div>
        {footerButtons.length > 0 && (
          <div className="dialog-footer">
            {footerButtons.map((button, index) => {
              if (button.show === false) {
                return null;
              }
              const buttonType = button.formSubmit ? 'submit' : 'button';
              return (
                <button
                  key={index}
                  type={buttonType}
                  className={getButtonClassName(button.type)}
                  onClick={button.onClick}
                  form={button.formId}
                >
                  {getButtonLabel(button)}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export default Dialog;

