// This file is part of cxml, copyright (c) 2015-2016 BusFaster Ltd.
// Released under the MIT license, see LICENSE.

import {TypeBase} from './TypeBase';

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
