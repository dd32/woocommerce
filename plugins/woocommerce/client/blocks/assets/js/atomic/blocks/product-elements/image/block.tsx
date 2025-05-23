/**
 * External dependencies
 */
import { Fragment } from '@wordpress/element';
import { __, sprintf } from '@wordpress/i18n';
import clsx from 'clsx';
import { PLACEHOLDER_IMG_SRC } from '@woocommerce/settings';
import {
	useInnerBlockLayoutContext,
	useProductDataContext,
} from '@woocommerce/shared-context';
import { useStyleProps } from '@woocommerce/base-hooks';
import { withProductDataContext } from '@woocommerce/shared-hocs';
import { useStoreEvents } from '@woocommerce/base-context/hooks';
import type { HTMLAttributes } from 'react';
import { decodeEntities } from '@wordpress/html-entities';
import { isString, objectHasProp } from '@woocommerce/types';

/**
 * Internal dependencies
 */
import ProductSaleBadge from '../sale-badge/block';
import './style.scss';
import { BlockAttributes, ImageSizing } from './types';

const ImagePlaceholder = ( props ): JSX.Element => {
	return (
		<img
			{ ...props }
			src={ PLACEHOLDER_IMG_SRC }
			alt={ props.alt }
			width={ undefined }
			height={ undefined }
		/>
	);
};

interface ImageProps {
	image?: null | {
		alt?: string | undefined;
		id: number;
		name: string;
		sizes?: string | undefined;
		src?: string | undefined;
		srcset?: string | undefined;
		thumbnail?: string | undefined;
	};
	loaded: boolean;
	showFullSize: boolean;
	fallbackAlt: string;
	scale: string;
	width?: string | undefined;
	height?: string | undefined;
	aspectRatio: string | undefined;
}

const Image = ( {
	image,
	loaded,
	showFullSize,
	fallbackAlt,
	width,
	scale,
	height,
	aspectRatio,
}: ImageProps ): JSX.Element => {
	const { thumbnail, src, srcset, sizes, alt } = image || {};
	const imageProps = {
		alt: alt || fallbackAlt,
		hidden: ! loaded,
		src: thumbnail,
		...( showFullSize && { src, srcSet: srcset, sizes } ),
	};

	const imageStyles: Record< string, string | undefined > = {
		height,
		width,
		objectFit: scale,
		aspectRatio,
	};

	return (
		<>
			{ imageProps.src && (
				/* eslint-disable-next-line jsx-a11y/alt-text */
				<img
					style={ imageStyles }
					data-testid="product-image"
					{ ...imageProps }
				/>
			) }
			{ ! image && (
				<ImagePlaceholder
					style={ imageStyles }
					alt={ imageProps.alt }
				/>
			) }
		</>
	);
};

type Props = BlockAttributes &
	HTMLAttributes< HTMLDivElement > & { style?: Record< string, unknown > };

export const Block = ( props: Props ): JSX.Element | null => {
	const {
		className,
		imageSizing = ImageSizing.SINGLE,
		showProductLink = true,
		showSaleBadge,
		saleBadgeAlign = 'right',
		height,
		width,
		scale,
		aspectRatio,
		style,
		...restProps
	} = props;
	const styleProps = useStyleProps( props );
	const { parentClassName } = useInnerBlockLayoutContext();
	const { product, isLoading } = useProductDataContext();
	const { dispatchStoreEvent } = useStoreEvents();

	if ( ! product.id ) {
		return (
			<div
				className={ clsx(
					className,
					'wc-block-components-product-image',
					{
						[ `${ parentClassName }__product-image` ]:
							parentClassName,
					},
					styleProps.className
				) }
				style={ styleProps.style }
			>
				<ImagePlaceholder />
			</div>
		);
	}
	const hasProductImages = !! product.images.length;
	const image = hasProductImages ? product.images[ 0 ] : null;
	const ParentComponent = showProductLink ? 'a' : Fragment;
	const anchorLabel = sprintf(
		/* translators: %s is referring to the product name */
		__( 'Link to %s', 'woocommerce' ),
		product.name
	);
	const anchorProps = {
		href: product.permalink,
		...( ! hasProductImages && { 'aria-label': anchorLabel } ),
		onClick: () => {
			dispatchStoreEvent( 'product-view-link', {
				product,
			} );
		},
	};

	return (
		<div
			className={ clsx(
				className,
				'wc-block-components-product-image',
				{
					[ `${ parentClassName }__product-image` ]: parentClassName,
				},
				styleProps.className
			) }
			style={ styleProps.style }
		>
			<ParentComponent { ...( showProductLink && anchorProps ) }>
				{ !! showSaleBadge && (
					<ProductSaleBadge
						align={ saleBadgeAlign }
						{ ...restProps }
					/>
				) }
				<Image
					fallbackAlt={ decodeEntities( product.name ) }
					image={ image }
					loaded={ ! isLoading }
					showFullSize={ imageSizing !== ImageSizing.THUMBNAIL }
					width={ width }
					height={ height }
					scale={ scale }
					aspectRatio={
						objectHasProp( style, 'dimensions' ) &&
						objectHasProp( style.dimensions, 'aspectRatio' ) &&
						isString( style.dimensions.aspectRatio )
							? style.dimensions.aspectRatio
							: aspectRatio
					}
				/>
			</ParentComponent>
		</div>
	);
};

export default withProductDataContext( Block );
