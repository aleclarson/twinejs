import {ModeFactory} from 'codemirror';
import {Thunk} from 'react-hook-thunk-reducer';
import type {Passage} from '../stories';

interface BaseStoryFormat {
	id: string;
	loadState: 'unloaded' | 'loading' | 'loaded' | 'error';
	name: string;
	selected: boolean;
	url: string;
	userAdded: boolean;
	version: string;
}

/**
 * States for a story format.
 */
export type StoryFormat =
	| (BaseStoryFormat & {loadState: 'unloaded'})
	| (BaseStoryFormat & {loadState: 'loading'})
	| (BaseStoryFormat & {loadState: 'error'; loadError: Error})
	| (BaseStoryFormat & {
			loadState: 'loaded';
			properties: StoryFormatProperties;
	  });

export type StoryFormatToolbarButton = {
	type: 'button';
	command: string;
	disabled?: boolean;
	icon: string;
	iconOnly?: boolean;
	label: string;
};

export type StoryFormatToolbarMenuItem =
	| Omit<StoryFormatToolbarButton, 'icon'>
	| {type: 'separator'};

export type StoryFormatToolbarItem =
	| StoryFormatToolbarButton
	| {
			type: 'menu';
			disabled: boolean;
			icon: string;
			iconOnly?: boolean;
			items: StoryFormatToolbarMenuItem[];
			label: string;
	  };

export interface StoryFormatToolbarFactoryEnvironment {
	appTheme: 'dark' | 'light';
	foregroundColor: string;
	locale: string;
}

export type StoryFormatToolbarFactory = (
	editor: CodeMirror.Editor,
	environment: StoryFormatToolbarFactoryEnvironment
) => StoryFormatToolbarItem[];

/**
 * Either a variable reference or a variable definition.
 */
export type StoryFormatVariableToken = {
	/** The name of the variable. */
	name: string;
	/**
	 * Where in the passage text the variable was found. If null, the variable is built-in to the
	 * story format and is not editable.
	 */
	position: {line: number; ch: number} | null;
	/** The expression used to update the variable. If undefined, this is a reference. */
	expression?: string;
	/** If true, the variable is local to the passage. */
	local?: boolean;
	/**
	 * The passage in which the variable was declared. If null, the variable is built-in to the story
	 * format and is not editable.
	 */
	passage: Passage | null;
};

export type VariableToken = {
	name: string;
	position: {line: number; ch: number};
	expression?: string;
	local?: boolean;
};

export type StoryFormatVariablesExtension = {
	/** Reserved words cannot be used as variable names. */
	reservedWords?: string[];
	/** Used in variable auto-completion and to find variable references in passage text. */
	validNameRegex?: RegExp;
	/**
	 * Used to identify areas in the passage text where variables might be referenced. Every capture
	 * group is searched for variable references.
	 */
	expressionRegex?: RegExp;
	/**
	 * Suggest variable names for auto-completion. If this is not defined, the default behavior is to
	 * sort the variable names by Jaro-Winkler similarity.
	 */
	suggestVariableName?: (variableNames: string[], query: string) => string[];
	/**
	 * Variable definitions are parsed from passages, for auto-completion and validation.
	 */
	parseDefinitions?: (text: string) => (string | VariableToken)[];
};

/**
 * Properties available once a story format is loaded. Note that some there is
 * some overlap between this and StoryFormat--this is so that we know certain
 * things, mainly the format name and version, before loading.
 * @see
 * https://github.com/iftechfoundation/twine-specs/blob/master/twine-2-storyformats-spec.md
 */
export interface StoryFormatProperties {
	author?: string;
	description?: string;
	editorExtensions?: {
		twine?: {
			[semverSpec: string]: {
				codeMirror?: {
					commands?: Record<string, (editor: CodeMirror.Editor) => void>;
					mode?: ModeFactory<unknown>;
					toolbar?: StoryFormatToolbarFactory;
				};
				references?: {
					parsePassageText?: (text: string) => string[];
				};
				variables?: StoryFormatVariablesExtension;
			};
		};
	};
	hydrate?: string;
	image?: string;
	license?: string;
	name: string;
	proofing?: boolean;
	source: string;
	url?: string;
	version: string;
}

export type StoryFormatsState = StoryFormat[];

export type StoryFormatsAction =
	| {type: 'init'; state: StoryFormat[]}
	| {type: 'repair'}
	| {
			type: 'create';
			props: Omit<StoryFormat, 'id' | 'loadState' | 'properties'>;
	  }
	| {type: 'delete'; id: string}
	| {type: 'update'; id: string; props: Partial<StoryFormat>};

export type StoryFormatsDispatch = React.Dispatch<
	StoryFormatsAction | Thunk<StoryFormatsState, StoryFormatsAction>
>;

export interface StoryFormatsContextProps {
	dispatch: StoryFormatsDispatch;
	formats: StoryFormatsState;
}
