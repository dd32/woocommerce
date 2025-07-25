/**
 * External dependencies
 */
import { render, screen, waitFor, act } from '@testing-library/react';
import { previewCart } from '@woocommerce/resource-previews';
import { dispatch } from '@wordpress/data';
import { CART_STORE_KEY as storeKey } from '@woocommerce/block-data';
import { server, http, HttpResponse } from '@woocommerce/test-utils/msw';
import { registerCheckoutFilters } from '@woocommerce/blocks-checkout';

/**
 * Internal dependencies
 */
import { defaultCartState } from '../../../data/cart/default-state';
import { allSettings } from '../../../settings/shared/settings-init';

import Cart from '../block';

import FilledCart from '../inner-blocks/filled-cart-block/frontend';
import EmptyCart from '../inner-blocks/empty-cart-block/frontend';

import ItemsBlock from '../inner-blocks/cart-items-block/frontend';
import TotalsBlock from '../inner-blocks/cart-totals-block/frontend';

import LineItemsBlock from '../inner-blocks/cart-line-items-block/block';
import OrderSummaryBlock from '../inner-blocks/cart-order-summary-block/frontend';
import ExpressPaymentBlock from '../inner-blocks/cart-express-payment-block/block';
import ProceedToCheckoutBlock from '../inner-blocks/proceed-to-checkout-block/block';
import AcceptedPaymentMethodsIcons from '../inner-blocks/cart-accepted-payment-methods-block/block';
import OrderSummaryHeadingBlock from '../inner-blocks/cart-order-summary-heading/frontend';
import OrderSummarySubtotalBlock from '../inner-blocks/cart-order-summary-subtotal/frontend';
import OrderSummaryShippingBlock from '../inner-blocks/cart-order-summary-shipping/frontend';
import OrderSummaryTaxesBlock from '../inner-blocks/cart-order-summary-taxes/frontend';

jest.mock( '@wordpress/compose', () => ( {
	...jest.requireActual( '@wordpress/compose' ),
	useResizeObserver: jest.fn().mockReturnValue( [ null, { width: 0 } ] ),
} ) );

const CartBlock = ( {
	attributes = {
		showRateAfterTaxName: false,
		checkoutPageId: 0,
	},
} ) => {
	const { showRateAfterTaxName, checkoutPageId } = attributes;
	return (
		<Cart attributes={ attributes }>
			<FilledCart>
				<ItemsBlock>
					<LineItemsBlock />
				</ItemsBlock>
				<TotalsBlock>
					<OrderSummaryBlock>
						<OrderSummaryHeadingBlock />
						<OrderSummarySubtotalBlock />
						<OrderSummaryShippingBlock />
						<OrderSummaryTaxesBlock
							showRateAfterTaxName={ showRateAfterTaxName }
						/>
					</OrderSummaryBlock>
					<ExpressPaymentBlock />
					<ProceedToCheckoutBlock checkoutPageId={ checkoutPageId } />
					<AcceptedPaymentMethodsIcons />
				</TotalsBlock>
			</FilledCart>
			<EmptyCart>
				<p>Empty Cart</p>
			</EmptyCart>
		</Cart>
	);
};

