"""
可选 Python sidecar：太乙 / 皇极 / 奇门 / 大六壬 完整法代理。
缺依赖时返回 stub，由 Node JS 引擎兜底。
"""

from __future__ import annotations

from typing import Any, Optional

try:
    from fastapi import FastAPI
    from pydantic import BaseModel
except ImportError as e:  # pragma: no cover
    raise SystemExit("请先 pip install fastapi uvicorn pydantic") from e

app = FastAPI(title="lingjing-py-engine", version="0.2.0")


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


class DateTimeReq(BaseModel):
    year: int
    month: int = 1
    day: int = 1
    hour: int = 12
    minute: int = 0


@app.get("/health")
def health() -> dict[str, Any]:
    flags = {
        "kintaiyi": False,
        "kinwangji": False,
        "kinqimen": False,
        "kinliuren": False,
    }
    for name in list(flags):
        try:
            __import__(name)
            flags[name] = True
        except Exception:
            pass
    return {"ok": True, **flags}


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


@app.post("/qimen")
def qimen(req: DateTimeReq) -> dict[str, Any]:
    try:
        # 常见 Python 包名：kinqimen（GPL，仅作可选旁证，不进 Node 运行时）
        from kinqimen import kinqimen as kq

        if hasattr(kq, "qimen"):
            data = kq.qimen(req.year, req.month, req.day, req.hour, req.minute)
        else:
            data = str(kq)
        return {"ok": True, "engine": "kinqimen", "data": data if isinstance(data, (dict, list, str)) else str(data)}
    except Exception as e:
        return {
            "ok": False,
            "engine": "stub",
            "error": str(e),
            "hint": "未安装 kinqimen；Node 侧已用 MIT qimendunjia-standalone 旁证",
        }


@app.post("/daliuren")
def daliuren(req: DateTimeReq) -> dict[str, Any]:
    try:
        from kinliuren import kinliuren as kl

        # 常见 API：Liuren(...).result(...)
        if hasattr(kl, "Liuren"):
            obj = kl.Liuren(req.year, req.month, req.day, req.hour)
            data = obj.result() if hasattr(obj, "result") else obj
        elif hasattr(kl, "liuren"):
            data = kl.liuren(req.year, req.month, req.day, req.hour)
        else:
            data = str(kl)
        return {"ok": True, "engine": "kinliuren", "data": data if isinstance(data, (dict, list, str)) else str(data)}
    except Exception as e:
        return {
            "ok": False,
            "engine": "stub",
            "error": str(e),
            "hint": "未安装 kinliuren 时请使用 Node lingjing-daliuren",
        }
