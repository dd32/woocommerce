/**
 * External dependencies
 */
import { __ } from '@wordpress/i18n';
import {
	useCustomerData,
	useShippingData,
} from '@woocommerce/base-context/hooks';
import { ShippingRatesControl } from '@woocommerce/base-components/cart-checkout';
import {
	getShippingRatesPackageCount,
	hasCollectableRate,
	hasAllFieldsForShippingRates,
} from '@woocommerce/base-utils';
import { getCurrencyFromPriceResponse } from '@woocommerce/price-format';
import {
	FormattedMonetaryAmount,
	StoreNoticesContainer,
} from '@woocommerce/blocks-components';
import { useEditorContext, noticeContexts } from '@woocommerce/base-context';
import { decodeEntities } from '@wordpress/html-entities';
import { getSetting } from '@woocommerce/settings';
import type {
	PackageRateOption,
	CartShippingPackageShippingRate,
} from '@woocommerce/types';
import NoticeBanner from '@woocommerce/base-components/notice-banner';
import type { ReactElement } from 'react';
import { useMemo } from '@wordpress/element';

/**
 * Renders a shipping rate control option.
 *
 * @param {Object} option Shipping Rate.
 */
const renderShippingRatesControlOption = (
	option: CartShippingPackageShippingRate
): PackageRateOption => {
	const priceWithTaxes = getSetting( 'displayCartPricesIncludingTax', false )
		? parseInt( option.price, 10 ) + parseInt( option.taxes, 10 )
		: parseInt( option.price, 10 );

	const secondaryLabel =
		priceWithTaxes === 0 ? (
			<span className="wc-block-checkout__shipping-option--free">
				{ __( 'Free', 'woocommerce' ) }
			</span>
		) : (
			<FormattedMonetaryAmount
				currency={ getCurrencyFromPriceResponse( option ) }
				value={ priceWithTaxes }
			/>
		);

	return {
		label: decodeEntities( option.name ),
		value: option.rate_id,
		description: decodeEntities( option.delivery_time ),
		secondaryLabel,
		secondaryDescription: decodeEntities( option.description ),
	};
};

const NoShippingAddressMessage = () => {
	return (
		<p
			role="status"
			aria-live="polite"
			className="wc-block-components-shipping-rates-control__no-shipping-address-message"
		>
			{ __(
				'Enter a shipping address to view shipping options.',
				'woocommerce'
			) }
		</p>
	);
};

const Block = ( {
	noShippingPlaceholder = null,
}: {
	noShippingPlaceholder?: ReactElement | null;
} ) => {
	const { isEditor } = useEditorContext();

	const {
		shippingRates,
		needsShipping,
		isLoadingRates,
		hasCalculatedShipping,
		isCollectable,
	} = useShippingData();

	const { shippingAddress } = useCustomerData();

	const filteredShippingRates = useMemo( () => {
		return isCollectable
			? shippingRates.map( ( shippingRatesPackage ) => {
					return {
						...shippingRatesPackage,
						shipping_rates:
							shippingRatesPackage.shipping_rates.filter(
								( shippingRatesPackageRate ) =>
									! hasCollectableRate(
										shippingRatesPackageRate.method_id
									)
							),
					};
			  } )
			: shippingRates;
	}, [ shippingRates, isCollectable ] );

	if ( ! needsShipping ) {
		return null;
	}

	const shippingRatesPackageCount =
		getShippingRatesPackageCount( shippingRates );

	if ( ! hasCalculatedShipping && ! shippingRatesPackageCount ) {
		return <NoShippingAddressMessage />;
	}
	const addressComplete = hasAllFieldsForShippingRates( shippingAddress );

	return (
		<>
			<StoreNoticesContainer
				context={ noticeContexts.SHIPPING_METHODS }
			/>
			{ isEditor && ! shippingRatesPackageCount ? (
				noShippingPlaceholder
			) : (
				<ShippingRatesControl
					noResultsMessage={
						<>
							{ addressComplete ? (
								<NoticeBanner
									isDismissible={ false }
									className="wc-block-components-shipping-rates-control__no-results-notice"
									status="warning"
								>
									{ __(
										'No shipping options are available for this address. Please verify the address is correct or try a different address.',
										'woocommerce'
									) }
								</NoticeBanner>
							) : (
								<NoShippingAddressMessage />
							) }
						</>
					}
					renderOption={ renderShippingRatesControlOption }
					collapsible={ false }
					shippingRates={ filteredShippingRates }
					isLoadingRates={ isLoadingRates }
					context="woocommerce/checkout"
				/>
			) }
		</>
	);
};

export default Block;
