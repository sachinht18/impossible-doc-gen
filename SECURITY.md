# Security Policy

## Supported Deployment Assumptions

This application depends on server-side access to `OPENAI_API_KEY`. Treat every deployment as a server application, not a static export.

## Secret Handling

- Store secrets in environment variables only.
- Never commit `.env.local`, production credentials, or copied secrets into documentation.
- Do not expose server-only values through `NEXT_PUBLIC_*`.

## Public Repository Checklist

Before making the repository public:

1. Confirm `.env.local` has never been committed.
2. Rotate any API keys that may have been exposed locally or shared in screenshots.
3. Review open issues, workflows, and docs for accidental secret disclosure.
4. Verify the deployed environment has `OPENAI_API_KEY` configured.

## Reporting

If you discover a vulnerability, report it privately to the repository maintainer before opening a public issue.
