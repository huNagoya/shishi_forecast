# 食事预报局

> 喝什么吃什么，身体后续一手掌握

**线上地址：** [shishi-forecast.gaoyan.me](http://shishi-forecast.gaoyan.me)

---

## 功能

| 功能 | 说明 |
|------|------|
| 😴 熬夜预警机 | 拍摄或描述饮品，预测咖啡因对今晚睡眠的影响 |
| 🚽 如厕预测官 | 拍摄或描述食物，预测消化节律与黄金如厕时段 |
| 📋 历史记录 | 查看过往预测结果 |

## 技术栈

- **框架**：Next.js 16 + React 19 + TypeScript
- **样式**：Tailwind CSS v4
- **AI**：智谱 GLM-4V（图像识别）/ GLM-4-Flash（文字分析）
- **数据库**：Supabase（用户行为埋点 + 反馈收集）
- **部署**：Vercel

## 咖啡因知识库

内置 137 条中国常见饮品咖啡因数据，覆盖霸王茶姬（69款）、卡旺卡（16款）、星巴克、瑞幸、蜜雪冰城等主流品牌，数据来源于品牌官方小程序及消费者委员会检测报告。

## 本地运行

```bash
npm install
npm run dev
```

需要在 `.env.local` 配置：

```
ZHIPU_API_KEY=your_key
NEXT_PUBLIC_SUPABASE_URL=your_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_key
```
