/**
 * External dependencies
 */
import type { Meta, StoryFn } from '@storybook/react';

/**
 * Internal dependencies
 */
import Spinner from '..';

export default {
	title: 'External Components/Spinner',
	component: Spinner,
} as Meta;

const Template: StoryFn = () => <Spinner />;

export const Default: StoryFn = Template.bind( {} );
Default.args = {};
Default.parameters = { controls: { hideNoControlsWarning: true } };
