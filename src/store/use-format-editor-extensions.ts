import * as React from 'react';
import {Format} from './story-formats';
import {formatEditorExtensions} from '../util/story-format';
import {formatEditorExtensionsDisabled, usePrefsContext} from './prefs';

export function useFormatEditorExtensions(
	format: Format,
	appVersion: string
) {
	const {prefs} = usePrefsContext();
	const [editorExtensions, setEditorExtensions] =
		React.useState<ReturnType<typeof formatEditorExtensions>>();
	const extensionsDisabled = formatEditorExtensionsDisabled(
		prefs,
		format.name,
		format.version
	);

	React.useEffect(() => {
		if (!extensionsDisabled && format.loadState === 'loaded') {
			setEditorExtensions(formatEditorExtensions(format, appVersion));
		}
	}, [extensionsDisabled, format, appVersion]);

	return {
		editorExtensions,
		extensionsDisabled
	};
}
