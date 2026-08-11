# 桌面宠物任务助手 - 项目初步设计文档

> 版本：v0.1.0
> 更新日期：2026-08-11
> 作者：KPBL Team

---

## 一、项目背景与目标

### 1.1 项目背景

现代人在日常工作/学习中需要频繁切换多种任务管理工具（Todoist、滴答清单、便签等），
但这些工具都需要主动打开窗口、点击菜单，使用成本较高；而桌面宠物作为常驻在桌面
右下角的小角色，可以做到「随叫随到、不抢焦点、不打扰」，是天然的轻量任务提醒载体。

### 1.2 项目目标

打造一款 **Windows 桌面端的桌面宠物 + 任务管理** 一体化应用，具备以下核心价值：

- **常驻陪伴**：桌面宠物以透明窗口形式常驻屏幕角落，可拖拽、可置顶
- **轻量任务**：右键宠物即可快速添加/查看今日任务，无需打开新窗口
- **智能提醒**：到点弹气泡提醒，支持任务完成动画
- **离线可用**：所有数据本地存储，零依赖云端

### 1.3 非目标（Non-Goals）

- 不做云同步（v1 不做）
- 不做移动端
- 不做多人协作
- 不做复杂日历视图

---

## 二、功能需求

### 2.1 核心功能模块

| 模块 | 功能描述 | 优先级 |
|------|---------|--------|
| 宠物显示 | 透明置顶窗口显示宠物形象 | P0 |
| 宠物拖拽 | 鼠标按住宠物可自由拖动到屏幕任意位置 | P0 |
| 任务添加 | 右键菜单 → 添加任务（标题、时间、备注） | P0 |
| 任务列表 | 点击宠物 → 弹出任务面板，展示今日任务 | P0 |
| 任务完成 | 双击任务标记完成，播放完成动画 | P0 |
| 任务删除 | 在任务面板中删除任务 | P0 |
| 定时提醒 | 到点弹出气泡提醒 | P1 |
| 开机自启 | 系统启动时自动运行 | P1 |
| 设置面板 | 修改宠物形象、提醒声音、置顶等 | P1 |
| 任务统计 | 今日完成数 / 待完成数显示 | P2 |

### 2.2 交互方式

- **左键单击宠物**：展开/收起任务面板
- **左键双击宠物**：快速添加任务
- **右键单击宠物**：弹出上下文菜单（添加任务、设置、退出）
- **鼠标拖拽宠物**：移动宠物位置
- **鼠标悬停宠物**：显示今日任务概要气泡
- **任务项双击**：标记为已完成
- **系统托盘图标**：右键退出/显示主窗口

### 2.3 用户流程图

```
启动应用
   │
   ▼
宠物出现在屏幕右下角（默认位置，记忆上次位置）
   │
   ├──► 右键宠物 ──► 上下文菜单
   │                    ├── 添加任务 ──► 弹出添加任务窗口
   │                    ├── 设置
   │                    └── 退出
   │
   ├──► 左键单击 ──► 展开/收起任务面板
   │
   ├──► 左键双击 ──► 快速添加任务输入框
   │
   └──► 悬停 ──► 显示"今日待办 X 项 / 已完成 Y 项"气泡

任务到点 ──► 弹出气泡 + 宠物跳跃动画 + 系统通知
```

---

## 三、技术选型

### 3.1 技术栈总览

| 层级 | 技术 | 版本 | 选型理由 |
|------|------|------|---------|
| 桌面框架 | Electron | ^31.x | 跨平台、生态成熟、可打包 Windows 安装包 |
| 构建工具 | Vite | ^5.x | 极速 HMR、ESM 原生支持 |
| 渲染层框架 | React | ^18.x | 生态丰富、组件化便于维护 |
| 语言 | TypeScript | ^5.x | 类型安全、IDE 智能提示 |
| UI 组件库 | Tailwind CSS | ^3.x | 原子化 CSS、快速出样式 |
| 本地存储 | lowdb (JSON) | ^7.x | 轻量、零依赖、便于调试查看数据 |
| 进程通信 | electron ipcRenderer/ipcMain | - | 主进程负责文件 I/O，渲染进程负责 UI |
| 打包工具 | electron-builder | ^24.x | 一键生成 .exe / .nsis 安装包 |

### 3.2 备选方案对比

**桌面框架：Electron vs Tauri**
- Tauri 体积更小（< 10MB），但需要 Rust 环境，Windows 端 WebView2 兼容性问题
- Electron 体积大（~80MB），但生态最成熟、Windows 体验最稳定，**选 Electron**

