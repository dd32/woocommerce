/**
 * External dependencies
 */
import { createElement } from '@wordpress/element';
import { Slot, Fill } from '@wordpress/components';

type WooPaymentGatewaySetupProps = {
	id: string;
};
/**
 * WooCommerce Payment Gateway setup.
 *
 * @slotFill WooPaymentGatewaySetup
 * @scope woocommerce-admin
 * @param {Object} props    React props.
 * @param {string} props.id Setup id.
 */
export const WooPaymentGatewaySetup = ( {
	id,
	...props
}: WooPaymentGatewaySetupProps ) => (
	<Fill name={ 'woocommerce_payment_gateway_setup_' + id } { ...props } />
);

WooPaymentGatewaySetup.Slot = ( {
	id,
	fillProps,
}: WooPaymentGatewaySetupProps & {
	fillProps?: React.ComponentProps< typeof Slot >[ 'fillProps' ];
} ) => (
	<Slot
		name={ 'woocommerce_payment_gateway_setup_' + id }
		fillProps={ fillProps }
	/>
);
