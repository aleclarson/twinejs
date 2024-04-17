import * as React from 'react';
import {Passage} from '../../store/stories';
import {useStoryFormatsContext} from '../../store/story-formats';
import {formatWithNameAndVersion} from '../../store/story-formats/getters';
import {useFormatEditorExtensions} from '../../store/use-format-editor-extensions';

export function useParsedPassageVariables(passages: Passage[]) {
	const {formats} = useStoryFormatsContext();
	const [variableMap, setVariableMap] = React.useState<
		Map<string, Map<string, string>>
	>(new Map());

	const currentFormat = React.useMemo(
		() =>
			formatWithNameAndVersion(
				formats,
				passages[0].storyFormat,
				passages[0].storyFormatVersion
			),
		[formats, passages]
	);

	const {editorExtensions} = useFormatEditorExtensions(currentFormat);

	React.useEffect(() => {
		const parsePassageText =
			editorExtensions?.twine?.[currentFormat.version]?.declarations
				?.parsePassageText;

		for (const passage of passages) {
			if (parsePassageText) {
				variableMap.set(passage.id, new Map(parsePassageText(passage.text)));
			}
		}
	}, [
		currentFormat,
		editorExtensions,
		passages,
		variableMap,
	]);

	return variableMap;
}
