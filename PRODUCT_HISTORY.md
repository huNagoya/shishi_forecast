# 食事预报局 — 产品迭代全记录

> 项目地址：https://shishiforecast.gaoyan.me  
> 技术栈：Next.js 14 App Router · Tailwind CSS · Qwen AI · Supabase · Vercel  
> 作者：高彦（AI 产品经理）

---

## 一、产品定位

**食事预报局**是一款面向年轻都市用户的 AI 饮食健康预测工具，核心价值主张：

> "喝什么吃什么，身体后续一手掌握"

用户拍下饮品或食物，AI 立即预测：
- **熬夜预警机**：咖啡因含量、预计入睡时间、失眠风险、次日精神状态
- **消化预测官**：消化时间、排便黄金时间窗、便秘/腹泻风险

目标用户：在意身体反应但懒得查资料的 20-35 岁的年轻人，尤其是奶茶重度用户和外卖依赖群体。

---

## 二、技术架构

```
前端（Next.js App Router）
  ├── /sleep         熬夜预警机输入页
  ├── /digest        消化预测官输入页
  ├── /history       历史记录 + EWMA 事后反馈
  ├── /settings      体质档案页（个性化分值展示）
  └── /             首页 + Onboarding 问卷

API Routes（Serverless）
  ├── /api/predict/sleep     睡眠预测（Qwen VL + Qwen Plus）
  ├── /api/predict/digest    消化预测（Qwen VL + Qwen Plus）
  ├── /api/feedback          用户反馈 + EWMA 触发
  └── /api/profile           用户体质档案读写

数据层（Supabase PostgreSQL）
  ├── predictions    每次预测埋点（type/input_method/score）
  ├── feedbacks      产品反馈（issue/correct_value/custom_text）
  └── user_profiles  个性化体质档案（EWMA 参数）

AI 模型
  ├── qwen-vl-max-latest   图片 OCR + 视觉识别
  └── qwen-plus-latest     文字预测分析

部署
  └── Vercel（自动部署 + cron keep-alive）
```

---

## 三、迭代历程

### 第一阶段：0 到 1 · 核心功能上线（2026-03-09）

**初始版本（`affdc44`）**

从零开始搭建完整产品。关键设计决策：

- 采用 **Next.js App Router** 而非传统 MPA，原因是 Serverless API Routes 可以直接调用 AI API，无需单独后端服务，配合 Vercel 实现零运维部署
- 图片识别选用**智谱 GLM-4V**（当时国内可用的多模态模型），文字预测用 GLM-4-Flash
- Prompt 设计：要求模型只返回 JSON，避免自然语言混入导致解析失败；同时在前端做了完整的格式容错（`toStringArray`、`toStr`、`toNum`）

**立即修复的问题（`49e7e7f`）**

上线后发现两个 bug：
1. 模型偶发返回数字字段为字符串，`NaN` 值导致前端崩溃 → 加强数字规范化逻辑
2. 大图片传入时 base64 字符串超出 JSON 解析限制 → 增加客户端图片压缩（`2216206`），上传前自动降质到合理体积

**设计思路**：宁可在客户端多做一步压缩，也不在服务端处理大文件——Serverless 函数有内存和时间限制，早处理早安全。

---

### 第二阶段：产品化打磨（2026-04-14 ~ 15）

**咖啡因知识库 + Supabase 接入（`5066e3d`）**

这一版是产品从「能用」到「好用」的关键跨越：

**咖啡因知识库（`lib/caffeine-lookup.ts`）**
问题背景：纯 AI 对常见国内奶茶品牌（霸王茶姬、茶百道、瑞幸等）的咖啡因含量存在幻觉，误差高达 100mg。

解决思路：维护一份本地知识库（品牌 × 产品 → 咖啡因含量区间），在调用 AI 前先匹配，若命中则将精确数据注入 prompt：
```
已知数据：霸王茶姬伯牙绝弦咖啡因约 60-80mg，请以此为准进行分析。
```
这是「RAG 思想在 prompt 层面的轻量实现」——不用向量数据库，用确定性知识锚定 AI 输出。

