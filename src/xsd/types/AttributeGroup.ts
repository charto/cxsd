// This file is part of fast-xml, copyright (c) 2015-2016 BusFaster Ltd.
// Released under the MIT license, see LICENSE.

import {State} from '../State';
import {QName} from '../QName';
import * as types from '../types';

/** <xsd:attributegroup>
  * Defines several attributes that can be included together in type definitions. */

export class AttributeGroup extends types.Base {
	static mayContain: () => types.BaseClass[] = () => [
		types.Annotation,
		types.Attribute,
		AttributeGroup
	];

	init(state: State) {
		this.define(state, 'attributegroup');
	}

	resolve(state: State) {
		var attributeGroup = this;

		if(this.ref) {
			var ref = new QName(this.ref, state.source);
			attributeGroup = this.scope.lookup(ref, 'attributegroup');
		}

		// Named attribute groups are only models for referencing elsewhere.

		if(!this.name) {
			if(attributeGroup) attributeGroup.scope.addAllToParent('attribute', 1, 1, this.scope);
			else throw new types.MissingReferenceError(this, state, 'attributeGroup', ref);
		}
	}

	id: string = null;
	name: string = null;
	ref: string = null;
}
