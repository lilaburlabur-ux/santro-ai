"""Latest-bar guard shared by the price updaters.

Yahoo's daily history can trail the live quote by one session: after the close
the newest daily bar is NaN or missing until Yahoo finalizes it, and each
updater's dropna() then silently treats the PREVIOUS session as today. When
the live quote is dated after the last daily bar, append the quote as today's
bar so price, change and performance all come from the same session.
"""
import datetime as dt
from zoneinfo import ZoneInfo

import pandas as pd
import yfinance as yf

ET = ZoneInfo("America/New_York")


def with_live_bar(sym, close):
    """Return (close_series, appended). `close` is a dropna()'d daily Close."""
    if close is None or len(close) == 0:
        return close, False
    last_day = close.index[-1].date()
    try:
        info = yf.Ticker(sym).info or {}
    except Exception:
        return close, False
    price, ts = info.get("regularMarketPrice"), info.get("regularMarketTime")
    if not price or not ts:
        return close, False
    quote_day = dt.datetime.fromtimestamp(ts, ET).date()
    if quote_day <= last_day:
        return close, False
    idx = pd.Timestamp(quote_day)
    if close.index.tz is not None:
        idx = idx.tz_localize(close.index.tz)
    return pd.concat([close, pd.Series([float(price)], index=[idx])]), True
