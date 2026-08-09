import React from 'react';

const StatCard = ({ title, value, icon, color }) => {
  return (
    <div
      className="flex-1 rounded-xl p-4 mx-1 min-h-[90px]"
      style={{ backgroundColor: color || '#1E40AF' }}
    >
      <div className="text-white/60 text-xl">{icon || '●'}</div>
      <div className="text-white text-2xl font-extrabold mt-1.5">{value}</div>
      <div className="text-white/80 text-xs mt-0.5">{title}</div>
    </div>
  );
};

export default StatCard;