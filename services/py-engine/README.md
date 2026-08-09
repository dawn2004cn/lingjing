# 灵镜 Python 术数旁路（太乙 / 皇极）

可选 sidecar：在需要完整古法时启动，由 Node 通过 HTTP 调用。

## 依赖（可选）

```bash
pip install fastapi uvicorn
# 完整引擎（自行安装，注意许可与版本）：
# pip install kintaiyi kinwangji
```

## 启动

```bash
cd services/py-engine
uvicorn app:app --host 127.0.0.1 --port 8765
```

环境变量（Next 侧）：

```
PY_ENGINE_URL=http://127.0.0.1:8765
```

未配置或不可达时，灵镜使用 `lib/taiyi` / `lib/huangji` 的 JS lite 实现。

## 接口

- `GET /health`
- `POST /taiyi` body: `{ year, month, day, hour, minute, ji_style, method }`
- `POST /huangji` body: `{ year, month, day, hour, minute }`
