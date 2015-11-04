// This file is part of fast-xml, copyright (c) 2015 BusFaster Ltd.
// Released under the MIT license, see LICENSE.

import * as fs from 'fs';
import * as path from 'path';

import * as url from 'url';
import * as http from 'http';
import * as stream from 'stream';
import * as request from 'request';
import * as Promise from 'bluebird';

Promise.longStackTraces();

var fsa = {
	stat: Promise.promisify(fs.stat),
	open: Promise.promisify(fs.open),
	close: Promise.promisify(fs.close),
	rename: Promise.promisify(fs.rename),
	mkdir: Promise.promisify(fs.mkdir),
	read: Promise.promisify(fs.read),
	readFile: Promise.promisify(fs.readFile) as any as (name: string, options: {encoding: string; flag?: string;}) => Promise<string>,
	writeFile: Promise.promisify(fs.writeFile) as (name: string, content: string, options: {encoding: string; flag?: string;}) => void
};

var againSymbol = {};
var again = () => againSymbol;

function repeat<T>(fn: (again: () => {}) => Promise.Thenable<T>): Promise.Thenable<T> {
	return(Promise.try(() =>
		fn(again)
	).then((result: T) =>
		(result == againSymbol) ? repeat(fn) : result
	));
}

class Task<ResultType> {
	constructor(func?: () => Promise<ResultType>) {
		this.func = func;
	}

	start(onFinish: () => void) {
		return(this.func().finally(onFinish));
	}

	delay() {
		return(new Promise((resolve: (result: ResultType) => void, reject: (err: any) => void) => {
			this.resolve = resolve;
			this.reject = reject;
		}));
	}

	resume(onFinish: () => void) {
		return(this.start(onFinish).then(this.resolve).catch(this.reject));
	}

	func: () => Promise<ResultType>;

	resolve: (result: ResultType) => void;
	reject: (err: any) => void;
}

class TaskQueue {
	add(task: Task<any>) {
		if(this.busyCount < TaskQueue.concurrency) {
			// Start the task immediately.

			++this.busyCount;
			return(task.start(() => this.next()));
		} else {
			// Schedule the task and return a promise that will behave exactly
			// like what task.start() returns.

			this.backlog.push(task);
			return(task.delay());
		}
	}

	next() {
		var task = this.backlog.shift();

		if(task) task.resume(() => this.next());
		else --this.busyCount;
	}

	static concurrency = 2;

	backlog: Task<any>[] = [];
	busyCount = 0;
}

export class CacheResult {
	constructor(streamOut: stream.Readable, urlRemote: string) {
		this.stream = streamOut;
		this.url = urlRemote;
	}

	stream: stream.Readable;
	url: string;
}

class FetchTask extends Task<CacheResult> {
	constructor(cache: Cache, remoteUrl: string) {
		super();

		this.cache = cache;
		this.url = remoteUrl;
	}

	start(onFinish: () => void) {
		var result = this.cache.fetchCached(this.url, onFinish).catch((err: NodeJS.ErrnoException) => {
			// Re-throw unexpected errors.
			if(err.code != 'ENOENT') throw(err);

			return(this.cache.fetchRemote(this.url, onFinish));
		});

		return(result);
	}

	cache: Cache;
	url: string;
}

export class Cache {

	constructor(pathBase: string, indexName: string) {
		this.pathBase = path.resolve(pathBase);
		this.indexName = indexName;
	}

