// This file is part of cxsd, copyright (c) 2016 BusFaster Ltd.
// Released under the MIT license, see LICENSE.

import {Namespace} from '../Namespace';
import {Type} from '../Type';
import {Element} from '../Element';
import {Transform} from './Transform';

function sanitizeName(name: string) {
	return(name.replace(/[^_0-9A-Za-z]/g, '').replace(/^[^A-Za-z]+/, ''));
}

export type Output = { [namespaceId: string]: { [name: string]: Type } };

export class ListImports extends Transform<ListImports, Output, void> {
	prepare() {
		this.visitType(this.doc);

		for(var type of this.namespace.typeList) {
			if(type) this.visitType(type);
		}

		this.namespace.importTypeNameTbl = this.output;

		return(true);
	}

	visitType(type: Type) {
		if(type.parent) this.addRef(type.parent.namespace, type.parent);

		for(var member of this.getTypeMembers(type)) {
			this.visitElement(member.element);
		}
	}

	visitElement(element: Element) {
		this.addRef(element.namespace);

		if(element.substitutes) this.addRef(element.substitutes.namespace);

		for(var type of element.typeList) this.addRef(type.namespace, type);
	}

	addRef(namespace: Namespace, type?: Type) {
		if(namespace && namespace != this.namespace) {
			// Type from another, imported namespace.

			// Make sure it gets exported.
			if(type) namespace.exportType(type);

			var id = namespace.id;
			var short = this.namespace.getShortRef(id);

			if(short) {
				if(!this.output[id]) this.output[id] = {};
				if(type) this.output[id][type.safeName] = type;
			}
		}
	}

	construct = ListImports;
	output: Output = {};
}
