// src/components/common/SectionHeader.jsx
import React from 'react';

const SectionHeader = ({ theme, title, action }) => {
  return (
    <div className="flex items-center justify-between mb-3">
      <span className="text-base font-bold" style={{ color: theme.colors.textPrimary }}>
        {title}
      </span>
      {action && (
        <button
          onClick={action.onPress}
          className="text-sm font-semibold hover:underline"
          style={{ color: theme.colors.primary }}
        >
          {action.label}
        </button>
      )}
    </div>
  );
};

export default SectionHeader;