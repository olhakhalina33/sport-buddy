import { defineConfig } from '@playwright/test';
import base from './playwright.config';

// Окрема конфігурація для генерації скриншотів (npm run screenshots), не входить у npm run e2e.
export default defineConfig({ ...base, testDir: './e2e-screens' });
