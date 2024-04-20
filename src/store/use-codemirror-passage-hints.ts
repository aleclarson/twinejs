import CodeMirror, {Editor, Handle} from 'codemirror';
import * as React from 'react';
import {Story} from './stories';
import {similaritySort} from '../util/similarity-sort';

type HintExtraKeyHandler = (editor: Editor, hint: Handle) => void;

export function useCodeMirrorPassageHints(story: Story) {
	return React.useCallback(
		(editor: Editor) => {
			const doc = editor.getDoc();

			editor.showHint({
				completeSingle: false,
				extraKeys:
					// Any of the characters below are an indication the user is finished
					// typing a passage name in a link and the hint should close. We need
					// to 'type' this character for the user since our handler consumes
					// the event.
					[']', '-', '|'].reduce<Record<string, HintExtraKeyHandler>>(
						(result, character) => {
							result[character] = (_editor, hint) => {
								doc.replaceRange(character, doc.getCursor());
								hint.close();
							};

							return result;
						},
						{}
					),
				hint() {
					const cursor = editor.getCursor();
					const text = doc.getLine(cursor.line);
					const precedingText = text.slice(0, cursor.ch);
					const followingText = text.slice(cursor.ch);

					const linkIndex = precedingText.lastIndexOf('[[');
					const pointerIndex = precedingText.lastIndexOf('->');
					const triggerIndex = Math.max(linkIndex, pointerIndex);

					const wordIndex = triggerIndex + 2;
					const word = precedingText.slice(wordIndex);

					// Any passage with the same name as our link content is never included in the completion
					// list, as it's likely to be a passage created from the typing of this very link.
					const linkContent = precedingText.slice(linkIndex + 2);

					const completions = {
						list: similaritySort(
							story.passages
								.filter(p => p.name !== linkContent)
								.map(p => p.name),
							word
						),
						from: {line: cursor.line, ch: wordIndex},
						to: cursor
					};

					// Insert a closing ]] if the user hasn't already done so.
					if (!followingText.startsWith(']]'))
						CodeMirror.on(completions, 'pick', () => {
							doc.replaceRange(']] ', doc.getCursor());
						});

					return completions;
				}
			});
		},
		[story.passages]
	);
}
