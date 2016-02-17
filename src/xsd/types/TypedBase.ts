// This file is part of cxsd, copyright (c) 2015-2016 BusFaster Ltd.
// Released under the MIT license, see LICENSE.

import {State} from '../State';
import {QName} from '../QName';
import * as types from '../types';

export class TypedBase extends types.Base {
	resolveType(state: State) {
		// If the element has a type set through an attribute, look it up in scope.

		if(this.type) {
			var type = new QName(this.type as string, state.source);
			this.type = this.scope.lookup(type, 'type') as types.TypeBase || type;
		} else {
			// If there's a single type as a child, use it as the element's type.
			this.type = this.scope.getType();
		}
	}

	type: string | QName | types.TypeBase = null;
}
