import pathlib

from fastapi import FastAPI
from fastapi.responses import FileResponse

from routes import notes

STATIC_DIR = pathlib.Path("/app/static")

app = FastAPI(title="wiki")
app.include_router(notes.router)


@app.get("/{full_path:path}")
def spa(full_path: str):
    candidate = STATIC_DIR / full_path
    if full_path and candidate.is_file():
        return FileResponse(candidate)
    return FileResponse(STATIC_DIR / "index.html")
