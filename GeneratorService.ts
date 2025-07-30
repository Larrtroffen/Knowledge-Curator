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
	 * Generates content for a new note based on a title and optional context snippets.
	 * @param title The title of the new note.
	 * @param contextSnippets Optional string containing context snippets.
	 * @returns A promise that resolves to the generated content string.
	 */
	async generateForNoteTitle(
		title: string,
		contextSnippets?: string
	): Promise<string> {
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

		// Replace placeholders
		let prompt = templateContent.replace(/{{title}}/g, title);

		if (contextSnippets) {
			prompt = prompt.replace(/{{context_snippets}}/g, contextSnippets);
		} else {
			// If no context snippets, remove the placeholder or replace with empty string
			prompt = prompt.replace(/{{context_snippets}}/g, "");
		}

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
				new Notice(
					`Failed to generate content for "${title}": ${error.message}`
				);
			} else {
				new Notice(
					`An unknown error occurred while generating content for "${title}".`
				);
			}
			throw error;
		}
	}
}
