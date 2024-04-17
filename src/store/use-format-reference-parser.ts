import * as React from 'react';
import {
	formatWithNameAndVersion,
	loadFormatProperties,
	useStoryFormatsContext
} from './story-formats';
import {useFormatEditorExtensions} from './use-format-editor-extensions';

const emptyFunc = () => [];

export function useFormatReferenceParser(
	formatName: string,
	formatVersion: string
) {
	const {dispatch, formats} = useStoryFormatsContext();
	const format = formatWithNameAndVersion(formats, formatName, formatVersion);
	const {editorExtensions, extensionsDisabled} =
		useFormatEditorExtensions(format);

	React.useEffect(() => {
		if (!extensionsDisabled && format.loadState === 'unloaded') {
			dispatch(loadFormatProperties(format));
		}
	}, [dispatch, extensionsDisabled, format]);

	return editorExtensions?.references?.parsePassageText ?? emptyFunc;
}
