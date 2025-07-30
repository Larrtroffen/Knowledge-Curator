# Obsidian Knowledge Curator

[![Latest Release](https://img.shields.io/github/v/release/Larrtroffen/Knowledge-Curator?style=flat-square)](https://github.com/Larrtroffen/Knowledge-Curator/releases)
[![License](https://img.shields.io/github/license/Larrtroffen/Knowledge-Curator?style=flat-square)](https://github.com/Larrtroffen/Knowledge-Curator/blob/main/LICENSE)
[![Obsidian Plugin](https://img.shields.io/badge/Obsidian-Plugin-black?style=flat-square&logo=obsidian&logoColor=white)](https://obsidian.md/)

---

**Knowledge Curator** is an Obsidian plugin that acts as a **link-driven knowledge graph extender**. It scans your vault for all `[[wikilinks]]`, identifies "unresolved links" (links that point to non-existent files), and presents them in an intelligently sorted list. With a single click, you can create the corresponding file and use AI to populate it with content, helping you organically grow your knowledge network.

## ✨ Key Features

-   **🔍 Unresolved Link Explorer**: A dedicated sidebar view that lists all your broken links, making it easy to spot gaps in your knowledge base.
-   **🧠 One-Click AI Generation**: Select any unresolved link, and the plugin will automatically create a new note and fill it with AI-generated content based on a prompt template of your choice.
-   **📝 Prompt Template System**: Define and manage custom prompt templates directly in the settings. Use the `{{title}}` placeholder to dynamically insert the link name into your prompts. This offers greater flexibility and control over the AI's output.
-   **📊 Smart Sorting & Grouping**: Sort links by frequency (most referenced first) or alphabetically. Group them by the folder they were found in to focus on specific areas of your vault.
-   **🔗 Context-Aware Generation**: (Optional) The plugin can gather context from all notes that reference a link, providing the AI with background information for more relevant and specific content.
-   **🌐 Internationalization**: Full support for English and Chinese (中文) interfaces, switchable in the settings.
-   **✅ Batch Operations**: Select multiple links using "Select All" or "Deselect All" buttons and generate content for them in a batch.
-   **🔍 Search & Filter**: Quickly find specific unresolved links using the built-in search bar.
-   **⚙️ Highly Configurable**: Easily configure your AI API endpoint, model, and other generation preferences.
-   **🎨 Polished UI/UX**: Enjoy smooth animations and a responsive interface with non-intrusive modals for a better user experience.

<img width="611" height="925" alt="image" src="https://github.com/user-attachments/assets/ace9b747-146a-45dd-ab40-e7ec3545876f" />

<img width="1125" height="1139" alt="d25e2f32-f157-4aec-bba7-5fbfc491d3c9" src="https://github.com/user-attachments/assets/c6fd7aed-6ed3-4284-8908-253ac672adec" />

## 🚀 Getting Started

### Prerequisites

-   [Obsidian](https://obsidian.md/) (version 1.0.0 or higher)
-   An API key for an OpenAI-compatible service (e.g., OpenAI, local LLMs).

### Installation

**From Community Plugins (Recommended when available)**

1.  Go to `Settings` > `Community Plugins`.
2.  Turn on `Community plugins`.
3.  Click `Browse` and search for "Knowledge Curator".
4.  Click `Install` and then `Enable`.

**For Testing (Using BRAT)**

1.  Install the [BRAT](https://github.com/TfTHacker/obsidian42-brat) plugin.
2.  In Obsidian, open the command palette (`Ctrl+P` or `Cmd+P`) and run `BRAT: Add a beta plugin for testing`.
3.  Enter this repository's URL: `https://github.com/Larrtroffen/Knowledge-Curator`.
4.  Enable "Knowledge Curator" in your community plugins list.

**Manual Installation**

1.  Download the latest release from the [Releases page](https://github.com/Larrtroffen/Knowledge-Curator/releases).
2.  Create a folder named `knowledge-curator` in your vault's `.obsidian/plugins/` directory.
3.  Move the downloaded `main.js`, `manifest.json`, and `styles.css` files into the new folder.
4.  Enable "Knowledge Curator" in `Settings` > `Community Plugins`.

### Configuration

1.  Open the "Knowledge Curator" plugin settings.
2.  **API Configuration**:
    -   **API Endpoint URL**: Your OpenAI-compatible API endpoint (e.g., `https://api.openai.com/v1/chat/completions`).
    -   **API Key**: Your secret API key.
    -   **Model Name**: The model to use for generation (e.g., `gpt-4`, `gpt-3.5-turbo`).
3.  **Prompt Templates**:
    -   This is where you define the instructions for the AI. You can add, edit, or delete prompt templates.
    -   Click "Add new template". A modal will appear.
    -   **Template Name**: Give your template a unique name (e.g., "Detailed Summary").
    -   **Prompt**: Enter the actual prompt for the AI. Use `{{title}}` as a placeholder for the unresolved link's name. For example: `Please provide a comprehensive summary of the topic: {{title}}. Include key concepts, important figures, and historical context.`
    -   Click "Save" to add the template.
4.  **Generation Configuration**:
    -   **Default Folder for New Notes**: The folder where new notes will be created (e.g., `Inbox`). Leave empty to create in the vault root.
    -   **Enable Context-Aware Generation**: If enabled, the plugin will find all notes that reference the unresolved link and append their content to the AI prompt as context.
5.  **Interface**:
    -   **Interface Language**: Choose between `English` and `中文 (Chinese)`.

## 📖 How to Use

1.  **Open the View**: Open the Knowledge Curator view from the Obsidian ribbon or by running the `Open Knowledge Curator view` command.
2.  **Scan for Links**: The plugin automatically scans for unresolved links on load. You can manually refresh using the refresh button in the sidebar.
3.  **Explore Links**: Browse the list of unresolved links. You can sort, group, and search to find the ones you want to address.
4.  **Select a Prompt Template**: In the Curator View's toolbar, use the dropdown to select one of your configured prompt templates.
5.  **Select & Generate**:
    -   **Single Link**: Click the checkbox next to a link, then click the "Generate Selected" button.
    -   **Multiple Links**: Use the "Select All" button to select all visible links, or manually select multiple checkboxes. Then click "Generate Selected".
6.  **Review & Refine**: The plugin will create the new note (e.g., `My Link Title.md`) and fill it with the entire AI-generated output based on your chosen prompt. The link will disappear from the unresolved list. You can then open the new note and review or edit the content.

## 🏗️ Workflow Diagram

```mermaid
graph TD
    A[Open Curator View] --> B[Scan Vault for Unresolved Links];
    B --> C{Display Links in Sidebar};
    C -- User Selects Link(s) & Prompt Template --> D[Create New Note File];
    D -- Optional: Gather Context --> E[Format Prompt with {{title}}];
    E --> F[Call AI API for Content];
    F --> G[Populate New Note with AI Output];
    G --> H[Refresh Link List];
    H --> C;
```

## 🛠️ Development

This project is built with TypeScript and uses ESBuild for bundling.

### Setup

1.  **Clone the repository**:
    ```bash
    git clone https://github.com/Larrtroffen/Knowledge-Curator.git
    cd Knowledge-Curator
    ```
2.  **Install dependencies**:
    ```bash
    npm install
    ```

### Scripts

-   `npm run dev`: Starts the development server, watching for file changes and recompiling.
-   `npm run build`: Compiles TypeScript and bundles the plugin into the `dist` folder.
-   `npm run version`: Bumps the plugin version using `version-bump.mjs`.

### Project Structure

-   `main.ts`: Entry point of the plugin. Handles settings, commands, and view registration.
-   `CuratorView.ts`: Manages the sidebar UI, user interactions, and rendering of the link list.
-   `VaultScanner.ts`: Responsible for scanning the vault and identifying unresolved links.
-   `GeneratorService.ts`: Handles the logic for fetching templates, gathering context, and orchestrating content generation.
-   `ApiService.ts`: A simple service for making API calls to the LLM endpoint.
-   `i18n.ts`: Contains all translation strings for internationalization.

## 🤝 Contributing

Contributions are what make the open-source community such an amazing place to learn, inspire, and create. Any contributions you make are **greatly appreciated**.

If you have a suggestion that would make this better, please fork the repo and create a pull request. You can also simply open an issue with the tag "enhancement". Don't forget to give the project a star! Thanks again!

1.  Fork the Project
2.  Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3.  Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4.  Push to the Branch (`git push origin feature/AmazingFeature`)
5.  Open a Pull Request

## 📄 License

Distributed under the MIT License. See `LICENSE` for more information.

## 🙏 Acknowledgments

-   The design and concept were inspired by the need to streamline the process of expanding a personal knowledge base.
-   Thanks to the Obsidian community for providing an excellent platform and API for plugin development.
-   This plugin was built with the help of the [Obsidian Sample Plugin](https://github.com/obsidianmd/obsidian-sample-plugin) template.