**存储：lowdb vs SQLite**
- SQLite 适合大数据量，但桌面宠物任务数据量极小（日 < 100 条）
- lowdb 直接读写 JSON 文件，**开发调试方便、零依赖、选 lowdb**

---

## 四、系统架构

### 4.1 整体架构图

```
┌──────────────────────────────────────────────────────────────┐
│                     Electron Application                     │
│                                                              │
│  ┌────────────────────────────┐  ┌─────────────────────────┐ │
│  │      Main Process          │  │     Renderer Process    │ │
│  │      (Node.js 环境)         │  │     (Chromium + React)  │ │
│  │                             │  │                         │ │
│  │  ┌───────────────────────┐ │  │  ┌───────────────────┐  │ │
│  │  │  WindowManager        │ │  │  │  PetWindow        │  │ │
│  │  │  - 创建透明窗口       │◄┼──┼──┤  - 宠物形象渲染   │  │ │
│  │  │  - 窗口置顶/拖拽      │ │  │  │  - Lottie 动画    │  │ │
│  │  └───────────────────────┘ │  │  └───────────────────┘  │ │
│  │                             │  │                         │ │
│  │  ┌───────────────────────┐ │  │  ┌───────────────────┐  │ │
│  │  │  TaskService          │◄┼──┼──┤  TaskPanel       │  │ │
│  │  │  - CRUD 任务          │ │  │  │  - 任务列表 UI    │  │ │
│  │  │  - 读写 lowdb         │ │  │  │  - 添加/完成按钮  │  │ │
│  │  └───────────────────────┘ │  │  └───────────────────┘  │ │
│  │                             │  │                         │ │
│  │  ┌───────────────────────┐ │  │  ┌───────────────────┐  │ │
│  │  │  NotificationService  │◄┼──┼──┤  Bubble           │  │ │
│  │  │  - 系统通知           │ │  │  │  - 提醒气泡       │  │ │
│  │  │  - 定时器             │ │  │  └───────────────────┘  │ │
│  │  └───────────────────────┘ │  │                         │ │
│  │                             │  │  ┌───────────────────┐  │ │
│  │  ┌───────────────────────┐ │  │  │  Tray             │  │ │
│  │  │  TrayService          │◄┼──┼──┤  - 托盘菜单       │  │ │
│  │  │  - 托盘图标 + 菜单    │ │  │  └───────────────────┘  │ │
│  │  └───────────────────────┘ │  │                         │ │
│  └────────────────────────────┘  └─────────────────────────┘ │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐  │
│  │                  IPC Bridge (preload)                   │  │
│  │   contextBridge.exposeInMainWorld('pet', {...})         │  │
│  └────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────┘

         ▲                                    ▲
         │                                    │
         └────────────  IPC 通道 ─────────────┘
         ipcRenderer.invoke  ◄──────────►  ipcMain.handle
```

### 4.2 进程职责划分

#### Main Process（主进程，Node.js 环境）

- 创建 BrowserWindow（宠物透明窗口、任务面板窗口、设置窗口）
- 管理窗口生命周期：创建、显示、隐藏、销毁
- 文件 I/O：读写本地 JSON 数据库
- 系统集成：托盘图标、系统通知、开机自启
- 定时器：每分钟检查到期任务

#### Renderer Process（渲染进程，Chromium + React）

- 渲染宠物形象（SVG/Lottie 动画）
- 渲染任务面板、设置面板 UI
- 处理用户交互：点击、拖拽、双击
- 通过 `window.pet` API 调用主进程能力

#### Preload Script（预加载脚本）

- 使用 `contextBridge` 暴露安全的 IPC API 给渲染进程
- 隔离 Node.js API，避免 XSS 风险

### 4.3 IPC 通道设计

| 通道名 | 方向 | 参数 | 返回值 | 说明 |
|--------|------|------|--------|------|
| `task:list` | renderer → main | `{ date?: string }` | `Task[]` | 获取指定日期任务 |
| `task:create` | renderer → main | `TaskInput` | `Task` | 创建任务 |
| `task:update` | renderer → main | `{ id, patch }` | `Task` | 更新任务 |
| `task:delete` | renderer → main | `{ id }` | `boolean` | 删除任务 |
| `task:toggleDone` | renderer → main | `{ id }` | `Task` | 切换完成状态 |
| `window:drag` | renderer → main | `{ dx, dy }` | void | 拖拽宠物 |
| `notify:show` | main → renderer | `NotifyPayload` | - | 通知渲染进程显示气泡 |
| `settings:get` | renderer → main | - | `Settings` | 获取设置 |
| `settings:set` | renderer → main | `Partial<Settings>` | `Settings` | 更新设置 |

