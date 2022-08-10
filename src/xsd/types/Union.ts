// This file is part of cxsd, copyright (c) 2015-2016 BusFaster Ltd.
// Released under the MIT license, see LICENSE.

import {State} from '../State';
import {QName} from '../QName';
import * as types from '../types';
import {TypedBase} from './TypedBase';

/** <xsd:union> */

export class Union extends TypedBase {
	static mayContain: () => types.BaseClass[] = () => [
		types.SimpleType
	]

	resolve(state: State) {
		// var type = this.resolveType(this.memberType, state);
		// Convert union types to strings for now.
		var type = this.resolveType('string', state);
		(state.parent.xsdElement as types.SimpleType).parent = type;
	}

	memberType: string = null;
}
