// This file is part of cxsd, copyright (c) 2015-2016 BusFaster Ltd.
// Released under the MIT license, see LICENSE.

import {State} from '../State';
import {QName} from '../QName';
import * as types from '../types';

/** <xsd:simpletype> */

export class SimpleType extends types.TypeBase {
	static mayContain: () => types.BaseClass[] = () => [
		types.Annotation,
		types.Restriction,
		List,
		Union
	];

	setEnumerationList(enumerationList: string[]) {
		this.enumerationList = enumerationList;
	}

	getEnumerationList() {
		return(this.enumerationList);
	}

	private enumerationList: string[];
}

/** <xsd:complextype> */

export class ComplexType extends types.TypeBase {
	static mayContain: () => types.BaseClass[] = () => [
		types.Annotation,
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
		(state.parent.xsdElement as types.TypeBase).parent = this.parent;

		// Pass elements and attributes defined in child extension or restriction
		// onwards to the parent type definition.
		this.scope.addAllToParent('element');
		this.scope.addAllToParent('attribute');
		this.scope.addAllToParent('group');
		this.scope.addAllToParent('attributeGroup');

//		super.resolve(state);
	}

	// Internally used members
	parent: types.TypeBase | QName;
}

/** <xsd:simplecontent> */

export class SimpleContent extends ContentBase {
}

/** <xsd:complexcontent> */

export class ComplexContent extends ContentBase {
}

export class ListBase extends types.Base {
	static mayContain: () => types.BaseClass[] = () => [
		SimpleType
	]
}

/** <xsd:list> */

export class List extends ListBase {
}

/** <xsd:union> */

export class Union extends ListBase {
}
