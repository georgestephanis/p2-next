/**
 * Shared frontend editor settings.
 */
export const BASE_EDITOR_SETTINGS = {
	hasFixedToolbar: false,
	focusMode: false,
	isRTL: document.documentElement.dir === 'rtl',
};

/**
 * Build editor settings with optional overrides.
 *
 * @param {Object} overrides Optional shallow overrides.
 * @return {Object} Editor settings object.
 */
export function getEditorSettings( overrides = {} ) {
	return {
		...BASE_EDITOR_SETTINGS,
		...overrides,
	};
}
