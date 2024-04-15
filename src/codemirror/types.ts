import {CMPrefixTriggerOptions} from './prefix-trigger';

export interface EditorConfiguration extends CodeMirror.EditorConfiguration {
	prefixTrigger?: CMPrefixTriggerOptions;
}
