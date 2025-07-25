/* eslint-disable @woocommerce/dependency-group */
/* eslint-disable @typescript-eslint/ban-ts-comment */

/**
 * External dependencies
 */
import { __ } from '@wordpress/i18n';
import { getSetting } from '@woocommerce/settings';
import { getNewPath, getPersistedQuery } from '@woocommerce/navigation';
import { Button } from '@wordpress/components';

/**
 * Internal dependencies
 */
import { SiteHub } from '../assembler-hub/site-hub';
import { ADMIN_URL } from '~/utils/admin-settings';

import './style.scss';
import { WooCYSSecondaryButtonSlot } from './secondary-button-slot';
import lessonPlan from '../assets/icons/lesson-plan.js';
import { Icon, brush, tag } from '@wordpress/icons';
import { trackEvent } from '../tracking';
import { isEntrepreneurFlow } from '../entrepreneur-flow';

export * as services from './services';

export const Transitional = () => {
	const homeUrl: string = getSetting( 'homeUrl', '' );
	const adminUrl = getNewPath( getPersistedQuery(), '/', {} );

	return (
		<div className="woocommerce-customize-store__transitional">
			<SiteHub
				isTransparent={ false }
				className="woocommerce-edit-site-layout__hub"
			/>
			<div className="woocommerce-customize-store__transitional-content">
				<h1 className="woocommerce-customize-store__transitional-heading">
					{ __( 'Your store looks great!', 'woocommerce' ) }
				</h1>
				<h2 className="woocommerce-customize-store__transitional-subheading">
					{ isEntrepreneurFlow()
						? __(
								"Congratulations! You've successfully designed your store. Now you can go back to the Home screen to complete your store setup and start selling.",
								'woocommerce'
						  )
						: __(
								"Congratulations! You've successfully designed your store. Take a look at your hard work before continuing to set up your store.",
								'woocommerce'
						  ) }
				</h2>

				<WooCYSSecondaryButtonSlot />
				<div className="woocommerce-customize-store__transitional-buttons">
					<Button
						href={ homeUrl }
						className="woocommerce-customize-store__transitional-preview-button"
						variant={
							isEntrepreneurFlow() ? 'secondary' : 'primary'
						}
						onClick={ () => {
							trackEvent(
								'customize_your_store_transitional_preview_store_click'
							);
						} }
					>
						{ __( 'View store', 'woocommerce' ) }
					</Button>

					{ isEntrepreneurFlow() && (
						<Button
							variant="primary"
							href={ adminUrl }
							onClick={ () => {
								trackEvent(
									'customize_your_store_entrepreneur_home_click'
								);
							} }
						>
							{ __( 'Back to Home', 'woocommerce' ) }
						</Button>
					) }
				</div>
				{ ! isEntrepreneurFlow() && (
					<>
						<h2 className="woocommerce-customize-store__transitional-main-actions-title">
							{ __( "What's next?", 'woocommerce' ) }
						</h2>
						<div className="woocommerce-customize-store__transitional-main-actions">
							<div className="woocommerce-customize-store__transitional-action">
								<Icon
									className={
										'woocommerce-customize-store__transitional-action__icon'
									}
									icon={ tag }
								/>
								<div className="woocommerce-customize-store__transitional-action__content">
									<h3>
										{ __(
											'Add your products',
											'woocommerce'
										) }
									</h3>
									<p>
										{ __(
											'Start stocking your virtual shelves by adding or importing your products, or edit the sample products.',
											'woocommerce'
										) }
									</p>
									<Button
										variant="link"
										href={ `${ ADMIN_URL }edit.php?post_type=product` }
										onClick={ () => {
											trackEvent(
												'customize_your_store_transitional_product_list_click'
											);
										} }
									>
										{ __(
											'Go to Products',
											'woocommerce'
										) }
									</Button>
								</div>
							</div>

							<div className="woocommerce-customize-store__transitional-action">
								<Icon
									className={
										'woocommerce-customize-store__transitional-action__icon'
									}
									icon={ brush }
								/>
								<div className="woocommerce-customize-store__transitional-action__content">
									<h3>
										{ __(
											'Fine-tune your design',
											'woocommerce'
										) }
									</h3>
									<p>
										{ __(
											'Head to the Editor to change your images and text, add more pages, and make any further customizations.',
											'woocommerce'
										) }
									</p>
									<Button
										variant="link"
										href={ `${ ADMIN_URL }site-editor.php` }
										onClick={ () => {
											trackEvent(
												'customize_your_store_transitional_editor_click'
											);
										} }
									>
										{ __(
											'Go to the Editor',
											'woocommerce'
										) }
									</Button>
								</div>
							</div>

							<div className="woocommerce-customize-store__transitional-action">
								<Icon
									className={
										'woocommerce-customize-store__transitional-action__icon'
									}
									icon={ lessonPlan }
								/>
								<div className="woocommerce-customize-store__transitional-action__content">
									<h3>
										{ __(
											'Continue setting up your store',
											'woocommerce'
										) }
									</h3>
									<p>
										{ __(
											'Go back to the Home screen to complete your store setup and start selling',
											'woocommerce'
										) }
									</p>
									<Button
										variant="link"
										href={ adminUrl }
										onClick={ () => {
											trackEvent(
												'customize_your_store_transitional_home_click'
											);
										} }
									>
										{ __( 'Back to Home', 'woocommerce' ) }
									</Button>
								</div>
							</div>
						</div>
					</>
				) }
			</div>
		</div>
	);
};
