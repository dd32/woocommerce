/**
 * External dependencies
 */
import { __ } from '@wordpress/i18n';
import interpolateComponents from '@automattic/interpolate-components';
import { recordEvent } from '@woocommerce/tracks';
import { updateQueryString } from '@woocommerce/navigation';

/**
 * Internal dependencies
 */
import { PartnerCard } from '../components/partner-card';
import logo from './logo.png';
import { TermsOfService } from '~/task-lists/components/terms-of-service';

export const Card = () => {
	return (
		<PartnerCard
			name={ __( 'WooCommerce Tax', 'woocommerce' ) }
			logo={ logo }
			description={ __(
				'WooCommerce Tax, recommended for new stores',
				'woocommerce'
			) }
			benefits={ [
				__( 'Real-time sales tax calculation', 'woocommerce' ),
				interpolateComponents( {
					mixedString: __(
						'{{strong}}Single{{/strong}} economic nexus compliance',
						'woocommerce'
					),
					components: {
						strong: <strong />,
					},
				} ),
				// eslint-disable-next-line @wordpress/i18n-translator-comments
				__( '100% free', 'woocommerce' ),
			] }
			terms={
				<TermsOfService
					buttonText={ __( 'Continue setup', 'woocommerce' ) }
				/>
			}
			actionText={ __( 'Continue setup', 'woocommerce' ) }
			onClick={ () => {
				recordEvent( 'tasklist_tax_select_option', {
					selected_option: 'woocommerce-tax',
				} );
				updateQueryString( {
					partner: 'woocommerce-tax',
				} );
			} }
		/>
	);
};
