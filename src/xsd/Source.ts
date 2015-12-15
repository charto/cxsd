// This file is part of fast-xml, copyright (c) 2015 BusFaster Ltd.
// Released under the MIT license, see LICENSE.

import * as url from 'url';

import {Namespace} from './Namespace'
import {Loader} from './Loader'

/** Details of a single XSD source file. */

export class Source {
	constructor(targetNamespace: Namespace, urlRemote: string) {
		this.targetNamespace = targetNamespace;
		this.url = urlRemote;
		this.urlOriginal = urlRemote;
	}

	parse(attrTbl: {[name: string]: string}) {
		// Unqualified tags are assumed to be in the default namespace.
		// For the schema file itself, it should be http://www.w3.org/2001/XMLSchema

		if(attrTbl['xmlns']) {
			this.defaultNamespace = Namespace.register(attrTbl['xmlns']);
		}

		// Everything defined in the current file belongs to the target namespace by default.

		if(attrTbl['targetnamespace']) {
			this.targetNamespace.init(attrTbl['targetnamespace']);
		}

		// Read the current file's preferred shorthand codes for other XML namespaces.

		for(var attr of Object.keys(attrTbl)) {
			if(attr.match(/^xmlns:/i)) {
				var short = attr.substr(attr.indexOf(':') + 1);

				this.namespaceRefTbl[short] = Namespace.register(attrTbl[attr]);
			}
		}
	}

	lookupNamespace(ref: string) {
		return(this.namespaceRefTbl[ref] || Namespace.lookup(ref));
	}

	urlResolve(urlRemote: string) {
		return(url.resolve(this.targetNamespace.url, urlRemote));
	}

	updateUrl(urlRemote: string) { this.url = urlRemote; }

	url: string;
	urlOriginal: string;

	/** New definitions are exported into the target namespace. */
	targetNamespace: Namespace;

	/** Unqualified names are assumed to belong to the default namespace. */
	defaultNamespace: Namespace;

	private loader: Loader;

	/** Table of namespace shorthand references (xmlns:...) used in this file. */
	private namespaceRefTbl: {[name: string]: Namespace} = {};

	parsed: Promise<any>;
}
