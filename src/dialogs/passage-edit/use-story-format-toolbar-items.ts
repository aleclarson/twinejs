import * as React from 'react';
import CodeMirror from 'codemirror';
import {usePrefsContext} from '../../store/prefs';
import {
	formatWithNameAndVersion,
	StoryFormatToolbarFactory,
	StoryFormatToolbarFactoryEnvironment,
	StoryFormatToolbarItem,
	useStoryFormatsContext
} from '../../store/story-formats';
import {useFormatCodeMirrorToolbar} from '../../store/use-format-codemirror-toolbar';
import {getAppInfo} from '../../util/app-info';

export function useStoryFormatToolbarItems(
	formatName: string,
	formatVersion: string,
	editor?: CodeMirror.Editor
): StoryFormatToolbarItem[] {
	const {dispatch, formats} = useStoryFormatsContext();
	const {prefs} = usePrefsContext();
	const format = formatWithNameAndVersion(formats, formatName, formatVersion);
	const toolbarFactory = useFormatCodeMirrorToolbar(formatName, formatVersion);
	const [toolbarItems, setToolbarItems] = React.useState<
		StoryFormatToolbarItem[]
	>([]);

	React.useEffect(() => {
		if (editor && toolbarFactory) {
			try {
				const style = window.getComputedStyle(editor.getWrapperElement());

				setToolbarItems(
					toolbarFactory(editor, {
						appTheme: useComputedTheme(),
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
	}, [editor, format.name, format.version, prefs.locale, toolbarFactory]);

	return toolbarItems;
}
