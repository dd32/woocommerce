/**
 * External dependencies
 */
import { __ } from '@wordpress/i18n';
import { SelectControl, TextControl } from '@wordpress/components';

/**
 * Internal dependencies
 */
import type { PickupLocation } from '../types';
import { countryStateOptions, states } from '../utils';

const Form = ( {
	formRef,
	values,
	setValues,
}: {
	formRef: React.RefObject< HTMLFormElement >;
	values: PickupLocation;
	setValues: React.Dispatch< React.SetStateAction< PickupLocation > >;
} ) => {
	const { country: selectedCountry, state: selectedState } = values.address;
	const setLocationField =
		( field: keyof PickupLocation ) => ( newValue: string | boolean ) => {
			setValues( ( prevValue: PickupLocation ) => ( {
				...prevValue,
				[ field ]: newValue,
			} ) );
		};

	const setLocationAddressField =
		( field: keyof PickupLocation[ 'address' ] ) =>
		( newValue: string | boolean ) => {
			setValues( ( prevValue ) => ( {
				...prevValue,
				address: {
					...prevValue.address,
					[ field ]: newValue,
				},
			} ) );
		};

	const countryHasStates =
		states[ selectedCountry ] &&
		Object.keys( states[ selectedCountry ] ).length > 0;

	return (
		<form ref={ formRef }>
			<TextControl
				label={ __( 'Location name', 'woocommerce' ) + ' *' }
				name={ 'location_name' }
				value={ values.name }
				onChange={ setLocationField( 'name' ) }
				autoComplete="off"
				required={ true }
				aria-required={ true }
				onInvalid={ (
					event: React.InvalidEvent< HTMLInputElement >
				) => {
					event.target.setCustomValidity(
						__( 'A Location title is required', 'woocommerce' )
					);
				} }
				onInput={ ( event: React.ChangeEvent< HTMLInputElement > ) => {
					event.target.setCustomValidity( '' );
				} }
			/>
			<TextControl
				label={ __( 'Address', 'woocommerce' ) }
				name={ 'location_address' }
				placeholder={ __( 'Address', 'woocommerce' ) }
				value={ values.address.address_1 }
				onChange={ setLocationAddressField( 'address_1' ) }
				autoComplete="off"
			/>
			<TextControl
				label={ __( 'City', 'woocommerce' ) }
				name={ 'location_city' }
				hideLabelFromVision={ true }
				placeholder={ __( 'City', 'woocommerce' ) }
				value={ values.address.city }
				onChange={ setLocationAddressField( 'city' ) }
				autoComplete="off"
			/>
			<TextControl
				label={ __( 'Postcode / ZIP', 'woocommerce' ) }
				name={ 'location_postcode' }
				hideLabelFromVision={ true }
				placeholder={ __( 'Postcode / ZIP', 'woocommerce' ) }
				value={ values.address.postcode }
				onChange={ setLocationAddressField( 'postcode' ) }
				autoComplete="off"
			/>
			{ ! countryHasStates && (
				<TextControl
					placeholder={ __( 'State', 'woocommerce' ) }
					value={ selectedState }
					onChange={ setLocationAddressField( 'state' ) }
				/>
			) }
			<SelectControl
				name="location_country_state"
				label={ __( 'Country / State', 'woocommerce' ) }
				hideLabelFromVision={ true }
				placeholder={ __( 'Country / State', 'woocommerce' ) }
				value={ ( () => {
					if ( ! selectedState && countryHasStates ) {
						return `${ selectedCountry }:${
							Object.keys( states[ selectedCountry ] )[ 0 ]
						}`;
					}

					return `${ selectedCountry }${
						selectedState &&
						states[ selectedCountry ]?.[ selectedState ]
							? ':' + selectedState
							: ''
					}`;
				} )() }
				onChange={ ( val: string ) => {
					const [ country, state = '' ] = val.split( ':' );
					setLocationAddressField( 'country' )( country );
					setLocationAddressField( 'state' )( state );
				} }
			>
				{ countryStateOptions.options.map( ( option ) => {
					if ( option.label ) {
						return (
							<optgroup
								key={ option.label }
								label={ option.label }
							>
								{ option.options.map( ( subOption ) => (
									<option
										key={ subOption.value }
										value={ subOption.value }
									>
										{ subOption.label }
									</option>
								) ) }
							</optgroup>
						);
					}

					return (
						<option
							key={ option.options[ 0 ].value }
							value={ option.options[ 0 ].value }
						>
							{ option.options[ 0 ].label }
						</option>
					);
				} ) }
			</SelectControl>

			<TextControl
				label={ __( 'Pickup details', 'woocommerce' ) }
				name={ 'pickup_details' }
				value={ values.details }
				onChange={ setLocationField( 'details' ) }
				autoComplete="off"
			/>
		</form>
	);
};

export default Form;
