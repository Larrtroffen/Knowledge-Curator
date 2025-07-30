import { App, TFile, TAbstractFile, CachedMetadata } from "obsidian";
import KnowledgeCurator from "./main";

export type NoteStatus = "pending" | "completed" | "in-progress" | "error";

export interface ScannedNote {
	file: TFile;
	status: NoteStatus;
}

export class VaultScanner {
	app: App;
	plugin: KnowledgeCurator;

	constructor(app: App, plugin: KnowledgeCurator) {
		this.app = app;
		this.plugin = plugin;
	}

	async scanVault(): Promise<ScannedNote[]> {
		const scannedNotes: ScannedNote[] = [];
		const files = this.app.vault.getFiles();

		for (const file of files) {
			if (file instanceof TFile && file.extension === "md") {
				const status = this.getNoteStatus(file);
				scannedNotes.push({ file, status });
			}
		}
		return scannedNotes;
	}

	getNoteStatus(file: TFile): NoteStatus {
		const cache = this.app.metadataCache.getFileCache(file);
		const frontmatter = cache?.frontmatter;

		if (frontmatter && frontmatter.status) {
			const statusValue = String(frontmatter.status).toLowerCase();
			if (
				statusValue ===
				this.plugin.settings.completedStatusIdentifier.toLowerCase()
			) {
				return "completed";
			}
			if (statusValue === "in-progress" || statusValue === "processing") {
				// Common identifiers for in-progress
				return "in-progress";
			}
			if (statusValue === "error") {
				return "error";
			}
			// If status is present but doesn't match known completed/in-progress/error, treat as pending
			// This allows users to have custom status values that are still considered 'pending' by the curator.
			return "pending";
		}

		// If no frontmatter status, check if the file is empty or only contains frontmatter
		if (file.stat.size === 0) {
			return "pending";
		}

		// A more robust check for empty content (ignoring frontmatter)
		// This is a simplified check; a more thorough one might involve reading the file content.
		// For now, if no status is set, we assume it's pending.
		return "pending";
	}

	// Placeholder for a future method that might build a tree structure
	async scanVaultTree(): Promise<any> {
		// 'any' for now, will define a proper tree node type later
		// This will be implemented in Phase 2 for the tree view
		return {};
	}
}
