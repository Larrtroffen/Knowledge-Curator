import { ItemView, WorkspaceLeaf, Notice, setIcon } from "obsidian";
import KnowledgeCurator from "./main";
import { VaultScanner, UnresolvedLinkInfo } from "./VaultScanner";
import { GeneratorService } from "./GeneratorService";
import { t } from "./i18n";

export const VIEW_TYPE_CURATOR = "knowledge-curator-view";

interface LinkViewState {
	expandedFolders: Set<string>;
	expandedLinks: Set<string>;
	selectedLinks: Set<string>;
}

export class CuratorView extends ItemView {
	plugin: KnowledgeCurator;
	scanner: VaultScanner;
	generator: GeneratorService;
	contentEl: HTMLElement; // Main content area for the list
	links: UnresolvedLinkInfo[] = [];
	availableTemplates: { name: string; path: string }[] = [];
	selectedPrompt = "";
	currentSortBy: "frequency" | "alphabetical" = "frequency";
	currentGroupBy: "none" | "folder" = "folder"; // Default to folder view
	searchQuery = "";
	state: LinkViewState = {
		expandedFolders: new Set(),
		expandedLinks: new Set(),
		selectedLinks: new Set(),
	};

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
		return t(this.plugin.settings.language, "viewTitle");
	}

	getIcon() {
		return "links-coming-in";
	}

	async onOpen() {
		await this.loadView();
		await this.loadTemplates();
	}

	async loadTemplates() {
		try {
			this.availableTemplates =
				await this.generator.getAvailableTemplates();
			if (this.availableTemplates.length > 0) {
				this.selectedPrompt = this.availableTemplates[0].path; // Select first by default
			}
			this.renderTemplateDropdown();
		} catch (error) {
			console.error("Failed to load templates:", error);
			new Notice(
				t(this.plugin.settings.language, "noticeCouldNotLoadTemplates")
			);
		}
	}

	renderTemplateDropdown() {
		const existingDropdown = this.containerEl.querySelector(
			".curator-template-select"
		);
		if (existingDropdown) {
			existingDropdown.remove();
		}

		const toolbar = this.containerEl.querySelector(".curator-toolbar");
		if (!toolbar) return;

		const templateLabel = toolbar.createEl("label", {
			cls: "curator-toolbar-label",
			text: ` ${t(this.plugin.settings.language, "templateLabel")} `,
		});
		const templateDropdown = toolbar.createEl("select", {
			cls: "curator-template-select",
		});

		if (this.availableTemplates.length === 0) {
			templateDropdown.appendChild(new Option("No templates found", ""));
			templateDropdown.disabled = true;
		} else {
			this.availableTemplates.forEach((template) => {
				templateDropdown.appendChild(
					new Option(template.name, template.path)
				);
			});
			templateDropdown.value = this.selectedPrompt;
			templateDropdown.addEventListener("change", (e) => {
				this.selectedPrompt = (e.target as HTMLSelectElement).value;
			});
		}
		templateLabel.appendChild(templateDropdown);
		// Insert before the search box or generate button for better layout
		toolbar.insertBefore(
			templateLabel,
			toolbar.querySelector(".curator-search-input") ||
				toolbar.querySelector(".curator-generate-button")
		);
	}

	async loadView() {
		const lang = this.plugin.settings.language;
		const container = this.containerEl.children[1];
		container.empty();
		container.createEl("h2", { text: t(lang, "viewTitle") });

		// Toolbar
		const toolbar = container.createDiv("curator-toolbar");

		const refreshButton = toolbar.createEl("button", {
			cls: "curator-toolbar-button",
		});
		setIcon(refreshButton, "refresh-cw");
		refreshButton.setAttribute(
			"aria-label",
			t(lang, "refreshButtonAriaLabel")
		);
		refreshButton.addEventListener("click", () => {
			this.refreshUnresolvedLinks(true); // Force refresh
		});

		// Sort Dropdown
		const sortLabel = toolbar.createEl("label", {
			cls: "curator-toolbar-label",
			text: ` ${t(lang, "sortLabel")} `,
		});
		const sortDropdown = toolbar.createEl("select", {
			cls: "curator-toolbar-select",
		});
		sortDropdown.appendChild(
			new Option(t(lang, "sortFrequency"), "frequency")
		);
		sortDropdown.appendChild(
			new Option(t(lang, "sortAlphabetical"), "alphabetical")
		);
		sortDropdown.value = this.currentSortBy;
		sortDropdown.addEventListener("change", (e) => {
			this.currentSortBy = (e.target as HTMLSelectElement).value as
				| "frequency"
				| "alphabetical";
			this.renderLinks();
		});
		sortLabel.appendChild(sortDropdown);

		// Group Dropdown
		const groupLabel = toolbar.createEl("label", {
			cls: "curator-toolbar-label",
			text: ` ${t(lang, "groupLabel")} `,
		});
		const groupDropdown = toolbar.createEl("select", {
			cls: "curator-toolbar-select",
		});
		groupDropdown.appendChild(new Option(t(lang, "groupNone"), "none"));
		groupDropdown.appendChild(new Option(t(lang, "groupFolder"), "folder"));
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
			placeholder: t(lang, "searchPlaceholder"),
			cls: "curator-search-input",
		});
		searchBox.addEventListener("input", (e) => {
			this.searchQuery = (
				e.target as HTMLInputElement
			).value.toLowerCase();
			this.renderLinks();
		});

		// Select All Button
		const selectAllButton = toolbar.createEl("button", {
			cls: "curator-select-all-button",
			text: t(lang, "selectAllButtonText"),
		});
		selectAllButton.setAttribute(
			"aria-label",
			t(lang, "selectAllButtonAriaLabel")
		);
		selectAllButton.addEventListener("click", () => {
			this.selectAllVisibleLinks();
		});

		// Deselect All Button
		const deselectAllButton = toolbar.createEl("button", {
			cls: "curator-deselect-all-button",
			text: t(lang, "deselectAllButtonText"),
		});
		deselectAllButton.setAttribute(
			"aria-label",
			t(lang, "deselectAllButtonAriaLabel")
		);
		deselectAllButton.addEventListener("click", () => {
			this.deselectAllLinks();
		});

		// Generate Selected Button
		const generateButton = toolbar.createEl("button", {
			cls: "curator-generate-button",
			text: t(lang, "generateSelectedButtonText"),
		});
		generateButton.setAttribute(
			"aria-label",
			t(lang, "generateSelectedButtonAriaLabel")
		);
		generateButton.addEventListener("click", () => {
			this.handleGenerateSelected();
		});
		this.updateGenerateButtonState(generateButton);

		this.contentEl = container.createDiv("curator-content");

		// Initial load: try cache, then scan
		const cachedLinks = this.plugin.getCachedLinks();
		if (cachedLinks) {
			this.links = Array.from(cachedLinks.values()).flat();
			this.renderLinks();
			this.refreshUnresolvedLinks(false);
		} else {
			this.refreshUnresolvedLinks(true);
		}
	}

	async onClose() {
		// Nothing specific to clean up for now.
	}

	async refreshUnresolvedLinks(forceRefresh = true) {
		const lang = this.plugin.settings.language;
		if (forceRefresh) {
			new Notice(t(lang, "noticeScanning"));
			this.contentEl.empty();
		}

		try {
			const scannedLinks = await this.scanner.scanUnresolvedLinks();
			this.links = scannedLinks;
			const groupedForCache = this.scanner.groupLinksByFolder(this.links);
			this.plugin.setCachedLinks(groupedForCache);

			if (forceRefresh) {
				this.renderLinks();
				new Notice(
					t(lang, "noticeScanComplete", { count: this.links.length })
				);
			} else {
				this.renderLinks();
			}
		} catch (error) {
			console.error("Error scanning vault:", error);
			new Notice(t(lang, "noticeErrorScanningVault"));
		}
	}

	renderLinks() {
		const lang = this.plugin.settings.language;
		this.contentEl.empty();
		const generateButton = this.containerEl.querySelector(
			".curator-generate-button"
		) as HTMLButtonElement;
		if (generateButton) this.updateGenerateButtonState(generateButton);

		let linksToRender = [...this.links];

		if (this.searchQuery) {
			linksToRender = linksToRender.filter((link) =>
				link.linkText.toLowerCase().includes(this.searchQuery)
			);
		}

		linksToRender = this.scanner.sortLinks(
			linksToRender,
			this.currentSortBy
		);

		if (linksToRender.length === 0) {
			this.contentEl.createEl("p", {
				cls: "curator-empty-message",
				text:
					this.links.length === 0
						? t(lang, "emptyMessageNoLinks")
						: t(lang, "emptyMessageNoSearchResults"),
			});
			return;
		}

		if (this.currentGroupBy === "folder") {
			this.renderGroupedLinkList(linksToRender);
		} else {
			this.renderFlatLinkList(linksToRender);
		}
	}

	renderFlatLinkList(links: UnresolvedLinkInfo[]) {
		const listContainer = this.contentEl.createDiv(
			"curator-list-container"
		);
		links.forEach((linkInfo) => {
			this.renderLinkItem(listContainer, linkInfo);
		});
	}

	renderGroupedLinkList(links: UnresolvedLinkInfo[]) {
		const lang = this.plugin.settings.language;
		const groupedLinks = this.scanner.groupLinksByFolder(links);
		const listContainer = this.contentEl.createDiv(
			"curator-list-container"
		);

		groupedLinks.forEach((linksInGroup, folderPath) => {
			const folderName =
				folderPath === "" ? t(lang, "folderRootName") : folderPath;
			const folderId = `folder-${folderPath.replace(/\//g, "-")}`;
			const isExpanded = this.state.expandedFolders.has(folderId);

			const folderHeader = listContainer.createDiv(
				"curator-folder-header"
			);
			folderHeader.setAttribute("data-folder-id", folderId);

			const folderIcon = folderHeader.createEl("span", {
				cls: "curator-folder-icon",
			});
			setIcon(folderIcon, isExpanded ? "chevron-down" : "chevron-right");

			folderHeader.createSpan({
				cls: "curator-folder-name",
				text: t(lang, "folderNameTemplate", {
					name: folderName,
					count: linksInGroup.length,
				}),
			});
			folderHeader.addEventListener("click", () => {
				this.toggleFolder(folderId);
			});

			const linksContainer = listContainer.createDiv(
				"curator-folder-content"
			);
			linksContainer.style.display = isExpanded ? "block" : "none";
			linksContainer.style.maxHeight = isExpanded
				? `${linksContainer.scrollHeight}px`
				: "0px"; // For transition
			linksContainer.setAttribute("data-folder-content-id", folderId);

			linksInGroup.forEach((linkInfo) => {
				this.renderLinkItem(linksContainer, linkInfo);
			});
		});
	}

	renderLinkItem(container: HTMLElement, linkInfo: UnresolvedLinkInfo) {
		const lang = this.plugin.settings.language;
		const linkId = `link-${linkInfo.linkText.replace(/\s/g, "-")}`;
		const isSelected = this.state.selectedLinks.has(linkInfo.linkText);
		const isExpanded = this.state.expandedLinks.has(linkInfo.linkText);

		const linkItem = container.createDiv("curator-link-item");
		linkItem.setAttribute("data-link-id", linkId);
		if (isSelected) linkItem.addClass("is-selected");

		const linkHeader = linkItem.createDiv("curator-link-header");

		const checkbox = linkHeader.createEl("input", {
			type: "checkbox",
			cls: "curator-link-checkbox",
		});
		checkbox.checked = isSelected;
		checkbox.addEventListener("click", (e) => {
			e.stopPropagation();
			this.toggleLinkSelection(linkInfo.linkText);
		});

		const expandIcon = linkHeader.createEl("span", {
			cls: "curator-link-expand-icon",
		});
		setIcon(expandIcon, isExpanded ? "chevron-down" : "chevron-right");
		expandIcon.addEventListener("click", (e) => {
			e.stopPropagation();
			this.toggleLinkDetails(linkInfo.linkText, linkItem);
		});

		linkHeader.createSpan({
			cls: "curator-link-text",
			text: `[[${linkInfo.linkText}]]`,
		});
		linkHeader.createSpan({
			cls: "curator-link-frequency",
			text: `(${linkInfo.frequency})`,
		});

		const detailsContainer = linkItem.createDiv("curator-link-details");
		detailsContainer.style.display = isExpanded ? "block" : "none";
		detailsContainer.style.maxHeight = isExpanded
			? `${detailsContainer.scrollHeight}px`
			: "0px"; // For transition

		detailsContainer.createEl("h4", {
			text: t(lang, "referencedInHeader"),
		});
		const sourceList = detailsContainer.createEl("ul", {
			cls: "curator-source-list",
		});
		linkInfo.sourceFiles.forEach((sourcePath) => {
			sourceList.createEl("li", { text: sourcePath });
		});
	}

	toggleFolder(folderId: string) {
		const folderHeader = this.containerEl.querySelector(
			`[data-folder-id="${folderId}"]`
		) as HTMLElement;
		const folderContent = this.containerEl.querySelector(
			`[data-folder-content-id="${folderId}"]`
		) as HTMLElement;
		if (!folderHeader || !folderContent) return;

		const isExpanded = this.state.expandedFolders.has(folderId);
		const icon = folderHeader.querySelector(
			".curator-folder-icon"
		) as HTMLElement;

		if (isExpanded) {
			this.state.expandedFolders.delete(folderId);
			folderContent.style.maxHeight = "0px";
			requestAnimationFrame(() => {
				// Use a timeout that matches the CSS transition duration
				setTimeout(() => {
					folderContent.style.display = "none";
				}, 300); // Match transition duration
			});
		} else {
			this.state.expandedFolders.add(folderId);
			folderContent.style.display = "block";
			folderContent.style.maxHeight = "0px"; // Start from 0 for transition
			requestAnimationFrame(() => {
				// Measure scrollHeight in the next frame
				requestAnimationFrame(() => {
					folderContent.style.maxHeight = `${folderContent.scrollHeight}px`;
				});
			});
		}

		if (icon) {
			setIcon(icon, isExpanded ? "chevron-right" : "chevron-down");
		}
	}

	toggleLinkDetails(linkText: string, linkItemElement: HTMLElement) {
		const detailsContainer = linkItemElement.querySelector(
			".curator-link-details"
		) as HTMLElement;
		const expandIcon = linkItemElement.querySelector(
			".curator-link-expand-icon"
		) as HTMLElement;
		if (!detailsContainer || !expandIcon) return;

		const isExpanded = this.state.expandedLinks.has(linkText);

		if (isExpanded) {
			this.state.expandedLinks.delete(linkText);
			detailsContainer.style.maxHeight = "0px";
			requestAnimationFrame(() => {
				setTimeout(() => {
					detailsContainer.style.display = "none";
				}, 300);
			});
		} else {
			this.state.expandedLinks.add(linkText);
			detailsContainer.style.display = "block";
			detailsContainer.style.maxHeight = "0px";
			requestAnimationFrame(() => {
				requestAnimationFrame(() => {
					detailsContainer.style.maxHeight = `${detailsContainer.scrollHeight}px`;
				});
			});
		}

		setIcon(expandIcon, isExpanded ? "chevron-right" : "chevron-down");
	}

	toggleLinkSelection(linkText: string) {
		const isSelected = this.state.selectedLinks.has(linkText);
		if (isSelected) {
			this.state.selectedLinks.delete(linkText);
		} else {
			this.state.selectedLinks.add(linkText);
		}

		// Find the link item in the DOM and update its visual state
		const linkId = `link-${linkText.replace(/\s/g, "-")}`;
		const linkItem = this.containerEl.querySelector(
			`[data-link-id="${linkId}"]`
		) as HTMLElement;
		if (linkItem) {
			const checkbox = linkItem.querySelector(
				".curator-link-checkbox"
			) as HTMLInputElement;
			if (checkbox) {
				checkbox.checked = !isSelected;
			}
			if (isSelected) {
				linkItem.removeClass("is-selected");
			} else {
				linkItem.addClass("is-selected");
			}
		}

		// Update the generate button state without re-rendering everything
		const generateButton = this.containerEl.querySelector(
			".curator-generate-button"
		) as HTMLButtonElement;
		if (generateButton) {
			this.updateGenerateButtonState(generateButton);
		}
	}

	updateGenerateButtonState(button: HTMLButtonElement) {
		const lang = this.plugin.settings.language;
		if (this.state.selectedLinks.size > 0) {
			button.disabled = false;
			button.textContent = `${t(lang, "generateSelectedButtonText")} (${
				this.state.selectedLinks.size
			})`;
		} else {
			button.disabled = true;
			button.textContent = t(lang, "generateSelectedButtonDisabledText");
		}
	}

	/**
	 * Gets the list of link texts that are currently rendered in the view,
	 * respecting search filters and grouping.
	 */
	private getCurrentRenderedLinkTexts(): string[] {
		let linksToRender = [...this.links];

		if (this.searchQuery) {
			linksToRender = linksToRender.filter((link) =>
				link.linkText.toLowerCase().includes(this.searchQuery)
			);
		}

		linksToRender = this.scanner.sortLinks(
			linksToRender,
			this.currentSortBy
		);

		return linksToRender.map((link) => link.linkText);
	}

	selectAllVisibleLinks() {
		const visibleLinkTexts = this.getCurrentRenderedLinkTexts();
		visibleLinkTexts.forEach((linkText) => {
			this.state.selectedLinks.add(linkText);
		});

		// Update DOM directly
		visibleLinkTexts.forEach((linkText) => {
			const linkId = `link-${linkText.replace(/\s/g, "-")}`;
			const linkItem = this.containerEl.querySelector(
				`[data-link-id="${linkId}"]`
			) as HTMLElement;
			if (linkItem) {
				const checkbox = linkItem.querySelector(
					".curator-link-checkbox"
				) as HTMLInputElement;
				if (checkbox) {
					checkbox.checked = true;
				}
				linkItem.addClass("is-selected");
			}
		});

		// Update the generate button state
		const generateButton = this.containerEl.querySelector(
			".curator-generate-button"
		) as HTMLButtonElement;
		if (generateButton) {
			this.updateGenerateButtonState(generateButton);
		}
	}

	deselectAllLinks() {
		this.state.selectedLinks.clear();

		// Update DOM directly
		const allSelectedLinkItems = this.containerEl.querySelectorAll(
			".curator-link-item.is-selected"
		) as NodeListOf<HTMLElement>;
		allSelectedLinkItems.forEach((linkItem) => {
			const checkbox = linkItem.querySelector(
				".curator-link-checkbox"
			) as HTMLInputElement;
			if (checkbox) {
				checkbox.checked = false;
			}
			linkItem.removeClass("is-selected");
		});

		// Update the generate button state
		const generateButton = this.containerEl.querySelector(
			".curator-generate-button"
		) as HTMLButtonElement;
		if (generateButton) {
			this.updateGenerateButtonState(generateButton);
		}
	}

	async handleGenerateSelected() {
		const lang = this.plugin.settings.language;
		if (this.state.selectedLinks.size === 0) {
			new Notice(t(lang, "noticeNoLinksSelected"));
			return;
		}
		if (!this.selectedPrompt) {
			new Notice(t(lang, "noticeNoTemplateSelected"));
			return;
		}

		const selectedLinkTexts = Array.from(this.state.selectedLinks);
		const templateName = this.availableTemplates.find(
			(t) => t.path === this.selectedPrompt
		)?.name;
		new Notice(
			t(lang, "noticeStartingGeneration", {
				count: selectedLinkTexts.length,
				templateName: templateName || "Unknown",
			})
		);

		for (const linkText of selectedLinkTexts) {
			try {
				const linkInfo = this.links.find(
					(l) => l.linkText === linkText
				);
				if (!linkInfo) {
					console.warn(
						`Could not find link info for ${linkText} during generation.`
					);
					continue;
				}
				await this.generateForLink(linkInfo);
				this.state.selectedLinks.delete(linkText);
				this.plugin.clearCachedLinks();
			} catch (error) {
				console.error(`Failed to generate for ${linkText}:`, error);
				new Notice(
					t(lang, "noticeFailedToGenerate", { title: linkText })
				);
			}
		}

		new Notice(t(lang, "noticeBatchGenerationComplete"));
		this.refreshUnresolvedLinks(true);
	}

	async generateForLink(linkInfo: UnresolvedLinkInfo) {
		const lang = this.plugin.settings.language;
		const { defaultNewNotePath } = this.plugin.settings;
		const newNotePath = defaultNewNotePath
			? `${defaultNewNotePath}/${linkInfo.linkText}.md`
			: `${linkInfo.linkText}.md`;

		if (this.app.vault.getAbstractFileByPath(newNotePath)) {
			new Notice(
				t(lang, "noticeAlreadyExists", { title: linkInfo.linkText })
			);
			return;
		}

		new Notice(
			t(lang, "noticeGeneratingFor", { title: linkInfo.linkText })
		);

		const generatedContent = await this.generator.generateForNoteTitle(
			linkInfo.linkText,
			this.selectedPrompt // Pass the selected prompt
		);

		const targetDir = newNotePath.substring(
			0,
			newNotePath.lastIndexOf("/")
		);
		if (targetDir && !(await this.app.vault.adapter.exists(targetDir))) {
			await this.app.vault.createFolder(targetDir);
		}

		await this.app.vault.create(newNotePath, generatedContent);
		new Notice(
			t(lang, "noticeSuccessfullyCreated", { title: linkInfo.linkText })
		);
	}
}

