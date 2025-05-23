/**
 * External dependencies
 */
import { Card, CardBody, Button, CardDivider } from '@wordpress/components';
import { useState } from '@wordpress/element';
import { WooPaymentsMethodsLogos } from '@woocommerce/onboarding';
import { useSelect } from '@wordpress/data';
import { paymentSettingsStore } from '@woocommerce/data';

/**
 * Internal dependencies
 */
import { getAdminSetting } from '~/utils/admin-settings';
import sanitizeHTML from '~/lib/sanitize-html';
import WooPaymentsLogo from './woopayments.svg';
import ExitSurveyModal from './exit-survey-modal';
import strings from './strings';

interface Props {
	isSubmitted: boolean;
	handleSetup: () => void;
}

const Banner = ( { isSubmitted, handleSetup }: Props ) => {
	const { first_name } = getAdminSetting( 'currentUserData', {} );
	const { description, cta_label, tc_url } = getAdminSetting(
		'wcpayWelcomePageIncentive'
	);

	const [ isNoThanksClicked, setNoThanksClicked ] = useState( false );
	const [ isExitSurveyModalOpen, setExitSurveyModalOpen ] = useState( false );

	const isWooPayEligible = useSelect( ( select ) => {
		const store = select( paymentSettingsStore );
		return store.getIsWooPayEligible();
	}, [] );

	const handleNoThanks = () => {
		setNoThanksClicked( true );
		setExitSurveyModalOpen( true );
	};

	return (
		<Card className="__CLASS__">
			<CardBody className="woopayments-welcome-page__header">
				<img src={ WooPaymentsLogo } alt="WooPayments logo" />
				<h1>{ strings.heading( first_name ) }</h1>
			</CardBody>
			<CardBody className="woopayments-welcome-page__offer">
				<div className="woopayments-welcome-page__offer-pill">
					{ strings.limitedTimeOffer }
				</div>
				<h2
					dangerouslySetInnerHTML={ sanitizeHTML(
						description + '<span class="tos-asterix">*</span>'
					) }
				/>
				<Button
					variant="primary"
					isBusy={ isSubmitted }
					disabled={ isSubmitted }
					onClick={ handleSetup }
				>
					{ cta_label }
				</Button>
				<Button
					variant="tertiary"
					isBusy={ isNoThanksClicked && isExitSurveyModalOpen }
					disabled={ isNoThanksClicked && isExitSurveyModalOpen }
					onClick={ handleNoThanks }
				>
					{ strings.noThanks }
				</Button>
				<p>
					{ isWooPayEligible ?? false
						? strings.TosAndPpWooPay
						: strings.TosAndPp }
				</p>
				<p>{ strings.termsAndConditions( tc_url ) }</p>
			</CardBody>
			<CardDivider />
			<CardBody className="woopayments-welcome-page__payments">
				<p>{ strings.paymentOptions }</p>
				<WooPaymentsMethodsLogos
					isWooPayEligible={ isWooPayEligible }
					maxElements={ 10 }
				/>
			</CardBody>
			{ isExitSurveyModalOpen && (
				<ExitSurveyModal
					setExitSurveyModalOpen={ setExitSurveyModalOpen }
				/>
			) }
		</Card>
	);
};

export default Banner;