---

## 五、模块设计

### 5.1 目录结构

```
desktop-pet/
├── docs/                       # 项目文档
│   ├── DESIGN.md               # 设计文档（本文件）
│   └── assets/                 # 文档图片资源
├── src/
│   ├── main/                   # 主进程代码
│   │   ├── index.ts            # 主进程入口
│   │   ├── windows/
│   │   │   ├── petWindow.ts    # 宠物窗口管理
│   │   │   ├── taskWindow.ts   # 任务面板窗口
│   │   │   └── settingsWindow.ts
│   │   ├── services/
│   │   │   ├── taskService.ts  # 任务数据 CRUD
│   │   │   ├── notifyService.ts # 提醒服务
│   │   │   ├── trayService.ts  # 托盘服务
│   │   │   └── storeService.ts # lowdb 封装
│   │   ├── ipc/
│   │   │   ├── taskIpc.ts      # 任务相关 IPC handler
│   │   │   ├── settingsIpc.ts
│   │   │   └── windowIpc.ts
│   │   └── config/
│   │       └── constants.ts    # 常量定义
│   │
│   ├── preload/                # 预加载脚本
│   │   └── index.ts            # contextBridge 暴露 API
│   │
│   ├── renderer/               # 渲染进程代码
│   │   ├── index.html          # HTML 入口
│   │   ├── src/
│   │   │   ├── main.tsx        # React 入口
│   │   │   ├── App.tsx         # 根组件
│   │   │   ├── pages/
│   │   │   │   ├── Pet.tsx     # 宠物页（透明窗口）
│   │   │   │   ├── TaskPanel.tsx # 任务面板
│   │   │   │   └── Settings.tsx # 设置页
│   │   │   ├── components/
│   │   │   │   ├── PetSprite.tsx # 宠物精灵动画
│   │   │   │   ├── TaskItem.tsx
│   │   │   │   ├── Bubble.tsx   # 提醒气泡
│   │   │   │   └── ContextMenu.tsx
│   │   │   ├── hooks/
│   │   │   │   ├── useTask.ts  # 任务数据 hook
│   │   │   │   └── useDrag.ts   # 拖拽 hook
│   │   │   ├── styles/
│   │   │   │   └── global.css
│   │   │   ├── types/
│   │   │   │   └── task.ts      # TypeScript 类型定义
│   │   │   └── utils/
│   │   │       └── date.ts
│   │   └── vite.config.ts
│   │
│   └── shared/                 # 主进程/渲染进程共享类型
│       └── types.ts
│
├── resources/                  # 应用资源
│   ├── icon.ico                # 应用图标
│   ├── tray-icon.png           # 托盘图标
│   └── pet/                    # 宠物素材
│       ├── idle.svg            # 待机状态
│       ├── happy.svg           # 完成任务动画
│       └── alert.svg           # 提醒动画
│
├── electron-builder.yml        # 打包配置
├── electron.vite.config.ts     # electron-vite 配置
├── package.json
├── tsconfig.json
├── tsconfig.node.json
├── .gitignore
└── README.md
```

### 5.2 关键模块详细设计

#### 5.2.1 PetWindow（宠物窗口）

```typescript
// src/main/windows/petWindow.ts 关键设计
new BrowserWindow({
  width: 160,
  height: 160,
  frame: false,           // 无边框
  transparent: true,      // 透明背景
  resizable: false,
  alwaysOnTop: true,      // 置顶
  skipTaskbar: true,      // 不在任务栏显示
  hasShadow: false,
  webPreferences: {
    preload: join(__dirname, '../preload/index.js'),
    contextIsolation: true,
    nodeIntegration: false,
  }
})
```

- 通过 `setIgnoreMouseEvents(false)` 处理点击穿透
- 拖拽通过监听渲染进程 `mouse-down` 事件 + 主进程 `window.setPosition` 实现

#### 5.2.2 TaskService（任务服务）

```typescript
interface Task {
  id: string;            // UUID
  title: string;         // 任务标题（必填）
  note?: string;         // 备注
  dueAt?: number;        // 到期时间戳（可选）
  done: boolean;         // 是否完成
  createdAt: number;     // 创建时间
  updatedAt: number;     // 更新时间
  date: string;          // 归属日期 YYYY-MM-DD
}
```

- 使用 lowdb 存储到 `app.getPath('userData')/tasks.json`
- 每次写操作通过 `db.write()` 持久化
- 主进程启动时初始化 db，注册 IPC handler

#### 5.2.3 NotifyService（提醒服务）

