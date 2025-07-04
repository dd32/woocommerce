/**
 * External dependencies
 */
import { __ } from '@wordpress/i18n';

/**
 * Internal dependencies
 */

export default function HeaderTitle() {
	return (
		<h1 className="woocommerce-marketplace__header-title">
			{ __( 'The WooCommerce Marketplace', 'woocommerce' ) }
		</h1>
	);
}
