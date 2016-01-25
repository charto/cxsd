// This file is part of cxsd, copyright (c) 2015-2016 BusFaster Ltd.
// Released under the MIT license, see LICENSE.

import {Loader} from './Loader';
import {Source} from './Source';
import {Scope} from './Scope';
import {State} from './State';
import {QName} from './QName';
import {Primitive} from './types/Primitive';
import * as schema from '../schema';

/** XML namespace, binding it to syntax definitions. */

export class Namespace {
	constructor() {
		var id = Namespace.list.length;
		Namespace.list[id] = this;

		this.id = id;
		this.scope = new Scope(this instanceof PrimitiveSpace ? null : PrimitiveSpace.getScope(), this);
	}

	/** Initialize names and addresses. Can be called multiple times. */
	init(name: string, url?: string, short?: string) {
		name = Namespace.sanitize(name);

		if(name) {
			if(!this.name) this.name = name;
			Namespace.tbl[name] = this;
		}

		if(url) {
			if(!this.url) this.url = url;
			Namespace.tbl[url] = this;
		}

		if(short) {
			if(!this.short) this.short = short;
			Namespace.tbl[short] = this;
		}

		return(this);
	}

	static sanitize(name: string) {
		return(name && name.replace(/\/+$/, ''));
	}

	/** Globally register a namespace, to attach handlers to it. */
	static register(name: string, url?: string, short?: string) {
		name = Namespace.sanitize(name);

		var namespace = Namespace.tbl[name] || Namespace.tbl[url];

		if(!namespace) {
			namespace = new Namespace();
		}

		return(namespace.init(name, url, short));
	}

	/** Find a globally registered namespace. */
	static lookup(name: string) {
		name = Namespace.sanitize(name);

		return(Namespace.tbl[name]);
	}

	static byId(id: number) {
		return(Namespace.list[id]);
	}

	/** Load and parse the main schema file for this namespace. */
	importSchema(loader: Loader, urlRemote?: string) {
		var source = loader.importFile(this, urlRemote || this.url);

		if(!this.sourceTbl[source.id]) {
			this.sourceTbl[source.id] = source;
			this.sourceList.push(source);
		}

		return(source);
	}

	/** Update final address of schema file if HTTP request was redirected. */
	updateUrl(urlOld: string, urlNew: string) {
		if(!this.url || this.url == urlOld) this.url = urlNew;
	}

	/** Fetch the root scope with published attributes, groups, elements... */
	getScope() { return(this.scope); }

	/** @return List of all source files potentially contributing to this namespace. */
	getSourceList() {
		return(this.sourceList);
	}

	/** Internal list of namespaces indexed by a surrogate key. */
	private static list: Namespace[] = [];

	/** Table of namespaces based on their names and addresses. */
	private static tbl: {[name: string]: Namespace} = {};

	/** Surrogate key, used internally as a unique namespace ID. */
	id: number;

	/** URL address identifying the namespace (not used to download anything). */
	name: string;

	/** URL address where main schema file was downloaded. */
	url: string;

	/** Example short name for this namespace. */
	short: string;

	/** List of all source files potentially contributing to this namespace. */
	private sourceList: Source[] = [];

	/** Source files potentially contributing to this namespace. */
	private sourceTbl: {[id: number]: Source} = {};

	/** Global scope where exported members will be published. */
	private scope: Scope;
}

/** Special singleton namespace that contains primitive types. */

export class PrimitiveSpace extends Namespace {
	/** Construct a table mapping XSD primitive type names to their handler classes. */

	constructor() {
		super();

		var spec = [
			[
				'boolean',
				'boolean'
			], [
				'date dateTime duration time ' +
				'byte decimal double float int integer long negativeInteger nonNegativeInteger nonPositiveInteger positiveInteger short unsignedLong unsignedInt unsignedShort unsignedByte',
				'number'
			], [
				'anyURI ID IDREF IDREFS language NCName NMTOKEN NMTOKENS normalizedString QName string token',
				'string'
			]
		];

		var scope = this.getScope();
		var source = new Source(this, '');
		var state = new State(null, null, source);

		state.setScope(scope);
		schema.Namespace.register(this.id, this.name, this.short).isPrimitiveSpace = true;

		for(var typeSpec of spec) {
			var type = new Primitive(null);
			type.name = typeSpec[1];
			type.init(new State(state, null));

			var outType = type.getOutType();

			outType.literalType = outType;
			outType.safeName = type.name;

			for(var name of typeSpec[0].split(' ')) {
				scope.add(new QName().parsePrimitive(name, this), 'type', type, 1, 1);
			}
		}
	}

	static get() {
		var instance = PrimitiveSpace.instance;

		if(!instance) {
			instance = new PrimitiveSpace();
			PrimitiveSpace.instance = instance;
		}

		return(instance);
	}

	static getScope() {
		return(PrimitiveSpace.get().getScope());
	}

	static instance: PrimitiveSpace;

	name = 'xml-primitives';
	short = 'Primitive';
}
