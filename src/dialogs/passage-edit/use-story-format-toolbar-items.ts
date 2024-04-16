import * as React from 'react';
import CodeMirror from 'codemirror';
import {usePrefsContext} from '../../store/prefs';
import {
	formatWithNameAndVersion,
	StoryFormatToolbarItem,
	useStoryFormatsContext
} from '../../store/story-formats';
import {useFormatCodeMirrorToolbar} from '../../store/use-format-codemirror-toolbar';
import {useComputedTheme} from '../../store/prefs/use-computed-theme';

export function useStoryFormatToolbarItems(
	formatName: string,
	formatVersion: string,
	editor?: CodeMirror.Editor
): [StoryFormatToolbarItem[], () => void] {
	const {formats} = useStoryFormatsContext();
	const {prefs} = usePrefsContext();
	const appTheme = useComputedTheme();
	const format = formatWithNameAndVersion(formats, formatName, formatVersion);
	const toolbarFactory = useFormatCodeMirrorToolbar(formatName, formatVersion);
	const [toolbarItems, setToolbarItems] = React.useState<
		StoryFormatToolbarItem[]
	>([]);

	const refreshToolbarItems = React.useCallback(() => {
		if (editor && toolbarFactory) {
			try {
				const style = window.getComputedStyle(editor.getWrapperElement());

				setToolbarItems(
					toolbarFactory(editor, {
						appTheme,
						foregroundColor: style.color,
						locale: prefs.locale
					})
				);
			} catch (error) {
				console.error(
					`Toolbar function for ${format.name} ${format.version} threw an error, skipping update`,
					error
				);
			}
		} else {
			setToolbarItems([]);
		}
	}, [
		editor,
		format.name,
		format.version,
		prefs.locale,
		toolbarFactory,
		appTheme
	]);

	React.useEffect(() => {
		if (editor) {
			refreshToolbarItems();
			editor.on('cursorActivity', refreshToolbarItems);
			return () => editor.off('cursorActivity', refreshToolbarItems);
		}
	}, [editor, refreshToolbarItems]);

	return [toolbarItems, refreshToolbarItems];
}
