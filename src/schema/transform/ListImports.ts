// This file is part of cxml, copyright (c) 2016 BusFaster Ltd.
// Released under the MIT license, see LICENSE.

import {Type} from '../Type';
import {Member} from '../Member';
import {Transform} from './Transform';

function sanitizeName(name: string) {
	return(name.replace(/[^_0-9A-Za-z]/g, '').replace(/^[^A-Za-z]+/, ''));
}

export type Output = { [namespaceId: string]: { [name: string]: boolean } };

export class ListImports extends Transform<Output> {
	visitTypeRef(type: Type, output: Output) {
		if(type.namespace && type.namespace != this.namespace) {
			// Type from another, imported namespace.

			var id = type.namespace.id;
			var short = this.namespace.getShortRef(id);

			if(short) {
				if(!output[id]) output[id] = {};
				output[id][type.safeName] = true;
			} else {
				console.error('MISSING IMPORT ' + type.namespace.name + ' for type ' + type.safeName);
			}
		}
	}

	exec() {
		var output: Output = {};

		super.exec(output);

		this.namespace.importTypeNameTbl = output;
	}

	construct = ListImports;
}
