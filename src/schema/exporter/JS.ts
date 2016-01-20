// This file is part of cxml, copyright (c) 2016 BusFaster Ltd.
// Released under the MIT license, see LICENSE.

import * as Promise from 'bluebird';

import {Cache} from 'cget'
import {Exporter} from './Exporter';
import {Namespace} from '../Namespace';

export class JS extends Exporter {
	writeImport(shortName: string, relativePath: string) {
		return(
			'var ' +
			shortName +
			' = require(' +
			"'" + relativePath + "'" +
			');'
		);
	}

	/** Output namespace contents to the given cache key. */

	writeContents(): string {
		var doc = this.doc;
		var namespace = doc.namespace;

		var importTbl = namespace.getUsedImportTbl();
		var importNameList = Object.keys(importTbl);

		return([].concat(
			[
				'var cxml = require("cxml");',
			],
			this.writeHeader(),
			[
				'cxml.register(' +
				"'" + namespace.name+ "', " +
				'exports, ' +
				'[\n\t' + importNameList.map((name: string) => {
					var otherNamespaceId = importTbl[name].id;
					var importTypeNameTbl = namespace.importTypeNameTbl[otherNamespaceId];
					var typeList: string[];

					if(importTypeNameTbl) typeList = Object.keys(importTypeNameTbl).sort();
					else typeList = []; // NOTE: This should never happen!

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
