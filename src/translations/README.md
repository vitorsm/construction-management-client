# Translation Files

This directory contains translation files for internationalization (i18n) of the application.

## Structure

The translation file (`en.json`) is organized into logical sections:

- **common**: Shared strings used across the application (buttons, labels, etc.)
- **login**: Login screen strings
- **projects**: Projects list and project creation strings
- **projectDetail**: Project dashboard and detail view strings
- **projectScreen**: Project screen navigation strings
- **tasks**: Tasks screen and task-related strings
- **taskDetails**: Task details dialog strings
- **expenses**: Expenses screen strings
- **expenseDetails**: Expense details dialog strings
- **expenseTypes**: Expense type labels
- **expenseClasses**: Expense class labels
- **dailyReport**: Daily report dialog strings
- **feed**: Feed/post-related strings
- **entities**: Generic entity screen strings (with placeholders)
- **entityTable**: Entity table column headers
- **items**: Item management strings
- **multiSelect**: Multi-select component strings
- **tasksSelect**: Task select component strings
- **pieChart**: Pie chart component strings
- **errors**: Error messages
- **status**: Status value labels

## Usage

To use these translations in your React components, you would typically:

1. Install an i18n library (e.g., `react-i18next`, `i18next`)
2. Load the translation file
3. Use translation keys in your components

### Example with react-i18next:

```javascript
import { useTranslation } from 'react-i18next';
import translations from './translations/en.json';

// In your component:
const { t } = useTranslation();
const loginText = t('login.title'); // "Login"
const buttonText = t('common.save'); // "Save"
```

### Example with simple utility:

```javascript
import translations from './translations/en.json';

// Simple helper function
const t = (key) => {
  const keys = key.split('.');
  let value = translations;
  for (const k of keys) {
    value = value?.[k];
  }
  return value || key;
};

// Usage:
const loginText = t('login.title'); // "Login"
```

## Placeholders

Some translation strings include placeholders that should be replaced with actual values:

- `{count}` - For numbers
- `{plural}` - For pluralization (e.g., "s" for plural)
- `{entityName}` - For entity names
- `{taskName}` - For task names
- `{expenseName}` - For expense names
- `{itemName}` - For item names
- `{progress}` - For progress percentages
- `{status}` - For HTTP status codes
- `{statusText}` - For HTTP status text
- `{resource}` - For resource names
- `{error}` - For error messages

### Example with placeholders:

```javascript
// Translation: "Refresh {entityName} with current filters"
const message = t('entities.refreshWithFilters', { entityName: 'tasks' });
// Result: "Refresh tasks with current filters"
```

## Adding New Languages

To add support for a new language:

1. Copy `en.json` to a new file (e.g., `pt.json` for Portuguese, `es.json` for Spanish)
2. Translate all the values while keeping the same keys
3. Update your i18n configuration to include the new language file

## Notes

- All user-facing text strings from the application have been extracted to this file
- Status values and enum-like strings are included for consistency
- Error messages are centralized for easier maintenance
- Some strings may need context-specific adjustments when implementing i18n

