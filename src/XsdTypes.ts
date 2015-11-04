// This file is part of fast-xml, copyright (c) 2015 BusFaster Ltd.
// Released under the MIT license, see LICENSE.

import * as url from 'url';

import {State, Namespace, Rule, Scope, QName} from './XsdState';
import {XsdParser} from './XsdParser';

export type XmlAttribute = string | number;
type XmlAttributeTbl = {[name: string]: XmlAttribute};

// Mixin decorator

function mixin(...constructorList: any[]) {
	return((target: any) => {
		for(var base of constructorList) {
			var proto = base.prototype;
			for(var key of Object.keys(proto)) {
				target.prototype[key] = proto[key];
			}
		}
	});
}




// Mixins

// TODO: maybe just use these classes directly as members,
// instead of mixing in their contents.

export class XsdElementStore {
	addElement(element: XsdElement) {
		if(!this.elementList) this.elementList = [];

		this.elementList.push(element);
	}

	replaceElement(elementOld: XsdElement, elementNew: XsdElement) {
		if(!this.elementList) return;

		this.elementList.forEach((element: XsdElement, index: number) => {
			if(element == elementOld) this.elementList[index] = elementNew;
		});
	}

	addElementsToParent(state: State) {
		if(this.elementList) {
			for(var element of this.elementList) {
				(state.parent.xsdElement as any as XsdElementStore).addElement(element);
			}
		}
	}

	elementList: XsdElement[];
}

export class XsdAttributeStore {
	addAttribute(attribute: XsdAttribute) {
		if(!this.attributeList) this.attributeList = [];

		this.attributeList.push(attribute);
	}

	attributeList: XsdAttribute[];
}

export class XsdTypeStore {
	addType(type: XsdTypeBase) {
		if(!this.typeList) this.typeList = [];

		this.typeList.push(type);
	}

	typeList: XsdTypeBase[];
}




// Common base for all schema tags

export interface XsdBaseClass {
	new(...args: any[]): XsdBase;
	mayContain(): XsdBaseClass[];

	name: string;
	rule: Rule;
}

export class XsdBase {
	static mayContain = () => ([] as XsdBaseClass[]);
	init(state: State) {}
	finish(state: State) {}

	static name: string;
	static rule: Rule;
}




// Schema root

export class XsdRoot extends XsdBase {
	static mayContain = () => [
		XsdSchema
	];
}

// <xsd:schema>

@mixin(XsdElementStore, XsdAttributeStore, XsdTypeStore)
export class XsdSchema extends XsdBase implements XsdElementStore, XsdAttributeStore, XsdTypeStore {
	static mayContain = () => [
		XsdImport,
		XsdInclude,
		XsdAttributeGroup,
		XsdSimpleType,
		XsdComplexType,
		XsdGroup,
		XsdAttribute,
		XsdElement
	];

	init(state: State) {
		var attrTbl = state.attributeTbl;

		// Unqualified tags are assumed to be in the default namespace.
		// For the schema file itself, it should be http://www.w3.org/2001/XMLSchema

		if(attrTbl['xmlns']) {
			state.stateStatic.namespaceDefault = Namespace.register(attrTbl['xmlns']);
		}

		// Everything defined in the current file belongs to the target namespace by default.

		if(attrTbl['targetnamespace']) {
			state.stateStatic.namespaceTarget.register(attrTbl['targetnamespace']);
		}

		// Read the current file's preferred shorthand codes for other XML namespaces.

		for(var attr of Object.keys(attrTbl)) {
			if(attr.match(/^xmlns:/i)) {
				var short = attr.substr(attr.indexOf(':') + 1);

				state.stateStatic.namespaceMap[short] = Namespace.register(attrTbl[attr]);
			}
		}

		// Ultimately the schema exports elements and types in the global scope
		// (meaning they are children of this, the root element).

		state.stateStatic.root = this;
	}

	// Mixed in members

	addElement: (element: XsdElement) => void;
	replaceElement: (elementOld: XsdElement, elementNew: XsdElement) => void;
	addElementsToParent: (state: State) => void;
	elementList: XsdElement[];

	addAttribute: (attribute: XsdAttribute) => void;
	attributeList: XsdAttribute[];

	addType: (type: XsdTypeBase) => void;
	typeList: XsdTypeBase[];
}




// Element support

export class XsdElementBase extends XsdBase {
	id: string = null;
	minOccurs: number = 1;
	maxOccurs: number = 1;
}

// <xsd:element>

@mixin(XsdTypeStore)
export class XsdElement extends XsdElementBase implements XsdTypeStore {
	static mayContain = () => [
		XsdSimpleType,
		XsdComplexType
	];

	init(state: State) {
		if(this.name) state.parent.scope.add(new QName(this.name, state), 'element', this);
	}

	finish(state: State) {
		var element = this;

		if(this.ref) {
			// Replace this with another, referenced element.

			var ref = new QName(this.ref, state);
			element = state.parent.scope.lookup(ref, 'element');
		}

		if(element) (state.parent.xsdElement as any as XsdElementStore).addElement(element);

		if(this.type) {
			var type = new QName(this.type as string, state);
			this.type = state.parent.scope.lookup(type, 'type') as XsdTypeBase || type;
		}

		if(!this.type && this.typeList && this.typeList.length == 1) {
			this.type = this.typeList[0];
		}
	}

	name: string = null;
	ref: string = null;
	type: string | QName | XsdTypeBase = null;
	default: string = null;

	// Mixed in members

