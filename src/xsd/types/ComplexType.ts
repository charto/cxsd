// This file is part of fast-xml, copyright (c) 2015 BusFaster Ltd.
// Released under the MIT license, see LICENSE.

import {State} from '../State';
import {QName} from '../QName';
import * as types from '../types';
import {Group, Sequence, Choice} from './Group';
import {Attribute, AttributeGroup} from './Attribute';

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

// <xsd:simpletype>

export class SimpleType extends TypeBase {
}

// <xsd:complextype>

export class ComplexType extends TypeBase {
	static mayContain = () => [
		SimpleContent,
		ComplexContent,
		types.Attribute,
//		anyattribute,
		types.Sequence,
		types.Choice,
		types.AttributeGroup,
		types.Group
	];
}

export class ContentBase extends types.Base {
	static mayContain = () => [
		Extension,
		Restriction
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

// Derived type support

export class XsdDerivationBase extends types.Base {
	static mayContain = () => [
		Attribute,
		Sequence
	]

	resolve(state: State) {
		var base = new QName(this.base, state.source);
		(state.parent.xsdElement as ContentBase).parent = this.scope.lookup(base, 'type') as TypeBase || base;

		this.scope.addAllToParent('element');
		this.scope.addAllToParent('attribute');
	}

	id: string = null;
	base: string = null;
}

// <xsd:extension>

export class Extension extends XsdDerivationBase {
}

// <xsd:restriction>

export class Restriction extends XsdDerivationBase {
}