- 主进程启动 `setInterval` 每 30 秒检查一次任务
- 触发条件：`task.dueAt <= now && !task.done && !task.notified`
- 触发动作：
  1. `Notification` 系统通知
  2. 通过 IPC 通知渲染进程显示气泡 + 播放跳跃动画
  3. 标记 `task.notified = true` 避免重复提醒

---

## 六、数据模型

### 6.1 任务数据

```typescript
// src/shared/types.ts
export interface Task {
  id: string;
  title: string;
  note?: string;
  dueAt?: number;
  done: boolean;
  notified: boolean;
  createdAt: number;
  updatedAt: number;
  date: string;        // YYYY-MM-DD 用于按日查询
}

export interface TaskInput {
  title: string;
  note?: string;
  dueAt?: number;
  date?: string;        // 不传默认今天
}
```

### 6.2 设置数据

```typescript
export interface Settings {
  petSkin: 'cat' | 'dog' | 'robot';   // 宠物皮肤
  alwaysOnTop: boolean;                // 置顶
  enableNotify: boolean;               // 提醒开关
  notifySound: boolean;                // 提醒声音
  autoStart: boolean;                  // 开机自启
  petPosition?: { x: number; y: number }; // 上次位置
}
```

### 6.3 数据库文件结构（tasks.json）

```json
{
  "tasks": [
    {
      "id": "uuid-xxx",
      "title": "完成设计文档",
      "note": "周一前提交",
      "dueAt": 1786500000000,
      "done": false,
      "notified": false,
      "createdAt": 1786400000000,
      "updatedAt": 1786400000000,
      "date": "2026-08-11"
    }
  ],
  "settings": {
    "petSkin": "cat",
    "alwaysOnTop": true,
    "enableNotify": true,
    "notifySound": true,
    "autoStart": false
  }
}
```

---

## 七、UI 设计

### 7.1 宠物形象

- v1 使用 **SVG 矢量图** 实现（不依赖 Lottie，减少体积）
- 三种状态：`idle`（待机）、`happy`（完成任务）、`alert`（提醒）
- 待机状态有缓慢呼吸动画（CSS transform scale）

### 7.2 任务面板

```
┌─────────────────────────────────┐
│  今日任务            2026-08-11 │
│  ──────────────────────────────  │
│  ☐ 完成设计文档                 │
│  ☐ 开会 14:00                   │
│  ☑ 买菜                  已完成  │
│  ☐ 写代码                       │
│  ──────────────────────────────  │
│  [+ 添加任务]                    │
└─────────────────────────────────┘
```

- 圆角卡片、毛玻璃效果（`backdrop-filter: blur`）
- 暗色主题为主，便于长时间使用

### 7.3 提醒气泡

```
   ┌──────────────────────┐
   │ 📌 到点啦！           │
   │  开会 14:00           │
   │  [完成] [稍后提醒]    │
   └──────────────────────┘
            ▲
            │
         🐱 宠物
```

---

## 八、开发计划

### 8.1 里程碑

| 阶段 | 内容 | 产出 |
|------|------|------|
| M0 | 项目搭建、文档、CI | 项目骨架、DESIGN.md、README.md |
| M1 | 宠物窗口 + 拖拽 | 透明窗口、可拖拽宠物 |
| M2 | 任务 CRUD + 面板 UI | 完整任务管理功能 |
| M3 | 提醒 + 托盘 | 定时提醒、系统托盘 |
| M4 | 设置 + 打包 | 设置面板、生成 .exe 安装包 |

### 8.2 当前阶段（M0）交付物

- [x] 项目初步设计文档（本文件）
- [x] 项目骨架代码
- [x] README.md
- [x] git 仓库初始化

---

## 九、风险与待确认事项

| 风险 | 影响 | 应对方案 |
|------|------|---------|
| Windows 透明窗口点击穿透问题 | 中 | 使用 `setIgnoreMouseEvents` + 前向/反向区域 |
| Electron 体积过大（~80MB） | 低 | v1 接受，后续考虑 Tauri 重构 |
| 多显示器分辨率适配 | 中 | 使用 `screen.getDisplayNearestPoint` 适配 |
| 宠物素材版权 | 低 | v1 使用自绘 SVG，避免外部素材 |

### 待确认

- [ ] 宠物形象风格偏好（拟物 / 卡通 / 极简线条）
- [ ] 是否需要多宠物切换
- [ ] 任务是否需要分类（工作 / 学习 / 生活）

---

## 十、参考资料

- Electron 官方文档：https://www.electronjs.org/docs/latest
- electron-vite 脚手架：https://electron-vite.org/
- lowdb：https://github.com/typicode/lowdb
- electron-builder：https://www.electron.build/
