# easy listening

面向 iOS 优先、兼容 Android 的英语听力练习应用。

当前仓库已经完成第一版初始化，目标是尽快把移动端工程跑起来，同时最大化复用“英语精听酱”项目中的内容资产、领域模型与后端接口。

## 当前结构

```text
easy_listening/
├── apps/
│   └── mobile/              # Expo + React Native 客户端
├── packages/
│   └── shared/              # 共享类型与领域模型
├── references/
│   └── source-assets/       # 从“英语精听酱”同步过来的静态素材
├── scripts/
│   └── sync-assets.sh       # 重新同步素材
└── docs/
    └── bootstrap.md         # 初始化决策与迁移方向
```

## 设计选择

- 移动端使用 `Expo + React Native + TypeScript`
- 优先保证 iOS 的开发路径，同时保留 Android 支持
- 共享层先抽出文章、句子、练习相关的核心类型，便于后续直接对接旧后端接口
- 静态资源先以“同步副本”的方式引入，避免过早绑定实现细节

## 下一步建议

1. 确认要继续使用原有 FastAPI 后端，还是为 App 增加独立的 BFF
2. 接入文章列表、文章详情、播放控制的真实 API
3. 落地第一个完整练习流：资源列表 -> 文章详情 -> 逐句播放 -> 跟读/遮盖练习

## 资产来源

旧项目路径：

`/Users/mingminji/workspace/server_106_14_147_33`

执行以下命令可重新同步首批素材：

```bash
npm run sync:assets
```
