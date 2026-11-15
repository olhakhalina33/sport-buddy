import { test } from '@playwright/test';
import { signIn } from '../e2e/helpers';

// Генерує docs/screenshots/*.png (обидві теми, 390 px як у макетах). Запуск: npm run screenshots
test.use({ viewport: { width: 390, height: 844 } });

for (const theme of ['light', 'dark'] as const) {
  test(`скриншоти — ${theme}`, async ({ page }) => {
    await page.addInitScript((t) => localStorage.setItem('theme', t), theme);
    const shot = (name: string) => page.screenshot({ path: `docs/screenshots/${name}-${theme}.png`, fullPage: true });

    await page.goto('/auth');
    await shot('01-auth');

    await signIn(page, 'andriy');
    await page.waitForTimeout(600);
    await shot('02-search');

    await page.goto('/training/10000000-0000-0000-0000-000000000001');
    await page.getByRole('heading', { name: /Учасники/ }).waitFor();
    await page.waitForTimeout(1200); // тайли карти
    await shot('03-card-organizer');

    await page.goto('/training/10000000-0000-0000-0000-000000000001/chat');
    await page.getByRole('heading', { name: /чат/ }).waitFor();
    await shot('05-chat');

    await page.goto('/training/10000000-0000-0000-0000-000000000004');
    await page.getByRole('heading', { name: /місць немає/ }).waitFor(); // andriy тут учасник → кнопка «Ви записані»
    await page.waitForTimeout(1200);
    await shot('06-card-full');

    await page.goto('/create');
    await page.getByLabel('Ліміт учасників').fill('1');
    await page.getByRole('button', { name: 'Опублікувати' }).click();
    await page.getByText('Мінімальний ліміт – 2 учасники').waitFor();
    await shot('07-create-error');

    await page.goto('/requests');
    await page.getByRole('heading', { name: 'Заявки на тренування' }).waitFor();
    await page.waitForTimeout(400);
    await shot('08-requests');
  });
}
