// src/components/common/Button.jsx
import React from 'react';

const Button = ({ 
  label, 
  onClick, 
  loading = false, 
  disabled = false, 
  color, 
  fullWidth = false,
  type = 'button',
  variant = 'primary',
  theme,
}) => {
  const bgColor = color || (variant === 'primary' ? '#1E40AF' : 'transparent');
  const textColor = variant === 'primary' ? '#FFFFFF' : theme?.colors?.textPrimary || '#0F172A';
  const borderColor = variant === 'outline' ? bgColor : 'transparent';

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={loading || disabled}
      className={`rounded-xl py-3.5 text-center font-bold transition-all ${fullWidth ? 'w-full' : ''}`}
      style={{
        backgroundColor: variant === 'primary' ? bgColor : 'transparent',
        color: textColor,
        border: variant === 'outline' ? `2px solid ${borderColor}` : 'none',
        opacity: (loading || disabled) ? 0.7 : 1,
        cursor: (loading || disabled) ? 'not-allowed' : 'pointer',
      }}
    >
      {loading ? (
        <span className="inline-flex items-center justify-center">
          <span className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent mr-2" />
          Loading...
        </span>
      ) : (
        label
      )}
    </button>
  );
};

export default Button;