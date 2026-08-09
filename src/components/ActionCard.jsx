import React from 'react';

const ActionCard = ({ icon, label, onClick, theme }) => {
  return (
    <button
      onClick={onClick}
      className="rounded-xl p-3 text-center border flex-1 min-w-[70px] transition-colors hover:opacity-80"
      style={{ 
        backgroundColor: theme?.colors?.card || '#FFFFFF',
        borderColor: theme?.colors?.border || '#E2E8F0',
      }}
    >
      <div className="text-2xl">{icon}</div>
      <p className="text-xs font-semibold mt-1.5" style={{ color: theme?.colors?.textPrimary || '#0F172A' }}>
        {label}
      </p>
    </button>
  );
};

export default ActionCard;