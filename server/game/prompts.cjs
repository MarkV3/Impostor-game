const PROMPTS = require('../../shared/prompts.json');

/** @type {Map<string, Set<string>>} */
const usedPromptKeysByRoom = new Map();

function getRandomPromptPair(roomCode) {
  if (!usedPromptKeysByRoom.has(roomCode)) usedPromptKeysByRoom.set(roomCode, new Set());
  const used = usedPromptKeysByRoom.get(roomCode);
  const mains = PROMPTS.filter((p) => p.kind === 'main' && !used.has(p.pairKey));
  if (mains.length === 0) {
    used.clear();
    return getRandomPromptPair(roomCode);
  }
  const main = mains[Math.floor(Math.random() * mains.length)];
  const impostor = PROMPTS.find((p) => p.pairKey === main.pairKey && p.kind === 'impostor');
  if (!impostor) return null;
  used.add(main.pairKey);
  return { main, impostor };
}

function resetPrompts(roomCode) {
  usedPromptKeysByRoom.delete(roomCode);
}

module.exports = { getRandomPromptPair, resetPrompts };
