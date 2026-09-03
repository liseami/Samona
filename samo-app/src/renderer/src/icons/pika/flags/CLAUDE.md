# flags/

> L2 | 父级: [../CLAUDE.md](../CLAUDE.md)

自绘国旗 SVG 图标 · 语言切换器按语言代码消费, 每旗对应一门 UI 语言。

---

## 语言代码映射

| 代码 | 图标 | 语言 |
|------|------|------|
| en | IconUnitedStates | English |
| es | IconMexico | Español |
| hi | IconIndia | हिन्दी |
| fr | IconFrance | Français |
| ja | IconJapan | 日本語 |
| ko | IconSouthKorea | 한국어 |
| de | IconGermany | Deutsch |
| pt | IconBrazil | Português |
| it | IconItaly | Italiano |
| am | IconEthiopia | አማርኛ (Amharic) |
| ru | IconRussia | Русский |
| pl | IconPoland | Polski |
| sv | IconSweden | Svenska |
| sr | IconSerbia | Српски |
| zh/zh-TW | IconChina | 中文 |

---

## SVG 视觉契约 (铁律)

新增国旗必须与 `IconChina` 同契约: `viewBox="0 0 32 32"`、`width/height={size}`、旗面 `x=1 y=4 width=30 height=24 rx=4 ry=4`。禁止固定 `24x24` 或旗面左右额外留白, 否则切换器里尺寸不齐。

---

[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