**Supabase 埋点**
每次预测写入 `predictions` 表（type / input_method / food_name / result_score），为后续分析「哪类食物预测置信度最低」留下数据基础。

**用户反馈功能（`FeedbackWidget`）**
在预测结果页底部加「点此反馈」入口，收集数据质量问题（识别错误、数值不对等），写入 `feedbacks` 表。

**稳定性修复（`3a147af`）**

发现 Serverless 函数在写完响应后立即关闭，导致异步埋点 `fire-and-forget` 数据丢失。

修复方案：将 Supabase 写入改为 `await`，确保数据落地后才返回响应。这是 Serverless 开发的常见陷阱——函数生命周期与进程生命周期不同。

**反馈弹窗层级修复（`3bb8ed5`）**

反馈弹窗被底部导航栏遮挡，z-index 处理不当。修复：弹窗 `z-[60]`，底部 padding 增加安全间距。

---

### 第三阶段：OCR 优化 + API 迁移（2026-05-09 前半）

**OCR Prompt 优化 + 反馈选项扩展（`9afbc03`）**

**OCR 准确率问题**：图片识别时，模型有时「看外观猜品牌」而非「读杯身文字」，导致识别错误。

解决：重写 `identifyPrompt`，加入显式冲突解决规则：
```
1. 杯身有清晰文字 → 以文字为准
2. 文字模糊 → 根据外观判断
3. 视觉与文字矛盾 → 文字优先于视觉
```
这条规则的关键是「优先级显式化」——AI 在多个信号冲突时需要明确指令，而不是让它自主判断。

**反馈选项扩展**：加入「以上都不是」+ 自由文本框（`custom_text` 列），让用户能描述未被预设选项覆盖的问题。

**全面迁移千问 API（`5606296`）**

背景：智谱 API Key 出现「Needs Attention」状态，存在不稳定风险。同时千问 VL Max（即 Qwen2.5-VL）的 OCR 能力更强。

迁移策略：
- 图片模型：`qwen-vl-max-latest`（Qwen2.5-VL Max）
- 文字模型：`qwen-plus-latest`
- 兼容层：在 `lib/zhipu.ts` 中并行维护 `callQwen`，原有 `callZhipu` 保留但弃用
- 迁移完成后统一使用 `callQwen`，移除 `callZhipu` 的所有调用

**设计原则**：迁移不破坏接口，新函数与旧函数签名保持一致，只改实现。

---

### 第四阶段：个性化引擎（2026-05-09 后半）

这是迄今为止最大规模的功能迭代，实现了完整的「个性化学习闭环」。

#### 4.1 Onboarding 问卷（`24aef44`）

**问题**：没有用户体质数据，AI 只能基于「通用人群」预测，个体差异被忽视。

**解法**：首次使用时触发 5 题问卷，建立初始体质档案：

| 题目 | 映射参数 | 分值逻辑 |
|------|---------|---------|
| 喝咖啡多久心跳加快 | caffeine_sensitivity | 很少→30 / 1-2h→50 / 30min内→70 |
| 下午喝咖啡入睡推迟 | caffeine_sensitivity | 不影响→30 / 1h→50 / 2h+→70 |
| 高油辣食后肠胃反应 | gi_sensitivity | 正常→30 / 轻微→50 / 明显→70 |
| 乳糖不耐受/IBS | gi_sensitivity | 有+15（上调） |
| 日常作息 | typical_sleep_hour | 存储作息基准 |

**最终分值**：
```
caffeine_sensitivity = round((Q1 + Q2) / 2)
gi_sensitivity = min(100, Q3 + (有特殊情况 ? 15 : 0))
```

