// This file is part of cxsd, copyright (c) 2016 BusFaster Ltd.
// Released under the MIT license, see LICENSE.

import {Namespace} from '../Namespace';
import {Type} from '../Type';
import {Element} from '../Element';
import {Member} from '../Member';
import {Transform} from './Transform';

export class AddImports extends Transform<AddImports, void, void> {
	prepare() {
		this.visitType(this.doc);

		for(var type of this.namespace.typeList) {
			if(type) this.visitType(type);
		}

		return(true);
	}

	addRef(namespace: Namespace, element?: Element) {
		if(namespace && namespace != this.namespace) {
			// Type from another, imported namespace.

			var id = namespace.id;
			var short = this.namespace.getShortRef(id);

			if(!short) {
				short = (element && element.namespace.getShortRef(id)) || namespace.short;
				if(short) this.namespace.addRef(short, namespace);
			}
		}
	}

	visitElement(element: Element) {
		this.addRef(element.namespace, element);

		if(element.substitutes) this.addRef(element.substitutes.namespace, element);

		for(var type of element.typeList) this.addRef(type.namespace, element);
	}

	visitType(type: Type) {
		// Types holding primitives should inherit from them.
		// NOTE: This makes base primitive types inherit themselves.
		if(type.primitiveType && !type.parent) type.parent = type.primitiveType;

		if(type.parent) this.addRef(type.parent.namespace);

		for(var member of this.getTypeMembers(type)) this.visitElement(member.element);
	}

	construct = AddImports;
}
