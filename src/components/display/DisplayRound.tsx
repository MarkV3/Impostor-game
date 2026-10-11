import React, { useContext, useEffect, useState } from 'react';
import { DevicePhoneMobileIcon, LockClosedIcon, TrophyIcon } from '@heroicons/react/24/outline';
import { GameContext } from '../../game/GameContext';
import { GameStatus } from '../../../shared/types';
import DisplayFrame from './DisplayFrame';
import Button from '../ui/Button';
import { useAnswerReveal } from './useAnswerReveal';
import { useVerdictReveal } from '../ui/useVerdictReveal';
import TableLayout from './TableLayout';
import AnswerCard from './AnswerCard';
import pacing from '../../../shared/presentation.json';
import OriginalQuestion from './OriginalQuestion';

const RevealCountdown: React.FC<{ at?: number }> = ({ at }) => {
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 100);
    return () => window.clearInterval(timer);
  }, [at]);
  return (
    <span className="verdict-beats" aria-label="Revealing the impostor">
      {[0, 1, 2].map((beat) => (
        <i key={beat} className={at && Math.ceil((at - now) / 1000) <= beat ? 'is-spent' : ''} />
      ))}
    </span>
  );
};

const DisplayRound: React.FC = () => {
  const { gameState, actions, connected } = useContext(GameContext);
  const reveal = useAnswerReveal(gameState!, actions.completeReveal, connected);
  const verdictReady = useVerdictReveal(gameState?.verdictRevealsAt);
  const votersReady = useVerdictReveal(
    gameState?.verdictRevealsAt === undefined
      ? undefined
      : gameState.verdictRevealsAt + pacing.votersDelayMs,
  );
  const scoresReady = useVerdictReveal(
    gameState?.verdictRevealsAt === undefined
      ? undefined
      : gameState.verdictRevealsAt + pacing.scoresDelayMs,
  );
  if (!gameState) return null;
  const {
    status,
    answers,
    votes,
    currentRound,
    totalRounds,
    impostorId,
    pointsThisRound = {},
    leaderboard,
  } = gameState;
  const players = gameState.players.filter((player) => !player.isDisplay);
  const writing =
    status === GameStatus.ANSWERING ||
    (status === GameStatus.DISTRIBUTE_PROMPTS && currentRound === 0);
  const revealing = status === GameStatus.REVEAL;
  const showingTable = writing || (revealing && reveal.beat === 'waiting');
  const voting = status === GameStatus.DISCUSS_AND_VOTE;
  const summary =
    status === GameStatus.SUMMARY || (status === GameStatus.DISTRIBUTE_PROMPTS && currentRound > 0);
  const resolving = status === GameStatus.SCORE || summary;
  const showVerdict = summary && verdictReady;
  const showVoters = summary && votersReady;
  const showScores = summary && scoresReady;
  const questionFocused = revealing && reveal.beat === 'question-reading';
  const questionVisible = !writing && (!revealing || reveal.beat.startsWith('question'));
  const showQuestion = questionVisible && !questionFocused;
  const finalRound = currentRound === totalRounds;
  const answeredIds = new Set(answers.map((answer) => answer.playerId));
  const votedIds = new Set(votes.map((vote) => vote.voterId));
  const impostor = players.find((player) => player.id === impostorId);
  const caught = (pointsThisRound[impostorId ?? ''] ?? 0) === 0;
  const highScore = Math.max(...players.map((player) => leaderboard[player.id] ?? 0));
  const winners = players.filter((player) => (leaderboard[player.id] ?? 0) === highScore);
  const rankFor = (id: string) =>
    1 + players.filter((player) => (leaderboard[player.id] ?? 0) > (leaderboard[id] ?? 0)).length;
  const progress = showingTable
    ? `${answeredIds.size} / ${players.length} answers in`
    : revealing
      ? `${reveal.visibleCount} / ${players.length} revealed`
      : `${votedIds.size} / ${players.length} votes in`;

  const resultsCue = (
    <div className="round-complete">
      <div>
        {finalRound ? (
          <>
            <TrophyIcon />
            <div>
              <p className="eyebrow">Final standings</p>
              <h2>
                {winners.map((player) => player.name).join(' & ')}{' '}
                {winners.length > 1 ? 'take' : 'takes'} the win.
              </h2>
            </div>
          </>
        ) : (
          <div>
            <p className="eyebrow">Round {currentRound} complete</p>
            <h2>Ready for another?</h2>
          </div>
        )}
      </div>
      <Button onClick={actions.continueRound}>
        {finalRound ? 'Finish game' : 'Next round'} <span aria-hidden="true">→</span>
      </Button>
    </div>
  );

  return (
    <DisplayFrame
      className={`round-frame ${showingTable ? 'table-round' : 'cards-round'}`}
      footer={
        <div className="round-footer">
          <span>
            {writing
              ? 'Answer on your phone. There’s no hurry.'
              : revealing
                ? 'Read it. React to it. Try not to give yourself away.'
                : showScores
                  ? 'Take your time. The host chooses what happens next.'
                  : voting
                    ? 'Talk it out. You can change your vote until everyone has voted.'
                    : 'All eyes on the cards.'}
          </span>
          {revealing && (
            <div className="reveal-controls">
              <button
                className="text-button"
                aria-pressed={reveal.paused}
                onClick={reveal.togglePause}
              >
                {reveal.paused ? 'Keep going' : 'Pause'}
              </button>
              <button
                className="text-button"
                disabled={reveal.beat === 'settling' || reveal.beat === 'question-settling'}
                onClick={reveal.next}
              >
                {reveal.beat === 'question-reading'
                  ? 'Place question'
                  : reveal.beat === 'question'
                    ? 'Start voting'
                    : reveal.beat === 'reading'
                      ? 'Collect card'
                      : 'Next card'}{' '}
                <span aria-hidden="true">→</span>
              </button>
            </div>
          )}
        </div>
      }
    >
      {showingTable ? (
        <section className={`answering-scene ${revealing ? 'is-leaving' : ''}`}>
          <div className="table-heading">
            <div>
              <p className="eyebrow">A question for everyone. A different one for someone.</p>
              <h1>Keep a straight face.</h1>
              <p>Your question is on your phone. Write your answer, then look up.</p>
            </div>
            <span className="round-progress" role="status">
              <span className="live-dot" />
              {progress}
            </span>
          </div>
          <TableLayout players={players} answeredIds={answeredIds} />
        </section>
      ) : (
        <section
          className={`reveal-scene ${questionFocused ? 'question-focus' : ''} ${showScores ? 'has-scores' : ''} ${showQuestion ? 'has-question' : ''} ${reveal.activePlayerId ? 'has-active-card' : ''} ${resolving && !showVerdict ? 'is-suspense' : ''}`}
          aria-label="Answers and voting"
        >
          <div className="scene-heading">
            <div className="round-question">
              {questionVisible ? (
                <OriginalQuestion text={gameState.mainQuestion ?? ''} focused={questionFocused} />
              ) : (
                <>
                  <p className="eyebrow">One answer at a time</p>
                  <h1>Let’s hear your stories.</h1>
                </>
              )}
            </div>
            <span className="round-progress" role="status">
              <span className="live-dot" />
              {progress}
            </span>
          </div>
          <div className="scene-cue" aria-live="polite">
            {showScores ? (
              resultsCue
            ) : resolving ? (
              showVerdict ? (
                <div className="verdict-message">
                  <span className="impostor-seal">The impostor</span>
                  <strong>
                    {caught
                      ? `Caught you, ${impostor?.name}!`
                      : `${impostor?.name} got away with it!`}
                  </strong>
                  <span>{showVoters ? 'Here’s who suspected whom.' : 'Let that sink in…'}</span>
                </div>
              ) : (
                <div className="suspense-message">
                  <LockClosedIcon />
                  <strong>Votes locked. Who was it?</strong>
                  <RevealCountdown at={gameState.verdictRevealsAt} />
                </div>
              )
            ) : voting ? (
              <div className="voting-message">
                <DevicePhoneMobileIcon />
                <div>
                  <strong>Vote on your phone</strong>
                  <span>Whose answer doesn’t quite fit? Talk first. Vote when you’re ready.</span>
                </div>
              </div>
            ) : (
              <p className="reveal-instruction">
                {questionFocused
                  ? 'This is what most of you were asked.'
                  : reveal.beat === 'question'
                    ? 'Same question. Very different answers. Who’s bluffing?'
                    : reveal.activePlayerId
                      ? 'Read the card. Let them explain themselves.'
                      : 'The answers are in. Here we go…'}
              </p>
            )}
          </div>
          <div className={`answer-theatre ${players.length > 6 ? 'large-group' : ''}`}>
            <div className={`answer-spread ${players.length > 6 ? 'answer-spread-large' : ''}`}>
              {players.map((player, index) => {
                const answer = answers.find((item) => item.playerId === player.id);
                const active = revealing && reveal.activePlayerId === player.id;
                const visible = showQuestion || active || reveal.settledIds.has(player.id);
                return (
                  <AnswerCard
                    key={player.id}
                    player={player}
                    index={index}
                    text={answer?.text ?? 'No answer this time.'}
                    active={active}
                    visible={visible}
                    voting={voting}
                    voted={votedIds.has(player.id)}
                    impostor={showVerdict && player.id === impostorId}
                    suspense={resolving && !showVerdict}
                    voters={
                      showVoters
                        ? votes
                            .filter((vote) => vote.targetId === player.id)
                            .map(
                              (vote) =>
                                players.find((item) => item.id === vote.voterId)?.name ??
                                'A friend',
                            )
                        : undefined
                    }
                    score={showScores ? (leaderboard[player.id] ?? 0) : undefined}
                    gain={pointsThisRound[player.id] ?? 0}
                    rank={showScores && finalRound ? rankFor(player.id) : undefined}
                  />
                );
              })}
            </div>
          </div>
        </section>
      )}
    </DisplayFrame>
  );
};
export default DisplayRound;
