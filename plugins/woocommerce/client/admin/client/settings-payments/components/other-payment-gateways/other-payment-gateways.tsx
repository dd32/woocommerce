/**
 * External dependencies
 */
import React from 'react';
import { Gridicon } from '@automattic/components';
import { Button, Popover } from '@wordpress/components';
import { useState, useMemo, useRef } from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import { decodeEntities } from '@wordpress/html-entities';
import {
	SuggestedPaymentExtension,
	SuggestedPaymentExtensionCategory,
} from '@woocommerce/data';

/**
 * Internal dependencies
 */
import { GridItemPlaceholder } from '~/settings-payments/components/grid-item-placeholder';
import { OfficialBadge } from '../official-badge';
import { IncentiveStatusBadge } from '~/settings-payments/components/incentive-status-badge';

interface OtherPaymentGatewaysProps {
	/**
	 * Array of suggested payment extensions.
	 */
	suggestions: SuggestedPaymentExtension[];
	/**
	 * Array of categories for the suggested payment extensions.
	 */
	suggestionCategories: SuggestedPaymentExtensionCategory[];
	/**
	 * The ID of the plugin currently being installed, or `null` if none.
	 */
	installingPlugin: string | null;
	/**
	 * Callback to handle plugin setup. Accepts the plugin ID, slug, and onboarding URL (if available).
	 */
	setupPlugin: (
		id: string,
		slug: string,
		onboardingUrl: string | null,
		attachUrl: string | null
	) => void;
	/**
	 * Indicates whether the suggestions are still being fetched.
	 */
	isFetching: boolean;
	/**
	 * A link to view more payment options in the WooCommerce marketplace.
	 */
	morePaymentOptionsLink: JSX.Element;
}

/**
 * A component that displays a collapsible list of suggested payment extensions grouped by categories.
 * When collapsed, it shows a few icons representing the suggestions. When expanded, it displays detailed
 * information about each suggestion and allows the user to install them.
 */