	addType: (type: XsdTypeBase) => void;
	typeList: XsdTypeBase[];
}

@mixin(XsdElementStore)
export class XsdGroupBase extends XsdElementBase implements XsdElementStore {
	// Mixed in members

	addElement: (element: XsdElement) => void;
	replaceElement: (elementOld: XsdElement, elementNew: XsdElement) => void;
	addElementsToParent: (state: State) => void;
	elementList: XsdElement[];
}

export class XsdGenericChildList extends XsdGroupBase {
	static mayContain: () => XsdBaseClass[] = () => [
		XsdElement,
		XsdGroup,
		XsdSequence,
		XsdChoice
	];

	finish(state: State) {
		this.addElementsToParent(state);
	}
}

// <xsd:sequence>

export class XsdSequence extends XsdGenericChildList {
}

// <xsd:choice>

export class XsdChoice extends XsdGenericChildList {
}

// <xsd:group>

@mixin(XsdElementStore)
export class XsdGroup extends XsdGroupBase {
	static mayContain: () => XsdBaseClass[] = () => [
		XsdSequence,
		XsdChoice
	];

	init(state: State) {
		if(this.name) state.parent.scope.add(new QName(this.name, state), 'group', this);
	}

	finish(state: State) {
		var group = this;

		if(this.ref) {
			var ref = new QName(this.ref, state);
			group = state.parent.scope.lookup(ref, 'group');
		}

		// Named groups are only models for referencing elsewhere.

		if(!this.name && group) group.addElementsToParent(state);
	}

	name: string = null;
	ref: string = null;
}




// Attribute support

// <xsd:attribute>

export class XsdAttribute extends XsdBase {
	init(state: State) {
		if(this.name) state.parent.scope.add(new QName(this.name, state), 'attribute', this);
	}

	finish(state: State) {
		var attribute = this;

		if(this.ref) {
			// Replace this with another, referenced attribute.

			var ref = new QName(this.ref, state);
			attribute = state.parent.scope.lookup(ref, 'attribute');
		}

		if(attribute) (state.parent.xsdElement as any as XsdAttributeStore).addAttribute(attribute);
	}

	id: string = null;
	name: string = null;
	ref: string = null;
	type: string = null;
	use: string = null;
	default: XmlAttribute = null;
}

// <xsd:attributegroup>

@mixin(XsdAttributeStore)
export class XsdAttributeGroup extends XsdBase implements XsdAttributeStore {
	static mayContain = () => [
		XsdAttribute
	];

	init(state: State) {
		if(this.name) state.parent.scope.add(new QName(this.name, state), 'attributegroup', this);
	}

	finish(state: State) {
		var attributeGroup = this;

		if(this.ref) {
			var ref = new QName(this.ref, state);
			attributeGroup = state.parent.scope.lookup(ref, 'attributegroup');
		}

		// Named attribute groups are only models for referencing elsewhere.

		if(!this.name && attributeGroup && attributeGroup.attributeList) {
			// Add attribute group contents to parent.

			for(var attribute of attributeGroup.attributeList) {
				(state.parent.xsdElement as any as XsdAttributeStore).addAttribute(attribute);
			}
		}
	}

	id: string = null;
	name: string = null;
	ref: string = null;

	// Mixed in members

	addAttribute: (attribute: XsdAttribute) => void;
	attributeList: XsdAttribute[];
}




// Type support

export class XsdTypeBase extends XsdBase {
	init(state: State) {
		(state.parent.xsdElement as any as XsdTypeStore).addType(this);
		if(this.name) state.parent.scope.add(new QName(this.name, state), 'type', this);
	}

	id: string = null;
	name: string = null;

	// Internally used members
	parent: XsdTypeBase | QName;
}

// <xsd:simpletype>

export class XsdSimpleType extends XsdTypeBase {
}

// <xsd:complextype>

@mixin(XsdElementStore, XsdAttributeStore)
export class XsdComplexType extends XsdTypeBase implements XsdElementStore, XsdAttributeStore {
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

	// Mixed in members

	addElement: (element: XsdElement) => void;
	replaceElement: (elementOld: XsdElement, elementNew: XsdElement) => void;
	addElementsToParent: (state: State) => void;
	elementList: XsdElement[];

	addAttribute: (attribute: XsdAttribute) => void;
	attributeList: XsdAttribute[];
}

export class XsdContentBase extends XsdBase {
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

export class XsdDerivationBase extends XsdBase {
	finish(state: State) {
		var base = new QName(this.base, state);
		(state.parent.xsdElement as XsdContentBase).parent = state.parent.scope.lookup(base, 'type') as XsdTypeBase || base;
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

export class XsdImport extends XsdBase {
	init(state: State) {
		if(this.schemaLocation) {
			// TODO: handle importing namespaces like http://www.w3.org/XML/1998/namespace
			// without a schemaLocation.

			var urlRemote = url.resolve(state.stateStatic.namespaceTarget.url, this.schemaLocation);
			state.stateStatic.addImport(Namespace.register(this.namespace, urlRemote), urlRemote);
		}
	}

	id: string = null;
	namespace: string = null;
	schemaLocation: string = null;
}

// <xsd:include>

export class XsdInclude extends XsdBase {
	init(state: State) {
		if(this.schemaLocation) {
			var urlRemote = url.resolve(state.stateStatic.namespaceTarget.url, this.schemaLocation);
			state.stateStatic.addImport(state.stateStatic.namespaceTarget, urlRemote);
		}
	}

	id: string = null;
	schemaLocation: string = null;
}
