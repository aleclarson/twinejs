import {getAppInfo} from '../util/app-info';
import {formatEditorExtensions} from '../util/story-format';
import {formatEditorExtensionsDisabled, usePrefsContext} from './prefs';
import {StoryFormat, useStoryFormat} from './story-formats';

type FormatEditorExtensions = ReturnType<typeof formatEditorExtensions>;

const editorExtensionsCache = new WeakMap<
	StoryFormat,
	FormatEditorExtensions
>();

export function useFormatEditorExtensions(
	formatName: string,
	formatVersion: string
) {
	const {prefs} = usePrefsContext();
	const {format} = useStoryFormat(formatName, formatVersion);
	const extensionsDisabled = formatEditorExtensionsDisabled(
		prefs,
		format.name,
		format.version
	);

	let editorExtensions = editorExtensionsCache.get(format);
	if (
		!editorExtensions &&
		!extensionsDisabled &&
		format.loadState === 'loaded'
	) {
		console.log('refreshing editor extensions');
		const {version} = getAppInfo();
		editorExtensions = formatEditorExtensions(format, version);
		editorExtensionsCache.set(format, editorExtensions);
	}

	if (extensionsDisabled) {
		editorExtensions = undefined;
	}

	return {editorExtensions, extensionsDisabled};
}
