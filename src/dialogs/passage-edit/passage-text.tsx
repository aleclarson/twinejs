import {jaroWinkler} from '@skyra/jaro-winkler';
import CodeMirror from 'codemirror';
import * as React from 'react';
import {useTranslation} from 'react-i18next';
import {EditorConfiguration} from '../../codemirror/types';
import {DialogEditor} from '../../components/container/dialog-card';
import {CodeArea} from '../../components/control/code-area';
import {StoryFormatVariableMap} from '../../routes/story-edit/use-parsed-passage-variables';
import {usePrefsContext} from '../../store/prefs';
import {Passage, Story} from '../../store/stories';
import {
	StoryFormat,
	StoryFormatToolbarButton,
	StoryFormatToolbarItem
} from '../../store/story-formats';
import {useCodeMirrorPassageHints} from '../../store/use-codemirror-passage-hints';
import {useFormatCodeMirrorMode} from '../../store/use-format-codemirror-mode';
import {useFormatEditorExtensions} from '../../store/use-format-editor-extensions';
import {codeMirrorOptionsFromPrefs} from '../../util/codemirror-options';
import {similaritySort} from '../../util/similarity-sort';

export interface PassageTextProps {
	disabled?: boolean;
	onChange: (value: string) => void;
	onEditorChange: (value: CodeMirror.Editor) => void;
	onExecCommand: (command: string, ...args: any[]) => void;
	passage: Passage;
	story: Story;
	storyFormat: StoryFormat;
	storyFormatExtensionsDisabled?: boolean;
	toolbarItems: StoryFormatToolbarItem[];
	variableMap?: StoryFormatVariableMap;
}

