/**
 * Internal dependencies
 */
import { setDefaultPaymentMethod as setDefaultPaymentMethodOriginal } from '../utils/set-default-payment-method';
import '../../checkout';
import { store as paymentStore } from '..';
import { PlainPaymentMethods } from '../../../types';

const originalDispatch = jest.requireActual( '@wordpress/data' ).dispatch;

jest.mock( '../utils/set-default-payment-method', () => ( {
	setDefaultPaymentMethod: jest.fn(),
} ) );

describe( 'payment data store actions', () => {
	const paymentMethods: PlainPaymentMethods = {
		'wc-payment-gateway-1': {
			name: 'wc-payment-gateway-1',
		},
		'wc-payment-gateway-2': {
			name: 'wc-payment-gateway-2',
		},
	};

	describe( 'setAvailablePaymentMethods', () => {
		it( 'Does not call setDefaultPaymentGateway if the current method is still available', () => {
			const actions = originalDispatch( paymentStore );
			actions.__internalSetActivePaymentMethod(
				Object.keys( paymentMethods )[ 0 ]
			);
			actions.__internalSetAvailablePaymentMethods( paymentMethods );
			expect( setDefaultPaymentMethodOriginal ).not.toHaveBeenCalled();
		} );

		it( 'Resets the default gateway if the current method is no longer available', () => {
			const actions = originalDispatch( paymentStore );
			actions.__internalSetActivePaymentMethod(
				Object.keys( paymentMethods )[ 0 ]
			);
			actions.__internalSetAvailablePaymentMethods( [
				paymentMethods[ Object.keys( paymentMethods )[ 0 ] ],
			] );
			expect( setDefaultPaymentMethodOriginal ).toHaveBeenCalled();
		} );
	} );
} );
