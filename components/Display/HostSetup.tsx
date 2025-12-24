import React, { useMemo, useState } from 'react';
import Card from '../shared/Card';
import Button from '../shared/Button';
import { createServerSocket } from '../../services/socketService';

const HostSetup: React.FC = () => {
	const socket = useMemo(() => createServerSocket(), []);
	// Keep inputs as strings so users can freely type without snapping to 0
	const [minPlayersStr, setMinPlayersStr] = useState('3');
	const [totalRoundsStr, setTotalRoundsStr] = useState('6');
	const [busy, setBusy] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const handleCreate = (e: React.FormEvent) => {
		e.preventDefault();
		setBusy(true);
		setError(null);
		// Parse and clamp values per product requirements
		const clamp = (val: number, min: number, max: number) => Math.max(min, Math.min(max, val));
		const parsedMinPlayers = clamp(parseInt(minPlayersStr || '0', 10) || 0, 3, 10);
		const parsedTotalRounds = clamp(parseInt(totalRoundsStr || '0', 10) || 0, 2, 10);
		// Normalize fields after submit (in case user typed out of range)
		setMinPlayersStr(String(parsedMinPlayers));
		setTotalRoundsStr(String(parsedTotalRounds));
		socket.emit('room:create', { minPlayersToStart: parsedMinPlayers, totalRounds: parsedTotalRounds }, (res?: any) => {
			setBusy(false);
			if (!res || !res.ok) { setError('Failed to create room.'); return; }
			const code = res.code as string;
			window.location.href = `/?code=${code}`;
		});
	};

	return (
		<div className="min-h-screen flex items-center justify-center p-6 bg-gray-900">
			<div className="w-full max-w-2xl">
				<h1 className="text-5xl font-extrabold text-center mb-8 text-indigo-400">Host a Game</h1>
				<Card>
					<form onSubmit={handleCreate} className="space-y-6">
						<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
							<div>
								<label className="block text-sm font-medium text-gray-300 mb-1">Min Players to Start</label>
								<input
									type="text"
									inputMode="numeric"
									pattern="[0-9]*"
									value={minPlayersStr}
									onChange={e => setMinPlayersStr(e.target.value.replace(/[^0-9]/g, ''))}
									onBlur={() => {
										const n = parseInt(minPlayersStr || '0', 10) || 0;
										const clamped = Math.max(3, Math.min(10, n || 3));
										setMinPlayersStr(String(clamped));
									}}
									className="w-full bg-gray-700 text-white p-3 rounded-lg border-2 border-gray-600 focus:border-indigo-500 focus:ring-indigo-500"
								/>
							</div>
							<div>
								<label className="block text-sm font-medium text-gray-300 mb-1">Total Rounds</label>
								<input
									type="text"
									inputMode="numeric"
									pattern="[0-9]*"
									value={totalRoundsStr}
									onChange={e => setTotalRoundsStr(e.target.value.replace(/[^0-9]/g, ''))}
									onBlur={() => {
										const n = parseInt(totalRoundsStr || '0', 10) || 0;
										const clamped = Math.max(2, Math.min(10, n || 2));
										setTotalRoundsStr(String(clamped));
									}}
									className="w-full bg-gray-700 text-white p-3 rounded-lg border-2 border-gray-600 focus:border-indigo-500 focus:ring-indigo-500"
								/>
							</div>
						</div>
						<Button type="submit" disabled={busy}>{busy ? 'Creating...' : 'Create Game'}</Button>
						{error && <p className="text-red-400">{error}</p>}
					</form>
				</Card>
				<p className="text-center text-gray-400 mt-4">Share the QR code on the next screen with players.</p>
			</div>
		</div>
	);
};

export default HostSetup;


