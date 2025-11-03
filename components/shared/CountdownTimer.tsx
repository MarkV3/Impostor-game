
import React, { useState, useEffect } from 'react';

interface CountdownTimerProps {
    endsAt: number;
    totalDuration: number;
    onComplete?: () => void;
    size?: number;
    strokeWidth?: number;
}

const CountdownTimer: React.FC<CountdownTimerProps> = ({ endsAt, totalDuration, onComplete, size = 60, strokeWidth = 6 }) => {
    const [timeLeft, setTimeLeft] = useState(Math.max(0, Math.round((endsAt - Date.now()) / 1000)));

    useEffect(() => {
        const interval = setInterval(() => {
            const newTimeLeft = Math.max(0, Math.round((endsAt - Date.now()) / 1000));
            setTimeLeft(newTimeLeft);
            if (newTimeLeft === 0) {
                clearInterval(interval);
                if(onComplete) onComplete();
            }
        }, 1000);

        return () => clearInterval(interval);
    }, [endsAt, onComplete]);

    const radius = (size - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;
    const progress = timeLeft / (totalDuration / 1000);
    const offset = circumference - progress * circumference;

    const isLowTime = timeLeft <= 10;

    return (
        <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
            <svg className="absolute" width={size} height={size}>
                <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    strokeWidth={strokeWidth}
                    className="text-gray-600"
                    stroke="currentColor"
                    fill="transparent"
                />
                <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    strokeWidth={strokeWidth}
                    stroke="currentColor"
                    fill="transparent"
                    strokeDasharray={circumference}
                    strokeDashoffset={offset}
                    className={`transform -rotate-90 origin-center transition-all duration-1000 ease-linear ${isLowTime ? 'text-red-500' : 'text-indigo-500'}`}
                />
            </svg>
            <span className={`text-xl font-bold ${isLowTime ? 'text-red-500 animate-pulse-fast' : 'text-white'}`}>{timeLeft}</span>
        </div>
    );
};

export default CountdownTimer;
