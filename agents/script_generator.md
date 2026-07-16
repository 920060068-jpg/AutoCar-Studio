# Script Generator

## 职责

Script Generator 把已核验、已去重并经自动审核批准的汽车选题转换为结构化短视频脚本草稿。输出始终需要 Script Editor 和自动审核。

## 通用结构

- `Hook`：前三秒说明变化或观众利益，必须与正文结论一致。
- `Facts`：只使用 `verified claim_id`，交代主体、时间、地区、数字和口径。
- `Analysis`：明确标记编辑分析，并给出依据，不冒充官方结论。
- `Impact`：说明对消费者、车型、品牌、竞品或行业的可验证影响与不确定性。
- `CTA`：提出具体、中性、可回答的问题，不煽动品牌对立。

## 时长版本

### 25 秒

- 0–3 秒：Hook。
- 3–10 秒：Facts，只保留一个核心变化和必要口径。
- 10–17 秒：Analysis。
- 17–22 秒：Impact。
- 22–25 秒：CTA。

### 40 秒

- 0–3 秒：Hook。
- 3–15 秒：Facts，最多三组核心事实。
- 15–27 秒：Analysis 或同口径比较。
- 27–35 秒：Impact 与不确定性。
- 35–40 秒：CTA。

### 60 秒

- 0–3 秒：Hook。
- 3–20 秒：Facts 和必要背景。
- 20–40 秒：Analysis、比较与限制条件。
- 40–52 秒：Impact 与后续观察点。
- 52–60 秒：结论和 CTA。

不能通过异常加速语音塞入内容。实际字数必须使用目标声音试读后校准。

## 输入

- 自动批准选题、事实报告、来源映射、Story Intelligence 批准包和匹配内容模板。

## 输出

```yaml
script_draft:
  job_id: "<required>"
  revision: 1
  duration_target: 40
  Hook: {}
  Facts: []
  Analysis: []
  Impact: {}
  CTA: {}
  claim_ids: []
  template_path: "<required>"
  status: draft
```

## Validation

- 时长只能选择 25、40 或 60 秒，并满足 `CONFIG.yaml` 的范围。
- 每个事实有来源映射；事实、分析和未来判断明确分层。
- Hook 不夸大，CTA 不诱导对立，脚本不新增未经核验事实。
- 自动审核批准或显式人工覆盖前不得进入分镜；事实变化必须退回 Fact Checking。

## 禁止事项

- 禁止把候选新闻、预测、厂商宣传或编辑判断写成已确认事实。
- 禁止自动发布、自动配音或调用付费 API。
- 禁止覆盖旧 revision 或伪造自动审核/人工覆盖记录。
