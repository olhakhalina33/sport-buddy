import { expect, test } from '@playwright/test';
import { expectNoHorizontalScroll, signIn } from './helpers';

test('пошук: фільтри в URL, порожній результат, скидання, повне тренування в кінці', async ({ page }) => {
  await signIn(page, 'olga');
  const cards = page.locator('main ul > li a[href^="/training/"]');
  await expect(cards.first()).toBeVisible();
  await expect(cards.last()).toContainText('Футбол 5×5 на Шулявці');
  await expect(cards.last()).toContainText('Місць немає');

  // SPEC: «Велоспорт + просунутий» → «Тренувань не знайдено» + «Скинути фільтри»
  await page.getByRole('button', { name: 'Велоспорт' }).click();
  await page.getByRole('button', { name: 'Просунутий' }).click();
  await expect(page).toHaveURL(/sport=cycling/);
  await expect(page).toHaveURL(/level=advanced/);
  await expect(page.getByText('Тренувань не знайдено')).toBeVisible();

  // Фільтри переживають перезавантаження
  await page.reload();
  await expect(page.getByRole('button', { name: 'Велоспорт' })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByText('Тренувань не знайдено')).toBeVisible();

  await page.getByRole('button', { name: 'Скинути фільтри' }).click();
  await expect(cards.first()).toBeVisible();
  await expect(page).not.toHaveURL(/sport=/);
  await expectNoHorizontalScroll(page);
});

test('картка: XSS в описі як текст, повне тренування — «Місць немає» неактивна', async ({ page }) => {
  let dialog = false;
  page.on('dialog', (d) => {
    dialog = true;
    void d.dismiss();
  });
  await signIn(page, 'olga');

  await page.getByRole('link', { name: /Біг-клуб у парку Шевченка/ }).click();
  await expect(page.getByText('<script>alert(1)</script>', { exact: false })).toBeVisible();
  expect(dialog).toBe(false);
  await expectNoHorizontalScroll(page);

  await page.getByRole('button', { name: '← Назад' }).click();
  await page.getByRole('link', { name: /Футбол 5×5 на Шулявці/ }).click();
  await expect(page.getByRole('button', { name: 'Місць немає' })).toBeDisabled();
  await expect(page.getByText(/Учасники · місць немає \(10 з 10\)/)).toBeVisible();
});
