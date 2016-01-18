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

		var importNameTbl = namespace.getImports();
		var importList = Object.keys(importNameTbl);

		console.log(namespace.name);

		return([].concat(
			[
				'var cxml = require("cxml");',
			],
			namespace.exportHeaderCJS(this),
			['cxml.register("' + namespace.name + '", exports, [' + importList.join(', ') + ']);']
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
