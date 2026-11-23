import { expect, test } from '@playwright/test';
import { signIn } from './helpers';

/**
 * Наскрізний сценарій двох акаунтів: глядач бачить запис іншого користувача без перезавантаження.
 * Тренування №5 «Велопрогулянка Гідропарком» (автоприйом, ліміт 12). Наприкінці запис скасовується,
 * але повторна заявка того ж користувача неможлива — тому для повторного запуску потрібен свіжий seed.
 */
test('живий лічильник: запис з іншого акаунта видно ≤ 2 с', async ({ browser }) => {
  const viewerCtx = await browser.newContext();
  const actorCtx = await browser.newContext();
  const viewer = await viewerCtx.newPage();
  const actor = await actorCtx.newPage();

  await signIn(viewer, 'maria');
  await signIn(actor, 'tetiana');
  const url = '/training/10000000-0000-0000-0000-000000000005';
  await viewer.goto(url);
  await actor.goto(url);

  const heading = viewer.getByRole('heading', { name: /Учасники · Вільно:/ });
  await expect(heading).toBeVisible();
  const before = Number((await heading.innerText()).match(/Вільно: (\d+)/)![1]);
  await viewer.waitForTimeout(1500); // дати каналу стати готовим

  const join = actor.getByRole('button', { name: 'Забронювати слот' });
  test.skip(!(await join.isVisible()), 'tetiana вже має заявку на це тренування — перезапустіть seed.sql');
  await join.click();
  await expect(actor.getByRole('button', { name: 'Ви записані' })).toBeDisabled();

  await expect(heading).toContainText(`Вільно: ${before - 1} з`, { timeout: 2_000 });
  await expect(viewer.getByRole('img', { name: 'Тетяна Зінченко' })).toBeVisible();

  // Скасування теж приходить глядачу
  await actor.getByRole('button', { name: 'Скасувати заявку' }).click();
  await actor.getByRole('button', { name: 'Так, скасувати' }).click();
  await expect(heading).toContainText(`Вільно: ${before} з`, { timeout: 2_000 });

  await viewerCtx.close();
  await actorCtx.close();
});
