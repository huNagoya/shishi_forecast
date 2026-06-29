# 食事预报局 — Claude 工作备忘

## 项目路径
`D:\shishi-forecast`（Next.js 14 + Supabase + Vercel）；小程序 Taro 端在 `D:\shishi-forecast-mp`

## 技术栈
- 前端：Next.js App Router、Tailwind CSS
- AI：千问 Qwen（文字 `qwen-plus-latest` + 图片 OCR `qwen3-vl-plus`）；`lib/zhipu.ts` 内函数名仍叫 callQwen（历史命名，已全部走千问）
- DB：Supabase（predictions、feedbacks 表）
- 部署：Vercel（`vercel.json` 配置 cron keep-alive）

## 已完成任务
- P0-1：反馈弹窗遮挡修复
- P0-2：digest 多菜品食物名识别优化
- P0-3：feedback fire-and-forget 稳定性修复
- P1-5：GitHub README 更新
- P1-4：反馈选项加「以上都不是」+ textarea（FeedbackWidget + API + DB custom_text 列）
- OCR Prompt 优化：identifyPrompt 加显式冲突解决规则（文字优先于视觉）
- 咖啡因知识库扩充：batch1（18品牌131条入库）+ batch2（茶颜悦色5款 + CoCo都可7款，全 estimated），最终 278 条；详见 memory `caffeine-db-enrichment`
- option C：sleep 预测对估算值显示「估算值·仅供参考」徽标（API 返回 `caffeineEstimated`，小程序 sleep 页渲染）

## 待完成任务（按优先级）

### 本周 — 小程序上线前
- [x] request 合法域名白名单（已配 `https://shishiforecast.gaoyan.me`，已备案）
- [ ] 《用户隐私保护指引》后台填写 + `chooseMedia` 隐私授权（采集照片→上传→转千问，必填，否则发布被拒）
- [ ] API 限频防刷（按设备/IP 每日次数上限，公开后防烧 token）
- [ ] 服务类目避开「医疗」+ 健康免责文案（已有「仅供参考」disclaimer）

### P2 — 个性化系统
- [ ] #7 Supabase 新增 `user_profiles` 表（见下方 DDL）
- [ ] #6 Onboarding 问卷（5题，首次使用触发，存 localStorage 后写 user_profiles）
  - Q1 喝咖啡多久心跳加快：很少/1-2小时后/30分钟内
  - Q2 下午3点后喝咖啡入睡推迟：不影响/1小时/2小时以上
  - Q3 高油辣食后肠胃反应：正常/不舒服但能接受/明显不适
  - Q4 是否乳糖不耐受/IBS（可多选）
  - Q5 日常作息：固定/工作日规律周末乱/完全不规律
  - 映射：caffeine_sensitivity (30/50/70)、gi_sensitivity (30/50/70)
- [ ] #10 预测时将用户体质参数注入 system prompt（sleep/route.ts 和 digest/route.ts 从 user_profiles 读取后拼入 prompt）
- [ ] #9 EWMA 参数更新逻辑 — 用户提交反馈后触发，α=0.3，更新 caffeine_sensitivity / gi_sensitivity
- [ ] #8 次日反馈机制 — 次日早上提示回顾昨日预测准确性

### P3 — 持久化记忆
- [ ] #11 用户饮食档案持久化（每次预测写入 user_profiles 的历史字段）
- [ ] #12 记忆摘要生成（每周一句话，Vercel cron 触发）

### P4 — 远期
- [ ] #13 主动推送（需 PWA 或微信服务号）
- [ ] #14 接入美团/饿了么菜单筛选（需开放平台合作）

## user_profiles 表 DDL
```sql
create table user_profiles (
  device_id text primary key,
  -- 咖啡因相关
  caffeine_sensitivity integer default 50,
  caffeine_halflife_hours float default 5.5,
  -- 肠胃相关
  gi_sensitivity integer default 50,
  gi_transit_hours float default 8.0,
  -- 作息基准
  typical_sleep_hour float default 23.5,
  -- 可信度
  feedback_count integer default 0,
  last_updated timestamptz default now()
);
```

## feedbacks 表补充
```sql
ALTER TABLE feedbacks ADD COLUMN custom_text text;
```

## 个性化引擎逻辑（面试可解释）
- Onboarding 问卷 → 初始化 user_profiles 参数
- 每次预测 → 读取 user_profiles → 拼入 prompt system context
- 用户反馈 → EWMA 更新：new_val = α × feedback_signal + (1-α) × old_val，α=0.3
- feedback_count < 5 时前端显示"预测准确度随使用次数提升，当前基于通用数据"

## 关于模型（2026-06 现状）
- 图片识别：digest 和 sleep 都用 `qwen3-vl-plus`
- 文字预测：digest 和 sleep 都用 `qwen-plus-latest`
- 已是较新千问，无进一步切换计划
