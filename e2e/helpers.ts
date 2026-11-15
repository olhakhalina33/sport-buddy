import { expect, type Page } from '@playwright/test';

export async function signIn(page: Page, who: string) {
  await page.goto('/auth');
  await page.getByLabel('Email').fill(`${who}@sportbuddy.test`);
  await page.getByLabel('Пароль').fill('Test1234!');
  await page.getByRole('button', { name: 'Увійти' }).click();
  await expect(page.getByRole('heading', { name: 'Тренування поруч' })).toBeVisible();
}

/** На сторінці немає горизонтального скролу (вимога 360 px). */
export async function expectNoHorizontalScroll(page: Page) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(0);
}
