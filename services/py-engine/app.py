"""
可选 Python sidecar：太乙 / 皇极完整法代理。
无 kintaiyi/kinwangji 时返回 stub，由 Node JS lite 兜底。
"""

from __future__ import annotations

from typing import Any, Optional

try:
    from fastapi import FastAPI
    from pydantic import BaseModel
except ImportError as e:  # pragma: no cover
    raise SystemExit("请先 pip install fastapi uvicorn pydantic") from e

app = FastAPI(title="lingjing-py-engine", version="0.1.0")


class TaiyiReq(BaseModel):
    year: int
    month: int = 1
    day: int = 1
    hour: int = 12
    minute: int = 0
    ji_style: int = 0
    method: int = 1


class HuangjiReq(BaseModel):
    year: int
    month: int = 1
    day: int = 1
    hour: int = 12
    minute: int = 0


@app.get("/health")
def health() -> dict[str, Any]:
    has_taiyi = False
    has_huangji = False
    try:
        import kintaiyi  # noqa: F401

        has_taiyi = True
    except Exception:
        pass
    try:
        import kinwangji  # noqa: F401

        has_huangji = True
    except Exception:
        pass
    return {"ok": True, "kintaiyi": has_taiyi, "kinwangji": has_huangji}


@app.post("/taiyi")
def taiyi(req: TaiyiReq) -> dict[str, Any]:
    try:
        from kintaiyi.kintaiyi import Taiyi

        result = Taiyi(req.year, req.month, req.day, req.hour, req.minute).pan(
            ji_style=req.ji_style, method=req.method
        )
        return {"ok": True, "engine": "kintaiyi", "data": result if isinstance(result, dict) else str(result)}
    except Exception as e:
        return {
            "ok": False,
            "engine": "stub",
            "error": str(e),
            "hint": "未安装 kintaiyi 时请使用 Node lingjing-taiyi-lite",
        }


@app.post("/huangji")
def huangji(req: HuangjiReq) -> dict[str, Any]:
    try:
        from kinwangji import display_pan, wanji_four_gua

        gua = wanji_four_gua(req.year, req.month, req.day, req.hour, req.minute)
        text = display_pan(req.year, req.month, req.day, req.hour, req.minute)
        return {"ok": True, "engine": "kinwangji", "gua": gua, "text": text}
    except Exception as e:
        return {
            "ok": False,
            "engine": "stub",
            "error": str(e),
            "hint": "未安装 kinwangji 时请使用 Node lingjing-huangji",
        }
