// This file is part of cxsd, copyright (c) 2016 BusFaster Ltd.
// Released under the MIT license, see LICENSE.

import * as Promise from 'bluebird';

import {Namespace, TypeState} from '../Namespace';
import {Type} from '../Type';
import {Member} from '../Member';

export abstract class Transform<Output> {
	constructor(doc: Type) {
		this.doc = doc;
		this.namespace = doc.namespace;
	}

	getTypeMembers(type: Type) {
		var memberList: Member[] = [];
		var member: Member;

		if(type.attributeList) {
			for(member of type.attributeList) memberList.push(member);
		}

		if(type.childList) {
			for(member of type.childList) memberList.push(member);
		}

		return(memberList);
	}

	prepare(): boolean | Promise<any> { return(true); }

	exec(): Promise<Namespace> {
		var doc = this.doc;
		var namespace = doc.namespace;

		this.visitedNamespaceTbl[namespace.id] = namespace;

		return(Promise.resolve(this.prepare()).then(() => Promise.map(
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

	private visitedNamespaceTbl: { [key: string]: Namespace } = {};

	protected doc: Type;
	protected namespace: Namespace;
}
