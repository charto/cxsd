// This file is part of fast-xml, copyright (c) 2015 BusFaster Ltd.
// Released under the MIT license, see LICENSE.

import {Loader} from './Loader';
import {Scope} from './Scope';

export class Namespace {
	constructor(id: number) {
		this.id = id;
	}

	init(name: string, url?: string, short?: string) {
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

	static register(name: string, url?: string, short?: string) {
		var namespace = Namespace.tbl[name] || Namespace.tbl[url];

		if(!namespace) {
			var id = Namespace.list.length;

			namespace = new Namespace(id);
			Namespace.list[id] = namespace;
		}

		return(namespace.init(name, url, short));
	}

	static lookup(name: string) {
		return(Namespace.tbl[name]);
	}

	importSchema(loader: Loader, urlRemote?: string) {
		return(loader.importFile(this, urlRemote || this.url));
	}

	updateUrl(urlOld: string, urlNew: string) {
		if(!this.url || this.url == urlOld) this.url = urlNew;
	}

	exportTS() {
		console.log('declare module "' + this.name + '" {');

		var typeTbl = this.scope.dumpTypes();

		for(var key of Object.keys(typeTbl)) {
			var type = typeTbl[key];
			console.log('\texport interface ' + type.name + ' {');
			console.log('\t}');
		}

		console.log('}');
	}

	getScope() { return(this.scope); }

	private static list: Namespace[] = [];
	private static tbl: {[name: string]: Namespace} = {};

	id: number;
	name: string;
	url: string;
	private short: string;
	private scope: Scope = new Scope(null, this);
}
