// This file is part of fast-xml, copyright (c) 2015-2016 BusFaster Ltd.
// Released under the MIT license, see LICENSE.

import {Base} from './Base';
import {State} from '../State';
import {QName} from '../QName';
import {Namespace} from '../Namespace';
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
	exported2: boolean;
}

/** Primitive types map directly to JavaScript equivalents. */

export class Primitive extends TypeBase {
	constructor(name: string) {
		super(null);

		this.name = name;
	}

	/** Construct a table mapping XSD primitive type names to their handler classes
	  * or return it from memory. */

	static getTypes() {
		var tbl = this.typeTbl;

		if(!tbl) {
			tbl = {};

			var spec = [
				['boolean', 'boolean'],
				['date dateTime duration time', 'number'],
				['anyURI ID IDREF IDREFS language NCName NMTOKEN NMTOKENS normalizedString QName string token', 'string'],
				['byte decimal double float int integer long negativeInteger nonNegativeInteger nonPositiveInteger positiveInteger short unsignedLong unsignedInt unsignedShort unsignedByte', 'number']
			];

			for(var typeSpec of spec) {
				var prim = new Primitive(typeSpec[1]);

				for(var name of typeSpec[0].split(' ')) {
					tbl[name.toLowerCase()] = prim;
				}
			}

			this.typeTbl = tbl;
		}

		return(tbl);
	}

	/** Table mapping XSD primitive type names to their handler classes. */
	static typeTbl: {[name: string]: Primitive};
}
