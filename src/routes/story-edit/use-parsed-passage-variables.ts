import * as React from 'react';
import type {Passage, Story} from '../../store/stories';
import type {
	VariableToken,
	StoryFormatVariableToken
} from '../../store/story-formats';
import {useFormatEditorExtensions} from '../../store/use-format-editor-extensions';

export function useParsedPassageVariables(story: Story) {
	const {editorExtensions} = useFormatEditorExtensions(
		story.storyFormat,
		story.storyFormatVersion
	);
	const variableMap = React.useMemo(
		() => new StoryFormatVariableMap(),
		[story.id, editorExtensions]
	);
	const parsedPassages = React.useMemo(
		() => new WeakSet<Passage>(),
		[variableMap]
	);

	React.useEffect(() => {
		const parseDefinitions = editorExtensions?.variables?.parseDefinitions;

		if (parseDefinitions) {
			for (const passage of story.passages) {
				// When a passage's text is changed, its object is re-created, which is detected by the
				// WeakSet. We need to check if the passage is already parsed, and if not, parse it.
				if (!parsedPassages.has(passage)) {
					parsedPassages.add(passage);
					variableMap.resetPassage(passage, parseDefinitions(passage.text));
				}
			}
		}
	}, [editorExtensions, story.passages, variableMap]);

	return variableMap;
}

export type StoryFormatVariable = {
	name: string;
	/**
	 * Variables may be defined or re-defined in multiple passages.
	 */
	definitions: StoryFormatVariableToken[];
};

export class StoryFormatVariableMap {
	/** Native variables by variable name. */
	private natives = new Map<string, StoryFormatVariable>();
	/** Global variables by variable name. */
	private globals = new Map<string, StoryFormatVariable>();
	/** Variable definitions by passage ID. */
	private locals = new Map<string, StoryFormatVariable[]>();

	/**
	 * Return the variables accessible to a passage.
	 *
	 * Local variables are always first, followed by globals, then natives. Within each section, the
	 * variables are sorted alphabetically from A to Z.
	 */
	variablesForPassage(passage: Passage) {
		const locals = this.locals.get(passage.id)!;
		const names = locals.map(v => v.name);
		console.log('variablesForPassage', {id: passage.id, locals, names});

		return [
			...locals.sort(localeNameSort),
			...Array.from(this.globals.values())
				.filter(v => !names.includes(v.name))
				.sort(localeNameSort),
			...Array.from(this.natives.values()).sort(localeNameSort)
		];
	}

	resetPassage(passage: Passage, tokens: (string | VariableToken)[]) {
		const prevLocals = this.locals.get(passage.id);
		const locals: StoryFormatVariable[] = [];
		this.locals.set(passage.id, locals);

		for (const token of tokens) {
			if (typeof token === 'string') {
				if (!this.natives.has(token)) {
					this.natives.set(token, {name: token, definitions: []});
				}
			} else {
				const {name} = token;

				const variableToken: StoryFormatVariableToken = {...token, passage};
				const variable = this.globals.get(name) ||
					locals.find(v => v.name === name) ||
					prevLocals?.find(v => v.name === name) || {
						name,
						definitions: []
					};

				if (variableToken.expression) {
					variable.definitions.push(variableToken);

					// There may be multiple definitions of the same variable in a passage, so we need to
					// check if the variable already exists in the list.
					if (!locals.includes(variable)) {
						locals.push(variable);
					}
				}

				if (!variableToken.local) {
					this.globals.set(name, variable);
				}
			}
		}

		prevLocals?.forEach(variable => {
			if (locals.includes(variable)) {
				return;
			}
			variable.definitions = variable.definitions.filter(
				def => def.passage?.id !== passage.id
			);
			if (variable.definitions.length === 0) {
				this.globals.delete(variable.name);
			}
		});
	}
}

function localeNameSort(left: {name: string}, right: {name: string}): number {
	return left.name.localeCompare(right.name);
}
