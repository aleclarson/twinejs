import * as React from 'react';
import {Passage} from '../../store/stories';
import {
	StoryFormat,
	StoryFormatVariableReference
} from '../../store/story-formats';
import {useFormatEditorExtensions} from '../../store/use-format-editor-extensions';

export type VariableReference = StoryFormatVariableReference & {
	passage: Passage;
};

export type VariableMap = Map<string, VariableReference[]>;

export function useParsedPassageVariables(
	format: StoryFormat,
	passages: Passage[]
) {
	const [variableMap] = React.useState<Map<string, VariableReference[]>>(
		new Map()
	);

	const {editorExtensions} = useFormatEditorExtensions(format);

	React.useEffect(() => {
		const parsePassageText = editorExtensions?.variables?.parsePassageText;

		if (parsePassageText)
			for (const passage of passages) {
				for (const variable of parsePassageText(passage.text)) {
					const variableReferences = variableMap.get(variable.name) || [];
					variableReferences.push({...variable, passage});
					variableMap.set(variable.name, variableReferences);
				}
			}
	}, [format, editorExtensions, passages, variableMap]);

	return variableMap;
}
