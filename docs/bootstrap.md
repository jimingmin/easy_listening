# Bootstrap Notes

## Why this shape

`easy listening` 以移动端为主，因此初始化时优先建立了 `apps/mobile`，并把共享模型放到 `packages/shared`，为后续复用“英语精听酱”的文章、句子、音频、进度逻辑做准备。

## Reuse plan

当前已确认旧项目中最适合优先迁移的资产包括：

- 文章与句子领域模型
- 资源列表与文章详情接口定义
- 首页/品牌相关静态素材
- 听力播放、逐句展示、遮盖练习的交互思路

## Suggested migration order

1. 完成 App 壳层与导航
2. 对接认证与文章 API
3. 迁移资源列表和文章详情数据模型
4. 重写移动端播放 UI
5. 接入收藏、进度、会员与支付能力

## Notes

- 旧项目 Web 前端使用 React + Vite，组件不能直接复用到 React Native，但领域模型、接口契约、资源文件和交互设计都可以复用
- `references/source-assets` 是同步副本，后续可以按需移动到正式业务资源目录
