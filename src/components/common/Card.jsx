// src/components/common/Card.jsx
import React from 'react';

const Card = ({ 
  children, 
  theme, 
  className = '', 
  padding = 'p-4',
  onClick,
}) => {
  return (
    <div
      className={`rounded-xl ${padding} border ${className}`}
      style={{
        backgroundColor: theme?.colors?.card || '#FFFFFF',
        borderColor: theme?.colors?.border || '#E2E8F0',
        cursor: onClick ? 'pointer' : 'default',
      }}
      onClick={onClick}
    >
      {children}
    </div>
  );
};

export default Card;