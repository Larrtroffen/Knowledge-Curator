import {
	App,
	Notice,
	Plugin,
	PluginSettingTab,
	Setting,
	WorkspaceLeaf,
} from "obsidian";
import { CuratorView, VIEW_TYPE_CURATOR } from "./CuratorView";

interface KnowledgeCuratorSettings {
	apiEndpoint: string;
	apiKey: string;
	modelName: string;
	templateFolderPath: string; // Changed from file path to folder path
	defaultNewNotePath: string;
	enableContextAwareGeneration: boolean;
	language: "en" | "zh"; // New setting for language
}

const DEFAULT_SETTINGS: KnowledgeCuratorSettings = {
	apiEndpoint: "",
	apiKey: "",
	modelName: "gpt-3.5-turbo",
	templateFolderPath: "Templates", // Changed to folder path
	defaultNewNotePath: "", // Default to root of vault
	enableContextAwareGeneration: true, // Default to enabled
	language: "en", // Default to English
};

export default class KnowledgeCurator extends Plugin {
	settings: KnowledgeCuratorSettings;
	view: CuratorView | null = null;
	cachedUnresolvedLinks: Map<string, any> | null = null; // Cache for unresolved links, keyed by folder/group

	async onload() {
		await this.loadSettings();

		// This adds a settings tab so the user can configure various aspects of the plugin
		this.addSettingTab(new KnowledgeCuratorSettingTab(this.app, this));

		// Register the Curator View (sidebar)
		this.registerView(
			VIEW_TYPE_CURATOR,
			(leaf: WorkspaceLeaf) => (this.view = new CuratorView(leaf, this))
		);

		// Add a command to open the Curator View
		this.addCommand({
			id: "open-curator-view",
			name: "Open Knowledge Curator view",
			callback: () => {
				this.activateView();
			},
		});

		// Add a command to refresh the vault scan
		this.addCommand({
			id: "refresh-curator-scan",
			name: "Refresh Curator scan",
			callback: () => {
				if (this.view) {
					this.view.refreshUnresolvedLinks(); // Updated method name
				} else {
					new Notice("Please open the Knowledge Curator view first.");
				}
			},
		});

		// Attempt to activate the view on load if it was active before
		this.app.workspace.onLayoutReady(() => this.activateView());
	}

	async onunload() {
		// Clean up the view when the plugin is unloaded
		if (this.view) {
			this.app.workspace
				.getLeavesOfType(VIEW_TYPE_CURATOR)
				.forEach((leaf) => {
					leaf.detach();
				});
		}
	}

	async activateView() {
		const { workspace } = this.app;

		let leaf: WorkspaceLeaf | null = null;
		const leaves = workspace.getLeavesOfType(VIEW_TYPE_CURATOR);

		if (leaves.length > 0) {
			// A leaf with our view already exists, use it
			leaf = leaves[0];
		} else {
			// Our view could not be found in the workspace, create a new leaf in the right sidebar
			leaf = workspace.getRightLeaf(false);
			if (!leaf) {
				// If right sidebar is not available, try left
				leaf = workspace.getLeftLeaf(false);
			}
			if (leaf) {
				await leaf.setViewState({
					type: VIEW_TYPE_CURATOR,
					active: true,
				});
			}
		}

		if (leaf) {
			workspace.revealLeaf(leaf);
		} else {
			new Notice("Could not open Knowledge Curator view.");
		}
	}

	async loadSettings() {
		this.settings = Object.assign(
			{},
			DEFAULT_SETTINGS,
			await this.loadData()
		);
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}

	getCachedLinks(): Map<string, any> | null {
		return this.cachedUnresolvedLinks;
	}

	setCachedLinks(links: Map<string, any>) {
		this.cachedUnresolvedLinks = links;
	}

	clearCachedLinks() {
		this.cachedUnresolvedLinks = null;
	}
}

class KnowledgeCuratorSettingTab extends PluginSettingTab {
	plugin: KnowledgeCurator;

	constructor(app: App, plugin: KnowledgeCurator) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();

		containerEl.createEl("h2", { text: "Knowledge Curator Settings" });

		new Setting(containerEl)
			.setName("API Endpoint URL")
			.setDesc("The URL for your OpenAI-compatible API endpoint.")
			.addText((text) =>
				text
					.setPlaceholder(
						"e.g., https://api.openai.com/v1/chat/completions"
					)
					.setValue(this.plugin.settings.apiEndpoint)
					.onChange(async (value) => {
						this.plugin.settings.apiEndpoint = value;
						await this.plugin.saveSettings();
					})
			);

		new Setting(containerEl)
			.setName("API Key")
			.setDesc("Your API key for the service.")
			.addText((text) =>
				text
					.setPlaceholder("Enter your API key")
					.setValue(this.plugin.settings.apiKey)
					.onChange(async (value) => {
						this.plugin.settings.apiKey = value;
						await this.plugin.saveSettings();
					})
			);

		new Setting(containerEl)
			.setName("Model Name")
			.setDesc(
				"The model identifier to use for generation (e.g., gpt-4, llama3:instruct)."
			)
			.addText((text) =>
				text
					.setPlaceholder("gpt-3.5-turbo")
					.setValue(this.plugin.settings.modelName)
					.onChange(async (value) => {
						this.plugin.settings.modelName = value;
						await this.plugin.saveSettings();
					})
			);

		new Setting(containerEl)
			.setName("Template Folder Path")
			.setDesc(
				"Path to the folder containing your template files (e.g., Templates). Templates should be markdown files and can use {{title}} and {{context_snippets}} as placeholders."
			)
			.addText((text) =>
				text
					.setPlaceholder("Templates")
					.setValue(this.plugin.settings.templateFolderPath)
					.onChange(async (value) => {
						this.plugin.settings.templateFolderPath = value;
						await this.plugin.saveSettings();
					})
			);

		new Setting(containerEl)
			.setName("Default Folder for New Notes")
			.setDesc(
				"Newly created notes from unresolved links will be placed in this folder. Leave empty to create in the vault root."
			)
			.addText((text) =>
				text
					.setPlaceholder("e.g., Inbox/Unresolved")
					.setValue(this.plugin.settings.defaultNewNotePath)
					.onChange(async (value) => {
						this.plugin.settings.defaultNewNotePath = value;
						await this.plugin.saveSettings();
					})
			);

		new Setting(containerEl)
			.setName("Enable Context-Aware Generation")
			.setDesc(
				"If enabled, the plugin will gather context from notes referencing the link and include it in the prompt for more relevant content generation."
			)
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.enableContextAwareGeneration)
					.onChange(async (value) => {
						this.plugin.settings.enableContextAwareGeneration =
							value;
						await this.plugin.saveSettings();
					})
			);

		new Setting(containerEl)
			.setName("Interface Language")
			.setDesc("Choose the language for the plugin's interface.")
			.addDropdown((dropdown) => {
				dropdown.addOption("en", "English");
				dropdown.addOption("zh", "中文 (Chinese)");
				dropdown.setValue(this.plugin.settings.language);
				dropdown.onChange(async (value) => {
					this.plugin.settings.language = value as "en" | "zh";
					await this.plugin.saveSettings();
					// Optionally, force a redraw of the view if it's open
					if (this.plugin.view) {
						this.plugin.view.onOpen(); // Re-initialize the view to apply new language
					}
				});
			});
	}
}
