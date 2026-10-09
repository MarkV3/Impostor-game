function scoreRound(room) {
  const gamePlayers = room.players.filter((p) => !p.isDisplay);
  const N = gamePlayers.length;
  const pointsThisRound = {};

  gamePlayers.forEach((p) => {
    if (p.id !== room.impostorId) {
      const vote = room.votes.find((v) => v.voterId === p.id);
      pointsThisRound[p.id] = vote && vote.targetId === room.impostorId ? 1 : 0;
    }
  });

  const votesAgainstImpostor = room.votes.filter((v) => v.targetId === room.impostorId).length;
  const threshold = Math.floor(N / 2) + 1;
  pointsThisRound[room.impostorId] = votesAgainstImpostor < threshold ? 1 : 0;

  const leaderboard = { ...room.leaderboard };
  Object.entries(pointsThisRound).forEach(([pid, pts]) => {
    leaderboard[pid] = (leaderboard[pid] || 0) + pts;
  });

  return { leaderboard, pointsThisRound };
}

module.exports = { scoreRound };
