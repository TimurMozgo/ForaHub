declare namespace Cloudflare {
  interface Env {
    FORAHUB_TEST_SHEETS_URL?: string;
    FORAHUB_TEST_SHEETS_SECRET?: string;
    DB?: D1Database;
    BUCKET?: R2Bucket;
  }
}
