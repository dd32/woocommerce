/**
 * External dependencies
 */
import { Modal } from '@wordpress/components';

export type SchedulePublishModalProps = Omit<
	React.ComponentProps< typeof Modal >,
	'children' | 'title' | 'onRequestClose' | 'value'
> & {
	postType: string;
	title?: string;
	description?: string;
	value?: string;
	onCancel?(): void;
	onSchedule?( value?: string ): void;
	isScheduling?: boolean;
};
