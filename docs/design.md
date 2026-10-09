# Around the table, then all cards on the table

The design returns to the late-night table: forest green felt, warm ivory cards, brass details, and expressive serif headings. The lobby and finale retain their previous layouts. The round has clear visual cues, while conversation and voting remain untimed.

Open `/?preview=1` on the local game server, or use **Try a sample round** on `/host`. This preview has no real room or socket connection. Sample friends answer automatically, one every 1.4 seconds. Use **Everyone votes** during discussion to simulate the vote finishing. Try 3, 6, or 10 players and long answers. The preview uses the final round so placements are visible after scoring.

## The sequence

1. **Answering around the table.** Players sit around the oval perimeter rather than in two rows. Each seat has a readable Writing badge with animated dots. Submitted answers replace this with a check, an Answer in badge, and a gentle green avatar glow. Questions stay on the phones.
2. **A central reading card.** Once all answers arrive, the table fades away. A large ivory card shows one player's name and full answer in the centre. It then shrinks and moves into that player's slot in the spread. The next large card appears only after the previous movement finishes. Collected answers remain visible behind it.
3. **The original question.** After the last card settles, the question appears as large central text labelled The original question. The cards softly blur behind it. After reading, the text moves into the heading and the spread moves slightly down. Voting follows once the question has landed.
4. **Discussion and voting.** The same spread stays visible. A prominent phone cue says Vote on your phone. Choosing cards have an amber outline and glow; voted cards have a green outline and glow, with status labels and checks. No timer cuts conversation short.
5. **The impostor and votes.** All votes lock, three warm suspense marks fade over three seconds, and the cards gently pulse. The impostor's card receives a strong red outline, glow, and badge, with a 1.4-second shake and 2.4-second glow animation. After 2.5 seconds, voter names replace the answer in the same card body, in the answer's serif type. The original answer reserves its layout space while hidden, keeping the card dimensions unchanged.
6. **Scores and places.** Scores appear 6.5 seconds after the impostor reveal, giving the room four seconds to inspect voters first. Each card shows total points and points gained. On the last round, every card also shows its overall placement and the winner or tied winners are announced above the spread. The host starts the next round or finishes the game when ready.

## Pacing and control

Answering and voting have no time limits. Answers are limited to 80 characters on both the phone and server. Once everyone answers, the first reading card appears after 1.2 seconds. Each answer has 6.5–7.9 seconds in the centre, depending on length. Its entrance takes 700 milliseconds; collection takes 1.1 seconds, with 250 milliseconds before the next card. The question has 5.5 seconds of central reading, a 1.1-second move into the heading, and 900 milliseconds before voting begins.

**Pause** holds a central answer or question indefinitely. **Collect card** moves an answer into the spread; the next card appears and remains paused. **Place question** moves the central question into its heading. **Keep going** resumes automatic reading. **Start voting** can finish the final question beat. The server has no fallback that interrupts a paused reveal.

After everyone votes, the existing 1.5-second lock and 300-millisecond scoring calculation precede the countdown. The display and phones share the server's `verdictRevealsAt` timestamp. Presentation offsets are in `shared/presentation.json`. Phone point totals appear with shared-screen totals. Results never expire, and the server rejects continuation before scores are presented.

## Readability and motion

Full answers wrap. Ten players use a five-column spread on desktop, three columns on narrower displays, and one column on small screens. Shared-screen rounds automatically fit their available height, including the host controls and footer, without scrolling. Voter lists shrink their type only as needed to fit the existing answer area. Small-screen previews retain responsive stacking. The table becomes taller and narrower on small screens, retaining perimeter seating. Reduced-motion preferences remove entrances, collection motion, pulsing, and shaking while preserving the reading beats and status labels.

The card moves using its measured centre and destination rectangles, so its destination follows the actual responsive layout. A resize updates the reading card's centre. Vote choices have explicit selection states, keyboard focus, and a receipt. Artwork, texture, icons, and fonts require no runtime CDN.

Use the preview to judge the visual sequence, then play with friends to judge whether the room has enough time to read, react, and argue.
