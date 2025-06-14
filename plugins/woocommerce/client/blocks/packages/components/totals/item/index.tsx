/**
 * External dependencies
 */
import clsx from 'clsx';
import { isValidElement } from '@wordpress/element';
import type { ReactElement, ReactNode } from 'react';
import type { Currency } from '@woocommerce/types';

/**
 * Internal dependencies
 */
import './style.scss';
import FormattedMonetaryAmount from '../../formatted-monetary-amount';

export interface TotalsItemProps {
	className?: string | undefined;
	currency?: Currency | undefined;
	label: string;
	// Value may be a number, or react node. Numbers are passed to FormattedMonetaryAmount.
	value: number | ReactNode;
	description?: ReactNode;
}

const TotalsItemValue = ( {
	value,
	currency,
}: Partial< TotalsItemProps > ): ReactElement | null => {
	if ( isValidElement( value ) ) {
		return (
			<div className="wc-block-components-totals-item__value">
				{ value }
			</div>
		);
	}

	return Number.isFinite( value ) ? (
		<FormattedMonetaryAmount
			className="wc-block-components-totals-item__value"
			currency={ currency || undefined }
			value={ value as number }
		/>
	) : null;
};

const TotalsItem = ( {
	className,
	currency,
	label,
	value,
	description,
}: TotalsItemProps ): ReactElement => {
	return (
		<div className={ clsx( 'wc-block-components-totals-item', className ) }>
			<span className="wc-block-components-totals-item__label">
				{ label }
			</span>
			<TotalsItemValue value={ value } currency={ currency } />
			<div className="wc-block-components-totals-item__description">
				{ description }
			</div>
		</div>
	);
};

export default TotalsItem;
