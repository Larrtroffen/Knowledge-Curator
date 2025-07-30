import { App } from "obsidian";
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

	/**
	 * Gets a list of available prompt templates from the plugin settings.
	 * @returns A promise that resolves to an array of objects, each containing the template's name and prompt.
	 */
	async getAvailableTemplates(): Promise<{ name: string; path: string }[]> {
		const { promptTemplates } = this.plugin.settings;
		// Map to the expected structure { name: string; path: string }
		// We use the prompt itself as the 'path' for identification in the dropdown.
		return promptTemplates.map((t) => ({
			name: t.name,
			path: t.prompt, // Using prompt as a unique identifier for selection
		}));
	}

	/**
	 * Generates content for a new note based on a title and a selected prompt template.
	 * @param title The title of the new note.
	 * @param selectedPrompt The prompt string from the selected template.
	 * @returns A promise that resolves to the generated content string.
	 */
	async generateForNoteTitle(
		title: string,
		selectedPrompt: string
	): Promise<string> {
		if (!selectedPrompt) {
			throw new Error(
				"Prompt template is not provided. Please select a template."
			);
		}

		// Replace placeholders in the selected prompt
		const prompt = selectedPrompt.replace(/{{title}}/g, title);

		try {
			// Notice will be handled by the caller (CuratorView) for batch operations
			const generatedContent = await this.apiService.generateContent(
				prompt
			);
			return generatedContent;
		} catch (error) {
			console.error("Error during content generation:", error);
			if (error instanceof Error) {
				// Notice will be handled by the caller
				throw new Error(
					`Failed to generate content for "${title}": ${error.message}`
				);
			} else {
				throw new Error(
					`An unknown error occurred while generating content for "${title}".`
				);
			}
		}
	}
}
