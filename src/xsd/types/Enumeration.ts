// This file is part of fast-xml, copyright (c) 2015-2016 BusFaster Ltd.
// Released under the MIT license, see LICENSE.

import {State} from '../State';
import * as types from '../types';

/** <xsd:enumeration> */

export class Enumeration extends types.Base {
	static mayContain: () => types.BaseClass[] = () => [
		types.Annotation
	];

	init(state: State) {
		(state.parent.xsdElement as types.Restriction).addEnumeration(this.value);
	}

	value: string = null;
}
