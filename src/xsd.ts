// This file is part of fast-xml, copyright (c) 2015-2016 BusFaster Ltd.
// Released under the MIT license, see LICENSE.

import {Cache} from 'cget';
import {Namespace} from './xsd/Namespace';
import {Loader} from './xsd/Loader';
import {Exporter} from './xsd/Exporter'

Cache.patchRequest();

Namespace.register('http://www.w3.org/XML/1998/namespace', 'http://www.w3.org/2001/xml.xsd', 'xml');

var loader = new Loader({
	forceHost: '127.0.0.1',
	forcePort: 12345
});

loader.import(process.argv[2]).then((namespace: Namespace) => {
	try {
		console.log(new Exporter(namespace).export());
	} catch(err) {
		console.log(err);
		console.log(err.stack);
	}
});
