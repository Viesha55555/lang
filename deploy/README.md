# Container Deployment

Run these commands from the repository root:

```bash
docker compose -f deploy/compose.yaml up --build -d
```

Then find this computer's LAN address:

```bash
hostname -I
```

Open the app from another device on the same network:

```text
http://YOUR_LAN_IP:8080
```

For example:

```text
http://192.168.1.42:8080
```

Stop it with:

```bash
docker compose -f deploy/compose.yaml down
```

View logs with:

```bash
docker compose -f deploy/compose.yaml logs -f
```

## Notes

- `192.168.1.1` is usually the router admin page. Use the LAN IP of the computer,
  NAS, Raspberry Pi, or server running Docker.
- Browser microphone and speech recognition features may require HTTPS on LAN.
  The app can be served over plain HTTP, but speech features may be limited by
  the browser.
