# pi-sdlc

把《AI Native SDLC Playbook》的产物驱动、人类治理、持续反馈闭环迁移到 **pi packages**。一个包在多个项目里复用：1 个 extension、6 个阶段 Skills、3 个快捷 prompts、7 个产物模板。

当前版本是本地可用的 MVP，**尚未发布 npm**。它编排工作流、记录人工审批、检查产物依赖；不会替你配置监控、创建 GitHub PR、执行生产部署或启动后台 agent。

## 安装

需要 Node.js ≥22.19、pi（开发验证版本 1.2.0）；Test/Deploy 审批还需要 Git。建议在目标仓库根目录运行。

```bash
# 在要使用 SDLC 能力的项目中执行；路径换成这个包的实际位置
pi install /absolute/path/to/pi-sdlc
pi
```

只对当前项目安装：

```bash
pi install --local /absolute/path/to/pi-sdlc
```

项目资源需要先 review 并授予 project trust。包由 pi 动态加载 TypeScript，无需构建。安装后在已有 pi 会话中执行 `/reload`。

临时体验，不修改安装设置：

```bash
pi -e /absolute/path/to/pi-sdlc
```

## 完整工作流

在 pi 对话框中逐步执行。每次 `run` 后先完成产物、查看内容和真实证据，再由对应的人执行 `approve`；不要一口气复制所有命令。

```text
/sdlc init claims-status 客户自助查看理赔状态
/sdlc run plan
/sdlc approve plan 产品负责人
/sdlc run design
/sdlc approve design 产品负责人
/sdlc run build
/sdlc approve build 技术负责人
/sdlc run implement
/sdlc run test
/sdlc approve test 代码负责人
/sdlc run deploy
/sdlc approve deploy 发布负责人
/sdlc run maintain
```

- **Plan** → `intent.md`：问题、结果、用户、约束和待决问题。
- **Design** → `spec.md`：需求与设计合并，显式标记政策冲突和风险。
- **Build** → `plan.md`：只探索与规划；列出文件、步骤、风险和证明。
- **Implement**：Build 的执行子步骤，不是第七个 SDLC 阶段；只在计划批准后修改代码。
- **Test** → `verification.md`：真实命令、退出码、日志、验收覆盖和剩余风险。
- **Deploy** → `review.md` + `release.md`：三轮审查、发布准备和回滚证据，**不执行部署**。
- **Maintain** → `incident.md`：读取外部观测，诊断、归档、提出新的 intent 与永久回归 eval。

模板包含 `<!-- sdlc:draft -->`。内容完成后移除，仍留有标记的产物无法批准。标记检查不是内容质量评估；审核人必须检查 TODO、证据、风险和验收结果。

探索大仓库时可用 `pi --tools +grep,+find,+ls` 启用额外只读工具（默认只有 read/bash/edit/write）。

生产发布由外部受保护环境/发布平台执行，完成后再使用 Maintain 记录真实监控或事件证据。全新的告警可直接 `/sdlc init <new-id> <title>` → Plan，以告警为输入，不必伪造先前的 Deploy 批准。

## 状态和跨会话

```text
/sdlc status
/sdlc use claims-status
/sdlc run test
/sdlc help
/sdlc off
```

- 产物：`intent/<id>/`。
- 人工审批、内容 SHA-256、历史：`.sdlc/changes/<id>.json`。
- 活跃 change/phase：pi session branch 的 custom entry，随分支恢复；新会话用 `use` 选择。
- 多个 change 可共存。并行实现请使用独立 Git worktree；一个工作树里的 Test/Deploy 指纹包含所有 Git 跟踪和未忽略文件，因此其他并行修改也会使审批过期。
- 上游产物改变会让下游审批失效。Test/Deploy 还绑定源文件内容、文件名、删除状态和 mode，包括未跟踪但未忽略的文件；排除 `intent/`、`.sdlc/`，不覆盖 Git 忽略文件、外部服务状态或模型配置。源码符号链接暂不支持这两个审批阶段。
- 一个锁串行化跨进程 init/approve 写入，原子替换状态文件；锁冲突会报错而不是覆盖。异常退出留下锁时，确认所有使用它的进程已停止后再清理 `.sdlc/mutation.lock/`。
- 建议把产物、审批状态和代码一起交给 Git/PR review。包不会自动 commit/push；本地审批不是 git 提交，也不是不可篡改的审计库。

