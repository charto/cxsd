// This file is part of fast-xml, copyright (c) 2015-2016 BusFaster Ltd.
// Released under the MIT license, see LICENSE.

import {State} from '../State';
import {QName} from '../QName';
import * as types from '../types';
import {TypeBase} from './Primitive';

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
	static mayContain: () => types.BaseClass[] = () => [
		types.Annotation,
		types.SimpleType,
		types.ComplexType
	];

	init(state: State) {
		super.init(state);

		this.define(state, 'element', this.min, this.max);
		this.surrogateKey = Element.nextKey++;
	}

	resolve(state: State) {
		var element = this as Element;

		if(this.ref) {
			// Replace this with another, referenced element.

			var ref = new QName(this.ref, state.source);
			element = this.scope.lookup(ref, 'element') as Element;

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

		if(this.substitutionGroup) {
			// Add this as an alternative to the substitution group base element.
			var ref = new QName(this.substitutionGroup, state.source);
			var groupBase = this.scope.lookup(ref, 'element') as Element;

			if(groupBase) groupBase.addSubstitute(element);
			else throw new types.MissingReferenceError(this, state, 'element', ref);
		}
	}

	addSubstitute(element: Element) {
		// TODO: check out the "block" attribute. It might disallow adding alternatives.

		if(!this.substituteList) this.substituteList = [];
		this.substituteList.push(element);
	}

	getTypes() {
		var typeList: types.TypeBase[] = [];

		// Filter out types of abstract and unresolved elements.
		if(
			typeof(this.type) == 'object' &&
			this.type instanceof types.TypeBase
		) {
			typeList = [this.type as types.TypeBase];
		}

		return(typeList);
	}

	isAbstract() {
		return(this.abstract == 'true' || this.abstract == '1');
	}

	name: string = null;
	ref: string = null;
	type: string | QName | types.TypeBase = null;
	default: string = null;

	/** Abstract elements are disallowed in the XML document,
	  * and another member of the same substitution group should be used. */
	abstract: string = null; // boolean
	substitutionGroup: string = null;

	substituteList: Element[];
	surrogateKey: number;
	private static nextKey = 0;
}
