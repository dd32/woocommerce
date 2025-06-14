/**
 * External dependencies
 */
import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { dispatch } from '@wordpress/data';
import { validationStore } from '@woocommerce/block-data';

/**
 * Internal dependencies
 */
import { TotalsCoupon } from '..';

describe( 'TotalsCoupon', () => {
	it( "Shows a validation error when one is in the wc/store/validation data store and doesn't show one when there isn't", async () => {
		const user = userEvent.setup();
		const { rerender } = render( <TotalsCoupon instanceId={ 'coupon' } /> );

		const openCouponFormButton = screen.getByText( 'Add coupons' );
		expect( openCouponFormButton ).toBeInTheDocument();
		await act( async () => {
			await user.click( openCouponFormButton );
		} );
		expect(
			screen.queryByText( 'Invalid coupon code' )
		).not.toBeInTheDocument();

		const { setValidationErrors } = dispatch( validationStore );
		act( () => {
			setValidationErrors( {
				coupon: {
					hidden: false,
					message: 'Invalid coupon code',
				},
			} );
		} );
		rerender( <TotalsCoupon instanceId={ 'coupon' } /> );

		expect( screen.getByText( 'Invalid coupon code' ) ).toBeInTheDocument();
	} );
} );
