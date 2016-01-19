// This file is part of cxml, copyright (c) 2016 BusFaster Ltd.
// Released under the MIT license, see LICENSE.

import * as Promise from 'bluebird';

import {Cache} from 'cget'
import {Exporter} from './Exporter';
import {Namespace} from '../Namespace';

export class JS extends Exporter {
	/** Output namespace contents to the given cache key. */

	handleExport(): string {
		var doc = this.doc;
		var namespace = doc.namespace;

		var importNameTbl = namespace.getUsedImports();
		var importList = Object.keys(importNameTbl);

		return([].concat(
			[
				'var cxml = require("cxml");',
			],
			namespace.exportHeaderCJS(this),
			[
				'cxml.register(' +
				"'" + namespace.name+ "', " +
				'exports, ' +
				'[\n\t' + importList.map((name: string) => {
					var typeList = Object.keys(namespace.importTypeNameTbl[importNameTbl[name]]).sort();
					return(
						'[' + name + ', [' +
						typeList.map((name: string) => "'" + name + "'").join(', ') +
						']]'
					);
				}).join(',\n\t') + '\n], [\n' +
				']' +
				');'
			]
		).join('\n'));
	}

	getCache() {
		return(JS.cache);
	}

	getOutName(name: string) {
		return(name + '.js');
	}

	construct = JS;

	/** Cache where all output is written. */
	private static cache = new Cache('cache/js', '_index.js');
}
