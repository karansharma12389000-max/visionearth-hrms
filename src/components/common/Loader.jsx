// src/components/common/Loader.jsx
import React from 'react';

const Loader = ({ theme, message = 'Loading...' }) => {
  return (
    <div className="flex flex-col items-center justify-center min-h-[200px]">
      <div 
        className="h-10 w-10 animate-spin rounded-full border-4 border-t-transparent"
        style={{ 
          borderColor: theme?.colors?.primary || '#1E40AF',
          borderTopColor: 'transparent',
        }}
      />
      <p className="mt-3 text-sm" style={{ color: theme?.colors?.textSecondary || '#64748B' }}>
        {message}
      </p>
    </div>
  );
};

export default Loader;