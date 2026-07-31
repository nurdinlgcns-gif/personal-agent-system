from datetime import datetime, timedelta, timezone


def now_iso() -> str:
    jakarta_tz = timezone(timedelta(hours=7))
    return datetime.now(tz=jakarta_tz).isoformat(timespec="seconds")
