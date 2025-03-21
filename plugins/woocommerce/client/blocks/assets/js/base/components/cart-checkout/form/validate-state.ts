/**
 * External dependencies
 */
import { dispatch, select } from '@wordpress/data';
import { KeyedFormFields, ShippingAddress } from '@woocommerce/settings';
import { validationStore } from '@woocommerce/block-data';
import { __, sprintf } from '@wordpress/i18n';
import isShallowEqual from '@wordpress/is-shallow-equal';

function previousAddress( initialValue?: ShippingAddress ) {
	let lastValue = initialValue;

	function track( value: ShippingAddress ) {
		const currentValue = lastValue;

		lastValue = value;

		// Return the previous value
		return currentValue;
	}

	return track;
}

const lastShippingAddress = previousAddress();
const lastBillingAddress = previousAddress();

export const validateState = (
	addressType: string,
	values: ShippingAddress,
	stateField: KeyedFormFields[ number ]
) => {
	const validationErrorId = `${ addressType }_state`;
	const hasValidationError =
		select( validationStore ).getValidationError( validationErrorId );
	const isRequired = stateField.required;

	const lastAddress =
		addressType === 'shipping'
			? lastShippingAddress( values )
			: lastBillingAddress( values );

	const addressChanged =
		!! lastAddress && ! isShallowEqual( lastAddress, values );

	if ( hasValidationError ) {
		if ( ! isRequired || values.state ) {
			// Validation error has been set, but it's no longer required, or the state was provided, clear the error.
			dispatch( validationStore ).clearValidationError(
				validationErrorId
			);
		} else if ( ! addressChanged ) {
			// Validation error has been set, there has not been an address change so show the error.
			dispatch( validationStore ).showValidationError(
				validationErrorId
			);
		}
	} else if (
		! hasValidationError &&
		isRequired &&
		! values.state &&
		values.country
	) {
		// No validation has been set yet, if it's required, there is a country set and no state, set the error.
		dispatch( validationStore ).setValidationErrors( {
			[ validationErrorId ]: {
				message: sprintf(
					/* translators: %s will be the state field label in lowercase e.g. "state" */
					__( 'Please select a %s', 'woocommerce' ),
					stateField.label.toLowerCase()
				),
				hidden: true,
			},
		} );
	}
};
