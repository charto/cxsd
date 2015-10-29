// This file is part of fast-xml, copyright (c) 2015 BusFaster Ltd.
// Released under the MIT license, see LICENSE.

import {State, Namespace, Rule, Scope, QName} from './XsdState';

export type XmlAttribute = string | number;
type XmlAttributeTbl = {[name: string]: XmlAttribute};

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

@mixin(XsdElementStore, XsdTypeStore)
export class XsdSchema extends XsdBase implements XsdElementStore, XsdTypeStore {
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

		if(attrTbl['xmlns']) {
			state.stateStatic.namespaceDefault = Namespace.register(attrTbl['xmlns']);
		}

		if(attrTbl['targetnamespace']) {
			state.stateStatic.namespaceTarget = Namespace.register(attrTbl['targetnamespace'], state.stateStatic.cache.remoteUrl);
		}

		for(var attr of Object.keys(attrTbl)) {
			if(attr.match(/^xmlns:/i)) {
				var short = attr.substr(attr.indexOf(':') + 1);

				state.stateStatic.namespaceMap[short] = Namespace.register(attrTbl[attr]);
			}
		}

		state.stateStatic.root = this;
	}

	// Mixed in members

	addElement: (element: XsdElement) => void;
	replaceElement: (elementOld: XsdElement, elementNew: XsdElement) => void;
	addElementsToParent: (state: State) => void;
	elementList: XsdElement[];

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
		(state.parent.xsdElement as any as XsdElementStore).addElement(this);

		if(this.name) state.parent.scope.add(new QName(this.name, state), 'element', this);
	}

	finish(state: State) {
		if(this.ref) {
			var ref = new QName(this.ref as string, state);
			var element = state.parent.scope.lookup(ref, 'element');

			if(element) {
				(state.parent.xsdElement as any as XsdElementStore).replaceElement(this, element);
			}
		}

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

		if(group) group.addElementsToParent(state);
	}

	name: string = null;
	ref: string = null;
}




// Attribute support

// <xsd:attribute>

export class XsdAttribute extends XsdBase {
	init(state: State) {
		(state.parent.xsdElement as any as XsdAttributeStore).addAttribute(this);
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

		if(attributeGroup) {
			// TODO: add contents of attributeGroup to parent
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
		Namespace.register(this.namespace, this.schemaLocation);
	}

	id: string = null;
	namespace: string = null;
	schemaLocation: string = null;
}

// <xsd:include>

export class XsdInclude extends XsdBase {
	id: string = null;
	schemaLocation: string = null;
}
