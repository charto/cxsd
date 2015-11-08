import * as fs from 'fs';
import * as url from 'url';
import * as http from 'http';

import {FetchOptions, Cache, CacheResult, fsa} from './Cache';

var cache = new Cache('demo/xsd', '_index.xsd');

type ArgTbl = {[key: string]: string};
type HeaderTbl = {[key: string]: string};

function parseArgs(query: string) {
	var result: ArgTbl = {};

	if(query) {
		for(var item of query.split('&')) {
			var partList = item.split('=').map(decodeURIComponent);

			if(partList.length == 2) result[partList[0]] = partList[1];
		}
	}

	return(result);
}

function extend(dst: Object, src: Object) {
	for(var key of Object.keys(src)) {
		dst[key] = src[key];
	}

	return(dst);
}

function clone(src: Object) {
	return(extend({}, src));
}

function reportError(res: http.ServerResponse, code: number, header?: Object) {
	var body = new Buffer(code + '\n', 'utf-8');

	header = extend(
		header || {},
		{
			'Content-Type': 'text/plain',
			'Content-Length': body.length
		}
	)

	res.writeHead(code, header);

	res.end(body);
}

var app = http.createServer((req: http.IncomingMessage, res: http.ServerResponse) => {
//	console.log(util.inspect(req, {depth: null, colors: true}));

	var urlParts = url.parse(req.url);
	var args = parseArgs(urlParts.query);
	var host = args['host'];

	if(!host) {
		reportError(res, 400);
		return;
	}

	urlParts.protocol = 'http';
	urlParts.search = null;
	urlParts.query = null;
	urlParts.host = host;

	var cachePath = cache.getCachePath(url.format(urlParts));

	cachePath.then(Cache.checkRemoteLink).then((remoteUrl: string) => {
		if(remoteUrl) {
			reportError(res, 302, {
				'Location': remoteUrl
			});

			return;
		}

		fsa.stat(cachePath.value()).then((stats: fs.Stats) => {
			var header = {
				'Content-Type': 'text/plain;charset=utf-8',
				'Content-Length': stats.size
			};

			res.writeHead(200, header);

			fs.createReadStream(cachePath.value()).pipe(res);
		});
	}).catch((err: NodeJS.ErrnoException) => {
		reportError(res, 404);
	});
});

app.listen(12345);
