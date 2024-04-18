import uuid from 'tiny-uuid';
import * as React from 'react';
import useThunkReducer from 'react-hook-thunk-reducer';
import {usePersistence} from '../persistence/use-persistence';
import {builtins} from './defaults';
import {
	StoryFormat,
	StoryFormatsAction,
	StoryFormatsContextProps,
	StoryFormatsState
} from './story-formats.types';
import {useStoreErrorReporter} from '../use-store-error-reporter';
import {reducer} from './reducer';
import {formatWithNameAndVersion} from './getters';

const defaultBuiltins: StoryFormat[] = builtins().map(f => ({
	...f,
	id: uuid(),
	loadState: 'unloaded',
	selected: false,
	userAdded: false
}));

export const StoryFormatsContext =
	React.createContext<StoryFormatsContextProps>({
		dispatch: () => {},
		formats: []
	});

StoryFormatsContext.displayName = 'StoryFormats';

export const useStoryFormat = (formatName: string, formatVersion: string) => {
	const {dispatch, formats} = useStoryFormatsContext();
	return {
		format: formatWithNameAndVersion(formats, formatName, formatVersion),
		dispatch
	};
};

export const useStoryFormatsContext = () =>
	React.useContext(StoryFormatsContext);

export const StoryFormatsContextProvider: React.FC = props => {
	const {storyFormats} = usePersistence();
	const {reportError} = useStoreErrorReporter();
	const persistedReducer: React.Reducer<StoryFormatsState, StoryFormatsAction> =
		React.useCallback(
			(state, action) => {
				const newState = reducer(state, action);

				try {
					storyFormats.saveMiddleware(newState, action);
				} catch (error) {
					reportError(error as Error, 'store.errors.cantPersistStoryFormats');
				}
				return newState;
			},
			[reportError, storyFormats]
		);

	const [state, dispatch] = useThunkReducer(persistedReducer, defaultBuiltins);

	return (
		<StoryFormatsContext.Provider
			value={{
				dispatch,
				formats: state
			}}
		>
			{props.children}
		</StoryFormatsContext.Provider>
	);
};
