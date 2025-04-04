/**
 * External dependencies
 */
import { __ } from '@wordpress/i18n';
import triggerFetch from '@wordpress/api-fetch';
import {
	useEffect,
	useRef,
	useCallback,
	useState,
	useMemo,
} from '@wordpress/element';
import {
	emptyHiddenAddressFields,
	removeAllNotices,
} from '@woocommerce/base-utils';
import { useDispatch, useSelect, select as selectStore } from '@wordpress/data';
import {
	checkoutStore,
	paymentStore,
	validationStore,
	processErrorResponse,
	clearCheckoutPutRequests,
} from '@woocommerce/block-data';
import {
	getPaymentMethods,
	getExpressPaymentMethods,
} from '@woocommerce/blocks-registry';
import {
	ApiResponse,
	CheckoutResponseSuccess,
	CheckoutResponseError,
	assertResponseIsValid,
	responseTypes,
} from '@woocommerce/types';
import { checkoutEvents } from '@woocommerce/blocks-checkout-events';

/**
 * Internal dependencies
 */
import { preparePaymentData, processCheckoutResponseHeaders } from './utils';
import { useShippingDataContext } from './shipping';
import { useStoreCart } from '../../hooks/cart/use-store-cart';
import { useCheckoutAddress } from '../../hooks/use-checkout-address';

/**
 * CheckoutProcessor component.
 *
 * Subscribes to checkout context and triggers processing via the API.
 */
