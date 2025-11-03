
import React from 'react';
import Spinner from '../shared/Spinner';

interface PlayerWaitingProps {
    title: string;
    message: string;
}

const PlayerWaiting: React.FC<PlayerWaitingProps> = ({ title, message }) => {
    return (
        <div className="min-h-screen flex flex-col items-center justify-center p-4 text-center">
            <Spinner />
            <h1 className="text-3xl font-bold mt-6">{title}</h1>
            <p className="text-gray-400 mt-2">{message}</p>
        </div>
    );
};

export default PlayerWaiting;
