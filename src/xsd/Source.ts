// This file is part of cxsd, copyright (c) 2015-2016 BusFaster Ltd.
// Released under the MIT license, see LICENSE.

import * as Promise from 'bluebird';
import * as url from 'url';

import {Context} from './Context'
import {Namespace} from './Namespace'
import {Loader} from './Loader'

/** Details of a single XSD source file. */

export class Source {
	constructor(urlRemote: string, context: Context, targetNamespace?: Namespace) {
		var id = Source.list.length;

		this.context = context;
		this.id = id;
		this.url = urlRemote;
		this.urlOriginal = urlRemote;
		if(targetNamespace) {
			this.targetNamespace = targetNamespace;
			this.targetNamespace.addSource(this);
		}

		Source.list[id] = this;
	}

	/** Called by the parser, converts XSD attributes describing the schema into references to internal objects. */

	parse(attrTbl: {[name: string]: string}) {
		// Unqualified tags are assumed to be in the default namespace.
		// For the schema file itself, it should be http://www.w3.org/2001/XMLSchema

		if(attrTbl['xmlns']) {
			this.defaultNamespace = this.context.registerNamespace(attrTbl['xmlns']);
		}

		// Everything defined in the current file belongs to the target namespace by default.

		if(attrTbl['targetnamespace']) {
			if(!this.targetNamespace) {
				this.targetNamespace = this.context.registerNamespace(attrTbl['targetnamespace'], this.urlOriginal);
				this.targetNamespace.addSource(this);
			}
		}

		// Read the current file's preferred shorthand codes for other XML namespaces.

		for(var attr of Object.keys(attrTbl)) {
			if(attr.match(/^xmlns:/i)) {
				var short = attr.substr(attr.indexOf(':') + 1);

				this.namespaceRefTbl[short] = this.context.registerNamespace(attrTbl[attr]).init(null, short);
			}
		}

		// xml prefix may be used without defining xmlns:xml.

		this.namespaceRefTbl['xml'] = this.context.registerNamespace('http://www.w3.org/XML/1998/namespace');
	}

	/** Find a namespace according to its full name or the short name as used in this source file. */

	lookupNamespace(ref: string) {
		return(this.namespaceRefTbl[ref] || this.context.getNamespace(ref));
	}

	/** Resolve a possible relative URL in the context of this source file. */

	urlResolve(urlRemote: string) {
		return(url.resolve(this.targetNamespace.schemaUrl, urlRemote));
	}

	/** Update current remote address, in case the previous address got redirected. */

	updateUrl(urlOld: string, urlNew: string) {
		this.url = urlNew;
		if(this.targetNamespace) this.targetNamespace.updateUrl(urlOld, urlNew);
	}

	getNamespaceRefs() {
		return(this.namespaceRefTbl);
	}

	/** Internal list of source files indexed by a surrogate key. */
	private static list: Source[] = [];

	private context: Context;

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