export const PassageText: React.FC<PassageTextProps> = props => {
	const {
		disabled,
		onChange,
		onEditorChange,
		onExecCommand,
		passage,
		story,
		storyFormat,
		storyFormatExtensionsDisabled,
		toolbarItems,
		variableMap
	} = props;
	const [localText, setLocalText] = React.useState(passage.text);
	const {prefs} = usePrefsContext();
	const autocompletePassageNames = useCodeMirrorPassageHints(story);
	const mode =
		useFormatCodeMirrorMode(storyFormat.name, storyFormat.version) ?? 'text';
	const {t} = useTranslation();

	// These are refs so that changing them doesn't trigger a rerender, and more
	// importantly, no React effects fire.

	const onChangeText = React.useRef<string>();
	const onChangeTimeout = React.useRef<number>();

	// Effects to handle debouncing updates upward. The idea here is that the
	// component maintains a local state so that the CodeMirror instance always is
	// up-to-date with what the user has typed, but the global context may not be.
	// This is because updating global context causes re-rendering in the story
	// map, which can be time-intensive.

	React.useEffect(() => {
		// A change to passage text has occurred externally, e.g. through a find and
		// replace. We ignore this if a change is pending so that users don't see
		// things they've typed in disappear or be replaced.

		if (!onChangeTimeout.current && localText !== passage.text) {
			setLocalText(passage.text);
		}
	}, [localText, passage.text]);

	const handleLocalChange = React.useCallback(
		(
			editor: CodeMirror.Editor,
			data: CodeMirror.EditorChange,
			text: string
		) => {
			// A local change has been made, e.g. the user has typed or pasted into
			// the field. It's safe to immediately trigger a CodeMirror editor update.

			onEditorChange(editor);

			// Set local state because the CodeMirror instance is controlled, and
			// updates there should be immediate.

			setLocalText(text);

			// If there was a pending update, cancel it.

			if (onChangeTimeout.current) {
				window.clearTimeout(onChangeTimeout.current);
			}

			// Save the text value in case we need to reset the timeout in the next
			// effect.

			onChangeText.current = text;

			// Queue a call to onChange.

			onChangeTimeout.current = window.setTimeout(() => {
				// Important to reset this ref so that we don't try to cancel fired
				// timeouts above.

				onChangeTimeout.current = undefined;

				// Finally call the onChange prop.

				onChange(onChangeText.current!);
			}, 1000);
		},
		[onChange, onEditorChange]
	);

	// If the onChange prop changes while an onChange call is pending, reset the
	// timeout and point it to the correct callback.

	React.useEffect(() => {
		if (onChangeTimeout.current) {
			window.clearTimeout(onChangeTimeout.current);
			onChangeTimeout.current = window.setTimeout(() => {
				// This body must be the same as in the timeout in the previous effect.

				onChangeTimeout.current = undefined;
				onChange(onChangeText.current!);
			}, 1000);
		}
	}, [onChange]);

	const handleMount = React.useCallback(
		(editor: CodeMirror.Editor) => {
			onEditorChange(editor);

			// Check if the selection is empty and between "[[" and "]]". If so, make sure there is no
			// "->" or the cursor is after it. Finally, if all this is true, call the
			// autocompletePassageNames function.
			editor.on('beforeSelectionChange', (editor, change) => {
				if (change.ranges.length > 1) return;
				const {anchor, head} = change.ranges[0];
				if (anchor.line === head.line && anchor.ch === head.ch) {
					const {line, ch} = anchor;
					const lineText = editor.getLine(line);
					if (
						lineText.lastIndexOf('[[', ch) !== -1 &&
						lineText.indexOf(']]', ch) !== -1 &&
						lineText.indexOf('->', ch) === -1
					) {
						requestAnimationFrame(() => {
							autocompletePassageNames(editor);
						});
					}
				}
			});

			// The potential combination of loading a mode and the dialog entrance
			// animation seems to mess up CodeMirror's cursor rendering. The delay below
			// is intended to run after the animation completes.

			window.setTimeout(() => {
				editor.focus();
				editor.refresh();
			}, 400);
		},
		[onEditorChange]
	);

	const handleSlashPrefix = useStableCallback(
		(editor: CodeMirror.Editor) => {
			const toolbarButtons = toolbarItems.flatMap(item =>
				item.type === 'menu'
					? item.items.filter(
							(subItem): subItem is StoryFormatToolbarButton =>
								subItem.type !== 'separator'
					  )
					: item
			);

			editor.showHint({
				completeSingle: false,
				hint(): CodeMirror.Hints {
					const wordRange = editor.findWordAt(editor.getCursor());
					const word = editor
						.getRange(wordRange.anchor, wordRange.head)
						.toLowerCase();

					let buttons = toolbarButtons.filter(button => !button.disabled);
					if (word !== '/') {
						const rankedToolbarButtons = buttons.map(button => ({
							...button,
							score: button.label
								.toLowerCase()
								.split(' ')
								.reduce((acc, curr) => {
									return Math.max(acc, jaroWinkler(word, curr));
								}, 0)
						}));

						rankedToolbarButtons.sort((a, b) => b.score - a.score);

						// As a match becomes more certain, we should only show
						// buttons that are more certain.
						buttons =
							rankedToolbarButtons[0].score >= 0.8
								? rankedToolbarButtons.filter(button => button.score >= 0.8)
								: rankedToolbarButtons[0].score >= 0.6
								? rankedToolbarButtons.filter(button => button.score >= 0.6)
								: rankedToolbarButtons;
					}

					return {
						list: buttons.map(button => ({
							text: button.label,
							hint() {
								const doc = editor.getDoc();
								if (word !== '/') {
									wordRange.anchor.ch--;
								}
								doc.replaceRange('', wordRange.anchor, wordRange.head);
								onExecCommand(button.command);
							}
						})),
						from: wordRange.anchor,
						to: wordRange.head
					};
				}
			});
		},
		[toolbarItems, onExecCommand]
	);

	const {editorExtensions} = useFormatEditorExtensions(
		story.storyFormat,
		story.storyFormatVersion
	);
	const handleAtPrefix = useStableCallback(
		(editor: CodeMirror.Editor) => {
			if (!variableMap) {
				return;
			}

			const {validNameRegex = /^\w+$/, suggestVariableName} =
				editorExtensions?.variables || {};

			editor.showHint({
				completeSingle: false,
				hint() {
					// Get the partial variable name directly before the cursor. It can include periods and underscores. The first character of each part (i.e. the first character of the variable or the first character after a period) must be a letter or underscore.
					const cursor = editor.getCursor();
					const precedingText = editor.getLine(cursor.line).slice(0, cursor.ch);
					const variableQuery = precedingText.match(/@([^\s]+)?$/);

					if (!variableQuery || !validNameRegex.test(variableQuery[1])) {
						return;
					}

					let variableNames = variableMap
						.variablesForPassage(passage)
						.map(variable => variable.name);

					if (suggestVariableName) {
						variableNames = suggestVariableName(
							variableNames,
							variableQuery[1]
						);
					} else {
						variableNames = similaritySort(variableNames, variableQuery[1]);
					}

					return {
						list: variableNames,
						from: {
							line: cursor.line,
							ch: cursor.ch - variableQuery[0].length
						},
						to: cursor
					};
				}
			});
		},
		[variableMap]
	);

	const handlePrefix = React.useCallback(
		(editor: CodeMirror.Editor) => {
			const cursor = editor.getCursor();
			const isSlash =
				editor.getRange({line: cursor.line, ch: cursor.ch - 1}, cursor) === '/';

			if (isSlash) {
				// Ignore slash if not at the start of a line.
				if (cursor.ch === 1) {
					handleSlashPrefix(editor);
				}
			} else {
				const isAt =
					editor.getRange({line: cursor.line, ch: cursor.ch - 1}, cursor) ===
					'@';

				if (isAt) {
					handleAtPrefix(editor);
				} else {
					autocompletePassageNames(editor);
				}
			}
		},
		[autocompletePassageNames]
	);

	const options = React.useMemo(
		(): EditorConfiguration => ({
			...codeMirrorOptionsFromPrefs(prefs),
			mode: storyFormatExtensionsDisabled ? 'text' : mode,
			lineWrapping: true,
			placeholder: t('dialogs.passageEdit.passageTextPlaceholder'),
			prefixTrigger: {
				callback: handlePrefix,
				prefixes: ['[[', '->', '/', '@']
			},
			extraKeys: {
				call(key, cm) {
					if (key === 'Tab' || key === 'Shift-Tab') {
						const reverse = key === 'Shift-Tab';

						let firstMarkIndex = -1;
						let lastMarkIndex = -1;
						let previousMarkIndex = -1;
						let nextMarkIndex = -1;

						const cursor = cm.getCursor();
						const marks = cm.getAllMarks();
						marks.forEach((mark, index) => {
							const markerRange = mark.find() as CodeMirror.MarkerRange;
							const {line, ch} = reverse ? markerRange.to : markerRange.from;

							if (
								line < cursor.line ||
								(line === cursor.line && ch < cursor.ch)
							) {
								if (firstMarkIndex === -1) {
									firstMarkIndex = index;
								}
								previousMarkIndex = index;
							} else {
								if (lastMarkIndex === -1) {
									nextMarkIndex = index;
								}
								lastMarkIndex = index;
							}
						});

						if (reverse) {
							nextMarkIndex = previousMarkIndex;
							firstMarkIndex = lastMarkIndex;
						}

						if (nextMarkIndex === -1) {
							nextMarkIndex = firstMarkIndex;
							if (nextMarkIndex === -1) {
								return;
							}
						}

						const nextPlaceholder = marks
							.slice(nextMarkIndex)
							.find(mark => mark.className === 'placeholder');

						// Select the placeholder mark.
						const placeholderElement = nextPlaceholder?.replacedWith;
						if (placeholderElement) {
							return () => {
								placeholderElement.click();
							};
						}
					}
				},
				fallthrough: undefined
			},
			// This value prevents the area from being focused.
			readOnly: disabled ? 'nocursor' : false
		}),
		[disabled, handlePrefix, mode, prefs, storyFormatExtensionsDisabled, t]
	);

	const hotReloadKey = React.useMemo(() => Date.now(), []);

	return (
		<DialogEditor>
			<CodeArea
				key={hotReloadKey}
				editorDidMount={handleMount}
				fontFamily={prefs.passageEditorFontFamily}
				fontScale={prefs.passageEditorFontScale}
				label={t('dialogs.passageEdit.passageTextEditorLabel')}
				labelHidden
				onBeforeChange={handleLocalChange}
				onChange={onEditorChange}
				options={options}
				value={localText}
			/>
		</DialogEditor>
	);
};

function useStableCallback<T extends (...args: any[]) => any>(
	callback: T,
	deps: React.DependencyList
) {
	const ref = React.useRef<T>();
	React.useEffect(() => {
		ref.current = callback;
	}, deps);

	return React.useCallback(
		(...args: Parameters<T>) => ref.current?.(...args),
		[]
	);
}
