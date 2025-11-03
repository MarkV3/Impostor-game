
import React, { useState, useContext } from 'react';
import { GameContext } from '../../contexts/GameContext';
import Button from '../shared/Button';
import Card from '../shared/Card';

const PlayerJoin: React.FC = () => {
    const [name, setName] = useState('');
    const [code, setCode] = useState('');
    const { actions, error } = useContext(GameContext);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (name.trim() && code.trim()) {
            actions.joinRoom(code.toUpperCase(), name.trim());
        }
    };

    return (
        <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-gray-900">
            <div className="w-full max-w-sm">
                <h1 className="text-5xl font-extrabold text-center mb-8 text-indigo-400">Impostor Prompt</h1>
                <Card>
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div>
                            <label htmlFor="code" className="block text-sm font-medium text-gray-300 mb-1">Room Code</label>
                            <input
                                id="code"
                                type="text"
                                value={code}
                                onChange={(e) => setCode(e.target.value)}
                                placeholder="ABCD"
                                maxLength={4}
                                className="w-full bg-gray-700 text-white text-center text-2xl font-mono tracking-[.5em] p-3 rounded-lg border-2 border-gray-600 focus:border-indigo-500 focus:ring-indigo-500 uppercase"
                                required
                            />
                        </div>
                        <div>
                            <label htmlFor="name" className="block text-sm font-medium text-gray-300 mb-1">Your Name</label>
                            <input
                                id="name"
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="Player"
                                maxLength={12}
                                className="w-full bg-gray-700 text-white p-3 rounded-lg border-2 border-gray-600 focus:border-indigo-500 focus:ring-indigo-500"
                                required
                            />
                        </div>
                        <Button type="submit" disabled={!name.trim() || !code.trim()}>
                            Join Game
                        </Button>
                        {error && <p className="text-red-400 text-center">{error}</p>}
                    </form>
                </Card>
            </div>
        </div>
    );
};

export default PlayerJoin;
