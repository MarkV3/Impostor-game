import React, { useEffect, useState } from 'react';

interface PhaseTransitionProps {
    statusKey: string | number;
    children: React.ReactNode;
}

const PhaseTransition: React.FC<PhaseTransitionProps> = ({ statusKey, children }) => {
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        setVisible(false);
        const id = requestAnimationFrame(() => setVisible(true));
        return () => cancelAnimationFrame(id);
    }, [statusKey]);

    return (
        <div
            className={`transition-all duration-500 ease-out transform ${
                visible ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
            }`}
        >
            {children}
        </div>
    );
};

export default PhaseTransition;


