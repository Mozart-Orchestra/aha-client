# Webapp v3 Deployment

The web app is served under `/webappv3`, so exported Expo assets must also use that prefix. If `index.html` points at root assets such as `/_expo/...`, `ahaagi.com` returns a Caddy 404 HTML page for those files and the browser reports stylesheet/script MIME errors.

## Server Mapping

| SSH host | Public web app | CLI API URL | CLI webapp URL |
| --- | --- | --- | --- |
| `wow` | `https://aha-agi.com/webappv3` | `https://aha-agi.com/api` | `https://aha-agi.com/webappv3` |
| `geminihub` | `https://ahaagi.com/webappv3` | `https://ahaagi.com/api` | `https://ahaagi.com/webappv3` |

## Build Rules

- Always build with `BASE_PATH=/webappv3` for deployments behind the `/webappv3` route.
- For manual static exports, use `yarn export:webappv3` instead of plain `expo export`.
- For Docker builds, pass `--build-arg BASE_PATH=/webappv3`.
- Set the add-device command URLs at build time with `EXPO_PUBLIC_AHA_CLI_SERVER_URL` and `EXPO_PUBLIC_AHA_CLI_WEBAPP_URL`.

Example for `ahaagi.com`:

```bash
BASE_PATH=/webappv3 \
EXPO_PUBLIC_AHA_CLI_SERVER_URL=https://ahaagi.com/api \
EXPO_PUBLIC_AHA_CLI_WEBAPP_URL=https://ahaagi.com/webappv3 \
yarn export:webappv3
```

After deploying, smoke test the generated HTML and assets:

```bash
html=$(curl -fsSL https://ahaagi.com/webappv3/)
printf '%s\n' "$html" | rg '"/_expo|"/assets|"/favicon' && echo "bad root asset ref"
js=$(printf '%s\n' "$html" | rg -o '/webappv3/_expo/static/js/web/[^"]+\.js' | head -1)
css=$(printf '%s\n' "$html" | rg -o '/webappv3/_expo/static/css/[^"]+\.css' | head -1)
curl -I "https://ahaagi.com${js}"
curl -I "https://ahaagi.com${css}"
curl -I https://ahaagi.com/webappv3/favicon.ico
```
