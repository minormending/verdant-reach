import { defineConfig } from 'vitest/config';
process.env.ART_QA_MAPS = '1';
export default defineConfig({ test: { include: ['tools/art/qa/maps.test.ts'], disableConsoleIntercept: true } });