// Modern CSS Styles
const style = document.createElement("style");
style.textContent = `
	.knowledge-curator-view {
		padding: 10px;
		background-color: var(--background-primary);
		color: var(--text-normal);
		font-family: var(--font-interface);
	}

	.knowledge-curator-view h2 {
		margin-top: 0;
		margin-bottom: 15px;
		font-size: 1.5em;
		font-weight: 600;
		color: var(--text-accent);
		border-bottom: 1px solid var(--background-modifier-border);
		padding-bottom: 10px;
	}

	.curator-toolbar {
		display: flex;
		align-items: center;
		gap: 10px;
		margin-bottom: 15px;
		padding: 10px;
		background-color: var(--background-secondary);
		border-radius: 8px;
		border: 1px solid var(--background-modifier-border);
		flex-wrap: wrap;
	}

	.curator-toolbar-button, .curator-generate-button {
		padding: 6px 12px;
		background-color: var(--interactive-accent);
		color: var(--text-on-accent);
		border: none;
		border-radius: 6px;
		cursor: pointer;
		font-size: var(--font-ui-small);
		transition: background-color 0.2s ease, transform 0.1s ease;
	}

	.curator-toolbar-button:hover, .curator-generate-button:hover:not(:disabled) {
		background-color: var(--interactive-accent-hover);
		transform: translateY(-1px);
	}

	.curator-toolbar-button:active, .curator-generate-button:active:not(:disabled) {
		transform: translateY(0);
	}

	.curator-generate-button:disabled {
		background-color: var(--background-modifier-error);
		color: var(--text-muted);
		cursor: not-allowed;
		opacity: 0.6;
	}

	.curator-toolbar-label {
		font-size: var(--font-ui-small);
		color: var(--text-muted);
		display: flex;
		align-items: center;
		gap: 5px;
	}

	.curator-toolbar-select, .curator-template-select, .curator-search-input {
		padding: 6px 8px;
		border-radius: 4px;
		border: 1px solid var(--background-modifier-border);
		background-color: var(--background-primary);
		color: var(--text-normal);
		font-size: var(--font-ui-small);
		transition: border-color 0.2s ease, box-shadow 0.2s ease;
	}

	.curator-toolbar-select:focus, .curator-template-select:focus, .curator-search-input:focus {
		outline: none;
		border-color: var(--interactive-accent);
		box-shadow: 0 0 0 2px var(--interactive-accent-hover);
	}
	
	.curator-search-input {
		margin-left: auto; /* Pushes search to the right */
		width: 200px;
	}

	.curator-content {
		border: 1px solid var(--background-modifier-border);
		border-radius: 8px;
		background-color: var(--background-primary);
		overflow-y: auto;
		max-height: calc(100vh - 200px); /* Adjust based on toolbar height */
	}

	.curator-list-container {
		padding: 0;
	}

	.curator-folder-header, .curator-link-header {
		display: flex;
		align-items: center;
		padding: 10px 15px;
		cursor: pointer;
		transition: background-color 0.2s ease;
		user-select: none; /* Prevent text selection */
	}

	.curator-folder-header:hover {
		background-color: var(--background-modifier-hover);
	}

	.curator-folder-icon, .curator-link-expand-icon {
		margin-right: 10px;
		color: var(--text-muted);
		flex-shrink: 0;
	}

	.curator-folder-name {
		font-weight: 500;
		color: var(--text-normal);
		flex-grow: 1;
	}

	.curator-folder-content {
		overflow: hidden;
		transition: max-height 0.3s ease-in-out, padding 0.3s ease-in-out;
	}
	
	.curator-folder-content[style*="display: block"] {
		padding-left: 20px;
		padding-right: 15px;
		padding-bottom: 5px; /* Space between last item in folder and next header */
	}


	.curator-link-item {
		border-radius: 6px;
		margin-bottom: 5px;
		background-color: var(--background-secondary-alt);
		border: 1px solid transparent;
		transition: border-color 0.2s ease, background-color 0.2s ease;
	}

	.curator-link-item.is-selected {
		border-color: var(--interactive-accent);
		background-color: var(--background-modifier-selected);
	}

	.curator-link-header {
		padding: 8px 12px;
		gap: 8px;
	}

	.curator-link-checkbox {
		cursor: pointer;
		flex-shrink: 0;
	}

	.curator-link-text {
		font-weight: 500;
		color: var(--text-normal);
		flex-grow: 1;
	}

	.curator-link-frequency {
		font-size: 0.85em;
		color: var(--text-muted);
		flex-shrink: 0;
	}

	.curator-link-details {
		overflow: hidden;
		transition: max-height 0.3s ease-in-out, padding 0.3s ease-in-out;
		padding-left: 35px; /* Indent more than folder content */
		padding-right: 15px;
		padding-bottom: 10px;
		color: var(--text-muted);
		font-size: 0.9em;
	}
	
	.curator-link-details h4 {
		margin-top: 10px;
		margin-bottom: 5px;
		color: var(--text-accent);
		font-size: 1em;
		font-weight: 500;
	}

	.curator-source-list {
		list-style: none;
		padding: 0;
		margin: 0;
	}

	.curator-source-list li {
		padding: 2px 0;
		word-break: break-all;
	}

	.curator-empty-message {
		text-align: center;
		padding: 20px;
		color: var(--text-muted);
		font-style: italic;
	}

	/* Responsive adjustments */
	@media (max-width: 600px) {
		.curator-toolbar {
			flex-direction: column;
			align-items: stretch;
		}
		.curator-search-input {
			margin-left: 0;
			width: 100%;
		}
		.curator-toolbar-label {
			justify-content: space-between;
		}
	}
`;
document.head.appendChild(style);
