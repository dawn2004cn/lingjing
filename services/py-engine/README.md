# 灵镜 Python 术数旁路（太乙 / 皇极 / 奇门 / 大六壬）

可选 sidecar：在需要完整古法时启动，由 Node 通过 HTTP 调用。结果会追加到规则文案，保证「每一项都有输出」。

## 依赖（可选）

```bash
pip install fastapi uvicorn
# 完整引擎（自行安装，注意许可与版本）：
# pip install kintaiyi kinwangji
# pip install kinqimen   # GPL，仅可选旁证，不进 Node 依赖
# pip install kinliuren
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

未配置或不可达时：

- 太乙 / 皇极 → Node JS lite
- 奇门 → Node 自研 + MIT `qimendunjia-standalone` 旁证
- 大六壬 → Node 自研九宗门

## 接口

- `GET /health`
- `POST /taiyi` body: `{ year, month, day, hour, minute, ji_style, method }`
- `POST /huangji` body: `{ year, month, day, hour, minute }`
- `POST /qimen` body: `{ year, month, day, hour, minute }`
- `POST /daliuren` body: `{ year, month, day, hour, minute }`