const CheckoutProcessor = () => {
	const { onCheckoutValidation } = checkoutEvents;

	const {
		additionalFields,
		customerId,
		customerPassword,
		extensionData,
		hasError: checkoutHasError,
		isBeforeProcessing: checkoutIsBeforeProcessing,
		isComplete: checkoutIsComplete,
		isProcessing: checkoutIsProcessing,
		orderNotes,
		redirectUrl,
		shouldCreateAccount,
	} = useSelect( ( select ) => {
		const store = select( checkoutStore );
		return {
			additionalFields: store.getAdditionalFields(),
			customerId: store.getCustomerId(),
			customerPassword: store.getCustomerPassword(),
			extensionData: store.getExtensionData(),
			hasError: store.hasError(),
			isBeforeProcessing: store.isBeforeProcessing(),
			isComplete: store.isComplete(),
			isProcessing: store.isProcessing(),
			orderNotes: store.getOrderNotes(),
			redirectUrl: store.getRedirectUrl(),
			shouldCreateAccount: store.getShouldCreateAccount(),
		};
	}, [] );

	const { __internalSetHasError, __internalProcessCheckoutResponse } =
		useDispatch( checkoutStore );

	const hasValidationErrors = useSelect(
		( select ) => select( validationStore ).hasValidationErrors,
		[]
	);
	const { shippingErrorStatus } = useShippingDataContext();

	const { shippingAddress, billingAddress, useBillingAsShipping } =
		useCheckoutAddress();

	const { cartNeedsPayment, cartNeedsShipping, receiveCartContents } =
		useStoreCart();

	const {
		activePaymentMethod,
		paymentMethodData,
		isExpressPaymentMethodActive,
		hasPaymentError,
		isPaymentReady,
		shouldSavePayment,
	} = useSelect( ( select ) => {
		const store = select( paymentStore );

		return {
			activePaymentMethod: store.getActivePaymentMethod(),
			paymentMethodData: store.getPaymentMethodData(),
			isExpressPaymentMethodActive: store.isExpressPaymentMethodActive(),
			hasPaymentError: store.hasPaymentError(),
			isPaymentReady: store.isPaymentReady(),
			shouldSavePayment: store.getShouldSavePaymentMethod(),
		};
	}, [] );

	const paymentMethods = getPaymentMethods();
	const expressPaymentMethods = getExpressPaymentMethods();
	const currentBillingAddress = useRef( billingAddress );
	const currentShippingAddress = useRef( shippingAddress );
	const currentRedirectUrl = useRef( redirectUrl );
	const [ isProcessingOrder, setIsProcessingOrder ] = useState( false );

	const paymentMethodId = useMemo( () => {
		const merged = {
			...expressPaymentMethods,
			...paymentMethods,
		};
		return merged?.[ activePaymentMethod ]?.paymentMethodId;
	}, [ activePaymentMethod, expressPaymentMethods, paymentMethods ] );

	const checkoutWillHaveError =
		( hasValidationErrors() && ! isExpressPaymentMethodActive ) ||
		hasPaymentError ||
		shippingErrorStatus.hasError;

	const paidAndWithoutErrors =
		! checkoutHasError &&
		! checkoutWillHaveError &&
		( isPaymentReady || ! cartNeedsPayment ) &&
		checkoutIsProcessing;

	// Determine if checkout has an error.
	useEffect( () => {
		if (
			checkoutWillHaveError !== checkoutHasError &&
			( checkoutIsProcessing || checkoutIsBeforeProcessing ) &&
			! isExpressPaymentMethodActive
		) {
			__internalSetHasError( checkoutWillHaveError );
		}
	}, [
		checkoutWillHaveError,
		checkoutHasError,
		checkoutIsProcessing,
		checkoutIsBeforeProcessing,
		isExpressPaymentMethodActive,
		__internalSetHasError,
	] );

	// Keep the billing, shipping and redirectUrl current
	useEffect( () => {
		currentBillingAddress.current = billingAddress;
		currentShippingAddress.current = shippingAddress;
		currentRedirectUrl.current = redirectUrl;
	}, [ billingAddress, shippingAddress, redirectUrl ] );

	const checkValidation = useCallback( () => {
		if ( hasValidationErrors() ) {
			// If there is a shipping rates validation error, return the error message to be displayed.
			if (
				selectStore( validationStore ).getValidationError(
					'shipping-rates-error'
				) !== undefined
			) {
				return {
					type: responseTypes.ERROR,
					errorMessage: __(
						'Sorry, this order requires a shipping option.',
						'woocommerce'
					),
				};
			}
			return false;
		}
		if ( hasPaymentError ) {
			return {
				type: responseTypes.ERROR,
				errorMessage: __(
					'There was a problem with your payment option.',
					'woocommerce'
				),
				context: 'wc/checkout/payments',
			};
		}
		if ( shippingErrorStatus.hasError ) {
			return {
				type: responseTypes.ERROR,
				errorMessage: __(
					'There was a problem with your shipping option.',
					'woocommerce'
				),
				context: 'wc/checkout/shipping-methods',
			};
		}

		return true;
	}, [ hasValidationErrors, hasPaymentError, shippingErrorStatus.hasError ] );

	// Validate the checkout using the CHECKOUT_VALIDATION_BEFORE_PROCESSING event
	useEffect( () => {
		let unsubscribeProcessing: () => void;
		if ( ! isExpressPaymentMethodActive ) {
			unsubscribeProcessing = onCheckoutValidation( checkValidation, 0 );
		}
		return () => {
			if (
				! isExpressPaymentMethodActive &&
				typeof unsubscribeProcessing === 'function'
			) {
				unsubscribeProcessing();
			}
		};
	}, [
		onCheckoutValidation,
		checkValidation,
		isExpressPaymentMethodActive,
	] );

	// Redirect when checkout is complete and there is a redirect url.
	useEffect( () => {
		window.localStorage.removeItem(
			'WOOCOMMERCE_CHECKOUT_IS_CUSTOMER_DATA_DIRTY'
		);
		if ( currentRedirectUrl.current ) {
			window.location.href = currentRedirectUrl.current;
		}
	}, [ checkoutIsComplete ] );

	// POST to the Store API and process and display any errors, or set order complete
	const processOrder = useCallback( async () => {
		if ( isProcessingOrder ) {
			return;
		}
		setIsProcessingOrder( true );
		removeAllNotices();

		const paymentData = cartNeedsPayment
			? {
					payment_method: paymentMethodId,
					payment_data: preparePaymentData(
						paymentMethodData,
						shouldSavePayment,
						activePaymentMethod
					),
			  }
			: {};

		const billingAddressData = emptyHiddenAddressFields(
			currentBillingAddress.current
		);

		const shippingAddressData = useBillingAsShipping
			? billingAddressData
			: emptyHiddenAddressFields( currentShippingAddress.current );

		const data = {
			additional_fields: additionalFields,
			billing_address: billingAddressData,
			create_account: shouldCreateAccount,
			customer_note: orderNotes,
			customer_password: customerPassword,
			extensions: { ...extensionData },
			shipping_address: cartNeedsShipping
				? shippingAddressData
				: undefined,
			...paymentData,
		};

		// Checkout fields are persisted on change, so we want to cancel any pending PUT requests
		// before placing the order.
		clearCheckoutPutRequests();

		triggerFetch( {
			path: '/wc/store/v1/checkout',
			method: 'POST',
			data,
			cache: 'no-store',
			parse: false,
		} )
			.then( ( response: unknown ) => {
				assertResponseIsValid< CheckoutResponseSuccess >( response );
				processCheckoutResponseHeaders( response.headers );
				if ( ! response.ok ) {
					throw response;
				}
				return response.json();
			} )
			.then( ( responseJson: CheckoutResponseSuccess ) => {
				__internalProcessCheckoutResponse( responseJson );
				setIsProcessingOrder( false );
			} )
			.catch( ( errorResponse: ApiResponse< CheckoutResponseError > ) => {
				processCheckoutResponseHeaders( errorResponse?.headers );
				try {
					// This attempts to parse a JSON error response where the status code was 4xx/5xx.
					errorResponse
						.json()
						.then(
							( response ) => response as CheckoutResponseError
						)
						.then( ( response: CheckoutResponseError ) => {
							if ( response.data?.cart ) {
								// We don't want to receive the address here because it will overwrite fields.
								receiveCartContents( response.data.cart );
							}
							processErrorResponse( response );
							__internalProcessCheckoutResponse( response );
						} );
				} catch {
					let errorMessage = __(
						'Something went wrong when placing the order. Check your email for order updates before retrying.',
						'woocommerce'
					);

					if ( customerId !== 0 ) {
						errorMessage = __(
							"Something went wrong when placing the order. Check your account's order history or your email for order updates before retrying.",
							'woocommerce'
						);
					}
					processErrorResponse( {
						code: 'unknown_error',
						message: errorMessage,
						data: null,
					} );
				}
				__internalSetHasError( true );
				setIsProcessingOrder( false );
			} );
	}, [
		isProcessingOrder,
		cartNeedsPayment,
		paymentMethodId,
		paymentMethodData,
		shouldSavePayment,
		activePaymentMethod,
		orderNotes,
		shouldCreateAccount,
		customerId,
		customerPassword,
		extensionData,
		additionalFields,
		cartNeedsShipping,
		receiveCartContents,
		__internalSetHasError,
		__internalProcessCheckoutResponse,
		useBillingAsShipping,
	] );

	// Process order if conditions are good.
	useEffect( () => {
		if ( paidAndWithoutErrors && ! isProcessingOrder ) {
			processOrder();
		}
	}, [ processOrder, paidAndWithoutErrors, isProcessingOrder ] );

	return null;
};

export default CheckoutProcessor;
