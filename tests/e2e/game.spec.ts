import { test, expect } from '@playwright/test';

test('a host and three phones play two untimed rounds and restart the same room', async ({
  browser,
  page,
  baseURL,
}) => {
  const errors: string[] = [];
  const watchErrors = (target: typeof page) =>
    target.on('pageerror', (error) => errors.push(error.message));
  watchErrors(page);
  const externalRequests: string[] = [];
  page.on('request', (request) => {
    if (new URL(request.url()).origin !== new URL(baseURL!).origin)
      externalRequests.push(request.url());
  });
  await page.goto('/host');
  await expect(page.getByRole('heading', { name: 'Host a Game' })).toBeVisible();
  await expect(page.getByRole('textbox')).toHaveCount(2);
  await page.getByLabel('Min Players to Start').fill('3');
  await page.getByLabel('Total Rounds').fill('2');
  await page.getByRole('button', { name: 'Create Game' }).click();
  await expect(page).toHaveURL(/\?code=[A-Z]{6}$/);
  const code = new URL(page.url()).searchParams.get('code')!;
  await expect(page.locator('.room-code')).toHaveText(code);
  const start = page.getByRole('button', { name: 'Start Game', exact: true });
  await expect(page.getByRole('button', { name: 'Need 3 more players' })).toBeDisabled();
  const contexts = await Promise.all(
    ['Alice', 'Bob', 'Charlie'].map(() =>
      browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true }),
    ),
  );
  const players = await Promise.all(contexts.map((context) => context.newPage()));
  const names = ['Alice', 'Bob', 'Charlie'];
  try {
    for (const [index, player] of players.entries()) {
      watchErrors(player);
      await player.goto('/');
      await player.getByLabel('Room Code').fill(code);
      await player.getByLabel('Your Name').fill(names[index]);
      await player.getByRole('button', { name: 'Join Game' }).click();
      await expect(player.getByRole('heading', { name: "You're in!" })).toBeVisible();
    }
    await expect(start).toBeEnabled();
    await expect(page.getByRole('heading', { name: 'Players (3/10)' })).toBeVisible();
    await page.screenshot({
      path: 'test-results/lobby.png',
      fullPage: true,
      animations: 'disabled',
    });
    await start.click();
    for (let round = 1; round <= 2; round++) {
      await expect(page.locator('.table-seat')).toHaveCount(3);
      await expect(page.getByRole('heading', { name: 'Keep a straight face.' })).toBeVisible();
      if (round === 1) {
        await page.screenshot({ path: 'test-results/writing.png', animations: 'disabled' });
        await players[0].screenshot({
          path: 'test-results/phone-answering.png',
          animations: 'disabled',
        });
      }
      for (const player of players) {
        await expect(player.getByRole('timer')).toHaveCount(0);
        await expect(player.getByPlaceholder('Your answer...')).toHaveAttribute('maxlength', '80');
        await player.getByPlaceholder('Your answer...').fill('A hammock');
        await player.getByRole('button', { name: 'Submit Answer' }).click();
      }
      await expect(page.locator('.player-card.is-reading')).toHaveCount(1);
      await page
        .locator('.player-card')
        .first()
        .evaluate((element) => ((element as HTMLElement).dataset.persistence = 'original'));
      if (round === 1)
        await page.screenshot({ path: 'test-results/reveal.png', animations: 'disabled' });
      await expect(page.getByText('Vote on your phone', { exact: true })).toBeVisible({
        timeout: 45_000,
      });
      await expect(page.locator('.player-card.is-open')).toHaveCount(3);
      await expect(page.locator('.player-card[data-persistence="original"]')).toHaveCount(1);
      if (round === 1)
        await page.screenshot({ path: 'test-results/discussion.png', animations: 'disabled' });
      for (const [index, player] of players.entries()) {
        await expect(player.getByRole('heading', { name: 'Who is the Impostor?' })).toBeVisible();
        await expect(player.getByRole('timer')).toHaveCount(0);
        await player
          .getByRole('button', { name: names[(index + 1) % names.length], exact: true })
          .click();
        await expect(player.getByText(/recorded! You can change it/)).toBeVisible();
        await expect(page.locator('.card-vote-status.has-voted')).toHaveCount(index + 1);
        if (round === 1 && index === 0)
          await player.screenshot({
            path: 'test-results/phone-voting.png',
            animations: 'disabled',
          });
      }
      await expect(page.getByText('Votes locked. Who was it?')).toBeVisible();
      for (const player of players) await expect(player.getByText(/You scored/)).not.toBeVisible();
      await expect(page.locator('.is-impostor')).toHaveCount(1);
      await expect(page.locator('.card-voters')).toHaveCount(3);
      await expect(page.locator('.player-card[data-persistence="original"]')).toHaveCount(1);
      for (const player of players) await expect(player.getByText(/You scored/)).toBeVisible();
      if (round === 1)
        await page.screenshot({ path: 'test-results/results.png', animations: 'disabled' });
      await page.getByRole('button', { name: round === 1 ? 'Next round' : 'Finish game' }).click();
    }
    await expect(page.getByRole('heading', { name: 'Game Over', exact: true })).toBeVisible();
    await page.screenshot({
      path: 'test-results/game-over.png',
      fullPage: true,
      animations: 'disabled',
    });
    for (const player of players)
      await expect(player.getByRole('heading', { name: 'Game Over!' })).toBeVisible();
    await page.getByRole('button', { name: /Restart Game/ }).click();
    await expect(start).toBeEnabled();
    await expect(page.locator('.room-code')).toHaveText(code);
    for (const player of players)
      await expect(player.getByRole('heading', { name: "You're in!" })).toBeVisible();
    expect(errors).toEqual([]);
    expect(externalRequests).toEqual([]);
  } finally {
    await Promise.all(contexts.map((context) => context.close()));
  }
});
test('an unknown room reports its error on the join screen', async ({ page }) => {
  await page.goto('/');
  await page.getByLabel('Room Code').fill('AAAAAA');
  await page.getByLabel('Your Name').fill('Test');
  await page.getByRole('button', { name: 'Join Game' }).click();
  await expect(page.getByText('Room not found.', { exact: true })).toBeVisible();
});
