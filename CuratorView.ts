import { App, ItemView, WorkspaceLeaf, Notice, TFile } from "obsidian";
import KnowledgeCurator from "./main";
import { VaultScanner, ScannedNote, NoteStatus } from "./VaultScanner";
import { GeneratorService } from "./GeneratorService";

export const VIEW_TYPE_CURATOR = "knowledge-curator-view";

export class CuratorView extends ItemView {
	plugin: KnowledgeCurator;
	scanner: VaultScanner;
	generator: GeneratorService;
	contentEl: HTMLElement; // Explicitly declare contentEl

	constructor(leaf: WorkspaceLeaf, plugin: KnowledgeCurator) {
		super(leaf);
		this.plugin = plugin;
		this.scanner = new VaultScanner(this.app, this.plugin);
		this.generator = new GeneratorService(this.app, this.plugin);
	}

	getViewType() {
		return VIEW_TYPE_CURATOR;
	}

	getDisplayText() {
		return "Knowledge Curator";
	}

	getIcon() {
		return "library";
	}

	async onOpen() {
		const container = this.containerEl.children[1];
		container.empty();
		container.createEl("h2", { text: "Knowledge Curator" });

		const toolbar = container.createDiv("curator-toolbar");
		const refreshButton = toolbar.createEl("button", { text: "Refresh" });
		refreshButton.addEventListener("click", () => {
			this.refreshVaultTree();
		});

		this.contentEl = container.createDiv("curator-content");
		this.refreshVaultTree();
	}

	async onClose() {
		// Nothing to clean up for now.
	}

	async refreshVaultTree() {
		new Notice("Scanning vault...");
		this.contentEl.empty();
		const listContainer = this.contentEl.createEl("ul");

		try {
			const scannedNotes = await this.scanner.scanVault();
			if (scannedNotes.length === 0) {
				listContainer.createEl("li", {
					text: "No markdown notes found.",
				});
			} else {
				scannedNotes.forEach((note) => {
					this.renderNoteItem(listContainer, note);
				});
			}
			new Notice("Vault scan complete.");
		} catch (error) {
			console.error("Error scanning vault:", error);
			new Notice("Error scanning vault. Check console for details.");
			listContainer.createEl("li", { text: "Error scanning vault." });
		}
	}

	renderNoteItem(container: HTMLElement, scannedNote: ScannedNote) {
		const { file, status } = scannedNote;
		const listItem = container.createEl("li");
		listItem.addClass("curator-note-item");
		listItem.dataset.path = file.path;

		const statusIcon = this.getStatusIcon(status);
		listItem.appendChild(statusIcon);

		const fileName = listItem.createEl("span", { text: file.basename });
		fileName.addClass("curator-note-filename");

		listItem.addEventListener("click", async () => {
			await this.handleNoteClick(file, status);
		});
	}

	getStatusIcon(status: NoteStatus): HTMLElement {
		const iconSpan = document.createElement("span");
		iconSpan.addClass("curator-status-icon");
		switch (status) {
			case "pending":
				iconSpan.textContent = "⚪️ ";
				break;
			case "completed":
				iconSpan.textContent = "🟢 ";
				break;
			case "in-progress":
				iconSpan.textContent = "🟡 ";
				// Add a simple spinner or loading text if desired
				break;
			case "error":
				iconSpan.textContent = "🔴 ";
				break;
			default:
				iconSpan.textContent = "⚪️ ";
		}
		return iconSpan;
	}

	async handleNoteClick(file: TFile, currentStatus: NoteStatus) {
		if (currentStatus === "in-progress") {
			new Notice("This note is currently being processed.");
			return;
		}

		const confirmMessage =
			currentStatus === "completed"
				? `This note (${file.basename}) is already complete. Do you want to regenerate its content?`
				: `Are you sure you want to generate content for "${file.basename}"? This will overwrite its current content.`;

		// Using a simple confirm for now. A modal would be better for Phase 2.
		if (!confirm(confirmMessage)) {
			return;
		}

		// Update UI to "in-progress" immediately
		this.updateNoteStatusInUI(file.path, "in-progress");
		new Notice(`Generating content for "${file.basename}"...`);

		try {
			const generatedContent = await this.generator.generateForNoteTitle(
				file.basename
			);

			// Write content to file
			await this.app.vault.process(file, (content) => {
				// For now, we always overwrite. Append mode can be added later.
				// We should also preserve frontmatter if it exists, or add new ones.
				// A more robust solution would parse existing frontmatter, merge, and then write.
				// For MVP, we'll just overwrite.
				return generatedContent;
			});

			// Update frontmatter
			await this.updateNoteFrontmatter(file, "completed");

			new Notice(`Content generated and saved for "${file.basename}".`);
			this.updateNoteStatusInUI(file.path, "completed");
		} catch (error) {
			console.error(`Error generating content for ${file.name}:`, error);
			new Notice(
				`Failed to generate content for "${file.basename}". See console for details.`
			);
			await this.updateNoteFrontmatter(file, "error");
			this.updateNoteStatusInUI(file.path, "error");
		}
	}

	updateNoteStatusInUI(filePath: string, status: NoteStatus) {
		const noteItem = this.contentEl.querySelector(
			`.curator-note-item[data-path="${filePath}"]`
		);
		if (noteItem) {
			const iconElement = noteItem.querySelector(".curator-status-icon");
			if (iconElement) {
				iconElement.replaceWith(this.getStatusIcon(status));
			}
		}
	}

	async updateNoteFrontmatter(file: TFile, status: NoteStatus) {
		try {
			const fileContent = await this.app.vault.read(file);
			const frontmatterRegex = /^---\s*\n([\s\S]*?)\n---\s*\n?/;
			const newStatusValue =
				status === "completed"
					? this.plugin.settings.completedStatusIdentifier
					: status; // For 'error', we just write 'error'

			const newFrontmatterEntry = `status: ${newStatusValue}\ncurated_by: KnowledgeCurator\ncurated_at: ${new Date().toISOString()}`;

			let newContent;
			const match = fileContent.match(frontmatterRegex);

			if (match) {
				// Frontmatter exists, update it
				const existingFrontmatter = match[1];
				// Simple replacement: replace existing status line or add it.
				// A more robust solution would use a YAML parser.
				const statusRegex = /^status:\s*.*$/m;
				if (statusRegex.test(existingFrontmatter)) {
					newContent = fileContent.replace(
						statusRegex,
						`status: ${newStatusValue}`
					);
				} else {
					// Add status line to existing frontmatter
					const updatedFrontmatter = `${existingFrontmatter.trim()}\nstatus: ${newStatusValue}\ncurated_by: KnowledgeCurator\ncurated_at: ${new Date().toISOString()}`;
					newContent = fileContent.replace(
						frontmatterRegex,
						`---\n${updatedFrontmatter}\n---\n`
					);
				}
			} else {
				// No frontmatter, add it
				newContent = `---\n${newFrontmatterEntry}\n---\n\n${fileContent}`;
			}
			await this.app.vault.modify(file, newContent);
		} catch (error) {
			console.error(
				`Error updating frontmatter for ${file.name}:`,
				error
			);
			// Non-critical error, so we don't throw, just log.
		}
	}
}
