# ForaHub support deployment

Bot: @ForaHubBot. Planned GitHub repository: ForaHub.

Support is independent of the game ledger and Google Sheets. It grants no Stars balance, items, case access or loyalty progress. Case opening and gift sale endpoints remain disabled by the server feature gate.

## Required configuration

- Store FORAHUB_BOT_TOKEN and FORAHUB_WEBHOOK_SECRET as server secrets, never in GitHub source, browser code or chat.
- Deploy the backend on a public HTTPS host. The current owner-private Sites deployment cannot receive Telegram webhooks.
- Register `/api/support/webhook` using Telegram setWebhook and the matching secret_token. Check getWebhookInfo before enabling payments. Do not replace an existing bot webhook without migrating its handlers.
- Set FORAHUB_SUPPORT_ENABLED=true only after webhook verification. It defaults to off.
- Configure the bot Mini App URL and payment support contact/commands before opening to users.
- Verify a real small payment and cancellation manually in Telegram. Automated checks mock Telegram and do not prove live acceptance.

## GitHub Pages

The current application uses Vinext server routes, D1 storage and authenticated saves. GitHub Pages cannot execute those routes. Publishing dist/client alone will not provide a working copy of the hub. A Pages migration needs a static frontend build plus a separate public backend, Telegram authentication and a deliberate migration of existing game saves. Do not publish a broken Pages workflow or expose server secrets to work around this.

## Checks

`node scripts/test-support.mjs`

`node node_modules/typescript/bin/tsc --noEmit`
