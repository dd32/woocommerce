/**
 * External dependencies
 */
import { createElement } from '@wordpress/element';
import clsx from 'clsx';

type FormSectionProps = {
	title: JSX.Element | string;
	description: JSX.Element | string;
	className?: string;
};

export const FormSection = ( {
	title,
	description,
	className,
	children,
}: React.PropsWithChildren< FormSectionProps > ) => {
	return (
		<div className={ clsx( 'woocommerce-form-section', className ) }>
			<div className="woocommerce-form-section__header">
				<h3 className="woocommerce-form-section__title">{ title }</h3>
				<div className="woocommerce-form-section__description">
					{ description }
				</div>
			</div>
			<div className="woocommerce-form-section__content">
				{ children }
			</div>
		</div>
	);
};
