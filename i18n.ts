export interface Translations {
	// View Title
	viewTitle: string;

	// Toolbar
	refreshButtonAriaLabel: string;
	sortLabel: string;
	sortFrequency: string;
	sortAlphabetical: string;
	groupLabel: string;
	groupNone: string;
	groupFolder: string;
	templateLabel: string;
	searchPlaceholder: string;
	selectAllButtonText: string;
	selectAllButtonAriaLabel: string;
	deselectAllButtonText: string;
	deselectAllButtonAriaLabel: string;
	generateSelectedButtonText: string;
	generateSelectedButtonAriaLabel: string;
	generateSelectedButtonDisabledText: string;

	// Content Area
	emptyMessageNoLinks: string;
	emptyMessageNoSearchResults: string;
	folderRootName: string;
	folderNameTemplate: string; // e.g., "📂 {name} ({count})"
	referencedInHeader: string;

	// Notices
	noticeScanning: string;
	noticeScanComplete: string; // e.g., "Scan complete. Found {count} unresolved links."
	noticeNoLinksSelected: string;
	noticeNoTemplateSelected: string;
	noticeCouldNotLoadTemplates: string;
	noticeStartingGeneration: string; // e.g., "Starting generation for {count} link(s) using template: {templateName}..."
	noticeBatchGenerationComplete: string;
	noticeGeneratingFor: string; // e.g., "Generating for \"[[{title}]]\"..."
	noticeAlreadyExists: string; // e.g., "Note \"[[{title}]]\" already exists. Skipping."
	noticeSuccessfullyCreated: string; // e.g., "Successfully created \"[[{title}]]\"."
	noticeFailedToGenerate: string; // e.g., "Failed to generate for \"[[{title}]]\". See console."
	noticeErrorScanningVault: string;

	// Settings Tab (labels will be handled by Obsidian's Setting component, but descriptions/values might need i18n)
	// For now, we focus on the view UI. Settings can be a later enhancement if needed.
}

export const translations: Record<string, Translations> = {
	en: {
		viewTitle: "Knowledge Curator",
		refreshButtonAriaLabel: "Refresh links",
		sortLabel: "Sort:",
		sortFrequency: "Frequency",
		sortAlphabetical: "Alphabetical",
		groupLabel: "Group:",
		groupNone: "None",
		groupFolder: "Folder",
		templateLabel: "Template:",
		searchPlaceholder: "Search links...",
		selectAllButtonText: "Select All",
		selectAllButtonAriaLabel: "Select all visible links",
		deselectAllButtonText: "Deselect All",
		deselectAllButtonAriaLabel: "Deselect all links",
		generateSelectedButtonText: "Generate Selected",
		generateSelectedButtonAriaLabel: "Generate content for selected links",
		generateSelectedButtonDisabledText: "Generate Selected",
		emptyMessageNoLinks: "No unresolved links found.",
		emptyMessageNoSearchResults: "No links match your search.",
		folderRootName: "Vault Root",
		folderNameTemplate: "📂 {name} ({count})",
		referencedInHeader: "Referenced in:",
		noticeScanning: "Scanning for unresolved links...",
		noticeScanComplete: "Scan complete. Found {count} unresolved links.",
		noticeNoLinksSelected: "No links selected.",
		noticeNoTemplateSelected:
			"No template selected. Please select a template to generate content.",
		noticeCouldNotLoadTemplates:
			"Could not load templates. Check settings and console.",
		noticeStartingGeneration:
			"Starting generation for {count} link(s) using template: {templateName}...",
		noticeBatchGenerationComplete: "Batch generation complete.",
		noticeGeneratingFor: 'Generating for "[[{title}]]"...',
		noticeAlreadyExists: 'Note "[[{title}]]" already exists. Skipping.',
		noticeSuccessfullyCreated: 'Successfully created "[[{title}]]".',
		noticeFailedToGenerate:
			'Failed to generate for "[[{title}]]". See console.',
		noticeErrorScanningVault:
			"Error scanning vault. Check console for details.",
	},
	zh: {
		viewTitle: "知识策展人",
		refreshButtonAriaLabel: "刷新链接",
		sortLabel: "排序：",
		sortFrequency: "按频次",
		sortAlphabetical: "按字母",
		groupLabel: "分组：",
		groupNone: "无",
		groupFolder: "按文件夹",
		templateLabel: "模板：",
		searchPlaceholder: "搜索链接...",
		selectAllButtonText: "全选",
		selectAllButtonAriaLabel: "选择所有可见链接",
		deselectAllButtonText: "取消全选",
		deselectAllButtonAriaLabel: "取消选择所有链接",
		generateSelectedButtonText: "生成所选",
		generateSelectedButtonAriaLabel: "为所选链接生成内容",
		generateSelectedButtonDisabledText: "生成所选",
		emptyMessageNoLinks: "未找到悬空链接。",
		emptyMessageNoSearchResults: "没有与搜索匹配的链接。",
		folderRootName: "仓库根目录",
		folderNameTemplate: "📂 {name} ({count})",
		referencedInHeader: "引用来源：",
		noticeScanning: "正在扫描悬空链接...",
		noticeScanComplete: "扫描完成。找到 {count} 个悬空链接。",
		noticeNoLinksSelected: "未选择链接。",
		noticeNoTemplateSelected: "未选择模板。请选择一个模板以生成内容。",
		noticeCouldNotLoadTemplates: "无法加载模板。请检查设置和控制台。",
		noticeStartingGeneration:
			"正在使用模板 {templateName} 为 {count} 个链接开始生成...",
		noticeBatchGenerationComplete: "批量生成完成。",
		noticeGeneratingFor: '正在为 "[[{title}]]" 生成...',
		noticeAlreadyExists: '笔记 "[[{title}]]" 已存在。已跳过。',
		noticeSuccessfullyCreated: '成功创建 "[[{title}]]"。',
		noticeFailedToGenerate: '为 "[[{title}]]" 生成失败。请查看控制台。',
		noticeErrorScanningVault: "扫描仓库时出错。请查看控制台了解详情。",
	},
};

/**
 * Simple translation function.
 * @param lang The language code (e.g., "en", "zh").
 * @param key The key of the translation string.
 * @param params Optional parameters to interpolate into the string (e.g., { count: 5 }).
 * @returns The translated string.
 */
export function t(
	lang: string,
	key: keyof Translations,
	params?: Record<string, any>
): string {
	const translationSet = translations[lang];
	if (!translationSet) {
		console.warn(
			`Translation set for language "${lang}" not found. Falling back to English.`
		);
		return t("en", key, params); // Fallback to English
	}

	let str = translationSet[key];
	if (!str) {
		console.warn(
			`Translation key "${key}" not found for language "${lang}". Falling back to English.`
		);
		return t("en", key, params); // Fallback to English
	}

	if (params) {
		// Simple interpolation for {placeholder}
		for (const paramKey in params) {
			str = str.replace(
				new RegExp(`{${paramKey}}`, "g"),
				String(params[paramKey])
			);
		}
	}
	return str;
}
