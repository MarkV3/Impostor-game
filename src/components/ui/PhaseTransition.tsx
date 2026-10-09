import React from 'react';

const PhaseTransition: React.FC<{ statusKey: string | number; children: React.ReactNode }> = ({
  statusKey,
  children,
}) => (
  <div key={statusKey} className="phase-transition">
    {children}
  </div>
);
export default PhaseTransition;
