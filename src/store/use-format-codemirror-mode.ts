import CodeMirror from 'codemirror';
import * as React from 'react';
import {getAppInfo} from '../util/app-info';
import {formatEditorExtensions, namespaceForFormat} from '../util/story-format';
import {formatEditorExtensionsDisabled, usePrefsContext} from './prefs';
import {loadFormatProperties, useStoryFormat} from './story-formats';

/**
 * Sets up a CodeMirror mode for a format, if the format has defined one via
 * properties.codeMirror.mode. Once one is fully set up, this returns the name
 * of that mode. If the mode is being set up or the format hasn't defined one,
 * this returns undefined.
 */
export function useFormatCodeMirrorMode(
	formatName: string,
	formatVersion: string
) {
	const {dispatch, format} = useStoryFormat(formatName, formatVersion);
	const {prefs} = usePrefsContext();
	const [modeName, setModeName] = React.useState<string>();
	const extensionsDisabled = formatEditorExtensionsDisabled(
		prefs,
		formatName,
		formatVersion
	);

	React.useEffect(() => {
		if (extensionsDisabled) {
			return;
		}

		if (format.loadState === 'unloaded') {
			dispatch(loadFormatProperties(format));
		} else if (format.loadState === 'loaded') {
			const editorExtensions = formatEditorExtensions(
				format,
				getAppInfo().version
			);

			if (editorExtensions?.codeMirror?.mode) {
				CodeMirror.defineMode(
					namespaceForFormat(format),
					editorExtensions.codeMirror.mode
				);
				setModeName(namespaceForFormat(format));
			}
		}
	}, [dispatch, extensionsDisabled, format]);

	return modeName;
}
