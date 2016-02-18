// This file is part of cxsd, copyright (c) 2015-2016 BusFaster Ltd.
// Released under the MIT license, see LICENSE.

import {State} from '../State';
import {QName} from '../QName';
import {ContentBase} from './ComplexType';
import * as types from '../types';

/** Derived type support, allows types to inherit others. */

export class DerivationBase extends types.Base {
	static mayContain: () => types.BaseClass[] = () => [
		types.Group,
		types.All,
		types.Choice,
		types.Sequence,
		types.Attribute,
		types.AttributeGroup,
		types.AnyAttribute
	]

	resolve(state: State) {
		var base = new QName(this.base, state.source);
		(state.parent.xsdElement as (ContentBase | types.SimpleType)).parent = this.scope.lookup(base, 'type') as types.TypeBase || base;

		this.scope.addAllToParent('element');
		this.scope.addAllToParent('attribute');
		this.scope.addAllToParent('group');
		this.scope.addAllToParent('attributeGroup');
	}

	id: string = null;
	base: string = null;
}