	mkdirp(pathName: string) {
		var partList = path.resolve(pathName).split(path.sep);
		var prefixList = partList.slice(0);
		var pathPrefix: string;

		// Remove path components until an existing directory is found.

		return(repeat((again: () => {}) => {
			if(!prefixList.length) return;

			pathPrefix = prefixList.join(path.sep);

			return(Promise.try(() => fsa.stat(pathPrefix)).then((stats: fs.Stats) => {
				if(stats.isFile()) {
					// Trying to convert a file into a directory.
					// Rename the file to indexName and move it into the new directory.

					var tempPath = pathPrefix + '.' + this.makeTempSuffix(6);

					return(Promise.try(() =>
						fsa.rename(pathPrefix, tempPath)
					).then(() =>
						fsa.mkdir(pathPrefix)
					).then(() =>
						fsa.rename(tempPath, path.join(pathPrefix, this.indexName))
					));
				} else if(!stats.isDirectory()) {
					throw(new Error('Tried to create a directory inside something weird: ' + pathPrefix));
				}
			}).catch((err: NodeJS.ErrnoException) => {
				// Re-throw unexpected errors.
				if(err.code != 'ENOENT' && err.code != 'ENOTDIR') throw(err);

				prefixList.pop();
				return(again());
			}));
		})).then(() => Promise.reduce(
			// Create path components that didn't exist yet.
			partList.slice(prefixList.length),
			(pathPrefix: any, part: string, index: number, len: number) => {
				console.error(['CREATE NEW PATH', pathPrefix, part, partList.length, prefixList.length].join('\t'));
				var pathNew = pathPrefix + path.sep + part;

				return(Promise.try(() =>
					fsa.mkdir(pathNew)
				).catch((err: NodeJS.ErrnoException) => {
					// Because of a race condition with simultaneous cache stores,
					// the directory might already exist.

					if(err.code != 'EEXIST') throw(err);
				}).then(() =>
					pathNew
				));
			},
			pathPrefix
		));
	}

	// Create a string of random letters and numbers.

	makeTempSuffix(length: number) {
		return(
			Math.floor((Math.random() + 1) * Math.pow(36, length))
			.toString(36)
			.substr(1)
		)
	}

	sanitizePath(path: string) {
		return(path
			// Remove unwanted characters.
			.replace(/[^-_./0-9A-Za-z]/g, '_')

			// Remove - _ . / from beginnings of path parts.
			.replace(/(^|\/)[-_./]+/g, '$1')

			// Remove - _ . / from endings of path parts.
			.replace(/[-_./]+($|\/)/g, '$1')
		);
	}

	// Store HTTP redirects as files containing the new URL.

	addLinks(redirectList: string[], target: string) {
		return(Promise.map(redirectList, (src: string) => {
			this.makeCachePath(src).then((cachePath: string) =>
				fsa.writeFile(cachePath, 'LINK: ' + target + '\n', {encoding: 'utf-8'})
			)
		}));
	}

	isDir(cachePath: string) {
		return(fsa.stat(cachePath).then(
			(stats: fs.Stats) => stats.isDirectory()
		).catch(
			(err: NodeJS.ErrnoException) => false
		));
	}

	// Get local cache file path where a remote URL should be downloaded.
	// Also create the directory containing it.

	makeCachePath(urlRemote: string) {
		var cachePath = path.join(
			this.pathBase,
			this.sanitizePath(urlRemote.substr(urlRemote.indexOf(':') + 1))
		);

		var makeValidPath = (isDir: boolean) => {
			if(isDir) cachePath = path.join(cachePath, this.indexName);

			return(this.mkdirp(path.dirname(cachePath)).then(() => cachePath));
		};

		if(urlRemote.charAt(urlRemote.length - 1) == '/') {
			return(makeValidPath(true));
		}

		return(this.isDir(urlRemote).then(makeValidPath));
	}

	sanitizeUrl(urlRemote: string) {
		var urlParts = url.parse(urlRemote, false, true);
		var origin = urlParts.hostname || '';

		if(urlParts.pathname.charAt(0) != '/') origin += '/';

		origin += urlParts.pathname;
		return((urlParts.protocol || 'http:') + '//' + url.resolve('', origin));
	}

	// Fetch URL from cache or download it if not available yet.
	// Returns the file's URL after redirections and a readable stream of its contents.

