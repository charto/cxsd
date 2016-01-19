// This file is part of cxml, copyright (c) 2016 BusFaster Ltd.
// Released under the MIT license, see LICENSE.

import {Namespace} from '../Namespace';
import {Type} from '../Type';
import {Member} from '../Member';

export class Transform<Output> {
	constructor(doc: Type) {
		this.doc = doc;
		this.namespace = doc.namespace;
	}

	visitTypeRef(type: Type, output: Output) {
		if(!type.name && !this.visitedTypeTbl[type.surrogateKey]) this.visitType(type, output);
	}

	visitType(type: Type, output: Output) {
		this.visitedTypeTbl[type.surrogateKey] = type;

		for(var attribute of type.attributeList) this.visitAttribute(attribute, output);
		for(var child of type.childList) this.visitChild(child, output);

		if(type.parent) this.visitTypeRef(type.parent, output);
	}

	visitMember(member: Member, output: Output) {}

	visitAttribute(attribute: Member, output: Output) {
		this.visitMember(attribute, output);
	}

	visitChild(child: Member, output: Output) {
		this.visitMember(child, output);

		for(var type of child.typeList) this.visitTypeRef(type, output);
	}

	visitRoot(child: Member, output: Output) {
		this.visitChild(child, output);
	}

	exec(output: Output) {
		var doc = this.doc;
		var namespace = this.namespace;

		this.visitedNamespaceTbl[namespace.id] = namespace;

		for(var type of namespace.typeList) {
			this.visitType(type, output);
		}

		for(var child of doc.childList) {
			this.visitRoot(child, output);
		}

		for(var id of Object.keys(namespace.shortNameTbl)) {
			if(!this.visitedNamespaceTbl[id]) {
				namespace = Namespace.byId(+id);

				if(namespace.doc) {
					var transform = new this.construct(namespace.doc);

					transform.visitedNamespaceTbl = this.visitedNamespaceTbl;
					transform.exec(output);
				}
			}
		}
	}

	construct: { new(...args: any[]): Transform<Output>; };

	private visitedTypeTbl: { [key: string]: Type } = {};

	private visitedNamespaceTbl: { [key: string]: Namespace } = {};

	protected doc: Type;
	protected namespace: Namespace;
}
