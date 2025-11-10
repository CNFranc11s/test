# Privacy Prism 多智能体重构白皮书

**作者：** Codex 工程组  
**日期：** 2025 年 11 月 10 日  
**修订号：** v1.0

## 摘要
最新版 Privacy Prism 以多智能体后端取代了按维度分散请求的旧流程：服务器并行调度六个分析 Agent 与一个总结 Agent，再将统一结果回传前端。本文对比 `old/` 快照与当前实现，在架构收敛、提示词体系、数据获取、前端体验与导出一致性等方面给出详尽说明。

## 1. 引言
旧版系统依赖 `/api/analyze/:dimension` 路径分别触发六次 OpenAI 调用，前端承担全部重试、指数退避与 PDF 排版工作；不同部署环境（Vercel 与本地 Node）之间也存在代码漂移。此次升级旨在集中调度、引入总结 Agent，并让界面叙事结构与多智能体输出保持一致。

## 2. 系统架构重新对齐

### 2.1 后端组成
* **单一 Express 应用（`backend/app.js`）**：所有中间件、静态托管、健康检查、`/api/analyze` 与 `/api/generate-pdf` 均收敛到同一模块，`backend/server.js`、`api/server.js` 仅需引用即可，消除了旧版重复初始化代码。
* **严格的请求校验**：`/api/analyze` 会将 URL 提交内容裁剪到 20,000 字符、强制最小 10 字符，并返回结构化的 `source`、`startedAt`、`elapsedMs` 元数据，取代六条路由上零散的判断逻辑。
* **集中式 PDF 接口**：服务器返回由 `backend/services/pdfGenerator.js` 生成的 PDFKit 缓冲区，彻底淘汰旧版 `api/server.js`、`backend/server.js` 内联的 jsPDF 流程。

### 2.2 分析调度
* **并行派发（`backend/services/analyzer.js`）**：`runMultiAgentAnalysis()` 通过 `Promise.all` 同时触发六个 `runAgent()`，并使用 `buildAgentMessages()` 自动组装提示词。旧版 `analyzeContentModeA/B` 只推送 SSE 片段，聚合逻辑全在前端。
* **总结生成**：`buildSummary()` 借助 `buildSummaryMessages()` 发起第七次调用，在服务端直接完成高管摘要，避免浏览器再次请求。
* **支持代理的 OpenAI 客户端**：如部署环境设置 `HTTPS_PROXY`/`HTTP_PROXY` 且安装 `undici`，则会自动启用 `ProxyAgent`，满足企业网络合规要求。

## 3. 提示词与配置强化
* **完整的维度提示库（`backend/prompts/dimensions.js`）**：每个维度记录系统提示、用户模板、标签、代号及目标字数（100–120 词），既是代码依赖又是文档依据。
* **总结提示词**：新增 “Prism Conductor” 模板，要求在 180–220 词内概述整体态势、关键洞察与行动建议。
* **模型路由（`backend/config/config.js`）**：默认模型为 `kimi-k2-turbo-preview`，可通过 `MODEL_EXPOSURE` 等环境变量按维度覆写，并支持单独指定 `SUMMARY_MODEL` 与 `OPENAI_BASE_URL`，兼容 Moonshot 与 OpenAI API。

## 4. 数据采集与导出机制
* **基于 fetch 的抓取器（`backend/services/scraper.js`）**：原生 `fetch` + 正则清理取代 axios + cheerio，显著减小依赖体积，也避免在 Vercel 上做 DOM 仿真。
* **带总结页的 PDF（`backend/services/pdfGenerator.js`）**：封面与六维度页面之后可选插入 “Executive Summary”，所见即所得，并在可用时自动加载 Noto Sans SC 字体以保证中文排版。

## 5. 前端体验

### 5.1 应用逻辑（`frontend/js/app.js`）
* **状态扩展**：`analysisResults` 记录 `summary`，同时新增 `summaryResult`、`analysisMeta` 缓存总结文本与耗时数据。
* **单次 fetch**：`startParallelAnalysis()` 仅提交一次 `{ input, type }`，再把返回的 JSON 写入各个维度卡片；旧的 `analyzeDimensionWithRetry()` 及进度计算被移除。
* **总结卡控制**：`resetSummaryCard()` 初始化 UI，`renderSummary()` 根据 `elapsedMs` 填充正文、模型徽标与运行时长。
* **URL 预览**：`updateExtractedContentView()` 展示抓取的前 1,200 字及字符统计，利用的是后端 `source` 字段。
* **导出载荷**：`handleDownload()` 附带总结文本提交给服务器，使 PDF 与前端呈现一致。

### 5.2 布局与视觉（`frontend/index.html`, `frontend/css/style.css`）
* **不透明头部**：分析页头部采用 `#0d1840` 与阴影，确保品牌文字在深浅背景下都清晰可见。
* **总结位置调整**：新增总结卡片固定在六维度之后，符合“细节→汇总”的阅读顺序。
* **页脚精简**：删除 “TECHNOLOGY · Powered by OpenAI GPT-4o” 区块，降低重复品牌信息。
* **样式基元**：新增 `.summary-card`、`.summary-status`、`.summary-model`、`.summary-timer` 等选择器，处理渐变、模糊与字重，保持与整体控制台风格一致。

## 6. 影响与讨论
* **延迟**：服务器端扇出取代六次独立 HTTP 请求，减少 TLS 握手，前端只需展示一次“正在派遣六个智能体”的进度。
* **可靠性**：重试逻辑迁移到服务器端，Node 可以统一记录与兜底，浏览器无需再处理指数退避。
* **报告一致性**：PDF 输出结构与界面一致（含可选总结页），利益相关人无需再手动编辑。
* **可维护性**：`backend/app.js` 同时供本地与 Serverless 使用，Bug 修复一次生效，配置漂移最小化。

## 7. 结论
此次升级让 Privacy Prism 从“按维度逐个调用、前端压力大”的形态演进为“后端多智能体汇总、前端专注呈现”。后端负责提示词、并行调度、总结与导出，前端仅需展示与交互，从而获得更清晰的用户体验、更快的响应感知以及对高管友好的交付物（PDF 报告）。
