// This file is part of cxsd, copyright (c) 2016 BusFaster Ltd.
// Released under the MIT license, see LICENSE.

import * as Promise from 'bluebird';

import {Namespace, TypeState} from '../Namespace';
import {Type} from '../Type';
import {Member} from '../Member';

/** TransformType is a class derived from Transform, used like CRTP in C++. */

export abstract class Transform<TransformType, Output, State> {
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

	exec(
		visitedNamespaceTbl?: { [key: string]: Namespace },
		state?: any
	): Promise<TransformType> {
		var doc = this.doc;
		var namespace = doc.namespace;

		if(state) this.state = state;

		if(!visitedNamespaceTbl) visitedNamespaceTbl = {};
		visitedNamespaceTbl[namespace.id] = namespace;

		return(Promise.resolve(this.prepare()).then(() => Promise.map(
			namespace.getUsedImportList(),
			(namespace: Namespace) => {
				if(!visitedNamespaceTbl[namespace.id]) {
					if(namespace.doc) {
						var transform = new this.construct(namespace.doc);

						return(transform.exec(visitedNamespaceTbl, this.state));
					}
				}

				return(null);
			}
		).then(() => this as any as TransformType)));
	}

	construct: { new(...args: any[]): Transform<TransformType, Output, State>; };

	protected doc: Type;
	protected namespace: Namespace;
	protected state: State;
}
