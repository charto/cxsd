// This file is part of cxsd, copyright (c) 2015-2016 BusFaster Ltd.
// Released under the MIT license, see LICENSE.

import {Cache} from 'cget';
import {Namespace, PrimitiveSpace} from './xsd/Namespace';
import {Loader} from './xsd/Loader';
import {exportNamespace} from './xsd/Exporter';
import * as schema from './schema';
import {AddImports} from './schema/transform/AddImports';
import {Sanitize} from './schema/transform/Sanitize';
import {ListImports} from './schema/transform/ListImports';

Cache.patchRequest();

var xmlSpace = Namespace.register('http://www.w3.org/XML/1998/namespace', 'http://www.w3.org/2001/xml.xsd', 'xml');

var loader = new Loader({});

loader.import(process.argv[2]).then((namespace: Namespace) => {
	try {
		exportNamespace(PrimitiveSpace.get());
		exportNamespace(xmlSpace);

		var spec = exportNamespace(namespace);

		new AddImports(spec).exec().then(() =>
			new Sanitize(spec).exec()
		).then((sanitize: Sanitize) =>
			sanitize.finish()
		).then(() =>
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
