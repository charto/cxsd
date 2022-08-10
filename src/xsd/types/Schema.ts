// This file is part of cxsd, copyright (c) 2015 BusFaster Ltd.
// Released under the MIT license, see LICENSE.

import {State} from '../State';
import * as types from '../types';

/** Schema root element */

export class Root extends types.Base {
	static mayContain: () => types.BaseClass[] = () => [
		Schema
	];
}

/** <xsd:schema> */

export class Schema extends types.Base {
	static mayContain: () => types.BaseClass[] = () => [
		types.Annotation,
		types.Import,
		types.Include,
		types.AttributeGroup,
		types.SimpleType,
		types.ComplexType,
		types.Group,
		types.Attribute,
		types.Element
	];

	init(state: State) {
		// Ultimately the schema exports elements and types in the global scope
		// (meaning they are children of this, the root element).

		state.source.parse(state.attributeTbl);
		var scope = state.source.targetNamespace.getScope();

		state.setScope(scope);
		this.scope = scope;
	}
}
