# Easy Listening Backend

This backend follows the same broad pattern as the existing "英语精听酱" service:

- `dev` reads development configuration and protects against accidentally using the production `resources` database.
- `prod` reads production configuration.
- `test` always falls back to an isolated SQLite database, even if MySQL URLs are present in the environment.

## Runtime entry

Install dependencies inside `backend/`:

```bash
python3.11 -m venv .venv
./.venv/bin/python -m pip install \
  -i https://mirrors.aliyun.com/pypi/simple/ \
  --trusted-host mirrors.aliyun.com \
  --timeout 120 \
  --retries 10 \
  --upgrade pip setuptools wheel
./.venv/bin/pip install \
  -i https://mirrors.aliyun.com/pypi/simple/ \
  --trusted-host mirrors.aliyun.com \
  --timeout 120 \
  --retries 10 \
  -e ".[dev]"
```

The backend requires Python 3.11 or newer. On Aliyun or other servers with
unstable access to `files.pythonhosted.org`, use the mirror options above
instead of the default PyPI index.

```bash
PYTHONPATH=backend ./backend/.venv/bin/uvicorn app.main:app --app-dir backend --host 0.0.0.0 --port 8000 --reload
```

Binding to `0.0.0.0` is recommended for Expo / iOS device debugging so the app can reach the backend from the local network.

Run tests from the repository root:

```bash
PYTHONPATH=backend ./backend/.venv/bin/pytest backend/tests
```

## Environment files

The loader checks these sources in order:

1. repository root `.env`
2. `backend/.env`
3. `backend/.env_dev`, `backend/.env_prod`, or `backend/.env_test`

Real OS environment variables always win over values from files.

For local development on this machine, `backend/.env_dev` can be linked to the
existing EnglishEar backend env file so both projects point at the same
`dev_resources` database while keeping separate backend implementations.

## Main endpoints

- `GET /api/resources/articles`
- `GET /api/resources/collections`
- `GET /api/resources/topics`

Compatibility aliases are also exposed to mirror the old public API:

- `GET /api/articles`
- `GET /api/series`
- `GET /api/topics`
