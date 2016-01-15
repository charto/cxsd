// This file is part of cxml, copyright (c) 2015-2016 BusFaster Ltd.
// Released under the MIT license, see LICENSE.

import * as types from '../types';

/** <xsd:annotation> */

export class Annotation extends types.Base {
	static mayContain: () => types.BaseClass[] = () => [
		types.Documentation
	];
}
