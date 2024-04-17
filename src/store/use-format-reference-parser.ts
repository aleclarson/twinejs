import * as React from 'react';
import {formatWithNameAndVersion, loadFormatProperties, useStoryFormatsContext} from './story-formats';
import {formatEditorExtensionsDisabled, usePrefsContext} from './prefs';
import {getAppInfo} from '../util/app-info';
import {useFormatEditorExtensions} from './use-format-editor-extensions';

const emptyFunc = () => [];

export function useFormatReferenceParser(
	formatName: string,
	formatVersion: string
) {
	const {prefs} = usePrefsContext();
	const {dispatch, formats} = useStoryFormatsContext();
	const format = formatWithNameAndVersion(formats, formatName, formatVersion);
	const {editorExtensions, extensionsDisabled} = useFormatEditorExtensions(format, getAppInfo().version);

	React.useEffect(() => {
		if (!extensionsDisabled && format.loadState === 'unloaded') {
			dispatch(loadFormatProperties(format));
		}
	}, [dispatch, extensionsDisabled, format]);

	if (extensionsDisabled) {
		return emptyFunc;
	}

	return editorExtensions?.references?.parsePassageText ?? emptyFunc;
}