describe( 'Testing cart', () => {
	beforeEach( () => {
		// Set up MSW handlers for cart requests
		server.use(
			http.get( '/wc/store/v1/cart', () => {
				return HttpResponse.json( previewCart );
			} )
		);
		act( () => {
			// need to clear the store resolution state between tests.
			dispatch( storeKey ).invalidateResolutionForStore();
			dispatch( storeKey ).receiveCart( defaultCartState.cartData );
		} );
	} );

	afterEach( () => {
		server.resetHandlers();
	} );

	it( 'renders cart if there are items in the cart', async () => {
		render( <CartBlock /> );

		await waitFor( () =>
			expect(
				screen.getByText( /Proceed to Checkout/i )
			).toBeInTheDocument()
		);

		expect(
			screen.getByText( /Proceed to Checkout/i )
		).toBeInTheDocument();
	} );

	it( 'Contains a Taxes section if Core options are set to show it', async () => {
		allSettings.displayCartPricesIncludingTax = false;
		// The criteria for showing the Taxes section is:
		// Display prices during basket and checkout: 'Excluding tax'.
		render( <CartBlock /> );

		await waitFor( () =>
			expect( screen.getByText( /Tax/i ) ).toBeInTheDocument()
		);
		expect( screen.getByText( /Tax/i ) ).toBeInTheDocument();
	} );

	it( 'Contains a Order summary header', async () => {
		render( <CartBlock /> );

		await waitFor( () =>
			expect( screen.getByText( /Cart totals/i ) ).toBeInTheDocument()
		);
		expect( screen.getByText( /Cart totals/i ) ).toBeInTheDocument();
	} );

	it( 'Contains a Order summary Subtotal section', async () => {
		render( <CartBlock /> );

		await waitFor( () =>
			expect( screen.getByText( /Subtotal/i ) ).toBeInTheDocument()
		);
		expect( screen.getByText( /Subtotal/i ) ).toBeInTheDocument();
	} );

	it( 'Shows individual tax lines if the store is set to do so', async () => {
		allSettings.displayCartPricesIncludingTax = false;
		allSettings.displayItemizedTaxes = true;
		// The criteria for showing the lines in the Taxes section is:
		// Display prices during basket and checkout: 'Excluding tax'.
		// Display tax totals: 'Itemized';
		render( <CartBlock /> );
		await waitFor( () =>
			expect( screen.getByText( /Sales tax/i ) ).toBeInTheDocument()
		);
		expect( screen.getByText( /Sales tax/i ) ).toBeInTheDocument();
	} );

	it( 'Shows rate percentages after tax lines if the block is set to do so', async () => {
		allSettings.displayCartPricesIncludingTax = false;
		allSettings.displayItemizedTaxes = true;
		// The criteria for showing the lines in the Taxes section is:
		// Display prices during basket and checkout: 'Excluding tax'.
		// Display tax totals: 'Itemized';
		render(
			<CartBlock
				attributes={ {
					showRateAfterTaxName: true,
					checkoutPageId: 0,
				} }
			/>
		);
		await waitFor( () =>
			expect( screen.getByText( /Sales tax 20%/i ) ).toBeInTheDocument()
		);
		expect( screen.getByText( /Sales tax 20%/i ) ).toBeInTheDocument();
	} );

	it( 'renders empty cart if there are no items in the cart', async () => {
		server.use(
			http.get( '/wc/store/v1/cart', () => {
				return HttpResponse.json( defaultCartState.cartData );
			} )
		);
		render( <CartBlock /> );

		await waitFor( () =>
			expect( screen.getByText( /Empty Cart/i ) ).toBeInTheDocument()
		);
		expect( screen.getByText( /Empty Cart/i ) ).toBeInTheDocument();
	} );

	it( 'renders correct cart line subtotal when currency has 0 decimals', async () => {
		const cart = {
			...previewCart,
			// Make it so there is only one item to simplify things.
			items: [
				{
					...previewCart.items[ 0 ],
					totals: {
						...previewCart.items[ 0 ].totals,
						// Change price format so there are no decimals.
						currency_minor_unit: 0,
						currency_prefix: '',
						currency_suffix: '€',
						line_subtotal: '16',
						line_total: '18',
					},
				},
			],
			items_count: 2,
		};

		server.use(
			http.get( '/wc/store/v1/cart', () => {
				return HttpResponse.json( cart );
			} )
		);

		render( <CartBlock /> );

		await waitFor( () =>
			expect( screen.getAllByRole( 'cell' )[ 1 ] ).toHaveTextContent(
				'16€'
			)
		);
	} );

	it( 'updates quantity when changed in server', async () => {
		render( <CartBlock /> );

		await waitFor( () =>
			expect(
				screen.getByLabelText(
					`Quantity of ${ previewCart.items[ 1 ].name } in your cart.`
				)
			).toHaveValue( 1 )
		);

		// Update the quantity of the second item to 5
		const cart = {
			...previewCart,
			items: [
				{
					...previewCart.items[ 0 ],
				},
				{
					...previewCart.items[ 1 ],
					quantity: 5,
				},
			],
			items_count: 7,
		};

		server.use(
			http.get( '/wc/store/v1/cart', () => {
				return HttpResponse.json( cart );
			} )
		);

		act( () => {
			dispatch( storeKey ).receiveCart( cart );
		} );

		// Check that quantity was updated to 5
		await waitFor( () =>
			expect(
				screen.getByLabelText(
					`Quantity of ${ cart.items[ 1 ].name } in your cart.`
				)
			).toHaveValue( 5 )
		);

		// React Transition Group uses deprecated findDOMNode, so we need to suppress the warning. This will have to be fixed in React 19.
		expect( console ).toHaveErrored();

		// TODO: This can be simplified to expect(console).toHaveErroredWith('error message', expect.any( String ))
		// after this ticket is done https://github.com/WordPress/gutenberg/issues/22850
		// eslint-disable-next-line no-console
		const [ firstArg, secondArg ] = console.error.mock.calls.at( -1 );
		expect( firstArg ).toEqual(
			'Warning: findDOMNode is deprecated and will be removed in the next major release. Instead, add a ref directly to the element you want to reference. Learn more about using refs safely here: https://reactjs.org/link/strict-mode-find-node%s'
		);
		// The stack trace
		expect( secondArg ).toBeTruthy();
	} );

	it( 'does not show the remove item button when a filter prevents this', async () => {
		// We're removing the link for the first previewCart item
		registerCheckoutFilters( 'woo-blocks-test-extension', {
			showRemoveItemLink: ( value, extensions, { cartItem } ) => {
				return cartItem.id !== previewCart.items[ 0 ].id;
			},
		} );

		render( <CartBlock /> );

		await waitFor( () => {
			expect(
				screen.getByText( /Proceed to Checkout/i )
			).toBeInTheDocument();
		} );

		expect( screen.queryAllByText( /Remove item/i ).length ).toBe( 1 );
	} );
} );
