import * as React from 'react';
import {useTranslation} from 'react-i18next';
import {RouteToolbar} from '../../../components/route-toolbar';
import {AppActions, BuildActions} from '../../../route-actions';
import {Story} from '../../../store/stories';
import {Point} from '../../../util/geometry';
import {PassageActions} from './passage/passage-actions';
import {StoryActions} from './story/story-actions';
import {UndoRedoButtons} from './undo-redo-buttons';
import {ZoomButtons} from './zoom-buttons';
import {StoryFormatVariableMap} from '../use-parsed-passage-variables';

export interface StoryEditToolbarProps {
	getCenter: () => Point;
	onOpenFuzzyFinder: () => void;
	story: Story;
	variableMap: StoryFormatVariableMap;
}

export const StoryEditToolbar: React.FC<StoryEditToolbarProps> = props => {
	const {getCenter, onOpenFuzzyFinder, story, variableMap} = props;
	const {t} = useTranslation();

	return (
		<RouteToolbar
			pinnedControls={
				<>
					<ZoomButtons story={story} />
					<UndoRedoButtons />
				</>
			}
			tabs={{
				[t('common.passage')]: (
					<PassageActions
						getCenter={getCenter}
						onOpenFuzzyFinder={onOpenFuzzyFinder}
						story={story}
						variableMap={variableMap}
					/>
				),
				[t('common.story')]: <StoryActions story={story} />,
				[t('common.build')]: <BuildActions story={story} />,
				[t('common.appName')]: <AppActions />
			}}
		/>
	);
};
