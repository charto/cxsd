// This file is part of fast-xml, copyright (c) 2015 BusFaster Ltd.
// Released under the MIT license, see LICENSE.

import {State} from '../State';
import {QName} from '../QName';
import * as types from '../types';

export class ElementBase extends types.Base {
	id: string = null;
	minOccurs: string = "1";
	maxOccurs: string = "1";

	min: number;
	max: number;

	init(state: State) {
		this.min = +this.minOccurs;
		if(this.maxOccurs == 'unbounded') this.max = Infinity;
		else this.max = +this.maxOccurs;
	}
}

/** <xsd:element> */

export class Element extends ElementBase {
	static mayContain = () => [
		types.SimpleType,
		types.ComplexType
	];

	init(state: State) {
		super.init(state);

		this.define(state, 'element', this.min, this.max);
		this.surrogateKey = Element.nextKey++;
	}

	resolve(state: State) {
		var element = this;

		if(this.ref) {
			// Replace this with another, referenced element.

			var ref = new QName(this.ref, state.source);
			element = this.scope.lookup(ref, 'element');

			if(element) element.define(state, 'element', this.min, this.max, this.scope);
			else throw new types.MissingReferenceError(this, state, 'element', ref);
		}

		// If the element has a type set through an attribute, look it up in scope.

		if(this.type) {
			var type = new QName(this.type as string, state.source);
			this.type = this.scope.lookup(type, 'type') as types.TypeBase || type;
		} else {
			// If there's a single type as a child, use it as the element's type.
			this.type = this.scope.getType();
		}
	}

	name: string = null;
	ref: string = null;
	type: string | QName | types.TypeBase = null;
	default: string = null;

	surrogateKey: number;
	private static nextKey = 0;
}
