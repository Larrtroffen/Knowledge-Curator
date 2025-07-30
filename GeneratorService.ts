import { App, TFile, TFolder } from "obsidian";
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
	 * Gets a list of available template files from the configured template folder.
	 * @returns A promise that resolves to an array of objects, each containing the template's name and path.
	 */
	async getAvailableTemplates(): Promise<{ name: string; path: string }[]> {
		const { templateFolderPath } = this.plugin.settings;
		const templates: { name: string; path: string }[] = [];

		if (!templateFolderPath) {
			return []; // Return empty if no folder is configured
		}

		const folder = this.app.vault.getAbstractFileByPath(templateFolderPath);
		if (!(folder instanceof TFolder)) {
			// If it's not a folder or doesn't exist, return empty.
			// Optionally, show a notice or log a warning.
			console.warn(
				`Template folder not found or is not a folder: ${templateFolderPath}`
			);
			return [];
		}

		const children = folder.children;
		for (const child of children) {
			if (child instanceof TFile && child.extension === "md") {
				templates.push({
					name: child.basename,
					path: child.path,
				});
			}
		}
		// Sort templates alphabetically by name
		templates.sort((a, b) => a.name.localeCompare(b.name));
		return templates;
	}

	/**
	 * Generates content for a new note based on a title, optional context snippets, and a selected template path.
	 * @param title The title of the new note.
	 * @param contextSnippets Optional string containing context snippets.
	 * @param templatePath The path to the selected template file.
	 * @returns A promise that resolves to the generated content string.
	 */
	async generateForNoteTitle(
		title: string,
		contextSnippets: string | undefined,
		templatePath: string
	): Promise<string> {
		if (!templatePath) {
			throw new Error(
				"Template path is not provided. Please select a template."
			);
		}

		const templateFile = this.app.vault.getAbstractFileByPath(templatePath);

		if (!(templateFile instanceof TFile)) {
			throw new Error(
				`Template file not found at "${templatePath}". Please check the template selection.`
			);
		}

		let templateContent: string;
		try {
			templateContent = await this.app.vault.read(templateFile);
		} catch (error) {
			console.error("Error reading template file:", error);
			throw new Error(`Could not read template file: ${templatePath}`);
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
