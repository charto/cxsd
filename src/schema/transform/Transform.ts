// This file is part of cxml, copyright (c) 2016 BusFaster Ltd.
// Released under the MIT license, see LICENSE.

import * as Promise from 'bluebird';

import {Namespace} from '../Namespace';
import {Type} from '../Type';
import {Member} from '../Member';

export abstract class Transform<Output> {
	constructor(doc: Type) {
		this.doc = doc;
		this.namespace = doc.namespace;
	}

	visitTypeRef(type: Type) {
		if(!type.name && !this.visitedTypeTbl[type.surrogateKey]) this.visitType(type);
	}

	visitType(type: Type) {
		this.visitedTypeTbl[type.surrogateKey] = type;

		for(var attribute of type.attributeList) this.visitAttribute(attribute);
		for(var child of type.childList) this.visitChild(child);

		if(type.parent) this.visitTypeRef(type.parent);
	}

	visitMember(member: Member) {}

	visitAttribute(attribute: Member) {
		this.visitMember(attribute);
	}

	visitChild(child: Member) {
		this.visitMember(child);

		for(var type of child.typeList) this.visitTypeRef(type);
	}

	visitRoot(child: Member) {
		this.visitChild(child);
	}

	prepare(): boolean | Promise<any> { return(true); }

	done(): boolean | Promise<any> { return(true); }

	exec(): Promise<Namespace> {
		var doc = this.doc;
		var namespace = this.namespace;

		this.visitedNamespaceTbl[namespace.id] = namespace;

		return(Promise.resolve(this.prepare()).then((ready: any) => {
			if(ready) {
				for(var type of namespace.exportedTypeList) {
					this.visitType(type);
				}

				for(var child of doc.childList) {
					this.visitRoot(child);
				}

				return(this.done());
			}
		}).then(() => Promise.map(
			namespace.getUsedImportList(),
			(namespace: Namespace) => {
				if(!this.visitedNamespaceTbl[namespace.id]) {
					if(namespace.doc) {
						var transform = new this.construct(namespace.doc);

						transform.visitedNamespaceTbl = this.visitedNamespaceTbl;
						return(transform.exec());
					}
				}

				return(null);
			}
		).then(() => namespace)));
	}

	construct: { new(...args: any[]): Transform<Output>; };

	private visitedTypeTbl: { [key: string]: Type } = {};

	private visitedNamespaceTbl: { [key: string]: Namespace } = {};

	protected doc: Type;
	protected namespace: Namespace;
	protected output: Output;
}
