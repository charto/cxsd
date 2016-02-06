// This file is part of cxsd, copyright (c) 2015-2016 BusFaster Ltd.
// Released under the MIT license, see LICENSE.

import * as Promise from 'bluebird';
import * as url from 'url';

import {Namespace} from './Namespace'
import {Loader} from './Loader'

/** Details of a single XSD source file. */

export class Source {
	constructor(targetNamespace: Namespace, urlRemote: string) {
		var id = Source.list.length;

		this.id = id;
		this.targetNamespace = targetNamespace;
		this.url = urlRemote;
		this.urlOriginal = urlRemote;

		Source.list[id] = this;
	}

	/** Called by the parser, converts XSD attributes describing the schema into references to internal objects. */

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

				this.namespaceRefTbl[short] = Namespace.register(attrTbl[attr], null, short);
			}
		}
	}

	/** Find a namespace according to its full name or the short name as used in this source file. */

	lookupNamespace(ref: string) {
		return(this.namespaceRefTbl[ref] || Namespace.lookup(ref));
	}

	/** Resolve a possible relative URL in the context of this source file. */

	urlResolve(urlRemote: string) {
		return(url.resolve(this.targetNamespace.url, urlRemote));
	}

	/** Update current remote address, in case the previous address got redirected. */

	updateUrl(urlRemote: string) { this.url = urlRemote; }

	getNamespaceRefs() {
		return(this.namespaceRefTbl);
	}

	/** Internal list of source files indexed by a surrogate key. */
	private static list: Source[] = [];

	/** Surrogate key, used internally as a unique source file ID. */
	id: number;

	/** Remote address of the file, after possible redirections. */
	url: string;

	/** Original remote address of the file, before any redirections. */
	urlOriginal: string;

	/** New definitions are exported into the target namespace. */
	targetNamespace: Namespace;

	/** Unqualified names are assumed to belong to the default namespace. */
	defaultNamespace: Namespace;

	/** Loader used for retrieving this file. */
	private loader: Loader;

	/** Table of namespace shorthand references (xmlns:...) used in this file. */
	private namespaceRefTbl: {[name: string]: Namespace} = {};

	/** Promise, resolves when the file and its dependencies have been completely parsed. */
	parsed: Promise<any>;
}
