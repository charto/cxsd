// This file is part of cxsd, copyright (c) 2016 BusFaster Ltd.
// Released under the MIT license, see LICENSE.

import {Namespace} from '../Namespace';
import {Type} from '../Type';
import {Element} from '../Element';
import {Member} from '../Member';
import {Transform} from './Transform';

export type Output = { [namespaceId: string]: { [key: string]: Type } };

export class AddImports extends Transform<AddImports, Output, void> {
	prepare() {
		this.visitType(this.doc);

		for(var type of this.namespace.typeList) {
			if(type) this.visitType(type);
		}

		this.namespace.importTypeNameTbl = this.output;

		return(this.output);
	}

	/** Replace imported type IDs with sanitized names. */
	finish(result: Output[]) {
		for(var namespaceTbl of result) {
			for(var namespaceId of Object.keys(namespaceTbl)) {
				var output: { [name: string]: Type } = {};
				var typeTbl = namespaceTbl[namespaceId];

				for(var key of Object.keys(typeTbl)) {
					var type = typeTbl[key];
					output[type.safeName] = type;
				}

				namespaceTbl[namespaceId] = output;
			}
		}
	}

	addRef(namespace: Namespace, element?: Element, type?: Type) {
		if(namespace && namespace != this.namespace) {
			// Type from another, imported namespace.

			// Make sure it gets exported.
			if(type) namespace.exportType(type);

			var id = namespace.id;
			var short = this.namespace.getShortRef(id);

			if(!short) {
				short = (element && element.namespace.getShortRef(id)) || namespace.short;

				if(short) this.namespace.addRef(short, namespace);
			}

			if(short) {
				if(!this.output[id]) this.output[id] = {};
				if(type) this.output[id][type.surrogateKey] = type;
			}
		}
	}

	visitElement(element: Element) {
		this.addRef(element.namespace, element);

		if(element.substitutes) this.addRef(element.substitutes.namespace, element);

		for(var type of element.typeList) this.addRef(type.namespace, element, type);
	}

	visitType(type: Type) {
		// Types holding primitives should inherit from them.
		// NOTE: This makes base primitive types inherit themselves.
		if(type.primitiveType && !type.parent) type.parent = type.primitiveType;

		if(type.parent) this.addRef(type.parent.namespace, null, type.parent);

		for(var member of this.getTypeMembers(type)) this.visitElement(member.element);
	}

	construct = AddImports;
	output: Output = {};
}
