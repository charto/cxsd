// This file is part of fast-xml, copyright (c) 2015 BusFaster Ltd.
// Released under the MIT license, see LICENSE.

import {State, Rule} from '../XsdState';
import {XsdParser} from '../XsdParser';
import {Namespace} from './Namespace';
import {Source} from './Source';
import {Scope} from './Scope';
import {QName} from './QName';

import {Base, BaseClass} from './types/Base';
export {Base, BaseClass};
import {Schema, Root} from './types/Schema';
export {Schema, Root};

export type XmlAttribute = string | number;
type XmlAttributeTbl = {[name: string]: XmlAttribute};




export class MissingReferenceError extends Error {
	constructor(tag: Base, state: State, type: string, ref: QName) {
		this.name = 'MissingReferenceError';
		this.message = 'Missing ' + type + ': ' + ref.format() + ' on line ' + tag.lineNumber + ' of ' + state.source.url;

		super(this.message);
	}
}




// Element support

export class XsdElementBase extends Base {
	id: string = null;
	minOccurs: number = 1;
	maxOccurs: number = 1;
}

// <xsd:element>

export class XsdElement extends XsdElementBase {
	static mayContain = () => [
		XsdSimpleType,
		XsdComplexType
	];

	init(state: State) {
		this.bind(state, 'element');
		this.surrogateKey = XsdElement.nextKey++;
	}

	finish(state: State) {
		var element = this;

		if(this.ref) {
			// Replace this with another, referenced element.

			var ref = new QName(this.ref, state.source);
			element = this.scope.lookup(ref, 'element');

			if(element) element.bind(state, 'element', this.scope);
			else throw new MissingReferenceError(this, state, 'element', ref);
		}

		// If the element has a type set through an attribute, look it up in scope.

		if(this.type) {
			var type = new QName(this.type as string, state.source);
			this.type = this.scope.lookup(type, 'type') as XsdTypeBase || type;
		} else {
			// If there's a single type as a child, use it as the element's type.
			this.type = this.scope.getType();
		}
	}

	name: string = null;
	ref: string = null;
	type: string | QName | XsdTypeBase = null;
	default: string = null;

	surrogateKey: number;
	private static nextKey = 0;
}

export class XsdGroupBase extends XsdElementBase {
}

export class XsdGenericChildList extends XsdGroupBase {
	static mayContain: () => BaseClass[] = () => [
		XsdElement,
		XsdGroup,
		XsdSequence,
		XsdChoice
	];

	finish(state: State) {
		this.scope.addAllToParent('element');
	}
}

// <xsd:sequence>

export class XsdSequence extends XsdGenericChildList {
}

// <xsd:choice>

export class XsdChoice extends XsdGenericChildList {
}

// <xsd:group>

export class XsdGroup extends XsdGroupBase {
	static mayContain: () => BaseClass[] = () => [
		XsdSequence,
		XsdChoice
	];

	init(state: State) {
		this.bind(state, 'group');
	}

	finish(state: State) {
		var group = this;

		if(this.ref) {
			var ref = new QName(this.ref, state.source);
			group = this.scope.lookup(ref, 'group');
		}

		// Named groups are only models for referencing elsewhere.

		if(!this.name) {
			if(group) group.scope.addAllToParent('element', this.scope);
			else throw new MissingReferenceError(this, state, 'group', ref);
		}
	}

	name: string = null;
	ref: string = null;
}




// Attribute support

// <xsd:attribute>

export class XsdAttribute extends Base {
	init(state: State) {
		this.bind(state, 'attribute');
		this.surrogateKey = XsdAttribute.nextKey++;
	}

	finish(state: State) {
		var attribute = this;

		if(this.ref) {
			// Replace this with another, referenced attribute.

			var ref = new QName(this.ref, state.source);
			attribute = this.scope.lookup(ref, 'attribute');

			if(attribute) attribute.bind(state, 'attribute', this.scope);
			else throw new MissingReferenceError(this, state, 'attribute', ref);
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

// <xsd:attributegroup>

export class XsdAttributeGroup extends Base {
	static mayContain = () => [
		XsdAttribute
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
			else throw new MissingReferenceError(this, state, 'attributeGroup', ref);
		}
	}

	id: string = null;
	name: string = null;
	ref: string = null;
}




// Type support

export class XsdTypeBase extends Base {
	init(state: State) {
		this.bind(state, 'type');
		this.scope.setType(this);
		this.surrogateKey = XsdTypeBase.nextKey++;
	}

	id: string = null;
	name: string = null;

	// Internally used members
	parent: XsdTypeBase | QName;
	surrogateKey: number;
	private static nextKey = 0;
}

// <xsd:simpletype>

export class XsdSimpleType extends XsdTypeBase {
}

// <xsd:complextype>

export class XsdComplexType extends XsdTypeBase {
	static mayContain = () => [
		XsdSimpleContent,
		XsdComplexContent,
		XsdAttribute,
//		anyattribute,
		XsdSequence,
		XsdChoice,
		XsdAttributeGroup,
		XsdGroup
	];
}

export class XsdContentBase extends Base {
	static mayContain = () => [
		XsdExtension,
		XsdRestriction
	]

	finish(state: State) {
		(state.parent.xsdElement as XsdTypeBase).parent = this.parent;
	}

	// Internally used members
	parent: XsdTypeBase | QName;
}

// <xsd:simplecontent>

export class XsdSimpleContent extends XsdContentBase {
}

// <xsd:complexcontent>

export class XsdComplexContent extends XsdContentBase {
}




// Derived type support

export class XsdDerivationBase extends Base {
	finish(state: State) {
		var base = new QName(this.base, state.source);
		(state.parent.xsdElement as XsdContentBase).parent = this.scope.lookup(base, 'type') as XsdTypeBase || base;
	}

	id: string = null;
	base: string = null;
}

// <xsd:extension>

export class XsdExtension extends XsdDerivationBase {
}

// <xsd:restriction>

export class XsdRestriction extends XsdDerivationBase {
}




// <xsd:import>

export class XsdImport extends Base {
	init(state: State) {
		if(this.schemaLocation) {
			// TODO: handle importing namespaces like http://www.w3.org/XML/1998/namespace
			// without a schemaLocation.

			var urlRemote = state.source.urlResolve(this.schemaLocation);
			state.stateStatic.addImport(Namespace.register(this.namespace, urlRemote), urlRemote);
		}
	}

	id: string = null;
	namespace: string = null;
	schemaLocation: string = null;
}

// <xsd:include>

export class XsdInclude extends Base {
	init(state: State) {
		if(this.schemaLocation) {
			var urlRemote = state.source.urlResolve(this.schemaLocation);
			state.stateStatic.addImport(state.source.targetNamespace, urlRemote);
		}
	}

	id: string = null;
	schemaLocation: string = null;
}
