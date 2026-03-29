import { test as base, expect, type BrowserContext } from '@playwright/test';
import fs from 'fs';
import path from 'path';

// This file is to be used as a base for other tests if we want to share state
// But Playwright's recommended way is using 'storageState' in the config.

export async function globalSetup() {
  // Not used yet, we'll configure it in playwright.config.ts
}
