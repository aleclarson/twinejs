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

					// Find the offset of the nearest prefix trigger, which helps with finding the search
					// query's start.
					const linkIndex = precedingText.lastIndexOf('[[');
					const pointerIndex = precedingText.lastIndexOf('->');
					const triggerIndex = Math.max(linkIndex, pointerIndex);

					// Look for the closing ]] to determine if the link is closed. This helps us know if what
					// comes after the cursor should be used in the search query.
					const otherLinkIndex = followingText.indexOf('[[');
					const linkCloseIndex = followingText.indexOf(']]');
					const linkIsClosed =
						linkCloseIndex !== -1 &&
						(otherLinkIndex === -1 || linkCloseIndex < otherLinkIndex);

					const queryIndex = triggerIndex + 2;
					const query =
						precedingText.slice(queryIndex) +
						(linkIsClosed ? followingText.slice(0, linkCloseIndex) : '');

					// Any passage with the same name as our link content is never included in the completion
					// list, as it's likely to be a passage created from the typing of this very link.
					const linkContent = precedingText.slice(linkIndex + 2);

					const completions = {
						list: similaritySort(
							story.passages
								.filter(p => p.name !== linkContent)
								.map(p => p.name),
							query
						),
						from: {line: cursor.line, ch: queryIndex},
						to: cursor
					};

					CodeMirror.on(completions, 'pick', () => {
						// Insert a closing ]] if the user hasn't already done so.
						if (!linkIsClosed) {
							doc.replaceRange(']] ', doc.getCursor());
						}
					});

					return completions;
				}
			});
		},
		[story.passages]
	);
}