## 工具护栏

仅在 `/sdlc init/use/run` 激活的会话内生效：

- Plan/Design/Build/Deploy/Maintain：允许 `read/grep/find/ls`、`sdlc_status` 和当前阶段的指定产物写入；阻止 shell、源码编辑和未知/MCP 工具。
- Implement/Test：检查有效前置审批后允许源码编辑和本地 shell；阻止直接 `.sdlc`/`.git` 文件编辑及明显的 deploy/rollback、基础设施操作、Git 发布命令。
- 已批准产物需回到其编写阶段修改，并重新批准。Test 只可写自己的 `verification.md`，不能直接改 plan/spec。
- 模型只有只读 `sdlc_status` 工具，没有 approve 工具。人工 `approve` 需要交互/RPC 确认；headless 模式拒绝批准。确认期间内容变化会拒绝写入审批。

**这是协作护栏，不是安全沙箱。** shell 包装、别名、自定义工具或 `/sdlc off` 可以绕过本地约束；本地 reviewer 名字不验证身份；状态文件可被操作系统用户改写。强制控制必须放在 OS/container 隔离、短期凭据、网络策略、分支保护、CODEOWNERS 和 protected environments。工具白名单不会让 shell 自动变成只读，也不自动冻结测试文件。

需要 MCP/browser、远程 PR diff 或严格测试冻结时，应由团队配置独立、受控的集成和外部检查；当前安全默认不会静默开放这些能力。

## 单独复用 Skills 和 prompts

```text
/skill:sdlc-plan 一个新的产品想法
/skill:sdlc-design 根据已有 intent 编写 spec
/skill:sdlc-build 为这个需求写实现计划
/skill:sdlc-test 检查验收覆盖
/skill:sdlc-deploy 审查这份 diff 并准备发布材料
/skill:sdlc-maintain 分析这份告警证据
/sdlc-capture 客户看不到订单状态
/sdlc-review 本次变更的鉴权与风险
/sdlc-context 测试命令和常见错误
```

独立 Skill/Prompt 是建议性指令，**不会激活 extension 的审批/护栏**。通用流程使用 `/sdlc`；局部场景直接加载 Skill。

## 团队定制

1. 在目标仓库维护短而准确的 `AGENTS.md`：命令与健康输出、架构、约定、冻结路径、反复出现的错误。
2. 用 `REVIEW.md` 定义 Bugs/Security/Compliance、Important/Nit、例外和数量上限。
3. 在项目 `.pi/skills/` 编写有 owner、来源和版本的安全/合规/品牌/UX Skills。强制政策还要配独立 CI/平台检查。
4. 每个产物声明唯一 source of truth；若 Jira/ServiceNow 为权威记录，Markdown 是工作副本，双向链接 record ID/commit SHA。MCP 同步需单独授权。
5. 建立真实任务 agent eval 集合，在 Skills、AGENTS.md、prompt、extension 或模型变更时回归，并将事故变成永久 eval。参见 `docs/adoption.md`。

## 开发和分发

```bash
npm ci --ignore-scripts
npm run check
npm test
npm pack
```

`npm pack` 包含 extension/lib/Skills/prompts/templates/docs，**不包含参考 PDF、测试、node_modules 或本项目的本地审批数据**。MIT 只适用于实现，不适用于原 PDF。发布前调整 npm 名称/版本并确认组织使用政策；尚未执行 `npm publish`。

参考原文：用户提供的 `AI Native SDLC Playbook_designv2.pdf`，Louis Claxton / Anthropic，54 页。映射与落地范围见 `docs/adoption.md`。
