# 开发与联调指南

这份文档用于说明本项目最常用的本地开发流程，包括：

- 如何启动前端与后端服务
- 如何执行类型检查与后端测试
- 如何运行和调试 iOS 应用

## 1. 环境要求

开始前请先确认本机具备以下环境：

- Node.js 20
- npm
- Python 3.11 及以上
- Xcode
- CocoaPods

仓库根目录中的 [`.nvmrc`](/Users/mingminji/workspace/easy_listening/.nvmrc) 当前指定 Node 版本为 `20`。

## 2. 初始化项目

首次拉取项目后，建议先完成下面几步：

```bash
nvm use
npm install
```

后端建议在 `backend/` 目录下创建虚拟环境并安装依赖：

```bash
cd backend
python3 -m venv .venv
./.venv/bin/pip install -e ".[dev]"
cd ..
```

如果你本地没有 `backend/.env_dev`，可以先从示例文件复制：

```bash
cp backend/.env_dev.example backend/.env_dev
```

说明：

- `backend/.env_dev` 用于本地开发环境
- `backend/.env_test` 或测试默认配置用于测试隔离
- 当前仓库的后端测试会强制使用独立 sqlite，不会直接写开发库

## 3. 启动服务

### 3.1 启动移动端开发服务

在仓库根目录执行：

```bash
npm run dev
```

常用变体：

```bash
npm run dev:web
npm run dev:mobile
```

说明：

- `npm run dev` 和 `npm run dev:mobile` 都会启动 Expo 开发服务
- `npm run dev:web` 会以 Web 模式启动 Expo

### 3.2 启动后端服务

在仓库根目录执行：

```bash
npm run backend:dev
```

当前命令实际执行的是：

```bash
PYTHONPATH=backend ./backend/.venv/bin/uvicorn app.main:app --app-dir backend --host 0.0.0.0 --port 8000 --reload
```

这样启动的原因：

- `127.0.0.1` 只允许当前电脑自己访问
- `0.0.0.0` 允许 iOS 模拟器、Expo 局域网调试和真机访问到本机后端
- 移动端默认会按平台尝试本机后端地址：iOS 模拟器优先 `http://127.0.0.1:8000`，Android 模拟器优先 `http://10.0.2.2:8000`，再兜底 Expo/Metro 暴露的局域网地址
- 如果显式设置了 `EXPO_PUBLIC_API_BASE_URL=http://localhost:8000` 或 `http://0.0.0.0:8000`，移动端也会自动改写为当前平台可访问的模拟器地址

可以用下面的命令确认后端是否真的可用：

```bash
curl http://127.0.0.1:8000/healthz
```

如果返回 `{"status":"ok", ...}`，说明服务进程本身已经正常启动。

后端默认提供的主要接口包括：

- `GET /api/resources/articles`
- `GET /api/resources/collections`
- `GET /api/resources/topics`
- `GET /api/articles`
- `GET /api/series`
- `GET /api/topics`

## 4. 测试程序

### 4.1 前端类型检查

在仓库根目录执行：

```bash
npm run typecheck
```

这个命令会递归执行 workspace 中声明的 `typecheck`，当前主要覆盖 `apps/mobile`。

### 4.2 后端测试

在仓库根目录执行：

```bash
npm run backend:test
```

当前命令实际执行的是：

```bash
PYTHONPATH=backend ./backend/.venv/bin/pytest backend/tests
```

测试默认使用独立 sqlite 数据库，适合本地快速回归。

### 4.3 建议的联调顺序

日常开发建议按下面顺序检查：

1. 先启动后端：`npm run backend:dev`
2. 再启动前端：`npm run dev`
3. 修改代码后先跑：`npm run typecheck`
4. 提交前补跑：`npm run backend:test`

## 5. 运行 iOS 应用

### 5.1 使用 Expo 命令启动

在仓库根目录执行：

```bash
npm run ios
```

这个命令会调用 `expo run:ios`，通常会完成以下事情：

- 检查原生工程
- 编译 iOS App
- 启动模拟器
- 安装并打开应用

如果 Metro 未启动，Expo 会自动拉起相关流程。

### 5.2 使用 Xcode 启动

如果需要看原生日志、调试签名、处理模拟器问题，建议直接打开 Xcode：

- 工程文件：[ios/easylistening.xcworkspace](/Users/mingminji/workspace/easy_listening/ios/easylistening.xcworkspace)

推荐流程：

1. 用 Xcode 打开 `ios/easylistening.xcworkspace`
2. 选择目标设备或模拟器
3. 点击运行
4. 如需 JS 热更新，保持 `npm run dev` 处于运行状态

### 5.3 iOS 常见注意事项

- `ios/.xcode.env` 会读取当前系统里的 `node`
- `ios/.xcode.env.local` 可以固定本机 Node 路径，避免 Xcode 找不到正确版本
- 如果出现 Pods 与锁文件不同步的问题，先检查 `ios/Podfile.lock` 和 Pods 是否一致
- 如果页面提示“资源接口暂时不可用”，先看页面上展示的“当前请求地址”，再确认后端是否能通过 `curl http://127.0.0.1:8000/healthz` 访问
- 真机调试时，如果需要手动指定接口地址，可以设置 `EXPO_PUBLIC_API_BASE_URL=http://你的局域网IP:8000`

当前 iOS Bundle Identifier 配置见：

- 根配置：[app.json](/Users/mingminji/workspace/easy_listening/app.json)
- 移动端配置：[apps/mobile/app.json](/Users/mingminji/workspace/easy_listening/apps/mobile/app.json)

## 6. 常用目录

- 前端入口：[App.tsx](/Users/mingminji/workspace/easy_listening/App.tsx)
- 移动端应用壳层：[apps/mobile/App.tsx](/Users/mingminji/workspace/easy_listening/apps/mobile/App.tsx)
- 后端入口：[backend/app/main.py](/Users/mingminji/workspace/easy_listening/backend/app/main.py)
- 后端测试：[backend/tests/test_resources_api.py](/Users/mingminji/workspace/easy_listening/backend/tests/test_resources_api.py)
- 项目上下文：[docs/project-context.md](/Users/mingminji/workspace/easy_listening/docs/project-context.md)

## 7. 当前可直接使用的命令清单

```bash
npm install
npm run dev
npm run dev:web
npm run dev:mobile
npm run ios
npm run android
npm run typecheck
npm run backend:dev
npm run backend:test
npm run sync:assets
```
