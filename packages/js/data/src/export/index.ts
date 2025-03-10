/**
 * External dependencies
 */
import { registerStore } from '@wordpress/data';
import { SelectFromMap, DispatchFromMap } from '@automattic/data-stores';
import { Reducer, AnyAction } from 'redux';
/**
 * Internal dependencies
 */
import { STORE_NAME } from './constants';
import * as selectors from './selectors';
import * as actions from './actions';
import reducer, { State } from './reducer';
import { WPDataSelectors } from '../types';
import controls from '../controls';
import { PromiseifySelectors } from '../types/promiseify-selectors';
export * from './types';
export type { State };

// @ts-expect-error migrate store to createReduxStore function https://github.com/woocommerce/woocommerce/issues/55640
registerStore< State >( STORE_NAME, {
	reducer: reducer as Reducer< State, AnyAction >,
	actions,
	controls,
	selectors,
} );

export const EXPORT_STORE_NAME = STORE_NAME;

declare module '@wordpress/data' {
	// TODO: convert action.js to TS
	function dispatch(
		key: typeof STORE_NAME
	): DispatchFromMap< typeof actions >;
	function select(
		key: typeof STORE_NAME
	): SelectFromMap< typeof selectors > & WPDataSelectors;
	function resolveSelect(
		key: typeof STORE_NAME
	): PromiseifySelectors< SelectFromMap< typeof selectors > >;
}
