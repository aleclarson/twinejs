import * as React from 'react';
import {StoryFormatToolbarItem} from '../../store/story-formats';
import {ButtonBar} from '../../components/container/button-bar';
import {IconButton} from '../../components/control/icon-button';
import {MenuButton} from '../../components/control/menu-button';
import './story-format-toolbar.css';

export interface StoryFormatToolbarProps {
	disabled?: boolean;
	onExecCommand: (name: string) => void;
	toolbarItems: StoryFormatToolbarItem[];
}

export const StoryFormatToolbar: React.FC<StoryFormatToolbarProps> = props => {
	const {disabled, onExecCommand, toolbarItems} = props;
	const containerRef = React.useRef<HTMLDivElement>(null);

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
									onClick={() => onExecCommand(item.command)}
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
													onClick: () => onExecCommand(subitem.command)
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
