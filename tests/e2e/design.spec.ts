import { test, expect } from '@playwright/test';

async function sample(page: import('@playwright/test').Page) {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.clock.install({ time: new Date('2026-01-01T12:00:00Z') });
  await page.clock.pauseAt(new Date('2026-01-01T12:00:01Z'));
  await page.goto('/?preview=1');
}

test('answers get a central reading beat, collect in place, then stay through voting and staggered results', async ({
  page,
}) => {
  const sockets: string[] = [];
  page.on('websocket', (socket) => sockets.push(socket.url()));
  await sample(page);
  await page.getByLabel('Sample player count').selectOption('3');
  await expect(page.locator('.table-seat.is-writing')).toHaveCount(3);
  await page.clock.runFor(1400);
  await expect(page.locator('.table-seat.is-ready')).toHaveCount(1);
  await page.getByRole('button', { name: 'Reveal', exact: true }).click();
  await page.clock.runFor(1200);
  await expect(page.locator('.is-reading blockquote')).toHaveText('A hammock');
  await page
    .locator('.player-card')
    .evaluateAll((cards) =>
      cards.forEach((card) => ((card as HTMLElement).dataset.persistence = 'original')),
    );
  const large = await page.locator('.is-reading').boundingBox();
  expect(large!.width).toBeGreaterThan(350);
  expect(Math.abs(large!.x + large!.width / 2 - 640)).toBeLessThan(2);
  await page.getByRole('button', { name: 'Pause', exact: true }).click();
  await page.clock.runFor(60000);
  await expect(page.locator('.is-reading blockquote')).toHaveText('A hammock');
  await page.getByRole('button', { name: 'Collect card' }).click();
  await page.clock.runFor(1350);
  await expect(page.locator('.is-reading blockquote')).toHaveText('My best friend');
  const collected = await page.locator('.player-card').first().boundingBox();
  expect(collected!.width).toBeLessThan(large!.width);
  await expect(page.locator('.player-card').first().locator('blockquote')).toHaveText('A hammock');
  await page.clock.runFor(60000);
  await expect(page.locator('.is-reading blockquote')).toHaveText('My best friend');
  await page.getByRole('button', { name: 'Keep going' }).click();
  await page.clock.runFor(6499);
  await expect(page.locator('.is-reading')).toHaveCount(1);
  await page.clock.runFor(1);
  await expect(page.locator('.is-reading')).toHaveCount(0);
  await page.clock.runFor(1350);
  await expect(page.locator('.is-reading blockquote')).toHaveText('A suspiciously large suitcase');
  await page.clock.runFor(6500);
  await expect(page.locator('.is-reading')).toHaveCount(0);
  await page.clock.runFor(1350);
  await expect(page.locator('.round-question h1')).toHaveText(
    'What would you bring to a deserted island?',
  );
  await expect(page.locator('.original-question.is-focused')).toBeVisible();
  await page.screenshot({ path: 'test-results/question-focus.png', animations: 'disabled' });
  expect(
    await page.locator('.answer-theatre').evaluate((element) => getComputedStyle(element).filter),
  ).toContain('blur');
  await expect(page.getByText('Vote on your phone', { exact: true })).not.toBeVisible();
  await page.clock.runFor(5500);
  await expect(page.locator('.original-question.is-focused')).toHaveCount(0);
  await page.clock.runFor(1100);
  await page.clock.runFor(900);
  await expect(page.getByText('Vote on your phone', { exact: true })).toBeVisible();
  await expect(page.locator('.player-card[data-persistence="original"]')).toHaveCount(3);
  await expect(page.locator('.card-vote-status.has-voted')).toHaveCount(2);
  await expect(page.locator('.player-card.is-voted')).toHaveCount(2);
  await expect(page.locator('.player-card.is-choosing')).toHaveCount(1);
  const cardSizes = await page.locator('.player-card').evaluateAll((cards) =>
    cards.map((card) => ({
      width: card.getBoundingClientRect().width,
      height: card.getBoundingClientRect().height,
    })),
  );
  await page.getByRole('button', { name: 'Everyone votes' }).click();
  await page.clock.runFor(2999);
  await expect(page.locator('.is-impostor')).toHaveCount(0);
  await expect(page.locator('.card-voters')).toHaveCount(0);
  await expect(page.locator('.card-points')).toHaveCount(0);
  await page.clock.runFor(1);
  await expect(page.locator('.is-impostor h2')).toHaveText('Olive');
  await page.clock.runFor(2499);
  await expect(page.locator('.card-voters')).toHaveCount(0);
  await page.clock.runFor(1);
  await expect(page.locator('.is-impostor .card-voters p')).toHaveText('Maya, Felix');
  await expect(page.locator('.is-impostor blockquote')).not.toBeVisible();
  expect(
    await page.locator('.player-card').evaluateAll((cards) =>
      cards.map((card) => ({
        width: card.getBoundingClientRect().width,
        height: card.getBoundingClientRect().height,
      })),
    ),
  ).toEqual(cardSizes);
  await page.clock.runFor(3999);
  await expect(page.locator('.card-points')).toHaveCount(0);
  await page.clock.runFor(1);
  await expect(page.locator('.card-points')).toHaveCount(3);
  expect(
    await page.locator('.player-card').evaluateAll((cards) =>
      cards.map((card) => ({
        width: card.getBoundingClientRect().width,
        height: card.getBoundingClientRect().height,
      })),
    ),
  ).toEqual(cardSizes);
  await expect(page.locator('.card-placement').first()).toHaveText('#1 overall');
  await expect(page.getByRole('heading', { name: 'Maya takes the win.' })).toBeVisible();
  await expect(page.locator('.player-card[data-persistence="original"]')).toHaveCount(3);
  await page.clock.runFor(60000);
  await page.getByRole('button', { name: 'Finish game' }).click();
  await expect(page.getByRole('heading', { name: 'Game Over', exact: true })).toBeVisible();
  expect(sockets).toEqual([]);
});

