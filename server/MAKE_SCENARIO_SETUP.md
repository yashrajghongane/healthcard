# Make.com Forgot-Password Setup (HealthCard)

Use this to configure your Make scenario for OTP email delivery.

## 1) Webhook Trigger

- Module: `Webhooks -> Custom webhook`
- Copy webhook URL and set it in `server/.env`:

```dotenv
MAKE_WEBHOOK_URL=https://hook.make.com/your_webhook_id
MAKE_WEBHOOK_API_KEY=
```

## 2) Incoming JSON Payload (from backend)

Backend sends this JSON to Make:

```json
{
  "channel": "password-reset",
  "appName": "HealthCard",
  "toEmail": "user@example.com",
  "resetCode": "123456",
  "expiresInMinutes": 10,
  "subject": "HealthCard password reset code",
  "messageText": "Your HealthCard password reset code is 123456. It expires in 10 minutes."
}
```

## 3) Email Module Mapping

Add module: `Gmail -> Send an email` (or any email module)

- `To` -> `toEmail`
- `Subject` -> `subject`
- `Body` -> `messageText`

Optional values you can include in body/template:

- `resetCode`
- `expiresInMinutes`

## 4) Optional Header API Key Validation

If you set `MAKE_WEBHOOK_API_KEY` in backend `.env`, backend sends header:

- `x-make-apikey: <value>`

In Make, add a filter after webhook:

- Left operand: webhook header `x-make-apikey`
- Operator: `equals`
- Right operand: your API key value

## 5) Quick Test (from terminal)

```bash
curl -X POST "<YOUR_MAKE_WEBHOOK_URL>" \
  -H "Content-Type: application/json" \
  -d '{
    "channel":"password-reset",
    "appName":"HealthCard",
    "toEmail":"your_test_email@example.com",
    "resetCode":"123456",
    "expiresInMinutes":10,
    "subject":"HealthCard password reset code",
    "messageText":"Your HealthCard password reset code is 123456. It expires in 10 minutes."
  }'
```

If Make receives this and email sends successfully, app forgot-password is fully wired.