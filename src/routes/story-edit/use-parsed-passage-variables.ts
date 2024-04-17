import * as React from 'react';
import {Passage} from '../../store/stories';
import {useStoryFormatsContext} from '../../store/story-formats';

export function useParsedPassageVariables(passages: Passage[]) {
	const {formats} = useStoryFormatsContext();
	const [variableMap, setVariableMap] = React.useState<
		Map<string, Map<string, string>>
	>(new Map());

	React.useEffect(() => {
		const newVariableMap = new Map<string, Map<string, string>>();

		for (const passage of passages) {
			const format = formats.find(
				format =>
					format.name === passage.storyFormat &&
					format.version === passage.storyFormatVersion
			);

			if (format?.declarations?.parsePassageText) {
				newVariableMap.set(
					passage.id,
					format.declarations.parsePassageText(passage.text)
				);
			}
		}

		setVariableMap(newVariableMap);
	}, [formats, passages]);

	return variableMap;
}
