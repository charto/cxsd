// This file is part of cxml, copyright (c) 2015-2016 BusFaster Ltd.
// Released under the MIT license, see LICENSE.

import {Cache} from 'cget';
import {Namespace} from './xsd/Namespace';
import {Loader} from './xsd/Loader';
import {exportNamespace} from './xsd/Exporter';
import * as schema from './schema';
import {Sanitize} from './schema/transform/Sanitize';
import {ListImports} from './schema/transform/ListImports';

Cache.patchRequest();

Namespace.register('http://www.w3.org/XML/1998/namespace', 'http://www.w3.org/2001/xml.xsd', 'xml');

var loader = new Loader({
	forceHost: '127.0.0.1',
	forcePort: 12345
});

loader.import(process.argv[2]).then((namespace: Namespace) => {
	try {
		var spec = exportNamespace(namespace);
		new Sanitize(spec).exec().then(() =>
			new ListImports(spec).exec()
		).then(() =>
			new schema.exporter.JS(spec).exec()
		).then(() =>
			new schema.exporter.TS(spec).exec()
		);
	} catch(err) {
		console.log(err);
		console.log(err.stack);
	}
});
