import { memo } from 'react';
import { BUSINESS_CONFIGS } from '../config/businessConfigs.js';

// Превключване между бизнес конфигурациите — основният "универсален"
// вход на системата. Всеки таб носи собствения акцентен цвят.
function BusinessTabs({ activeId, onChange }) {
  return (
    <nav className="business-tabs" aria-label="Избор на бизнес конфигурация">
      {BUSINESS_CONFIGS.map((c) => (
        <button
          key={c.id}
          className={'tab' + (c.id === activeId ? ' active' : '')}
          style={{ '--accent': c.color }}
          onClick={() => onChange(c.id)}
        >
          <span className="tab-badge">{c.shortLabel}</span>
          <span className="tab-name">{c.name}</span>
        </button>
      ))}
    </nav>
  );
}

export default memo(BusinessTabs);
