import { ItemView, WorkspaceLeaf, Notice } from "obsidian";
import KnowledgeCurator from "./main";
import { VaultScanner, UnresolvedLinkInfo } from "./VaultScanner";
import { GeneratorService } from "./GeneratorService";

export const VIEW_TYPE_CURATOR = "knowledge-curator-view";

export class CuratorView extends ItemView {
	plugin: KnowledgeCurator;
	scanner: VaultScanner;
	generator: GeneratorService;
	contentEl: HTMLElement; // Main content area for the list
	links: UnresolvedLinkInfo[] = [];
	currentSortBy: "frequency" | "alphabetical" = "frequency";
	currentGroupBy: "none" | "folder" = "none";
	searchQuery = "";

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
		return "links-coming-in"; // A more fitting icon for a link-focused view
	}

	async onOpen() {
		const container = this.containerEl.children[1];
		container.empty();
		container.createEl("h2", { text: "Knowledge Curator" });

		// Toolbar
		const toolbar = container.createDiv("curator-toolbar");
		toolbar.style.display = "flex";
		toolbar.style.alignItems = "center";
		toolbar.style.gap = "10px";
		toolbar.style.marginBottom = "10px";

		const refreshButton = toolbar.createEl("button", { text: "Refresh" });
		refreshButton.addEventListener("click", () => {
			this.refreshUnresolvedLinks();
		});

		// Sort Dropdown
		const sortLabel = toolbar.createEl("label", { text: " Sort by: " });
		const sortDropdown = toolbar.createEl("select");
		sortDropdown.appendChild(new Option("Frequency", "frequency"));
		sortDropdown.appendChild(new Option("Alphabetical", "alphabetical"));
		sortDropdown.value = this.currentSortBy;
		sortDropdown.addEventListener("change", (e) => {
			this.currentSortBy = (e.target as HTMLSelectElement).value as
				| "frequency"
				| "alphabetical";
			this.renderLinks();
		});
		sortLabel.appendChild(sortDropdown);

		// Group Dropdown
		const groupLabel = toolbar.createEl("label", { text: " Group by: " });
		const groupDropdown = toolbar.createEl("select");
		groupDropdown.appendChild(new Option("None", "none"));
		groupDropdown.appendChild(new Option("Folder", "folder"));
		groupDropdown.value = this.currentGroupBy;
		groupDropdown.addEventListener("change", (e) => {
			this.currentGroupBy = (e.target as HTMLSelectElement).value as
				| "none"
				| "folder";
			this.renderLinks();
		});
		groupLabel.appendChild(groupDropdown);

		// Search Box
		const searchBox = toolbar.createEl("input", {
			type: "text",
			placeholder: "Search links...",
			attr: { style: "margin-left: auto; width: 200px;" },
		});
		searchBox.addEventListener("input", (e) => {
			this.searchQuery = (
				e.target as HTMLInputElement
			).value.toLowerCase();
			this.renderLinks();
		});

		this.contentEl = container.createDiv("curator-content");
		this.refreshUnresolvedLinks();
	}

	async onClose() {
		// Nothing to clean up for now.
	}

	async refreshUnresolvedLinks() {
		new Notice("Scanning for unresolved links...");
		this.contentEl.empty();
		const statusEl = this.contentEl.createEl("div", {
			text: "Scanning...",
		});

		try {
			this.links = await this.scanner.scanUnresolvedLinks();
			this.renderLinks();
			new Notice(
				`Scan complete. Found ${this.links.length} unresolved links.`
			);
		} catch (error) {
			console.error("Error scanning vault:", error);
			new Notice("Error scanning vault. Check console for details.");
			statusEl.setText("Error scanning vault.");
		}
	}

	renderLinks() {
		this.contentEl.empty();

		let linksToRender = [...this.links];

		// Apply search filter
		if (this.searchQuery) {
			linksToRender = linksToRender.filter((link) =>
				link.linkText.toLowerCase().includes(this.searchQuery)
			);
		}

		// Apply sorting
		linksToRender = this.scanner.sortLinks(
			linksToRender,
			this.currentSortBy
		);

		const listContainer = this.contentEl.createEl("div");

		if (linksToRender.length === 0) {
			listContainer.createEl("p", {
				text:
					this.links.length === 0
						? "No unresolved links found."
						: "No links match your search.",
			});
			return;
		}

		if (this.currentGroupBy === "folder") {
			this.renderGroupedLinkList(listContainer, linksToRender);
		} else {
			this.renderLinkList(listContainer, linksToRender);
		}
	}

	renderLinkList(container: HTMLElement, links: UnresolvedLinkInfo[]) {
		const ul = container.createEl("ul");
		links.forEach((linkInfo) => {
			this.renderLinkItem(ul, linkInfo);
		});
	}

	renderGroupedLinkList(container: HTMLElement, links: UnresolvedLinkInfo[]) {
		const groupedLinks = this.scanner.groupLinksByFolder(links);
		groupedLinks.forEach((linksInGroup, folderPath) => {
			const folderName = folderPath === "" ? "/" : folderPath;
			const folderHeader = container.createEl("h3", {
				text: `📂 ${folderName}`,
			});
			folderHeader.style.cursor = "pointer";
			folderHeader.addEventListener("click", () => {
				const ul = folderHeader.nextElementSibling as HTMLUListElement;
				if (ul) {
					ul.style.display =
						ul.style.display === "none" ? "block" : "none";
				}
			});

			const ul = container.createEl("ul");
			ul.style.marginLeft = "20px";
			linksInGroup.forEach((linkInfo) => {
				this.renderLinkItem(ul, linkInfo);
			});
		});
	}

	renderLinkItem(container: HTMLElement, linkInfo: UnresolvedLinkInfo) {
		const li = container.createEl("li");
		li.addClass("curator-link-item");
		li.style.cursor = "pointer";
		li.style.padding = "5px";
		li.style.borderBottom = "1px solid var(--background-modifier-border)";

		const linkTextSpan = li.createEl("span", {
			text: `[[${linkInfo.linkText}]]`,
		});
		linkTextSpan.style.fontWeight = "bold";

		li.createEl("span", {
			text: ` (被引用 ${linkInfo.frequency} 次)`,
			attr: { style: "color: var(--text-muted); font-size: 0.9em;" },
		});

		// Optional: Add a button to show source files
		const sourceButton = li.createEl("button", {
			text: "...",
			attr: {
				style: "float: right; background: none; border: none; cursor: pointer;",
			},
		});
		sourceButton.addEventListener("click", (e) => {
			e.stopPropagation(); // Prevent triggering the main li click
			this.showSourceFiles(linkInfo);
		});

		li.addEventListener("click", async () => {
			await this.handleLinkClick(linkInfo);
		});
	}

	async handleLinkClick(linkInfo: UnresolvedLinkInfo) {
		const { defaultNewNotePath } = this.plugin.settings;
		const newNotePath = defaultNewNotePath
			? `${defaultNewNotePath}/${linkInfo.linkText}.md`
			: `${linkInfo.linkText}.md`;

		// Check if file was created in the meantime (e.g., by user or another plugin)
		if (this.app.vault.getAbstractFileByPath(newNotePath)) {
			new Notice(`Note "[[${linkInfo.linkText}]]" already exists.`);
			this.refreshUnresolvedLinks(); // Refresh to remove it from the list
			return;
		}

		new Notice(`Creating note for "[[${linkInfo.linkText}]]"...`);

		try {
			let contextSnippets: string | undefined;
			if (this.plugin.settings.enableContextAwareGeneration) {
				new Notice(
					`Gathering context for "[[${linkInfo.linkText}]]"...`
				);
				contextSnippets = await this.generator.getContextSnippets(
					linkInfo.linkText
				);
			}

			const generatedContent = await this.generator.generateForNoteTitle(
				linkInfo.linkText,
				contextSnippets
			);

			// Ensure the target directory exists
			const targetDir = newNotePath.substring(
				0,
				newNotePath.lastIndexOf("/")
			);
			if (
				targetDir &&
				!(await this.app.vault.adapter.exists(targetDir))
			) {
				await this.app.vault.createFolder(targetDir);
			}

			await this.app.vault.create(newNotePath, generatedContent);

			new Notice(
				`Note "[[${linkInfo.linkText}]]" created and populated.`
			);

			// Optionally, open the new file
			// this.app.workspace.getLeaf().openFile(newFile);

			// Refresh the list
			this.refreshUnresolvedLinks();
		} catch (error) {
			console.error(
				`Error creating note for ${linkInfo.linkText}:`,
				error
			);
			new Notice(
				`Failed to create note for "[[${linkInfo.linkText}]]". See console for details.`
			);
		}
	}

	showSourceFiles(linkInfo: UnresolvedLinkInfo) {
		const sourceList = linkInfo.sourceFiles
			.map((path) => `- ${path}`)
			.join("\n");
		new Notice(`Sources for "[[${linkInfo.linkText}]]":\n${sourceList}`, 0); // 0 for no timeout
	}
}
