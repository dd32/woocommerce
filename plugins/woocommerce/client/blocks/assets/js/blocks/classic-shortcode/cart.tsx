/**
 * External dependencies
 */
import { createBlock, type BlockInstance } from '@wordpress/blocks';
import { __ } from '@wordpress/i18n';

/**
 * Internal dependencies
 */
import type { OnClickCallbackParameter, InheritedAttributes } from './types';

const getButtonLabel = () => __( 'Transform into blocks', 'woocommerce' );

const getBlockifiedTemplate = ( inheritedAttributes: InheritedAttributes ) =>
	[
		createBlock( 'woocommerce/cart', {
			...inheritedAttributes,
			className: 'wc-block-cart',
		} ),
	].filter( Boolean ) as BlockInstance[];

const onClickCallback = ( {
	clientId,
	attributes,
	getBlocks,
	replaceBlock,
	selectBlock,
}: OnClickCallbackParameter ) => {
	replaceBlock( clientId, getBlockifiedTemplate( attributes ) );

	const blocks = getBlocks();

	const groupBlock = blocks.find(
		( block ) =>
			block.name === 'core/group' &&
			block.innerBlocks.some(
				( innerBlock ) =>
					innerBlock.name === 'woocommerce/store-notices'
			)
	);

	if ( groupBlock ) {
		selectBlock( groupBlock.clientId );
	}
};

/**
 * Title shown within the block itself.
 */
const getTitle = () => {
	return __( 'Classic Cart', 'woocommerce' );
};

/**
 * Description shown within the block itself.
 */
const getDescription = () => {
	return __(
		'This block will render the classic cart shortcode. You can optionally transform it into blocks for more control over the cart experience.',
		'woocommerce'
	);
};

const blockifyConfig = {
	getButtonLabel,
	onClickCallback,
	getBlockifiedTemplate,
};

export { blockifyConfig, getDescription, getTitle };
