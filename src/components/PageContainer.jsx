import React from 'react';

const PageContainer = ({ children, theme, className = '' }) => {
  return (
    <div 
      className={`min-h-screen pb-16 ${className}`}
      style={{ backgroundColor: theme?.colors?.background || '#F1F5F9' }}
    >
      {children}
    </div>
  );
};

export default PageContainer;