import * as React from 'react';
import {useTranslation} from 'react-i18next';
import useErrorBoundary from 'use-error-boundary';
import {ErrorMessage} from '../../components/error';
import {passageWithId, storyWithId, updatePassage} from '../../store/stories';
import {
	formatWithNameAndVersion,
	useStoryFormatsContext
} from '../../store/story-formats';
import {useUndoableStoriesContext} from '../../store/undoable-stories';
import {PassageText} from './passage-text';
import {PassageToolbar} from './passage-toolbar';
import {StoryFormatToolbar} from './story-format-toolbar';
import {TagToolbar} from './tag-toolbar';
import './passage-edit-contents.css';
import {useStoryFormatToolbarItems} from './use-story-format-toolbar-items';

export interface PassageEditContentsProps {
	disabled?: boolean;
	passageId: string;
	storyId: string;
}

export const PassageEditContents: React.FC<
	PassageEditContentsProps
> = props => {
	const {disabled, passageId, storyId} = props;
	const [storyFormatExtensionsEnabled, setStoryFormatExtensionsEnabled] =
		React.useState(true);
	const [editorCrashed, setEditorCrashed] = React.useState(false);
	const [cmEditor, setCmEditor] = React.useState<CodeMirror.Editor>();
	const {ErrorBoundary, error, reset: resetError} = useErrorBoundary();
	const {dispatch, stories} = useUndoableStoriesContext();
	const {formats} = useStoryFormatsContext();
	const passage = passageWithId(stories, storyId, passageId);
	const story = storyWithId(stories, storyId);
	const storyFormat = formatWithNameAndVersion(
		formats,
		story.storyFormat,
		story.storyFormatVersion
	);
	const {t} = useTranslation();
	const [toolbarItems, refreshToolbarItems] = useStoryFormatToolbarItems(
		storyFormat.name,
		storyFormat.version,
		cmEditor
	);

	React.useEffect(() => {
		if (error) {
			if (storyFormatExtensionsEnabled) {
				console.error(
					'Passage editor crashed, trying without format extensions',
					error
				);
				setStoryFormatExtensionsEnabled(false);
			} else {
				setEditorCrashed(true);
			}

			resetError();
		}
	}, [error, resetError, storyFormatExtensionsEnabled]);

	const handlePassageTextChange = React.useCallback(
		(text: string) => {
			dispatch(updatePassage(story, passage, {text}));
		},
		[dispatch, passage, story]
	);

	const handleExecCommand = React.useCallback(
		(name: string) => {
			// A format toolbar command probably will affect the editor content. It
			// appears that react-codemirror2 can't maintain the selection properly in
			// all cases when this happens (particularly when using
			// `replaceSelection('something', 'around')`), so we take a snapshot
			// immediately after the command runs, let react-codemirror2 work, then
			// reapply the selection ASAP.

			if (!cmEditor) {
				throw new Error('No editor set');
			}

			cmEditor.execCommand(name);

			const selections = cmEditor.listSelections();

			Promise.resolve().then(() => {
				cmEditor.setSelections(selections);
				renderTabPlaceholders(cmEditor, true);
				refreshToolbarItems();
			});
		},
		[cmEditor, renderTabPlaceholders, refreshToolbarItems]
	);

	const onEditorChange = React.useCallback((editor: CodeMirror.Editor) => {
		setCmEditor(editor);
		renderTabPlaceholders(editor);
	}, []);

	if (editorCrashed) {
		return (
			<ErrorMessage>{t('dialogs.passageEdit.editorCrashed')}</ErrorMessage>
		);
	}

	return (
		<div className="passage-edit-contents" aria-hidden={disabled}>
			<PassageToolbar
				disabled={disabled}
				editor={cmEditor}
				passage={passage}
				story={story}
			/>
			{storyFormatExtensionsEnabled && (
				<StoryFormatToolbar
					disabled={disabled}
					onExecCommand={handleExecCommand}
					toolbarItems={toolbarItems}
				/>
			)}
			<TagToolbar disabled={disabled} passage={passage} story={story} />
			<ErrorBoundary>
				<PassageText
					disabled={disabled}
					onChange={handlePassageTextChange}
					onEditorChange={onEditorChange}
					passage={passage}
					story={story}
					storyFormat={storyFormat}
					storyFormatExtensionsDisabled={!storyFormatExtensionsEnabled}
					onExecCommand={handleExecCommand}
					toolbarItems={toolbarItems}
				/>
			</ErrorBoundary>
		</div>
	);
};

// Look for placeholder syntax like ${1:placeholder} and
// replace them with element marks
function renderTabPlaceholders(
	editor: CodeMirror.Editor,
	focusFirst?: boolean
) {
	let firstPlaceholder: HTMLElement | undefined;

	const doc = editor.getDoc();
	doc.eachLine(line => {
		const lineNumber = doc.getLineNumber(line)!;
		const placeholderRegex = /\${(\d+):([^}]+)}/g;

		let match;
		while ((match = placeholderRegex.exec(line.text)) !== null) {
			const from = {
				line: lineNumber,
				ch: match.index
			};
			const to = {
				line: lineNumber,
				ch: from.ch + match[0].length
			};

			const placeholder = document.createElement('span');
			firstPlaceholder ??= placeholder;
			placeholder.className = 'placeholder';
			placeholder.textContent = match[2];

			const setSelected = (selected: boolean) => {
				const value = selected ? '1' : '0';
				if (value !== placeholder.dataset.selected) {
					placeholder.dataset.selected = value;
				}
			};

			setSelected(false);

			placeholder.addEventListener('click', () => {
				doc.setSelection(from, to);
			});

			const marker = doc.markText(from, to, {
				className: 'placeholder',
				replacedWith: placeholder,
				handleMouseEvents: true
			});

			const onSelectionChange = (
				editor: CodeMirror.Editor,
				selection: CodeMirror.EditorSelectionChange
			) => {
				setSelected(
					selection.ranges.length === 1 &&
						selection.ranges[0].anchor.line === from.line &&
						selection.ranges[0].anchor.ch === from.ch
				);
			};

			editor.on('beforeSelectionChange', onSelectionChange);
			marker.on('clear', () => {
				editor.off('beforeSelectionChange', onSelectionChange);
			});
		}
	});

	if (focusFirst) {
		Promise.resolve().then(() => {
			firstPlaceholder?.click();
		});
	}
}
