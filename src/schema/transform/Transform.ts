// This file is part of cxsd, copyright (c) 2016 BusFaster Ltd.
// Released under the MIT license, see LICENSE.

import * as Promise from 'bluebird';

import {Namespace, TypeState} from '../Namespace';
import {Type} from '../Type';
import {Member} from '../Member';

/** TransformType is a class derived from Transform, used like CRTP in C++. */

export abstract class Transform<TransformType extends Transform<TransformType, Output, State>, Output, State> {
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

	prepare(): Output | Promise<Output> { return(this.output); }

	exec(
		visitedNamespaceTbl?: { [key: string]: Namespace },
		state?: any
	): Promise<Output[]> {
		var doc = this.doc;
		var namespace = doc.namespace;

		if(state) this.state = state;

		if(!visitedNamespaceTbl) visitedNamespaceTbl = {};
		visitedNamespaceTbl[namespace.id] = namespace;

		return(Promise.resolve(this.prepare()).then((output: Output) => Promise.map(
			namespace.getUsedImportList(),
			(namespace: Namespace) => {
				if(!visitedNamespaceTbl[namespace.id]) {
					if(namespace.doc) {
						var transform = new this.construct(namespace.doc);

						return(transform.exec(visitedNamespaceTbl, this.state));
					}
				}

				return([]);
			}
		).then((outputList: Output[][]) => Array.prototype.concat.apply([output], outputList))));
	}

	construct: { new(...args: any[]): Transform<TransformType, Output, State>; };
	output: Output;

	protected doc: Type;
	protected namespace: Namespace;
	protected state: State;
}