**技术实现**：
- `lib/device-id.ts`：`crypto.randomUUID()` 生成匿名设备 ID，存 localStorage
- `app/api/profile`：POST 接口将体质档案 upsert 到 Supabase `user_profiles` 表
- `OnboardingModal`：底部弹出式问卷（手机端），居中弹窗（桌面端），支持「跳过」使用默认值

#### 4.2 体质档案页重设计（`b53787b`）

将原有「个人设置」（低/中/高三选一）替换为数据驱动的「体质档案」：

- **可视化分值条**：0-100 分的填充进度条，标注「低敏 / 偏低 / 中等 / 偏高 / 高敏」
- **学习进度**：0/5 次反馈进度条，5 次后显示「精准模式已解锁」
- **重新做问卷**入口（清除 localStorage 标记后跳回首页）
- **手动微调**折叠区（保留旧的低/中/高选择器，供有特殊需求的用户覆盖）

#### 4.3 体质参数注入 Prompt（`16cac65`）

**核心设计**：条件注入，而非无脑追加。

```typescript
// lib/user-hint.ts
if (caffeineSensitivity > 60) {
  return `用户对咖啡因较为敏感${countNote}，请适当上调失眠风险10-15分。`
}
// 45-55 区间 → 返回 null，不注入，0 token 浪费
```

**注入规则**：
- 分值在 45-55 之间（接近默认值）→ 不注入，避免噪声
- 分值 > 60 → 注入「请上调风险」
- 分值 < 40 → 注入「请下调风险」
- 有 2+ 次反馈校准 → 加注「已通过 N 次反馈校准」，提升 AI 置信度

**Token 增量**：仅 15-20 token，约原 prompt 的 10%，对模型注意力影响可忽略。

同步移除两个预测页的手动「耐受度/肠胃类型」选择器，改为自动从体质档案推导：
```typescript
deriveTolerance(caffeineSensitivity: number) // 60+→low, 40-→high, else→medium
deriveGutType(giSensitivity: number)          // 60+→diarrhea, 30-→constipation
```

#### 4.4 EWMA 参数更新（`f6acc37` → `26dd14f`）

**核心问题（用户洞察）**：  
预测结果的验证不发生在「刚看完结果的时刻」，而是几小时后睡醒或消化结束后。传统的「结果页反馈」无法收集到真实的事后验证数据。

**最终方案**：将 EWMA 触发点移至**历史记录页**。

**完整闭环**：
```
用户做预测 → 结果存入历史记录（ewmaRating 字段为空）
      ↓
几小时后（睡醒 / 消化结束）
      ↓
进历史 Tab → 展开过去的预测卡片
      ↓
看到「实际睡眠如何？」[更难入睡] [差不多] [睡得更好]
      ↓
选择 → ewmaRating 写入 localStorage
      → POST /api/feedback（issue: 'prediction_outcome'）
      → EWMA 计算 → Supabase 更新
      → 前端同步 localStorage 新分值
      → 卡片显示「已验证」紫色徽章
```

**EWMA 公式**：
```
new_val = 0.3 × signal + 0.7 × old_val

signal_up   = min(100, old_val + 20)  // 比预测更严重
signal_down = max(0,   old_val - 20)  // 比预测更轻

示例：initial=50，连续3次"更难入睡"
50 → 56 → 61 → 65（渐进收敛，α=0.3 防止过拟合）
```

**责任分离**：
- `FeedbackWidget`（结果页）：仅负责**数据质量**反馈（识别错误、数值不对）
- 历史记录卡片：负责**预测准确性**反馈，驱动 EWMA

---

## 四、关键设计决策汇总

