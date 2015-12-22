// This file is part of fast-xml, copyright (c) 2015 BusFaster Ltd.
// Released under the MIT license, see LICENSE.

import {State} from '../State';
import {QName} from '../QName';
import * as types from '../types';

export class TypeBase extends types.Base {
	init(state: State) {
		this.define(state, 'type');
		this.scope.setType(this);
		this.surrogateKey = TypeBase.nextKey++;
	}

	id: string = null;
	name: string = null;

	// Internally used members
	parent: TypeBase | QName;
	surrogateKey: number;
	private static nextKey = 0;
}

/** <xsd:simpletype> */

export class SimpleType extends TypeBase {
	static mayContain: () => types.BaseClass[] = () => [
		types.Restriction,
		List,
		Union
	];
}

/** <xsd:complextype> */

export class ComplexType extends TypeBase {
	static mayContain: () => types.BaseClass[] = () => [
		SimpleContent,
		ComplexContent,
		types.Attribute,
		types.AnyAttribute,
		types.Sequence,
		types.Choice,
		types.AttributeGroup,
		types.Group
	];
}

export class ContentBase extends types.Base {
	static mayContain: () => types.BaseClass[] = () => [
		types.Extension,
		types.Restriction
	]

	resolve(state: State) {
		(state.parent.xsdElement as TypeBase).parent = this.parent;

		this.scope.addAllToParent('element');
		this.scope.addAllToParent('attribute');
	}

	// Internally used members
	parent: TypeBase | QName;
}

/** <xsd:simplecontent> */

export class SimpleContent extends ContentBase {
}

/** <xsd:complexcontent> */

export class ComplexContent extends ContentBase {
}

export class ListBase extends types.Base {
	static mayContain = () => [
		SimpleType
	]
}

/** <xsd:list> */

export class List extends ListBase {
}

/** <xsd:union> */

export class Union extends ListBase {
}
