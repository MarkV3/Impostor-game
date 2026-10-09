import React from 'react';

const Spinner: React.FC = () => {
  return (
    <div
      className="animate-spin rounded-full h-12 w-12 border-b-4 border-[#dfbd7e]"
      role="status"
      aria-label="Loading"
    />
  );
};

export default Spinner;
