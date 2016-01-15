// This file is part of fast-xml, copyright (c) 2015-2016 BusFaster Ltd.
// Released under the MIT license, see LICENSE.

import {Base} from './Base';
import {State} from '../State';
import {QName} from '../QName';
import * as schema from '../../schema';

export class TypeBase extends Base {
	init(state: State) {
		this.qName = this.define(state, 'type');
		this.scope.setParentType(this);
		this.surrogateKey = TypeBase.nextKey++;
	}

	getOutType() {
		var outType = this.outType;

		if(!outType) {
			var qName = this.qName;
			outType = new schema.Type();

			if(qName) {
				var namespace = qName.namespace;
				outType.namespace = schema.Namespace.register(namespace.id, namespace.name);
			}

			outType.name = this.name;

			this.outType = outType;
		}

		return(outType);
	}

	id: string = null;
	name: string = null;

	// Internally used members
	parent: TypeBase | QName;
	qName: QName;
	surrogateKey: number;
	private static nextKey = 0;

	outType: schema.Type;

	// TODO: remove this and detect circular types (anonymous types inside elements referencing the same element) before exporting.
	exported: boolean;
}
