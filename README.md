# easy listening

面向 iOS 优先、兼容 Android 的英语听力练习应用。

当前仓库已经完成第一版初始化，目标是尽快把移动端工程跑起来，同时最大化复用“英语精听酱”项目中的内容资产、领域模型与后端接口。

项目长期上下文见 [docs/project-context.md](/Users/mingminji/workspace/easy_listening/docs/project-context.md)：旧项目工程目录为 `/Users/mingminji/workspace/server_106_14_147_33`，本项目核心目标是利用其现有核心语料资源，提供更方便、简洁的英语听力练习方式。核心功能准则是：类似 Apple Podcasts 的英语播客体验、增加中英双语字幕、支持逐句精听。

## 当前结构

```text
easy_listening/
├── backend/                 # FastAPI 资源服务（真实资源列表数据）
├── apps/
│   └── mobile/              # Expo + React Native 客户端
├── packages/
│   └── shared/              # 共享类型与领域模型
├── references/
│   └── source-assets/       # 从“英语精听酱”同步过来的静态素材
├── scripts/
│   └── sync-assets.sh       # 重新同步素材
└── docs/
    ├── project-context.md   # 项目长期上下文与旧项目源码位置
    └── bootstrap.md         # 初始化决策与迁移方向
```

开发启动、测试与 iOS 调试说明见 [docs/development.md](/Users/mingminji/workspace/easy_listening/docs/development.md)。

## 设计选择

- 移动端使用 `Expo + React Native + TypeScript`
- 后端使用 `FastAPI + SQLAlchemy`
- 优先保证 iOS 的开发路径，同时保留 Android 支持
- 共享层先抽出文章、句子、练习相关的核心类型，便于后续直接对接旧后端接口
- 静态资源先以“同步副本”的方式引入，避免过早绑定实现细节
- 后端环境切分参考“英语精听酱”：`dev`、`prod`、`test` 三套运行语义，其中 `test` 强制隔离到独立 sqlite

## 下一步建议

1. 接入文章详情、句子列表和全文/逐句播放的真实 API
2. 让移动端资源页改用新后端的真实列表、分类和合集接口
3. 落地第一个完整练习流：资源列表 -> 文章详情 -> 逐句播放 -> 跟读/遮盖练习

## 资产来源

旧项目路径：

`/Users/mingminji/workspace/server_106_14_147_33`

执行以下命令可重新同步首批素材：

```bash
npm run sync:assets
```

启动后端开发服务：

```bash
npm run backend:dev
```
