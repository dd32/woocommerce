/**
 * External dependencies
 */
import { __ } from '@wordpress/i18n';
import { Button } from '@wordpress/components';
import { EllipsisMenu } from '@woocommerce/components';
import { onboardingStore } from '@woocommerce/data';
import { useDispatch } from '@wordpress/data';

export type TaskListMenuProps = {
	id: string;
	hideTaskListText?: string;
};

export const TaskListMenu = ( { id, hideTaskListText }: TaskListMenuProps ) => {
	const { hideTaskList } = useDispatch( onboardingStore );

	return (
		<div className="woocommerce-card__menu woocommerce-card__header-item">
			<EllipsisMenu
				label={ __( 'Task List Options', 'woocommerce' ) }
				renderContent={ () => (
					<div className="woocommerce-task-card__section-controls">
						<Button onClick={ () => hideTaskList( id ) }>
							{ hideTaskListText ||
								__( 'Hide this', 'woocommerce' ) }
						</Button>
					</div>
				) }
			/>
		</div>
	);
};
