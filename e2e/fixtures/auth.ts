import { test as base, BrowserContext } from '@playwright/test';
import path from 'path';
import fs from 'fs';
import { loginViaApi } from './api';
import { TEST_USERS } from './seed-test';

type Role = 'OWNER' | 'MANAGER' | 'BARBER' | 'CUSTOMER';

async function ensureStorageState(role: Role): Promise<string> {
  const file = path.resolve(__dirname, '../.auth', `${role.toLowerCase()}.json`);
  if (fs.existsSync(file)) return file;

  const creds = role === 'OWNER'    ? TEST_USERS.OWNER
              : role === 'MANAGER'  ? TEST_USERS.MANAGER
              : role === 'BARBER'   ? TEST_USERS.BARBER
              :                       TEST_USERS.CUSTOMER;

  const { token, user } = await loginViaApi(creds.username, creds.password);

  const state = {
    cookies: [],
    origins: [
      {
        origin: 'http://localhost:4173',
        localStorage: [
          { name: 'token', value: token },
          { name: 'user', value: JSON.stringify(user) },
        ],
      },
    ],
  };
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(state));
  return file;
}

export const test = base.extend<{ asOwner: BrowserContext; asBarber: BrowserContext; asCustomer: BrowserContext; ownerToken: string }>({
  asOwner: async ({ browser }, use) => {
    const file = await ensureStorageState('OWNER');
    const ctx = await browser.newContext({ storageState: file });
    await use(ctx);
    await ctx.close();
  },
  asBarber: async ({ browser }, use) => {
    const file = await ensureStorageState('BARBER');
    const ctx = await browser.newContext({ storageState: file });
    await use(ctx);
    await ctx.close();
  },
  asCustomer: async ({ browser }, use) => {
    const file = await ensureStorageState('CUSTOMER');
    const ctx = await browser.newContext({ storageState: file });
    await use(ctx);
    await ctx.close();
  },
  ownerToken: async ({}, use) => {
    const { token } = await loginViaApi(TEST_USERS.OWNER.username, TEST_USERS.OWNER.password);
    await use(token);
  },
});

export { expect } from '@playwright/test';
