/**
 * External dependencies
 */
import { __ } from '@wordpress/i18n';
import { difference } from 'lodash';
import { useEffect, useState } from '@wordpress/element';
import { Stepper } from '@woocommerce/components';
import { Card, CardBody, Button } from '@wordpress/components';
import { getAdminLink } from '@woocommerce/settings';

/**
 * Internal dependencies
 */
import { Connect } from './components/connect';
import { Plugins } from './components/plugins';
import { StoreLocation } from './components/store-location';
import { WCSBanner } from './components/wcs-banner';
import { TaskProps, ShippingRecommendationProps } from './types';
import { redirectToWCSSettings } from './utils';
import { TrackedLink } from '~/components/tracked-link/tracked-link';
import { isFeatureEnabled } from '~/utils/features';

/**
 * Plugins required to automate shipping.
 */
const AUTOMATION_PLUGINS = [ 'woocommerce-shipping' ];

export const ShippingRecommendation = ( {
	activePlugins,
	isJetpackConnected,
	isResolving,
}: TaskProps & ShippingRecommendationProps ) => {
	const [ pluginsToActivate, setPluginsToActivate ] = useState< string[] >(
		[]
	);
	const [ stepIndex, setStepIndex ] = useState( 0 );
	const [ isRedirecting, setIsRedirecting ] = useState( false );
	const [ locationStepRedirected, setLocationStepRedirected ] =
		useState( false );

	const nextStep = () => {
		setStepIndex( stepIndex + 1 );
	};

	const redirect = () => {
		setIsRedirecting( true );
		redirectToWCSSettings();
	};

	const viewLocationStep = () => {
		setStepIndex( 0 );
	};

	// Skips to next step only once.
	const onLocationComplete = () => {
		if ( locationStepRedirected ) {
			return;
		}
		setLocationStepRedirected( true );
		nextStep();
	};

	useEffect( () => {
		const remainingPlugins = difference(
			AUTOMATION_PLUGINS,
			activePlugins
		);

		// Force redirect when all steps are completed.
		if (
			! isResolving &&
			remainingPlugins.length === 0 &&
			isJetpackConnected
		) {
			redirect();
		}

		if ( remainingPlugins.length <= pluginsToActivate.length ) {
			return;
		}
		setPluginsToActivate( remainingPlugins );
	}, [ activePlugins, isJetpackConnected, isResolving, pluginsToActivate ] );

	const steps = [
		{
			key: 'store_location',
			label: __( 'Set store location', 'woocommerce' ),
			description: __(
				'The address from which your business operates',
				'woocommerce'
			),
			content: (
				<StoreLocation
					nextStep={ nextStep }
					onLocationComplete={ onLocationComplete }
				/>
			),
			onClick: viewLocationStep,
		},
		{
			key: 'plugins',
			label: __( 'Install WooCommerce Shipping', 'woocommerce' ),
			description: __(
				'Enable shipping label printing and discounted rates',
				'woocommerce'
			),
			content: (
				<div>
					<WCSBanner />
					<Plugins
						nextStep={ nextStep }
						pluginsToActivate={ pluginsToActivate }
					/>
				</div>
			),
		},
		{
			key: 'connect',
			label: __( 'Connect your store', 'woocommerce' ),
			description: __(
				'Connect your store to WordPress.com to enable WooCommerce Shipping',
				'woocommerce'
			),
			content: isJetpackConnected ? (
				<Button onClick={ redirect } isBusy={ isRedirecting } isPrimary>
					{ __( 'Complete task', 'woocommerce' ) }
				</Button>
			) : (
				<Connect />
			),
		},
	];

	const step = steps[ stepIndex ];

	return (
		<div className="woocommerce-task-shipping-recommendation">
			<Card className="woocommerce-task-card">
				<CardBody>
					<Stepper
						isPending={ isResolving }
						isVertical={ true }
						currentStep={ step.key }
						steps={ steps }
					/>
				</CardBody>
			</Card>
			<TrackedLink
				textProps={ {
					as: 'div',
					className:
						'woocommerce-task-dashboard__container woocommerce-task-marketplace-link',
				} }
				message={ __(
					// translators: {{Link}} is a placeholder for a html element.
					'Visit {{Link}}the WooCommerce Marketplace{{/Link}} to find more shipping, delivery, and fulfillment solutions.',
					'woocommerce'
				) }
				eventName="tasklist_shipping_recommendation_visit_marketplace_click"
				targetUrl={
					isFeatureEnabled( 'marketplace' )
						? getAdminLink(
								'admin.php?page=wc-admin&tab=extensions&path=/extensions&category=shipping-delivery-and-fulfillment'
						  )
						: 'https://woocommerce.com/product-category/woocommerce-extensions/shipping-delivery-and-fulfillment/'
				}
				linkType={
					isFeatureEnabled( 'marketplace' ) ? 'wc-admin' : 'external'
				}
			/>
		</div>
	);
};
