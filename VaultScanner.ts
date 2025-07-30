import { App } from "obsidian";
import KnowledgeCurator from "./main";

export interface UnresolvedLinkInfo {
	linkText: string; // The text of the link, e.g., "数字利维坦"
	frequency: number; // How many times it's referenced
	sourceFiles: string[]; // Array of paths of files that reference this link
	// For grouping by folder, we can store the folder of the first source file
	// or a more complex structure if needed. For now, let's keep it simple.
	// primarySourceFolder?: string;
}

export class VaultScanner {
	app: App;
	plugin: KnowledgeCurator;

	constructor(app: App, plugin: KnowledgeCurator) {
		this.app = app;
		this.plugin = plugin;
	}

	/**
	 * Scans the vault for all unresolved links.
	 * @returns A promise that resolves to an array of UnresolvedLinkInfo objects.
	 */
	async scanUnresolvedLinks(): Promise<UnresolvedLinkInfo[]> {
		const unresolvedLinksMap = new Map<string, UnresolvedLinkInfo>();
		const files = this.app.vault.getMarkdownFiles();

		for (const file of files) {
			const cachedLinks =
				this.app.metadataCache.getFileCache(file)?.links;
			if (!cachedLinks) {
				continue;
			}

			for (const link of cachedLinks) {
				// Check if the link is unresolved
				const destinationFile =
					this.app.metadataCache.getFirstLinkpathDest(
						link.link,
						file.path
					);
				if (!destinationFile) {
					// This is an unresolved link
					const linkText = link.displayText || link.link; // Use displayText if available, otherwise the raw link path

					if (unresolvedLinksMap.has(linkText)) {
						const existingInfo = unresolvedLinksMap.get(linkText)!;
						existingInfo.frequency++;
						if (!existingInfo.sourceFiles.includes(file.path)) {
							existingInfo.sourceFiles.push(file.path);
						}
					} else {
						unresolvedLinksMap.set(linkText, {
							linkText: linkText,
							frequency: 1,
							sourceFiles: [file.path],
						});
					}
				}
			}
		}

		// Convert the Map values to an array
		return Array.from(unresolvedLinksMap.values());
	}

	/**
	 * Sorts unresolved links based on the specified criteria.
	 * @param links The array of UnresolvedLinkInfo objects.
	 * @param sortBy The criteria to sort by ('frequency' or 'alphabetical').
	 * @returns A new array of sorted UnresolvedLinkInfo objects.
	 */
	sortLinks(
		links: UnresolvedLinkInfo[],
		sortBy: "frequency" | "alphabetical"
	): UnresolvedLinkInfo[] {
		const sortedLinks = [...links]; // Create a shallow copy to avoid mutating the original array

		switch (sortBy) {
			case "frequency":
				sortedLinks.sort((a, b) => b.frequency - a.frequency);
				break;
			case "alphabetical":
				sortedLinks.sort((a, b) =>
					a.linkText.localeCompare(b.linkText)
				);
				break;
			// Add more sorting options here in the future (e.g., 'recency')
			default:
				// Default to frequency sort
				sortedLinks.sort((a, b) => b.frequency - a.frequency);
		}
		return sortedLinks;
	}

	/**
	 * Groups unresolved links by the folder of their source files.
	 * For simplicity, this implementation groups by the folder of the *first* source file encountered for each link.
	 * A more complex implementation might group all source files if a link appears in multiple folders.
	 * @param links The array of UnresolvedLinkInfo objects.
	 * @returns A Map where keys are folder paths and values are arrays of UnresolvedLinkInfo.
	 */
	groupLinksByFolder(
		links: UnresolvedLinkInfo[]
	): Map<string, UnresolvedLinkInfo[]> {
		const groupedLinks = new Map<string, UnresolvedLinkInfo[]>();

		for (const link of links) {
			if (link.sourceFiles.length > 0) {
				// Use the folder of the first source file for grouping
				const firstSourcePath = link.sourceFiles[0];
				const folderPath = firstSourcePath.substring(
					0,
					firstSourcePath.lastIndexOf("/")
				);

				if (!groupedLinks.has(folderPath)) {
					groupedLinks.set(folderPath, []);
				}
				groupedLinks.get(folderPath)!.push(link);
			} else {
				// Handle links with no source files (should not happen with current scan logic)
				// Place them in a "No Source Folder" group or handle as desired.
				if (!groupedLinks.has("No Source Folder")) {
					groupedLinks.set("No Source Folder", []);
				}
				groupedLinks.get("No Source Folder")!.push(link);
			}
		}
		return groupedLinks;
	}
}
