import { defineConfig } from "@playwright/test";

const port = 3102;
const distDir = process.env.COMUN_NEXT_DIST_DIR ?? ".next-s33-2-2-pagination";
export default defineConfig({testDir:"./tests/editorial-operation-authenticated",testMatch:"pagination.spec.mjs",globalSetup:"./tests/fixtures/comun/pagination-global-setup.mjs",globalTeardown:"./tests/fixtures/comun/operational-global-teardown.mjs",timeout:120000,workers:1,use:{baseURL:process.env.COMUN_BASE_URL??`http://127.0.0.1:${port}`,trace:"retain-on-failure",viewport:{width:1366,height:768}},webServer:process.env.PLAYWRIGHT_SKIP_WEBSERVER?undefined:{command:`set COMUN_NEXT_DIST_DIR=${distDir}&& set PORT=${port}&& node scripts/comun-local-env.mjs run npm run dev`,url:`http://127.0.0.1:${port}/comun`,reuseExistingServer:false,timeout:120000}});
