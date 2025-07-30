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
	 * Retrieves context snippets for a given link text from all notes that reference it.
	 * @param linkText The text of the link to find context for.
	 * @returns A promise that resolves to a string containing concatenated context snippets.
	 */
	async getContextSnippets(linkText: string): Promise<string> {
		const allFiles = this.app.vault.getMarkdownFiles();
		const snippets: string[] = [];

		for (const file of allFiles) {
			const fileCache = this.app.metadataCache.getFileCache(file);
			if (!fileCache || !fileCache.links) {
				continue;
			}

			// Check if this file contains the link we're looking for
			const linkExistsInFile = fileCache.links.some(
				(link) => (link.displayText || link.link) === linkText
			);

			if (linkExistsInFile) {
				const fileContent = await this.app.vault.read(file);
				// Simple regex to find lines containing the link [[linkText]]
				// This is a basic implementation and might need refinement for more complex markdown or edge cases.
				const linkRegex = new RegExp(
					`.*\\[\\[${linkText.replace(
						/[-/\\^$*+?.()|[\]{}]/g,
						"\\$&"
					)}\\]\\].*`,
					"gi" // Case-insensitive and global
				);

				const lines = fileContent.split("\n");
				for (const line of lines) {
					if (linkRegex.test(line)) {
						// Add a small context, e.g., the line itself.
						// Could be enhanced to include previous/next lines.
						snippets.push(
							`From "${file.basename}": ${line.trim()}`
						);
					}
				}
			}
		}

		return snippets.join("\n\n");
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
	 * Generates content for a new note based on a title, optional context snippets, and a selected prompt template.
	 * @param title The title of the new note.
	 * @param contextSnippets Optional string containing context snippets.
	 * @param selectedPrompt The prompt string from the selected template.
	 * @returns A promise that resolves to the generated content string.
	 */
	async generateForNoteTitle(
		title: string,
		contextSnippets: string | undefined,
		selectedPrompt: string
	): Promise<string> {
		if (!selectedPrompt) {
			throw new Error(
				"Prompt template is not provided. Please select a template."
			);
		}

		// Replace placeholders in the selected prompt
		const prompt = selectedPrompt.replace(/{{title}}/g, title);

		if (contextSnippets) {
			// Note: The {{context_snippets}} placeholder is not used in the new prompt system
			// as per the user's feedback. Context is handled separately if enabled.
			// If we wanted to re-integrate it, we would add a placeholder like {{context}}
			// to the prompt templates and replace it here.
			// For now, we just ignore the contextSnippets parameter if it's passed.
		}

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
