/**
 * External dependencies
 */
import { assign, DoneInvokeEvent } from 'xstate';
import { dispatch } from '@wordpress/data';
import { optionsStore } from '@woocommerce/data';

/**
 * Internal dependencies
 */
import { customizeStoreStateMachineContext } from '../types';
import { customizeStoreStateMachineEvents } from '..';

export const assignHasCompleteSurvey = assign<
	customizeStoreStateMachineContext,
	customizeStoreStateMachineEvents
>( {
	transitionalScreen: (
		context: customizeStoreStateMachineContext,
		event
	) => {
		return {
			...context.transitionalScreen,
			hasCompleteSurvey:
				( event as DoneInvokeEvent< string | undefined > ).data ===
				'yes',
		};
	},
} );

export const completeSurvey = assign<
	customizeStoreStateMachineContext,
	customizeStoreStateMachineEvents
>( {
	transitionalScreen: ( context: customizeStoreStateMachineContext ) => {
		dispatch( optionsStore ).updateOptions( {
			woocommerce_admin_customize_store_survey_completed: 'yes',
		} );

		return {
			...context.transitionalScreen,
			hasCompleteSurvey: true,
		};
	},
} );
