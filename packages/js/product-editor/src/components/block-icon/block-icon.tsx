/**
 * External dependencies
 */
import { BlockIcon as BaseBlockIcon } from '@wordpress/block-editor';
import { useSelect } from '@wordpress/data';
import { createElement, RawHTML } from '@wordpress/element';

/**
 * Internal dependencies
 */
import { BlockIconProps } from './types';

export function BlockIcon( { clientId }: BlockIconProps ) {
	const icon = useSelect(
		( select ) => {
			// Try to get the icon from the block's attributes
			const { getBlockAttributes, getBlockName } =
				select( 'core/block-editor' );
			// @ts-expect-error Selector is not typed
			const attributes = getBlockAttributes( clientId );
			if ( attributes?.icon ) {
				return attributes.icon;
			}

			// If there is no icon defined in attributes
			// Then try to get icon from block's metadata
			const { getBlockType } = select( 'core/blocks' );
			// @ts-expect-error Selector is not typed
			const blockName = getBlockName( clientId );
			// @ts-expect-error Selector is not typed
			const block = getBlockType( blockName ?? undefined );
			return block?.icon;
		},
		[ clientId ]
	);

	if ( ! icon ) {
		return null;
	}

	if ( typeof icon === 'object' ) {
		const { src, ...iconProps } = icon;

		if ( /^<(.)+>$/.test( src ) ) {
			const iconComponent = (
				<RawHTML aria-hidden="true" { ...iconProps }>
					{ src }
				</RawHTML>
			);
			return <BaseBlockIcon icon={ iconComponent } showColors />;
		}

		if ( /^https?:\/\/(.)+/.test( src ) ) {
			const iconImage = (
				<img
					src={ src }
					alt=""
					aria-hidden="true"
					{ ...iconProps }
					height={ 24 }
					width={ 24 }
				/>
			);
			return <BaseBlockIcon icon={ iconImage } showColors />;
		}
	}

	return <BaseBlockIcon icon={ icon } showColors />;
}
