// This file is part of cxsd, copyright (c) 2015-2016 BusFaster Ltd.
// Released under the MIT license, see LICENSE.

import {State} from '../State';
import * as types from '../types';

/** <xsd:enumeration> */

export class Enumeration extends types.Base {
	static mayContain: () => types.BaseClass[] = () => [
		types.Annotation
	];

	init(state: State) {
		var parent = state.parent.xsdElement;

		if(parent instanceof types.Restriction) parent.addEnumeration(this.value);
	}

	value: string = null;
}
