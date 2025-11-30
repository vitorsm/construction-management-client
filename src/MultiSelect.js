import React, { useState, useRef, useEffect } from 'react';
import './MultiSelect.css';

function MultiSelect({ options, selectedValues, onChange, placeholder = "Select options...", getOptionLabel, getOptionValue }) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleToggle = () => {
    setIsOpen(!isOpen);
  };

  const handleOptionClick = (option) => {
    const value = getOptionValue ? getOptionValue(option) : option;
    const isSelected = selectedValues.includes(value);
    
    if (isSelected) {
      onChange(selectedValues.filter(v => v !== value));
    } else {
      onChange([...selectedValues, value]);
    }
  };

  const handleRemove = (e, value) => {
    e.stopPropagation();
    onChange(selectedValues.filter(v => v !== value));
  };

  const getLabel = (option) => {
    if (getOptionLabel) {
      return getOptionLabel(option);
    }
    return typeof option === 'object' ? option.name || option.label : option;
  };

  const getValue = (option) => {
    if (getOptionValue) {
      return getOptionValue(option);
    }
    return typeof option === 'object' ? option.id || option.value : option;
  };

  const selectedOptions = options.filter(opt => selectedValues.includes(getValue(opt)));

  return (
    <div className="multi-select-container" ref={dropdownRef}>
      <div 
        className={`multi-select-input ${isOpen ? 'multi-select-open' : ''}`}
        onClick={handleToggle}
      >
        <div className="multi-select-selected">
          {selectedOptions.length === 0 ? (
            <span className="multi-select-placeholder">{placeholder}</span>
          ) : (
            <div className="multi-select-chips">
              {selectedOptions.map((option) => {
                const value = getValue(option);
                const label = getLabel(option);
                return (
                  <span key={value} className="multi-select-chip">
                    {label}
                    <button
                      type="button"
                      className="multi-select-chip-remove"
                      onClick={(e) => handleRemove(e, value)}
                    >
                      ×
                    </button>
                  </span>
                );
              })}
            </div>
          )}
        </div>
        <span className="multi-select-arrow">{isOpen ? '▲' : '▼'}</span>
      </div>
      
      {isOpen && (
        <div className="multi-select-dropdown">
          {options.length === 0 ? (
            <div className="multi-select-empty">No options available</div>
          ) : (
            options.map((option) => {
              const value = getValue(option);
              const label = getLabel(option);
              const isSelected = selectedValues.includes(value);
              return (
                <div
                  key={value}
                  className={`multi-select-option ${isSelected ? 'multi-select-option-selected' : ''}`}
                  onClick={() => handleOptionClick(option)}
                >
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => {}} // Handled by parent div onClick
                    readOnly
                  />
                  <span>{label}</span>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}

export default MultiSelect;

