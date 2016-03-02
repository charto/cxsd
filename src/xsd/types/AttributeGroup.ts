// This file is part of cxsd, copyright (c) 2015-2016 BusFaster Ltd.
// Released under the MIT license, see LICENSE.

import {State} from '../State';
import {QName} from '../QName';
import * as types from '../types';

/** <xsd:attributeGroup>
  * Defines several attributes that can be included together in type definitions. */

export class AttributeGroup extends types.Base {
	static mayContain: () => types.BaseClass[] = () => [
		types.Annotation,
		types.Attribute,
		AttributeGroup
	];

	init(state: State) {
		this.define(state, 'attributeGroup', 0, 0);
	}

	resolve(state: State) {
		var attributeGroup: AttributeGroup = this;

		if(this.ref) {
			var ref = new QName(this.ref, state.source);
			attributeGroup = this.scope.lookup(ref, 'attributeGroup') as AttributeGroup;
		}

		// Named attribute groups are only models for referencing elsewhere.

		if(!this.name) {
			if(attributeGroup) {
				// if(attributeGroup != this && !attributeGroup.resolved) console.log('OH NOES! AttributeGroup ' + attributeGroup.name);
				// attributeGroup.scope.addAllToParent('attribute', 1, 1, this.scope);
				attributeGroup.define(state, 'attributeGroup', 1, 1, this.scope);
			} else throw new types.MissingReferenceError('attributeGroup', ref);
		}
	}

	id: string = null;
	name: string = null;
	ref: string = null;
}
