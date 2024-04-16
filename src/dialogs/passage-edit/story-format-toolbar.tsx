import * as React from 'react';
import CodeMirror from 'codemirror';
import {usePrefsContext} from '../../store/prefs';
import {StoryFormat, StoryFormatToolbarItem} from '../../store/story-formats';
import {useComputedTheme} from '../../store/prefs/use-computed-theme';
import {ButtonBar} from '../../components/container/button-bar';
import {IconButton} from '../../components/control/icon-button';
import {MenuButton} from '../../components/control/menu-button';
import './story-format-toolbar.css';

export interface StoryFormatToolbarProps {
	disabled?: boolean;
	editor?: CodeMirror.Editor;
	onExecCommand: (name: string) => void;
	storyFormat: StoryFormat;
	toolbarItems: StoryFormatToolbarItem[];
}

export const StoryFormatToolbar: React.FC<StoryFormatToolbarProps> = props => {
	const {disabled, editor, onExecCommand, storyFormat, toolbarItems} = props;
	const containerRef = React.useRef<HTMLDivElement>(null);
	const appTheme = useComputedTheme();
	const {prefs} = usePrefsContext();

	function execCommand(name: string) {
		// Run the command, then update the toolbar after the current execution
		// context finishes.

		onExecCommand(name);
		Promise.resolve().then(() => {
			// No need to update the toolbar here, as it's handled by the
			// useStoryFormatToolbarItems hook
		});
	}

	return (
		<div className="story-format-toolbar" ref={containerRef}>
			<ButtonBar>
				{toolbarItems.map((item, index) => {
					switch (item.type) {
						case 'button':
							return (
								<IconButton
									disabled={disabled || item.disabled}
									icon={<img src={item.icon} alt="" />}
									iconOnly={item.iconOnly}
									key={index}
									label={item.label}
									onClick={() => execCommand(item.command)}
								/>
							);

						case 'menu': {
							return (
								<MenuButton
									disabled={disabled || item.disabled}
									icon={<img src={item.icon} alt="" />}
									iconOnly={item.iconOnly}
									items={item.items
										.filter(subitem =>
											['button', 'separator'].includes(subitem.type)
										)
										.map(subitem => {
											if (subitem.type === 'button') {
												return {
													type: 'button',
													disabled: subitem.disabled,
													label: subitem.label,
													onClick: () => execCommand(subitem.command)
												};
											}

											return {separator: true};
										})}
									key={index}
									label={item.label}
								/>
							);
						}
					}

					return null;
				})}
			</ButtonBar>
		</div>
	);
};
