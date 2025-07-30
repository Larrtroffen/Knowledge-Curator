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
	templateFilePath: string;
	overwriteMode: boolean; // true for overwrite, false for append
	pendingStatusIdentifier: string;
	completedStatusIdentifier: string;
}

const DEFAULT_SETTINGS: KnowledgeCuratorSettings = {
	apiEndpoint: "",
	apiKey: "",
	modelName: "gpt-3.5-turbo",
	templateFilePath: "Templates/Knowledge_Curator_Template.md",
	overwriteMode: true,
	pendingStatusIdentifier: "pending",
	completedStatusIdentifier: "completed",
};

export default class KnowledgeCurator extends Plugin {
	settings: KnowledgeCuratorSettings;
	view: CuratorView | null = null;

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
					this.view.refreshVaultTree();
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
			.setName("Template File Path")
			.setDesc(
				"Path to the template file within your vault (e.g., Templates/Concept_Template.md)."
			)
			.addText((text) =>
				text
					.setPlaceholder("Templates/Knowledge_Curator_Template.md")
					.setValue(this.plugin.settings.templateFilePath)
					.onChange(async (value) => {
						this.plugin.settings.templateFilePath = value;
						await this.plugin.saveSettings();
					})
			);

		new Setting(containerEl)
			.setName("Generation Mode")
			.setDesc(
				"Choose to overwrite existing content or append new content."
			)
			.addDropdown((dropdown) =>
				dropdown
					.addOption("overwrite", "Overwrite")
					.addOption("append", "Append")
					.setValue(
						this.plugin.settings.overwriteMode
							? "overwrite"
							: "append"
					)
					.onChange(async (value) => {
						this.plugin.settings.overwriteMode =
							value === "overwrite";
						await this.plugin.saveSettings();
					})
			);

		new Setting(containerEl)
			.setName("Pending Status Identifier")
			.setDesc(
				"The frontmatter value for a pending note (e.g., pending)."
			)
			.addText((text) =>
				text
					.setPlaceholder("pending")
					.setValue(this.plugin.settings.pendingStatusIdentifier)
					.onChange(async (value) => {
						this.plugin.settings.pendingStatusIdentifier = value;
						await this.plugin.saveSettings();
					})
			);

		new Setting(containerEl)
			.setName("Completed Status Identifier")
			.setDesc(
				"The frontmatter value for a completed note (e.g., completed, curated)."
			)
			.addText((text) =>
				text
					.setPlaceholder("completed")
					.setValue(this.plugin.settings.completedStatusIdentifier)
					.onChange(async (value) => {
						this.plugin.settings.completedStatusIdentifier = value;
						await this.plugin.saveSettings();
					})
			);
	}
}