| 决策 | 选择 | 理由 |
|------|------|------|
| AI 调用架构 | Serverless Route → AI API | 无后端运维成本，冷启动可接受 |
| 知识库实现 | 本地 JSON + Prompt 注入 | 比 RAG 轻量，确定性知识不需要语义检索 |
| 个性化参数 | 设备 ID + localStorage + Supabase | 无需注册账号，隐私友好，数据可跨设备恢复 |
| EWMA α 值 | 0.3 | 每次反馈约调整 6 分，5 次反馈后分值漂移约 25%，既有感知又不过拟合 |
| Prompt 注入策略 | 条件注入（偏离默认才生效） | 默认值 50 无信号意义，注入只会带来噪声 |
| 反馈触发时机 | 历史页事后验证 | 预测验证有时间差，即时反馈无法收集到真实体验数据 |
| API 选型 | 千问 Qwen（DashScope） | 国内奶茶品牌 OCR 更准，API 稳定性更好 |

---

## 五、当前功能全景

```
食事预报局
│
├── 熬夜预警机
│   ├── 图片模式：拍饮品 → OCR 识别品牌 → 查知识库 → AI 分析
│   ├── 文字模式：输入品名 → 查知识库 → AI 分析
│   └── 输出：预计入睡时间 · 失眠风险 · 次日状态 · 补救建议
│
├── 消化预测官
│   ├── 图片模式：拍食物 → AI 识别 → 分析消化影响
│   ├── 文字模式：输入菜品 → AI 分析
│   └── 输出：消化通畅分 · 黄金排便时间 · 便秘/腹泻风险 · 建议
│
├── 历史记录
│   ├── 过往预测列表（accordion 展开详情）
│   ├── 事后验证反馈（3档评级，触发 EWMA）
│   └── 「已验证」badge 标记
│
├── 体质档案（原设置页）
│   ├── 咖啡因敏感度可视化分值条（0-100）
│   ├── 肠胃敏感度可视化分值条（0-100）
│   ├── 学习进度（反馈次数 / 5）
│   ├── 重新做问卷入口
│   └── 手动微调折叠区（兼容旧逻辑）
│
└── Onboarding 问卷（首次使用触发）
    └── 5 题 → 初始化 caffeine_sensitivity / gi_sensitivity
```

---

## 六、数据库表结构

```sql
-- 预测埋点
CREATE TABLE predictions (
  id bigserial PRIMARY KEY,
  type text,           -- 'sleep' | 'digest'
  input_method text,   -- 'image' | 'text'
  food_name text,
  drink_name text,
  result_score integer,
  created_at timestamptz DEFAULT now()
);

-- 用户反馈
CREATE TABLE feedbacks (
  id bigserial PRIMARY KEY,
  type text,
  issue text,          -- wrong_name / wrong_caffeine / wrong_prediction / other / prediction_outcome
  drink_name text,
  food_name text,
  correct_value text,
  custom_text text,
  created_at timestamptz DEFAULT now()
);

-- 个性化体质档案
CREATE TABLE user_profiles (
  device_id text PRIMARY KEY,
  caffeine_sensitivity integer DEFAULT 50,   -- EWMA 驱动，0-100
  caffeine_halflife_hours float DEFAULT 5.5,
  gi_sensitivity integer DEFAULT 50,         -- EWMA 驱动，0-100
  gi_transit_hours float DEFAULT 8.0,
  typical_sleep_hour float DEFAULT 23.5,
  feedback_count integer DEFAULT 0,
  last_updated timestamptz DEFAULT now()
);
```

---

## 七、待完成路线图

| 优先级 | 功能 | 说明 |
|--------|------|------|
| P2 | #8 次日反馈机制 | 次日打开 App 时提示回顾昨日预测 |
| P3 | #11 饮食档案持久化 | 每次预测写入用户历史字段 |
| P3 | #12 记忆摘要生成 | 每周一句话摘要，Vercel cron 触发 |
| P4 | #13 主动推送 | 需 PWA 或微信服务号 |
| P4 | #14 接入外卖平台 | 需开放平台合作 |
| UI | Toast 组件 | EWMA 更新后的轻量提示 |
| UI | Badge 标记 | 历史卡片「待验证/已验证」状态 |
| UI | Skeleton 骨架屏 | 预测加载中的占位动画 |

---

*文档生成时间：2026-05-10 · 基于 git log 整理*
