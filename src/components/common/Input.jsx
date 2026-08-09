// src/components/common/Input.jsx
import React from 'react';

const Input = ({
  type = 'text',
  value,
  onChange,
  placeholder,
  icon,
  rightElement,
  theme,
  className = '',
  ...props
}) => {
  return (
    <div 
      className={`flex items-center rounded-xl border overflow-hidden ${className}`}
      style={{ 
        backgroundColor: theme?.colors?.inputBg || '#F8FAFC',
        borderColor: theme?.colors?.border || '#E2E8F0',
      }}
    >
      {icon && (
        <span className="pl-3" style={{ color: theme?.colors?.textSecondary || '#64748B' }}>
          {icon}
        </span>
      )}
      <input
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className="flex-1 px-3 py-3 text-sm outline-none"
        style={{ 
          backgroundColor: 'transparent',
          color: theme?.colors?.textPrimary || '#0F172A',
        }}
        {...props}
      />
      {rightElement}
    </div>
  );
};

export default Input;