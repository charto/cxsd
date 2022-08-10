// This file is part of cxsd, copyright (c) 2015-2016 BusFaster Ltd.
// Released under the MIT license, see LICENSE.

import {State} from '../State';
import * as types from '../types';

/** <xsd:anyAttribute> */

export class AnyAttribute extends types.Attribute {
	init(state: State) {
		this.name = '*';
		super.init(state);
	}

	resolve(state: State) {
		this.typeRef = this.resolveType('anytype', state);
	}

	namespace: string = null;
	processContents: 'lax' | 'skip' | 'strict' = 'strict';
}
