declare namespace Cloudflare {
  interface Env {
    FORAHUB_BOT_TOKEN?: string;
    FORAHUB_WEBHOOK_SECRET?: string;
    FORAHUB_SUPPORT_ENABLED?: string;
    FORAHUB_TEST_SHEETS_URL?: string;
    FORAHUB_TEST_SHEETS_SECRET?: string;
    DB?: D1Database;
    BUCKET?: R2Bucket;
  }
}