test('maximum-length answers have a full reading beat before moving to the spread', async ({
  page,
}) => {
  await sample(page);
  await page.getByLabel('Sample player count').selectOption('3');
  await page.getByLabel('Long answers').check();
  await page.getByRole('button', { name: 'Reveal', exact: true }).click();
  await page.clock.runFor(1200);
  await expect(page.locator('.is-reading blockquote')).toContainText('I thought about it');
  await page.clock.runFor(7899);
  await expect(page.locator('.is-reading')).toHaveCount(1);
  await page.clock.runFor(1);
  await expect(page.locator('.is-reading')).toHaveCount(0);
  await page.clock.runFor(1350);
  await expect(page.locator('.is-reading h2')).toHaveText('Felix');
  await expect(page.locator('.player-card').first().locator('blockquote')).toContainText(
    'I thought about it',
  );
});

test('seats follow the table perimeter and complete answers fit at different group and screen sizes', async ({
  page,
}) => {
  await sample(page);
  for (const viewport of [
    { width: 1280, height: 720 },
    { width: 1920, height: 1080 },
    { width: 390, height: 844 },
  ]) {
    await page.setViewportSize(viewport);
    for (const count of [3, 6, 10]) {
      await page.getByLabel('Sample player count').selectOption(String(count));
      await page.getByRole('button', { name: 'Write', exact: true }).click();
      await expect(page.locator('.table-seat')).toHaveCount(count);
      const seatsFit = await page.locator('.table-scene').evaluate((table) => {
        const bounds = table.getBoundingClientRect();
        const seats = Array.from(table.querySelectorAll('.table-seat')).map((seat) =>
          seat.getBoundingClientRect(),
        );
        return seats.every(
          (seat, index) =>
            seat.left >= bounds.left - 3 &&
            seat.right <= bounds.right + 3 &&
            seats.every(
              (other, j) =>
                j === index ||
                seat.right <= other.left ||
                seat.left >= other.right ||
                seat.bottom <= other.top ||
                seat.top >= other.bottom,
            ),
        );
      });
      expect(seatsFit, `${viewport.width}px with ${count} players`).toBe(true);
      if (viewport.width === 1280 && count === 10) {
        await page.clock.runFor(1400);
        await page.clock.runFor(1400);
        await page.screenshot({
          path: 'test-results/table-ten.png',
          animations: 'disabled',
          fullPage: true,
        });
      }
      await page.getByLabel('Long answers').check();
      await page.getByRole('button', { name: 'Discuss', exact: true }).click();
      await expect(page.locator('.player-card.is-open')).toHaveCount(count);
      expect(
        await page.locator('.player-card').evaluateAll((cards) =>
          cards.every((card) => {
            const range = document.createRange();
            range.selectNodeContents(card.querySelector('blockquote')!);
            const text = range.getBoundingClientRect();
            const bounds = card.getBoundingClientRect();
            return (
              text.left >= bounds.left &&
              text.right <= bounds.right + 1 &&
              text.top >= bounds.top &&
              text.bottom <= bounds.bottom
            );
          }),
        ),
      ).toBe(true);
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
      ).toBe(true);
      await expect(page.getByRole('timer')).toHaveCount(0);
      if (viewport.width > 700) {
        expect(
          await page
            .locator('.shared-display')
            .evaluate((display) => display.scrollHeight <= display.clientHeight + 1),
        ).toBe(true);
        const insideScreen = await page.locator('.shared-display').evaluate((display) => {
          const bounds = display.getBoundingClientRect();
          return Array.from(display.querySelectorAll('.player-card')).every((card) => {
            const rect = card.getBoundingClientRect();
            return (
              rect.top >= bounds.top &&
              rect.bottom <= bounds.bottom &&
              rect.left >= bounds.left &&
              rect.right <= bounds.right
            );
          });
        });
        expect(insideScreen).toBe(true);
        if (count === 10) {
          const sizes = await page.locator('.player-card').evaluateAll((cards) =>
            cards.map((card) => ({
              width: (card as HTMLElement).offsetWidth,
              height: (card as HTMLElement).offsetHeight,
            })),
          );
          await page.getByRole('button', { name: 'Everyone votes' }).click();
          await page.clock.runFor(3000);
          await page.clock.runFor(2500);
          await expect(page.locator('.card-voters')).toHaveCount(count);
          expect(
            await page
              .locator('.card-voters p')
              .evaluateAll((lists) =>
                lists.every((list) => list.scrollHeight <= list.clientHeight + 1),
              ),
          ).toBe(true);
          await page.clock.runFor(4000);
          expect(
            await page.locator('.player-card').evaluateAll((cards) =>
              cards.map((card) => ({
                width: (card as HTMLElement).offsetWidth,
                height: (card as HTMLElement).offsetHeight,
              })),
            ),
          ).toEqual(sizes);
          expect(
            await page
              .locator('.shared-display')
              .evaluate((display) => display.scrollHeight <= display.clientHeight + 1),
          ).toBe(true);
          if (viewport.width === 1280)
            await page.screenshot({
              path: 'test-results/maximum-answers-ten.png',
              animations: 'disabled',
            });
        }
      }
      if (viewport.width === 1280 && count === 6) {
        await page.getByLabel('Long answers').uncheck();
        await page.getByRole('button', { name: 'Discuss', exact: true }).click();
        await page.screenshot({
          path: 'test-results/voting-six.png',
          animations: 'disabled',
          fullPage: true,
        });
        await page.getByRole('button', { name: 'Everyone votes' }).click();
        await page.clock.runFor(3000);
        await page.clock.runFor(2500);
        await page.screenshot({
          path: 'test-results/verdict-six.png',
          animations: 'disabled',
          fullPage: true,
        });
        await page.clock.runFor(4000);
        await page.screenshot({
          path: 'test-results/placements-six.png',
          animations: 'disabled',
          fullPage: true,
        });
      }
    }
  }
});

