import {IconEdit} from '@tabler/icons';
import * as React from 'react';
import {useTranslation} from 'react-i18next';
import {IconButton} from '../../../../components/control/icon-button';
import {addPassageEditors, useDialogsContext} from '../../../../dialogs';
import {Passage, Story} from '../../../../store/stories';
import {StoryFormatVariableMap} from '../../use-parsed-passage-variables';

export interface EditPassagesButtonProps {
	passages: Passage[];
	story: Story;
	variableMap: StoryFormatVariableMap;
}

export const EditPassagesButton: React.FC<EditPassagesButtonProps> = props => {
	const {passages, story} = props;
	const {dispatch} = useDialogsContext();
	const {t} = useTranslation();

	function handleClick() {
		dispatch(
			addPassageEditors(
				story.id,
				passages.map(({id}) => id),
				props.variableMap
			)
		);
	}

	return (
		<IconButton
			disabled={passages.length === 0}
			icon={<IconEdit />}
			label={
				passages.length > 1
					? t('common.editCount', {count: passages.length})
					: t('common.edit')
			}
			onClick={handleClick}
		/>
	);
};
