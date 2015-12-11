// This file is part of fast-xml, copyright (c) 2015 BusFaster Ltd.
// Released under the MIT license, see LICENSE.

import * as types from '../XsdTypes';
import {QName} from './QName'

export class Scope {
	constructor(parent: Scope) {
		this.parent = parent;
	}

	add(name: QName, type: string, target: any) {
		var tbl = this.data[type];

		if(!tbl) {
			tbl = {} as {[name: string]: any};
			this.data[type] = tbl;
		}

		tbl[name.nameFull] = target;
	}

	lookup(name: QName, type: string): any {
		var scope: Scope = this;

		while(scope) {
			if(scope.data[type]) {
				var result = scope.data[type][name.nameFull];

				if(result) return(result);
			}

			scope = scope.parent;
		}

		return(null);
	}

	parent: Scope;

	data: {[type: string]: {[name: string]: any}} = {};

	attributeGroupTbl: {[name: string]: types.XsdAttributeGroup};
	groupTbl: {[name: string]: types.XsdGroup};
}
