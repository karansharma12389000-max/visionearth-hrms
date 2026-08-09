import React from 'react';

const Header = ({ title, subtitle, rightElement, theme }) => {
  return (
    <div className="px-5 pb-4" style={{ backgroundColor: theme?.colors?.primary || '#1E40AF' }}>
      <div className="flex items-center justify-between pt-4">
        <div>
          <h2 className="text-white text-xl font-extrabold">{title}</h2>
          {subtitle && <p className="text-white/70 text-xs mt-0.5">{subtitle}</p>}
        </div>
        {rightElement}
      </div>
    </div>
  );
};

export default Header;