import {
	App,
	Notice,
	Plugin,
	PluginSettingTab,
	Setting,
	WorkspaceLeaf,
	Modal,
	TextComponent,
	TextAreaComponent,
} from "obsidian";
import { CuratorView, VIEW_TYPE_CURATOR } from "./CuratorView";

interface PromptTemplate {
	name: string;
	prompt: string;
}

interface KnowledgeCuratorSettings {
	apiEndpoint: string;
	apiKey: string;
	modelName: string;
	promptTemplates: PromptTemplate[]; // New prompt-based template system
	defaultNewNotePath: string;
	language: "en" | "zh"; // New setting for language
}

const DEFAULT_SETTINGS: KnowledgeCuratorSettings = {
	apiEndpoint: "",
	apiKey: "",
	modelName: "gpt-3.5-turbo",
	promptTemplates: [
		{
			name: "Default Summary",
			prompt: "Please provide a comprehensive summary of the topic: {{title}}.",
		},
	], // Default to a simple prompt template
	defaultNewNotePath: "", // Default to root of vault
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

class TemplateModal extends Modal {
	template: PromptTemplate;
	onSave: (template: PromptTemplate) => void;

	constructor(
		app: App,
		template: PromptTemplate | null,
		onSave: (template: PromptTemplate) => void
	) {
		super(app);
		this.onSave = onSave;
		this.template = template || { name: "", prompt: "" };
	}

	onOpen() {
		const { contentEl } = this;
		contentEl.createEl("h2", {
			text: this.template.name ? "Edit Template" : "Add New Template",
		});

		let nameInput: TextComponent;
		let promptInput: TextAreaComponent;

		new Setting(contentEl)
			.setName("Template Name")
			.setDesc("A unique name for your prompt template.")
			.addText((text) => {
				nameInput = text;
				nameInput.setValue(this.template.name).onChange((value) => {
					this.template.name = value;
				});
			});

		new Setting(contentEl)
			.setName("Prompt")
			.setDesc(
				"The prompt text. Use {{title}} as a placeholder for the link name."
			)
			.addTextArea((text) => {
				promptInput = text;
				promptInput.setValue(this.template.prompt).onChange((value) => {
					this.template.prompt = value;
					// Auto-resize the textarea
					text.inputEl.style.height = "auto";
					text.inputEl.style.height =
						text.inputEl.scrollHeight + "px";
				});
			});

		const buttonContainer = contentEl.createDiv(
			"curator-modal-button-container"
		);
		new Setting(buttonContainer).addButton((btn) => {
			btn.setButtonText("Save")
				.setCta()
				.onClick(() => {
					if (!this.template.name || !this.template.prompt) {
						new Notice("Name and Prompt cannot be empty.");
						return;
					}
					this.onSave(this.template);
					this.close();
				});
		});

		new Setting(buttonContainer).addButton((btn) => {
			btn.setButtonText("Cancel").onClick(() => {
				this.close();
			});
		});
	}

	onClose() {
		const { contentEl } = this;
		contentEl.empty();
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

		// Prompt Templates Management
		containerEl.createEl("h3", { text: "Prompt Templates" });
		containerEl.createEl("p", {
			text: "Define and manage your prompt templates for AI generation. Use {{title}} as a placeholder for the link name.",
			cls: "setting-item-description",
		});

		const templatesContainer = containerEl.createDiv(
			"prompt-templates-container"
		);

		const renderTemplates = () => {
			templatesContainer.empty();
			this.plugin.settings.promptTemplates.forEach((template, index) => {
				const templateSetting = new Setting(templatesContainer)
					.setName(`Template ${index + 1}: ${template.name}`)
					.setDesc(template.prompt)
					.setClass("prompt-template-item");

				templateSetting.addExtraButton((button) => {
					button
						.setIcon("pencil")
						.setTooltip("Edit")
						.onClick(() => {
							const modal = new TemplateModal(
								this.app,
								{ ...template },
								(updatedTemplate) => {
									this.plugin.settings.promptTemplates[
										index
									] = updatedTemplate;
									this.plugin.saveSettings();
									renderTemplates();
								}
							);
							modal.open();
						});
				});

				templateSetting.addExtraButton((button) => {
					button
						.setIcon("trash")
						.setTooltip("Delete")
						.onClick(() => {
							// For deletion, a simple confirm is usually enough,
							// but we can create a custom modal if preferred.
							// For now, let's stick to confirm for deletion.
							if (
								confirm(
									`Are you sure you want to delete the template "${template.name}"?`
								)
							) {
								this.plugin.settings.promptTemplates.splice(
									index,
									1
								);
								this.plugin.saveSettings();
								renderTemplates(); // Re-render
							}
						});
				});
			});
		};

		new Setting(templatesContainer)
			.setName("Add new template")
			.setDesc("Create a new prompt template.")
			.addButton((btn) => {
				btn.setButtonText("Add")
					.setCta()
					.onClick(() => {
						const modal = new TemplateModal(
							this.app,
							null,
							(newTemplate) => {
								this.plugin.settings.promptTemplates.push(
									newTemplate
								);
								this.plugin.saveSettings();
								renderTemplates();
							}
						);
						modal.open();
					});
			});

		renderTemplates(); // Initial render

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
