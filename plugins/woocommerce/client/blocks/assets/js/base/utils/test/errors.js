/**
 * Internal dependencies
 */
import { formatError } from '../errors';

describe( 'formatError', () => {
	const mockResponseBody = JSON.stringify( { message: 'Lorem Ipsum' } );
	const mockMalformedJson = '{ "message": "Lorem Ipsum"';

	test( 'should format general errors', async () => {
		const error = await formatError( {
			message: 'Lorem Ipsum',
		} );
		const expectedError = {
			code: '',
			message: 'Lorem Ipsum',
			type: 'general',
		};

		expect( error ).toEqual( expectedError );
	} );

	test( 'should format API errors', async () => {
		const mockResponse = new Response( mockResponseBody, {
			status: 400,
		} );

		const error = await formatError( mockResponse );
		const expectedError = {
			code: '',
			message: 'Lorem Ipsum',
			type: 'api',
		};

		expect( error ).toEqual( expectedError );
	} );

	test( 'should format JSON parse errors', async () => {
		const mockResponse = new Response( mockMalformedJson, { status: 400 } );

		const error = await formatError( mockResponse );

		expect( error.message ).toContain(
			"Expected ',' or '}' after property value in JSON at position 26"
		);
		expect( error.type ).toEqual( 'general' );
	} );
} );
