# Obsidian Knowledge Curator (知识策展人)

“Knowledge Curator” (知识策展人) 是一个 Obsidian 插件，它作为一个结构驱动的内容填充工具，旨在帮助您管理和丰富您的 Vault。它会扫描您现有的笔记，并根据预设模板和 AI 服务，一键为“待填充”的笔记生成详细内容。

## 核心功能

1.  **保险库状态树 (Vault Status Tree):**

    -   在专属的侧边栏视图中，以列表形式（未来将升级为文件目录树）展示 Vault 中所有 Markdown 笔记。
    -   每个笔记前都有一个状态图标，清晰指示其内容状态：
        -   ⚪️ **待填充 (Pending):** 笔记为空、无 Frontmatter 状态标识，或状态为 `status: pending`。
        -   🟢 **已完成 (Completed):** Frontmatter 状态为 `status: completed` (或用户自定义的完成标识)。
        -   🟡 **处理中 (In Progress):** 插件正在为该笔记生成内容。
        -   🔴 **错误 (Error):** 上次生成时发生 API 或其他错误。

2.  **一键内容生成 (One-Click Population):**

    -   在侧边栏中单击任何“待填充”的笔记。
    -   插件会以该笔记的标题作为关键词，结合用户预设的模板，调用 OpenAI 兼容的 AI 接口生成内容。
    -   生成的内容会覆盖（未来可配置为追加）到原笔记中。
    -   生成成功后，笔记的 Frontmatter 状态会自动更新，侧边栏视图也会实时刷新。

3.  **模板驱动生成 (Template-Driven Generation):**

    -   用户可以在插件设置中指定一个 Vault 内的笔记作为模板文件 (例如 `Templates/Concept_Template.md`)。
    -   插件会读取模板内容，并将占位符（如 `{{title}}`）替换为当前笔记的标题，然后发送给 AI 进行内容生成。这使得提示词 (Prompt) 的定制非常灵活。

4.  **纯 OpenAI 兼容接口支持:**

    -   设置中仅需提供 API 端点 URL (API Endpoint URL) 和 API 密钥 (API Key)。
    -   这保证了插件可以无缝对接 OpenAI 官方 API、Azure OpenAI，以及任何通过 Ollama、LM Studio 等工具搭建的本地 LLM 服务，只要其提供 OpenAI 兼容的接口。
    -   用户还可以选择具体的模型名称（如 `gpt-4-turbo`, `llama3:instruct`）。

5.  **智能状态管理 (Intelligent Status Management):**
    -   生成成功后，插件会自动在笔记的 Frontmatter 区域添加或更新状态信息，例如：
        ```yaml
        ---
        status: completed
        curated_by: KnowledgeCurator
        curated_at: 2024-05-21T10:00:00
        ---
        ```
    -   这不仅用于在侧边栏中更新图标，也方便用户使用 Dataview 等其他插件进行后续的查询和管理。

## 插件架构

本插件采用模块化设计，主要包含以下几个核心部分：

-   **`main.ts`**: 插件的入口点。负责注册侧边栏视图、命令（如打开视图、刷新扫描）和设置页面。是插件生命周期管理的核心。
-   **`CuratorView.ts`**: 侧边栏 UI 的核心。负责渲染笔记列表、处理用户点击事件、调用内容生成服务，并更新笔记文件和其 Frontmatter。它直接与用户交互。
-   **`VaultScanner.ts`**: 负责遍历 Vault，通过 `app.metadataCache` 读取每个 Markdown 文件的 Frontmatter，判断其状态（待填充、已完成等），并构建一个供 UI 渲染的数据结构。
-   **`GeneratorService.ts`**: 内容生成的核心协调器。它接收笔记标题，读取用户指定的模板文件，将标题注入模板形成最终的 Prompt，然后调用 `ApiService`。
-   **`ApiService.ts`**: 专门的网络通信模块。负责与 OpenAI 兼容的 API 端点进行通信。它构造请求头（包括 `Authorization`）和请求体，处理网络请求和可能发生的错误，并返回 AI 生成的原始文本内容。
-   **设置 (`KnowledgeCuratorSettings`)**: 在 `main.ts` 中定义，包含了所有用户可配置的选项，如 API 信息、模板路径、状态标识符等。设置数据通过 Obsidian 的 API 进行加载和保存。

## 开发与构建

此项目使用 TypeScript 编写，以提供类型检查和更好的代码可维护性。

### 环境要求

-   [Node.js](https://nodejs.org/) (建议版本 >= 16)
-   [Obsidian](https://obsidian.md/) (用于测试插件)

### 快速开始

1.  **克隆此仓库:**
    ```bash
    git clone https://github.com/Larrtroffen/Knowledge-Curator.git
    cd Knowledge-Curator
    ```
2.  **安装依赖:**
    ```bash
    npm install
    ```
3.  **开发模式 (实时编译):**
    ```bash
    npm run dev
    ```
    此命令会监视 `main.ts` 及其他 `.ts` 文件的更改，并自动将它们编译到 `main.js`。
4.  **构建生产版本:**
    ```bash
    npm run build
    ```
    此命令会进行类型检查并编译生成最终的 `main.js`。

### 在 Obsidian 中手动安装插件

1.  运行 `npm run build` 生成 `main.js`、`manifest.json` 和 `styles.css` (如果有)。
2.  在您的 Obsidian Vault 中，创建一个文件夹，路径为 `.obsidian/plugins/knowledge-curator/` (其中 `knowledge-curator` 是 `manifest.json` 中的 `id`)。
3.  将生成的 `main.js`、`manifest.json` 和 `styles.css` 文件复制到该文件夹中。
4.  重启 Obsidian 并在“设置 -> 插件”中启用 “Knowledge Curator”。

## 路线图

-   **Phase 1 (MVP - 已完成):** 实现核心的扫描、状态识别、点击生成和 API 调用功能，以扁平列表形式展示笔记。
-   **Phase 2 (核心 UI/UX):** 将侧边栏的扁平列表升级为可交互的**目录树**，实现状态图标的实时更新，并加入更友好的确认对话框。
-   **Phase 3 (高级功能与完善):** 探索批量处理、上下文感知生成（结合父笔记、子笔记或链接笔记内容）以及更精细的模板变量支持。

## 许可证

本项目采用 MIT 许可证 - 详见 [LICENSE](LICENSE) 文件。
