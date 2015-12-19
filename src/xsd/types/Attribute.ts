// This file is part of fast-xml, copyright (c) 2015 BusFaster Ltd.
// Released under the MIT license, see LICENSE.

import {State} from '../State';
import {QName} from '../QName';
import * as types from '../types';

export type XmlAttribute = string | number;

/** <xsd:attribute> */

export class Attribute extends types.Base {
	init(state: State) {
		this.bind(state, 'attribute');
		this.surrogateKey = Attribute.nextKey++;
	}

	finish(state: State) {
		var attribute = this;

		if(this.ref) {
			// Replace this with another, referenced attribute.

			var ref = new QName(this.ref, state.source);
			attribute = this.scope.lookup(ref, 'attribute');

			if(attribute) attribute.bind(state, 'attribute', this.scope);
			else throw new types.MissingReferenceError(this, state, 'attribute', ref);
		}
	}

	id: string = null;
	name: string = null;
	ref: string = null;
	type: string = null;
	use: string = null;
	default: XmlAttribute = null;

	surrogateKey: number;
	private static nextKey = 0;
}

/** <xsd:attributegroup> */

export class AttributeGroup extends types.Base {
	static mayContain = () => [
		Attribute
	];

	init(state: State) {
		this.bind(state, 'attributegroup');
	}

	finish(state: State) {
		var attributeGroup = this;

		if(this.ref) {
			var ref = new QName(this.ref, state.source);
			attributeGroup = this.scope.lookup(ref, 'attributegroup');
		}

		// Named attribute groups are only models for referencing elsewhere.

		if(!this.name) {
			if(attributeGroup) attributeGroup.scope.addAllToParent('attribute', this.scope);
			else throw new types.MissingReferenceError(this, state, 'attributeGroup', ref);
		}
	}

	id: string = null;
	name: string = null;
	ref: string = null;
}