	fetch(urlRemote: string) {
		urlRemote = this.sanitizeUrl(urlRemote);

		return(this.fetchQueue.add(new FetchTask(this, urlRemote)));
	}

	fetchCached(urlRemote: string, onFinish: () => void) {
		console.log('BEGIN CACHED ' + urlRemote);

		var cachePath = this.makeCachePath(urlRemote);
		var targetPath = Promise.all([
			cachePath,
			cachePath.then((cachePath: string) => fsa.open(cachePath, 'r'))
		]).spread((cachePath: string, fd: number) => {
			// Check if there's a cached link redirecting the URL.

			var buf = new Buffer(6);

			return(fsa.read(fd, buf, 0, 6, 0).then(() => {
				fsa.close(fd);

				if(buf.equals(new Buffer('LINK: ', 'ascii'))) {
					return(fsa.readFile(cachePath, {encoding: 'utf-8'}).then((link: string) => {
						urlRemote = link.substr(6).replace(/\s+$/, '');

						return(this.makeCachePath(urlRemote));
					}));
				} else return(cachePath);
			}));
		});

		return(targetPath.then((targetPath: string) => {
			var streamIn = fs.createReadStream(targetPath, {encoding: 'utf-8'});

			streamIn.on('end', () => {
				console.log('FINISH CACHED ' + urlRemote);
				onFinish();
			});

			return(new CacheResult(
				streamIn,
				urlRemote
			));
		}));
	}

	fetchRemote(urlRemote: string, onFinish: () => void) {
		console.log('BEGIN REMOTE ' + urlRemote);

		var redirectList: string[] = [];
		var found = false;
		var resolve: (result: any) => void;
		var reject: (err: any) => void;
		var promise = new Promise<CacheResult>((res, rej) => {
			resolve = res;
			reject = rej;
		})

		var streamRequest = request({
			url: urlRemote,
			followRedirect: (res: http.IncomingMessage) => {
				redirectList.push(urlRemote);
				urlRemote = url.resolve(urlRemote, res.headers.location);

				this.fetchCached(urlRemote, onFinish).then((result: CacheResult) => {
					if(found) return;
					found = true;

					this.addLinks(redirectList, urlRemote).then(() => {
						resolve(result);
					});
				}).catch((err: NodeJS.ErrnoException) => {
					if(err.code != 'ENOENT' && err.code != 'ENOTDIR') {
						// Weird!
						reject(err);
					}
				});

				return(true);
			}
		});

		streamRequest.on('response', (res: http.IncomingMessage) => {
			if(found) return;
			found = true;

//			var streamBuffer = new stream.PassThrough();
			streamRequest.pause();

			this.makeCachePath(urlRemote).then((cachePath: string) => {
				var streamOut = fs.createWriteStream(cachePath);

				streamOut.on('finish', () => {
					// Output stream file handle stays open after piping unless manually closed.

					streamOut.close();
				});

				streamRequest.pipe(streamOut);
				streamRequest.resume();

				return(this.addLinks(redirectList, urlRemote));
			}).then(() => {
				resolve(new CacheResult(
					streamRequest as any as stream.Readable,
					urlRemote
				));
			});
		});

		streamRequest.on('end', () => {
			console.log('FINISH REMOTE ' + urlRemote);
			onFinish();
		});

		return(promise);
	}

	fetchQueue = new TaskQueue();

	pathBase: string;
	indexName: string;

}

/*
// TODO tests:

console.log(Cache.sanitizePath('..'));
// ''
console.log(Cache.sanitizePath('../bar'));
// 'bar'
console.log(Cache.sanitizePath('foo/../1.2.3/bar'));
// 'foo/1.2.3/bar'
console.log(Cache.sanitizePath('/foo/.bar.1.2.3.'));
// 'foo/bar.1.2.3'
console.log(Cache.sanitizePath('//foo/-..-/.bar/'));
// 'foo/bar'
*/