test('the central card animates into its slot and stays there', async ({ page }) => {
  await page.clock.install({ time: new Date('2026-01-01T12:00:00Z') });
  await page.clock.pauseAt(new Date('2026-01-01T12:00:01Z'));
  await page.goto('/?preview=1');
  await page.getByLabel('Sample player count').selectOption('6');
  await page.getByRole('button', { name: 'Reveal', exact: true }).click();
  await page.clock.runFor(1200);
  await page.getByRole('button', { name: 'Pause', exact: true }).click();
  await page.clock.runFor(800);
  await page.locator('.is-reading').evaluate((card) => {
    (card as HTMLElement).dataset.persistence = 'animated';
  });
  await page.screenshot({ path: 'test-results/spotlight.png', animations: 'disabled' });
  await page.getByRole('button', { name: 'Collect card' }).click();
  const motion = await page
    .locator('[data-persistence="animated"]')
    .evaluate((card) =>
      card.getAnimations().some((animation) => animation.effect?.getTiming().duration === 1100),
    );
  expect(motion).toBe(true);
  await page.clock.runFor(1350);
  await expect(page.locator('[data-persistence="animated"]')).toHaveCount(1);
  await expect(page.locator('[data-persistence="animated"]')).not.toHaveClass(/is-reading/);
  for (let index = 0; index < 5; index++) {
    await page.getByRole('button', { name: 'Collect card' }).click();
    await page.clock.runFor(1350);
  }
  await expect(page.locator('.original-question.is-focused')).toBeVisible();
  await page.clock.runFor(900);
  await page.getByRole('button', { name: 'Place question' }).click();
  expect(
    await page
      .locator('.original-question')
      .evaluate((question) =>
        question
          .getAnimations()
          .some((animation) => animation.effect?.getTiming().duration === 1100),
      ),
  ).toBe(true);
  await page.clock.runFor(1100);
  await expect(page.locator('.original-question.is-focused')).toHaveCount(0);
});
