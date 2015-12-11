// This file is part of fast-xml, copyright (c) 2015 BusFaster Ltd.
// Released under the MIT license, see LICENSE.

import * as expat from 'node-expat';
import * as Promise from 'bluebird';

import {FetchOptions, Cache, CacheResult} from 'cget';
import * as types from './XsdTypes';
import {State, Rule} from './XsdState';
import {Namespace} from './xsd/Namespace';
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

	parse(namespace: Namespace, options: FetchOptions) {
		var urlRemote = options.url;
		var state = new State(null, this.rootRule);

		state.stateStatic = {
			root: null,

			source: new Source(namespace),

			addImport: (namespaceTarget: Namespace, urlRemote: string) => {
				this.importList.push({namespace: namespaceTarget, url: urlRemote});
			},

			options: options
		};

		var stateStatic = state.stateStatic;
		var tempName = new QName();

		if(!urlRemote) urlRemote = namespace.url;

return(Namespace.cache.fetch(options).then((result: CacheResult) => {
		var resolve: (result: any) => void;
		var reject: (err: any) => void;
		var promise = new Promise<CacheResult>((res, rej) => {
			resolve = res;
			reject = rej;
		})

		var stream = result.stream;
		var xml = new expat.Parser('utf-8');

		var pendingList: State[] = [];

		if(!namespace.url || namespace.url == urlRemote) namespace.url = result.url;

		xml.on('startElement', (name: string, attrTbl: {[name: string]: string}) => {
try {
			tempName.parse(name, stateStatic.source, stateStatic.source.defaultNamespace);

			var rule = state.rule;

			if(rule) {
				rule = (
					rule.followerTbl[tempName.nameFull] ||
					rule.followerTbl[tempName.name] ||
					rule.followerTbl['*']
				);
			}

			state = new State(state, rule);

			if(rule && rule.proto) {
				var xsdElem = new rule.proto();

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
			}

//			if(namespace == 'xsd') console.log((rule ? ' ' : '!') + new Array(stateStatic.depth + 1).join(' ') + '<' + nameFull + Object.keys(attrTbl).map((key: string) => ' ' + key + '="' + attrTbl[key] + '"').join('') + '>');
} catch(err) {
	// Exceptions escaping from node-expat's event handlers cause weird effects.
	console.error(err);
}
		});

		xml.on('endElement', function(name: string) {
try {
//			console.log('</' + name + '>');

			if(state.xsdElement && state.xsdElement.finish) {
				// Schedule finish hook to run after parsing is done.
				// It might depend on definitions in scope but appearing later,
				// and selectively postponing only hooks that cannot run yet
				// would be extremely complicated.

				pendingList.push(state);
			}

			state = state.parent;
} catch(err) {
	// Exceptions escaping from node-expat's event handlers cause weird effects.
	console.error(err);
}
		});

		xml.on('text', function(text: string) {
//			text = text.replace(/\s+$/, '');
//			if(text) console.log(text);
		});

		xml.on('error', function(err: any) {
			console.error(err);
		});

		stream.on('data', (data: string) => {
			xml.parse(data, false);
		});

		stream.on('end', () => {
			// Finish parsing the file (synchronous call).

			xml.parse('', true);

			// Run all finish hooks.

			Promise.map(this.importList, (spec: {namespace: Namespace, url: string}) => {
				console.log('IMPORT into ' + spec.namespace.name + ' from ' + spec.url);
				return(spec.namespace.importSchema({
					url: spec.url,
					forceHost: stateStatic.options.forceHost,
					forcePort: stateStatic.options.forcePort
				}));
			}).then(() => {
				pendingList.forEach((state: State) => state.xsdElement.finish(state));
			}).then(resolve);

// TODO: debug with these!
//			console.log(stateStatic.namespaceMap);
//			console.log(util.inspect(stateStatic.root, {depth: 4, colors: true}));
		});

		return(promise);
}));
	}

	importList: {namespace: Namespace, url: string}[] = [];
	rootRule: Rule;
}
