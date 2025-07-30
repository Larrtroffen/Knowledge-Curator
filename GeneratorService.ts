import { App, TFile, Notice } from "obsidian";
import KnowledgeCurator from "./main";
import { ApiService } from "./ApiService";

export class GeneratorService {
	app: App;
	plugin: KnowledgeCurator;
	apiService: ApiService;

	constructor(app: App, plugin: KnowledgeCurator) {
		this.app = app;
		this.plugin = plugin;
		this.apiService = new ApiService(this.plugin);
	}

	async generateForNoteTitle(title: string): Promise<string> {
		const { templateFilePath } = this.plugin.settings;

		if (!templateFilePath) {
			throw new Error(
				"Template file path is not configured. Please check the plugin settings."
			);
		}

		const templateFile =
			this.app.vault.getAbstractFileByPath(templateFilePath);

		if (!(templateFile instanceof TFile)) {
			throw new Error(
				`Template file not found at "${templateFilePath}". Please check the path in settings.`
			);
		}

		let templateContent: string;
		try {
			templateContent = await this.app.vault.read(templateFile);
		} catch (error) {
			console.error("Error reading template file:", error);
			throw new Error(
				`Could not read template file: ${templateFilePath}`
			);
		}

		// Replace placeholders. For now, only {{title}} is supported.
		const prompt = templateContent.replace(/{{title}}/g, title);

		try {
			new Notice(`Generating content for "${title}"...`);
			const generatedContent = await this.apiService.generateContent(
				prompt
			);
			new Notice(`Content generated for "${title}".`);
			return generatedContent;
		} catch (error) {
			console.error("Error during content generation:", error);
			if (error instanceof Error) {
				// Notice is already shown by ApiService for some errors, but we can add one here too.
				new Notice(
					`Failed to generate content for "${title}": ${error.message}`
				);
			} else {
				new Notice(
					`An unknown error occurred while generating content for "${title}".`
				);
			}
			// Re-throw to allow the caller to handle the error state (e.g., set note status to 'error')
			throw error;
		}
	}
}