export const OtherPaymentGateways = ( {
	suggestions,
	suggestionCategories,
	installingPlugin,
	setupPlugin,
	isFetching,
	morePaymentOptionsLink,
}: OtherPaymentGatewaysProps ) => {
	const urlParams = new URLSearchParams( window.location.search );

	// Determine the initial expanded state based on URL params.
	const initialExpanded = urlParams.get( 'other_pes_section' ) === 'expanded';
	const [ isExpanded, setIsExpanded ] = useState( initialExpanded );
	const [ categoryIdWithPopoverVisible, setCategoryIdWithPopoverVisible ] =
		useState( '' );
	const buttonRef = useRef< HTMLSpanElement >( null );

	const handleClick = (
		event: React.MouseEvent | React.KeyboardEvent,
		categoryId: string
	) => {
		const clickedElement = event.target as HTMLElement;
		const parentSpan = clickedElement.closest(
			'.other-payment-gateways__content__title__icon-container'
		);

		if ( buttonRef.current && parentSpan !== buttonRef.current ) {
			return;
		}

		setCategoryIdWithPopoverVisible(
			categoryId === categoryIdWithPopoverVisible ? '' : categoryId
		);
	};

	const handleFocusOutside = () => {
		setCategoryIdWithPopoverVisible( '' );
	};

	// Group suggestions by category.
	const suggestionsByCategory = useMemo(
		() =>
			suggestionCategories.map(
				(
					category
				): {
					category: SuggestedPaymentExtensionCategory;
					suggestions: SuggestedPaymentExtension[];
				} => {
					return {
						category,
						suggestions: suggestions.filter(
							( suggestion ) => suggestion._type === category.id
						),
					};
				}
			),
		[ suggestions, suggestionCategories ]
	);

	// Memoize the collapsed images to avoid re-rendering when not expanded
	const collapsedImages = useMemo( () => {
		return isFetching ? (
			<>
				<div className="other-payment-gateways__header__title-image-placeholder" />
				<div className="other-payment-gateways__header__title-image-placeholder" />
				<div className="other-payment-gateways__header__title-image-placeholder" />
			</>
		) : (
			// Go through the category hierarchy so we render the collapsed images in the same order as when expanded.
			suggestionsByCategory.map(
				( { suggestions: categorySuggestions } ) => {
					if ( categorySuggestions.length === 0 ) {
						return null;
					}

					return categorySuggestions.map( ( extension ) => (
						<img
							key={ extension.id }
							src={ extension.icon }
							alt={ extension.title + ' small logo' }
							width="24"
							height="24"
							className="other-payment-gateways__header__title-image"
						/>
					) );
				}
			)
		);
	}, [ suggestionsByCategory, isFetching ] );

	// Memoize the expanded content to avoid re-rendering when expanded
	const expandedContent = useMemo( () => {
		return isFetching ? (
			<>
				<GridItemPlaceholder />
				<GridItemPlaceholder />
				<GridItemPlaceholder />
			</>
		) : (
			suggestionsByCategory.map(
				( { category, suggestions: categorySuggestions } ) => {
					if ( categorySuggestions.length === 0 ) {
						return null;
					}

					return (
						<div
							className="other-payment-gateways__content__category-container"
							key={ category.id }
						>
							<div className="other-payment-gateways__content__title">
								<h3 className="other-payment-gateways__content__title__h3">
									{ decodeEntities( category.title ) }
								</h3>
								<span
									className="other-payment-gateways__content__title__icon-container"
									onClick={ ( event ) =>
										handleClick( event, category.id )
									}
									onKeyDown={ ( event ) => {
										if (
											event.key === 'Enter' ||
											event.key === ' '
										) {
											handleClick( event, category.id );
										}
									} }
									tabIndex={ 0 }
									role="button"
									ref={ buttonRef }
								>
									<Gridicon
										icon="info-outline"
										className="other-payment-gateways__content__title__icon"
									/>
									{ category.id ===
										categoryIdWithPopoverVisible && (
										<Popover
											className="other-payment-gateways__content__title-popover"
											placement="top-start"
											offset={ 4 }
											variant="unstyled"
											focusOnMount={ true }
											noArrow={ true }
											shift={ true }
											onFocusOutside={
												handleFocusOutside
											}
										>
											<div className="components-popover__content-container">
												<p>
													{ decodeEntities(
														category.description
													) }
												</p>
											</div>
										</Popover>
									) }
								</span>
							</div>

							<div className="other-payment-gateways__content__grid">
								{ categorySuggestions.map( ( extension ) => (
									<div
										className="other-payment-gateways__content__grid-item"
										key={ extension.id }
									>
										<img
											className="other-payment-gateways__content__grid-item-image"
											src={ extension.icon }
											alt={
												decodeEntities(
													extension.title
												) + ' logo'
											}
										/>
										<div className="other-payment-gateways__content__grid-item__content">
											<span className="other-payment-gateways__content__grid-item__content__title">
												{ extension.title }
												{ extension?._incentive && (
													<IncentiveStatusBadge
														incentive={
															extension._incentive
														}
													/>
												) }
												{ /* All payment extension suggestions are official. */ }
												<OfficialBadge variant="expanded" />
											</span>
											<span className="other-payment-gateways__content__grid-item__content__description">
												{ decodeEntities(
													extension.description
												) }
											</span>
											<div className="other-payment-gateways__content__grid-item__content__actions">
												<Button
													variant="link"
													onClick={ () =>
														setupPlugin(
															extension.id,
															extension.plugin
																.slug,
															null, // Suggested gateways won't have an onboarding URL.
															// Only provide the attach link if not already installed.
															extension.plugin
																.status ===
																'not_installed'
																? extension
																		._links
																		?.attach
																		?.href ??
																		null
																: null
														)
													}
													isBusy={
														installingPlugin ===
														extension.id
													}
													disabled={
														!! installingPlugin
													}
												>
													{ installingPlugin ===
													extension.id
														? __(
																'Installing',
																'woocommerce'
														  )
														: __(
																'Install',
																'woocommerce'
														  ) }
												</Button>
											</div>
										</div>
									</div>
								) ) }
							</div>
						</div>
					);
				}
			)
		);
	}, [
		suggestionsByCategory,
		installingPlugin,
		setupPlugin,
		isFetching,
		categoryIdWithPopoverVisible,
	] );

	return (
		<div
			className={
				'other-payment-gateways' + ( isExpanded ? ' is-expanded' : '' )
			}
		>
			<div
				className="other-payment-gateways__header"
				onClick={ () => {
					setIsExpanded( ! isExpanded );
				} }
				onKeyDown={ ( event ) => {
					if ( event.key === 'Enter' || event.key === ' ' ) {
						setIsExpanded( ! isExpanded );
					}
				} }
				role="button"
				tabIndex={ 0 }
				aria-expanded={ isExpanded }
			>
				<div className="other-payment-gateways__header__title">
					<span>
						{ __( 'Other payment options', 'woocommerce' ) }
					</span>
					{ ! isExpanded && <>{ collapsedImages }</> }
				</div>
				<Gridicon
					className="other-payment-gateways__header__arrow"
					icon={ isExpanded ? 'chevron-up' : 'chevron-down' }
				/>
			</div>
			{ isExpanded && (
				<div className="other-payment-gateways__content">
					{ expandedContent }
					<div className="other-payment-gateways__content__external-icon">
						{ morePaymentOptionsLink }
					</div>
				</div>
			) }
		</div>
	);
};
