# Playbook → pi 的落地范围

这是针对仓库的工程适配，不宣称与 Claude Code 功能一一等价，也不复制其 managed settings。

## 核心映射

- PDF pp. 11–13，Capture as intent.md：`sdlc-plan` + `intent.md`，保留原始意图与产品负责人批准。
- pp. 15–17，Requirements and design：`sdlc-design` + `spec.md`，载入组织政策 Skills，标记矛盾和负责人。
- pp. 19–21，Plan mode / auto mode：`run build` 限制源码修改及 shell；人工批准 plan.md 后 `run implement`。不是 pi 原生 plan/auto mode，也不修改全局 permission 设置。
- pp. 22–26，Source of truth / CLAUDE.md / Skills：映射为记录链接、`AGENTS.md`、便携 Agent Skills。固定权威记录，避免多份文档互相矛盾。
- pp. 27–29，Hooks / parallel sessions / subagents：用 extension `tool_call` 做会话级 guard；worktree 由人显式创建；不内置 subagent runner。
- pp. 31–35，Feedback loop / evals：`sdlc-test` + verification.md，要求真实失败/成功证明，指导独立 agent eval；当前自动化测试是包逻辑测试，不是 20–50 个真实任务模型评测。
- pp. 37–46，Review / approval gates / CI/CD：`sdlc-deploy` + review.md/release.md，三轮审查及人类交接；生产授权留在外部平台。没有安装 PR bot、部署 MCP 或企业沙箱。
- pp. 48–52，Maintain / close the loop / channel first responder：`sdlc-maintain` + incident.md + 新 change 的 intent；没有启动监控、调度器或渠道 bot。

## 模块化采用

可以只安装 Skills/prompts，在现有流程中局部使用。Pi package resource filters 可禁用 extension，例如在 settings 的包对象中设置 `extensions: []`。此时所有控制都是建议性的。

`/sdlc` 提供更严格的完整依赖链，避免没有 approved intent/spec/plan 就编码；不支持跳过前置审批或 agent 自行提升权限。组织需要 headless 阶段自动转换时，先在独立流水线验证产物、校验权限与可信审批，并保持风险升级路线；不要让 agent 编辑本包的审批 JSON。

## CI 采用建议

先做确定性包检查，然后将模型工作加入隔离评测：

```bash
npm ci --ignore-scripts
npm run check
npm test
```

模型 eval 要在一次性容器/worktree 中跑，不持有生产凭据，不执行 PR 文本中未经审核的命令。每个 case 包含：原始 prompt、固定 fixture、模型/Skill/prompt 版本、可执行验收检查、允许工具、预算/超时和输出证据。用确定性检查判断结果，别把模型的“已完成”当 PASS。按团队数据建立阈值，变更造成 pass rate 下降时让配置 owner 审核。

非交互入口可以复用技能：

```bash
pi --offline --no-session --tools read,grep,find,ls --print \
  '/skill:sdlc-maintain 只根据仓库内提供的告警证据诊断，不修改代码，不部署'
```

先安装本包并配置模型凭据。`--offline` 只禁止 Pi 自动网络活动，并不禁止已选择模型的 API 调用或工具网络访问；该示例也不是 OS 沙箱。工具限制、短期 token 和容器网络限制需由调用平台设置。此入口不走 `/sdlc run`、不授予审批，输出只能作为待审核的建议。

## 外部闭环的最低要求

- 监控脚本确定性计算控制带并有单元测试，明确样本不足、标准差为零、异常值、冷却、去重和反复告警的行为。
- 1σ/2σ/3σ 仅是文档里的例子；必须按服务实际成本和稳定性标定。
- 告警触发诊断用读权限；修复提议进入受保护 PR；生产回滚只能走事先演练并获得授权的 runbook。
- 独立审核者/确定性门检查前一阶段，不让同一 agent 既写代码又批准它。
- 原始信号、动作、审批、恢复观测和 triage 决策都保留，最后生成下一份 intent 和永久回归 eval。

## 衡量是否有效

使用真实 Git/PR/CI/事件平台记录，而不是从本地状态 JSON 臆造：意图到设计周期、计划到合并周期、首次 CI 成功率、review 等待时间、变更失败率、生产异常到 intent 延迟、重复事故率。把速度与返工/逃逸缺陷同时观察；当前包只保存审批时间，不自动计算这些指标。
