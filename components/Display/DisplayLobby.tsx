import React, { useContext, useEffect, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { GameContext } from '../../contexts/GameContext';
import Button from '../shared/Button';
import { UserGroupIcon, ClipboardDocumentIcon } from '@heroicons/react/24/solid';

const DisplayLobby: React.FC = () => {
    const { gameState, actions } = useContext(GameContext);
    const [joinUrl, setJoinUrl] = useState('');
    const [copied, setCopied] = useState(false);

	useEffect(() => {
		// Show the player join URL without the display code parameter
		const base = `${window.location.origin}`;
		// Append ngrok skip param so players don't see the interstitial
		const urlWithSkip = `${base}/?ngrok-skip-browser-warning=true`;
		setJoinUrl(urlWithSkip);
	}, [gameState?.code]);

	const handleCopy = () => {
		if (navigator.clipboard && window.isSecureContext) {
			navigator.clipboard.writeText(joinUrl).then(() => {
				setCopied(true);
				setTimeout(() => setCopied(false), 2000);
			});
		} else {
			// Fallback for insecure contexts: temporary textarea
			const textarea = document.createElement('textarea');
			textarea.value = joinUrl;
			document.body.appendChild(textarea);
			textarea.select();
			try { document.execCommand('copy'); setCopied(true); setTimeout(() => setCopied(false), 2000); } finally {
				document.body.removeChild(textarea);
			}
		}
	};

    if (!gameState) return null;

    const players = gameState.players.filter(p => !p.isDisplay);
    const minPlayers = gameState.config?.minPlayersToStart ?? 4;
    const canStart = players.length >= minPlayers;

    return (
        <div className="flex flex-col md:flex-row h-[calc(100vh-4rem)] gap-8">
            <div className="flex-1 flex flex-col bg-gray-800 p-8 rounded-2xl">
                <h1 className="text-5xl lg:text-7xl font-extrabold text-indigo-400">Impostor Prompt</h1>
                <p className="text-2xl text-gray-300 mt-2">Join on your phone!</p>
                
                <div className="my-auto flex flex-col items-center gap-6">
                    <div className="flex items-center gap-4 bg-gray-900 px-6 py-4 rounded-lg">
                        <span className="text-xl text-gray-400">Room Code:</span>
                        <span className="text-5xl font-mono tracking-widest text-white">{gameState.code}</span>
                    </div>
                    
					<div className="p-4 bg-white rounded-lg">
						<QRCodeSVG value={joinUrl} size={192} />
                    </div>

                    <div className="text-center">
                        <p className="text-lg text-gray-300">Go to this URL on your phone:</p>
                        <div className="flex items-center gap-2 mt-2 bg-gray-700 p-3 rounded-lg">
                            <span className="text-indigo-300 font-mono">{joinUrl}</span>
                            <button onClick={handleCopy} className="p-2 rounded-md hover:bg-gray-600 transition">
                                <ClipboardDocumentIcon className={`h-6 w-6 ${copied ? 'text-green-400' : 'text-white'}`} />
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <div className="w-full md:w-96 flex flex-col bg-gray-800 p-8 rounded-2xl">
                <div className="flex items-center gap-3 mb-6">
                    <UserGroupIcon className="h-8 w-8 text-indigo-400" />
                    <h2 className="text-3xl font-bold">Players ({players.length}/{Math.max(minPlayers, 10)})</h2>
                </div>
                <div className="flex-1 space-y-3 overflow-y-auto pr-2">
                    {players.map(player => (
                        <div key={player.id} className="bg-gray-700 p-4 rounded-lg flex items-center justify-between shadow-md">
                            <span className="text-xl font-medium">{player.name}</span>
                            <div className="w-4 h-4 rounded-full bg-green-400 animate-pulse"></div>
                        </div>
                    ))}
                    {players.length === 0 && <p className="text-gray-400 text-center py-8">Waiting for players to join...</p>}
                </div>
                <div className="mt-6">
                    <Button onClick={actions.startGame} disabled={!canStart}>
                        {canStart ? 'Start Game' : `Need ${Math.max(minPlayers - players.length, 0)} more players`}
                    </Button>
                </div>
            </div>
        </div>
    );
};

export default DisplayLobby;