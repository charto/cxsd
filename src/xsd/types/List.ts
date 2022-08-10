// This file is part of cxsd, copyright (c) 2015-2016 BusFaster Ltd.
// Released under the MIT license, see LICENSE.

import {State} from '../State';
import {QName} from '../QName';
import * as types from '../types';
import {TypedBase} from './TypedBase';

/** <xsd:list> */

export class List extends TypedBase {
	static mayContain: () => types.BaseClass[] = () => [
		types.SimpleType
	]

	resolve(state: State) {
		var type = this.resolveType(this.itemType, state);
		this.scope.addContentToParent('list', type as types.TypeBase, 0, Infinity);
	}

	itemType: string = null;
}
