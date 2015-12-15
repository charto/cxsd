// This file is part of fast-xml, copyright (c) 2015 BusFaster Ltd.
// Released under the MIT license, see LICENSE.

import * as expat from 'node-expat';
import * as Promise from 'bluebird';

import {FetchOptions, Cache, CacheResult} from 'cget';
import * as types from './XsdTypes';
import {State, Rule} from './XsdState';
import {Namespace} from './xsd/Namespace';
import {Loader} from './xsd/Loader';
import {Source} from './xsd/Source';
import {QName} from './xsd/QName'

import * as util from 'util';

function parseRule(ctor: types.XsdBaseClass) {
	if(ctor.rule) return(ctor.rule as Rule);

	var rule = new Rule(new QName().parseClass(ctor.name), ctor);

	ctor.rule = rule;

	for(var follower of ctor.mayContain()) {
		var followerName = new QName().parseClass(follower.name);

		rule.followerTbl[followerName.nameFull] = parseRule(follower);
		rule.followerTbl[followerName.name] = parseRule(follower);
	}

	var obj = new ctor();

	for(var key of Object.keys(obj)) {
		rule.attributeList.push(key);
	}

	return(rule);
}

export class XsdParser {
	constructor() {
		this.rootRule = parseRule(types.XsdRoot);
	}

	startElement(state: State, name: string, attrTbl: {[name: string]: string}) {
		var qName = this.qName;

		qName.parse(name, state.source, state.source.defaultNamespace);

		var rule = state.rule;

		if(rule) {
			rule = (
				rule.followerTbl[qName.nameFull] ||
				rule.followerTbl[qName.name] ||
				rule.followerTbl['*']
			);
		}

		state = new State(state, rule);

		if(!rule || !rule.proto) return(state);

		var xsdElem = new rule.proto(state);

		state.xsdElement = xsdElem;

		// Make all attributes lowercase.

		for(var key of Object.keys(attrTbl)) {
			var keyLower = key.toLowerCase();

			if(key != keyLower && !attrTbl.hasOwnProperty(keyLower)) {
				attrTbl[keyLower] = attrTbl[key];
			}
		}

		// Copy known attributes to XSD element.

		for(var key of rule.attributeList) {
			if(attrTbl.hasOwnProperty(key)) {
				xsdElem[key] = attrTbl[key];
			}
		}

		if(xsdElem.init) {
			state.attributeTbl = attrTbl;

			xsdElem.init(state);
		}

		return(state);
	}

	parse(cached: CacheResult, source: Source, loader: Loader) {
		var state = new State(null, this.rootRule, source);

		state.stateStatic = {
			addImport: (namespaceTarget: Namespace, urlRemote: string) => {
				this.importList.push({namespace: namespaceTarget, url: urlRemote});
			},

			getLineNumber: () => {
				return(this.expat.getCurrentLineNumber());
			},

			// TODO: remove this property.
			options: loader.getOptions()
		};

		var stateStatic = state.stateStatic;

		var resolve: (result: any) => void;
		var reject: (err: any) => void;
		var promise = new Promise<CacheResult>((res, rej) => {
			resolve = res;
			reject = rej;
		})

		var stream = cached.stream;
		this.expat = new expat.Parser('utf-8');

		var pendingList: State[] = [];

		this.expat.on('startElement', (name: string, attrTbl: {[name: string]: string}) => {
			try {
				state = this.startElement(state, name, attrTbl);
			} catch(err) {
				// Exceptions escaping from node-expat's event handlers cause weird effects.
				console.error(err);
				console.error(err.stack);
			}
		});

		this.expat.on('endElement', function(name: string) {
			if(state.xsdElement && state.xsdElement.finish) {
				// Schedule finish hook to run after parsing is done.
				// It might depend on definitions in scope but appearing later,
				// and selectively postponing only hooks that cannot run yet
				// would be extremely complicated.

				pendingList.push(state);
			}

			state = state.parent;
		});

		this.expat.on('text', function(text: string) {
//			text = text.replace(/\s+$/, '');
//			if(text) console.log(text);
		});

		this.expat.on('error', function(err: any) {
			console.error(err);
		});

		stream.on('data', (data: string) => {
			this.expat.parse(data, false);
		});

		stream.on('end', () => {
			// Finish parsing the file (synchronous call).

			this.expat.parse('', true);

			// Run all finish hooks.

			Promise.map(this.importList, (spec: {namespace: Namespace, url: string}) => {
				console.log('IMPORT into ' + spec.namespace.name + ' from ' + spec.url);
				return(spec.namespace.importSchema(loader, spec.url));
			}).then((imported: any) => resolve({
				parsed: Promise.resolve(() => {
					pendingList.forEach((state: State) => state.xsdElement.finish(state));
				})
			})).catch((err: any) => {
				console.error(err);
				console.error(err.stack);
				reject(err);
			});


			this.importList = [];
		});

		return(promise);
	}

	private qName = new QName();
	private importList: {namespace: Namespace, url: string}[] = [];
	private rootRule: Rule;
	private expat: expat.Parser;
}
