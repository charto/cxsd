// This file is part of fast-xml, copyright (c) 2015 BusFaster Ltd.
// Released under the MIT license, see LICENSE.

import {State} from '../State';
import {QName} from '../QName';
import * as types from '../types';
import {ContentBase} from './ComplexType';

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
		(state.parent.xsdElement as ContentBase).parent = this.scope.lookup(base, 'type') as types.TypeBase || base;

		this.scope.addAllToParent('element');
		this.scope.addAllToParent('attribute');
	}

	id: string = null;
	base: string = null;
}

/** <xsd:extension> */

export class Extension extends DerivationBase {
}

/** <xsd:restriction>
  * The schema allows a restriction to contain anything, but we parse only some useful restrictions. */

export class Restriction extends DerivationBase {
	static mayContain: () => types.BaseClass[] = () => DerivationBase.mayContain().concat([
		Enumeration
	]);
}

/** <xsd:enumeration> */

export class Enumeration extends types.Base {
	static mayContain: () => types.BaseClass[] = () => [
		types.Annotation
	];
}
