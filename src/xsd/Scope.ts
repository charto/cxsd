// This file is part of cxsd, copyright (c) 2015-2016 BusFaster Ltd.
// Released under the MIT license, see LICENSE.

import * as types from './types';
import {Namespace} from './Namespace'
import {QName} from './QName'

export interface TypeMember {
	min: number;
	max: number;
	item: types.Base;
}

export interface NamedTypeMember extends TypeMember {
	name: string;
}

function addMemberToTable(tbl: { [name: string]: TypeMember }, name: string, specNew: TypeMember, min = 1, max = 1) {
	var spec = tbl[name];

	if(spec) {
		spec.min += specNew.min * min;
		spec.max += specNew.max * max;
	} else {
		spec = {
			min: specNew.min * min,
			max: specNew.max * max,
			item: specNew.item
		}

		tbl[name] = spec;
	}
}

/** Scope handles looking up references by type and name, and binding member
  * types and elements to types or namespaces. */

export class Scope {
	constructor(parent: Scope, namespace?: Namespace) {
		if(!namespace && parent) namespace = parent.namespace;

		this.parent = parent;
		this.namespace = namespace;
	}

	add(name: string, type: string, target: types.Base, min: number, max: number) {
		if(name) {
			var visibleTbl = this.visible[type];

			if(!visibleTbl) {
				visibleTbl = {};
				this.visible[type] = visibleTbl;
			}

			visibleTbl[name] = target;
		}

		if(max) {
			var exposeList = this.expose[type];

			if(!exposeList) {
				exposeList = [];
				this.expose[type] = exposeList;
			}

			exposeList.push({
				name: name,
				min: min,
				max: max,
				item: target
			});
		}
	}

	addToParent(name: string, type: string, target: types.Base, min: number, max: number) {
		this.parent.add(name, type, target, min, max);
	}

	addAllToParent(type: string, min = 1, max = 1, target?: Scope) {
		// Check if there's anything to add.
		if(!this.expose[type]) return;
		if(!target) target = this;
		target = target.parent;

		for(var spec of this.expose[type]) {
			// TODO: If target is a choice, it must take the overall min and max.
			target.add(spec.name, type, spec.item, spec.min * min, spec.max * max);
		}
	}

	addComments(commentList: string[]) {
		this.commentList = (this.commentList || []).concat(commentList);
	}

	addCommentsToGrandParent(commentList: string[]) {
		this.parent.parent.addComments(commentList);
	}

	getComments() {
		if(!this.commentList) return(null);

		// Convert line breaks.
		return(this.commentList.join('').replace(/\r\n?|\n/g, '\n'));
	}

	lookup(name: QName, type: string): types.Base {
		var scope: Scope = this;
		var nameFull = name.nameFull;
		var nameWild = '*:' + name.name;

		if(name.namespace && name.namespace != this.namespace) {
			scope = name.namespace.getScope();
		}

		var iter = 100;

		while(scope && --iter) {
			if(scope.visible[type]) {
				var result = scope.visible[type][nameFull] || scope.visible[type][nameWild];

				if(result) return(result);
			}

			scope = scope.parent;
		}

console.log('Missing ' + type + ': ' + name.name);

		return(null);
	}

	// Types

	setType(type: types.TypeBase) {
		// TODO: set to some invalid value if called more than once.
		if(!this.type && this.namespace.getScope() != this) this.type = type;
	}

	setParentType(type: types.TypeBase) {
		this.parent.setType(type);
	}

	getParentType(namespace: Namespace): types.TypeBase {
		for(var parent = this.parent; parent && parent.namespace == namespace; parent = parent.parent) {
			if(parent.type) return(parent.type);
		}

		return(null);
	}

	getType(): types.TypeBase { return(this.type); }

	dumpTypes() {
		return(this.expose['type'] || []);
	}

	dumpMembers(itemType: string, groupType: string) {
		var itemList = this.expose[itemType] || [];
		var groupList = this.expose[groupType] || [];
		var output: { [name: string]: TypeMember } = {};

		for(var spec of itemList) {
			if(spec.name) addMemberToTable(output, spec.name, spec);
		}

		for(var group of groupList) {
			var min = group.min;
			var max = group.max;

			var attributeTbl = group.item.getScope().dumpMembers(itemType, groupType);

			for(var key of Object.keys(attributeTbl)) {
				addMemberToTable(output, key, attributeTbl[key], min, max);
			}
		}

		return(output);
	}

	hasAttributes() {
		var tbl = this.expose['attribute'];

		for(var key in tbl) if(tbl.hasOwnProperty(key)) return(true);

		return(false);
	}

	private parent: Scope;
	namespace: Namespace;

	private visible = {} as {
		[type: string]: { [name: string]: types.Base }
	};

	private expose: {
		[type: string]: NamedTypeMember[];
	} = {};

	private type: types.TypeBase;

	private commentList: string[];

	private static primitiveScope: Scope;
}
