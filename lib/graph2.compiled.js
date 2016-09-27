(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
( function ( $, mw, vg ) {

	'use strict';
	/* global require */

	var wrapper,
		VegaWrapper = require( 'graph-shared' );

	wrapper = new VegaWrapper(
		vg.util, true,
		mw.config.get( 'wgGraphIsTrusted' ),
		mw.config.get( 'wgGraphAllowedDomains' ),
		false,
		function ( warning ) {
			mw.log.warn( warning );
		}, function ( opt ) {
			// Parse URL
			var uri = new mw.Uri( opt.url );
			// reduce confusion, only keep expected values
			if ( uri.port ) {
				uri.host += ':' + uri.port;
				delete uri.port;
			}
			// If url begins with   protocol:///...  mark it as having relative host
			if ( /^[a-z]+:\/\/\//.test( opt.url ) ) {
				uri.isRelativeHost = true;
			}
			if ( uri.protocol ) {
				// All other libs use trailing colon in the protocol field
				uri.protocol += ':';
			}
			// Node's path includes the query, whereas pathname is without the query
			// Standardizing on pathname
			uri.pathname = uri.path;
			delete uri.path;
			return uri;
		}, function ( uri, opt ) {
			// Format URL back into a string
			// Revert path into pathname
			uri.path = uri.pathname;
			delete uri.pathname;

			if ( location.host.toLowerCase() === uri.host.toLowerCase() ) {
				if ( !mw.config.get( 'wgGraphIsTrusted' ) ) {
					// Only send this header when hostname is the same.
					// This is broader than the same-origin policy,
					// but playing on the safer side.
					opt.headers = { 'Treat-as-Untrusted': 1 };
				}
			} else if ( opt.addCorsOrigin ) {
				// All CORS api calls require origin parameter.
				// It would be better to use location.origin,
				// but apparently it's not universal yet.
				uri.query.origin = location.protocol + '//' + location.host;
			}

			if ( uri.protocol[ uri.protocol.length - 1 ] === ':' ) {
				uri.protocol = uri.protocol.substring( 0, uri.protocol.length - 1 );
			}

			return uri.toString();
		} );

	/**
	 * Set up drawing canvas inside the given element and draw graph data
	 *
	 * @param {HTMLElement} element
	 * @param {Object|string} data graph spec
	 * @param {Function} [callback] function(error) called when drawing is done
	 */
	mw.drawVegaGraph = function ( element, data, callback ) {
		vg.parse.spec( data, function ( error, chart ) {
			if ( !error ) {
				chart( { el: element } ).update();
			}
			if ( callback ) {
				callback( error );
			}
		} );
	};

	mw.hook( 'wikipage.content' ).add( function ( $content ) {
		var specs = mw.config.get( 'wgGraphSpecs' );
		if ( !specs ) {
			return;
		}
		$content.find( '.mw-graph.mw-graph-always' ).each( function () {
			var graphId = $( this ).data( 'graph-id' );
			if ( !specs.hasOwnProperty( graphId ) ) {
				mw.log.warn( graphId );
			} else {
				mw.drawVegaGraph( this, specs[ graphId ], function ( error ) {
					if ( error ) {
						mw.log.warn( error );
					}
				} );
			}
		} );
	} );

}( jQuery, mediaWiki, vg ) );

},{"graph-shared":4}],2:[function(require,module,exports){
'use strict';

/**
 * Convert a list of domains into an object with a test method.
 *   equivalent regex: (any-subdomain)\.(wikipedia\.org|wikivoyage\.org|...)
 *
 * @param domains array of string domains
 * @param allowSubdomains if true, allows any sub and sub-sub-* domains
 * @returns {*}
 */
module.exports = function makeValidator(domains, allowSubdomains) {
    if (!domains || domains.length === 0) return {
        // Optimization - always return false
        test: function () {
            return false;
        }
    };
    return new RegExp(
        (allowSubdomains ? '^([^@/:]*\\.)?(' : '^(') +
        domains
            .map(function (s) {
                return s.replace('.', '\\.');
            })
            .join('|') + ')$', 'i');
};

},{}],3:[function(require,module,exports){
'use strict';
/* global module */

module.exports = parseWikidataValue;

/**
 * Given a value object as returned from Wikidata Query Service, returns a simplified value
 * @param {object} value Original object as sent by the Wikidata query service
 * @param {string} value.type SPARQL data type (literal, uri)
 * @param {string} value.datatype XMLSchema data type
 * @param {*} value.value The actual value sent by the Wikidata query service
 * @param {boolean=} ignoreUnknown if false, will return value.value even if it cannot be recognized
 * @return {*}
 */
function parseWikidataValue(value, ignoreUnknown) {
    var temp;

    if (!value || !value.type || value.value === undefined) {
        return undefined;
    }

    switch (value.type) {
        case 'literal':
            switch (value.datatype) {
                case 'http://www.w3.org/2001/XMLSchema#double':
                case 'http://www.w3.org/2001/XMLSchema#float':
                case 'http://www.w3.org/2001/XMLSchema#decimal':
                case 'http://www.w3.org/2001/XMLSchema#integer':
                case 'http://www.w3.org/2001/XMLSchema#long':
                case 'http://www.w3.org/2001/XMLSchema#int':
                case 'http://www.w3.org/2001/XMLSchema#short':
                case 'http://www.w3.org/2001/XMLSchema#nonNegativeInteger':
                case 'http://www.w3.org/2001/XMLSchema#positiveInteger':
                case 'http://www.w3.org/2001/XMLSchema#unsignedLong':
                case 'http://www.w3.org/2001/XMLSchema#unsignedInt':
                case 'http://www.w3.org/2001/XMLSchema#unsignedShort':
                case 'http://www.w3.org/2001/XMLSchema#nonPositiveInteger':
                case 'http://www.w3.org/2001/XMLSchema#negativeInteger':
                    temp = parseFloat(value.value);
                    if (temp.toString() === value.value) {
                        // use number only if it is fully round-tripable back to string
                        // TBD: this might be overcautios, and would cause more problems than solve
                        return temp;
                    }
                    break;
                case 'http://www.opengis.net/ont/geosparql#wktLiteral':
                    // Point(-64.2 -36.62)  -- (longitude latitude)
                    temp = /^Point\(([-0-9.]+) ([-0-9.]+)\)$/.exec(value.value);
                    if (temp) {
                        return [parseFloat(temp[1]), parseFloat(temp[2])];
                    }
                    break;
            }
            break;
        case 'uri':
            // "http://www.wikidata.org/entity/Q12345"  ->  "Q12345"
            temp = /^http:\/\/www\.wikidata\.org\/entity\/(Q[1-9][0-9]*)$/.exec(value.value);
            if (temp) {
                return temp[1];
            }
            break;
    }
    return ignoreUnknown ? undefined : value.value;
}


},{}],4:[function(require,module,exports){
'use strict';
/* global module */

var makeValidator = require('domain-validator'),
    parseWikidataValue = require('wd-type-parser');

module.exports = VegaWrapper;

/**
 * Shared library to wrap around vega code
 * @param {Object} datalib Vega's datalib object
 * @param {Object} datalib.load Vega's data loader
 * @param {Function} datalib.load.loader Vega's data loader function
 * @param {Function} datalib.extend similar to jquery's extend()
 * @param {boolean} useXhr true if we should use XHR, false for node.js http loading
 * @param {boolean} isTrusted true if the graph spec can be trusted
 * @param {Object} domains allowed protocols and a list of their domains
 * @param {Object} domainMap domain remapping
 * @param {Function} logger
 * @param {Function} parseUrl
 * @param {Function} formatUrl
 * @constructor
 */
function VegaWrapper(datalib, useXhr, isTrusted, domains, domainMap, logger, parseUrl, formatUrl) {
    var self = this;
    self.isTrusted = isTrusted;
    self.domains = domains;
    self.domainMap = domainMap;
    self.logger = logger;
    self.objExtender = datalib.extend;
    self.parseUrl = parseUrl;
    self.formatUrl = formatUrl;
    self.validators = {};

    datalib.load.loader = function (opt, callback) {
        var error = callback || function (e) { throw e; }, url;

        try {
            url = self.sanitizeUrl(opt); // enable override
        } catch (err) {
            error(err);
            return;
        }

        // Process data response
        var cb = function (error, data) {
            return self.dataParser(error, data, opt, callback);
        };

        if (useXhr) {
            return datalib.load.xhr(url, opt, cb);
        } else {
            return datalib.load.http(url, opt, cb);
        }
    };

    datalib.load.sanitizeUrl = self.sanitizeUrl.bind(self);

    // Prevent accidental use
    datalib.load.file = alwaysFail;
    if (useXhr) {
        datalib.load.http = alwaysFail;
    } else {
        datalib.load.xhr = alwaysFail;
    }
}

/**
 * Check if host was listed in the allowed domains, normalize it, and get correct protocol
 * @param {string} host
 * @returns {Object}
 */
VegaWrapper.prototype.sanitizeHost = function sanitizeHost(host) {
    // First, map the host
    host = (this.domainMap && this.domainMap[host]) || host;

    if (this.testHost('https:', host)) {
        return {host: host, protocol: 'https:'};
    } else if (this.testHost('http:', host)) {
        return {host: host, protocol: 'http:'};
    }
    return undefined;
};

/**
 * Test host against the list of allowed domains based on the protocol
 * @param {string} protocol
 * @param {string} host
 * @returns {boolean}
 */
VegaWrapper.prototype.testHost = function testHost(protocol, host) {
    if (!this.validators[protocol]) {
        var domains = this._getProtocolDomains(protocol);
        if (domains) {
            this.validators[protocol] = makeValidator(domains, protocol === 'https:' || protocol === 'http:');
        } else {
            return false;
        }
    }
    return this.validators[protocol].test(host);
};

/**
 * Gets allowed domains for a given protocol.  Assumes protocol ends with a ':'.
 * Handles if this.domains's keys do not end in the ':'.
 * @param {string} protocol
 * @return {[]|false}
 * @private
 */
VegaWrapper.prototype._getProtocolDomains = function _getProtocolDomains(protocol) {
    return this.domains[protocol] || this.domains[this.removeColon(protocol)];
};

VegaWrapper.prototype.removeColon = function removeColon(protocol) {
    return protocol && protocol.length && protocol[protocol.length - 1] === ':'
    ? protocol.substring(0, protocol.length - 1) : protocol;
}

/**this
 * Validate and update urlObj to be safe for client-side and server-side usage
 * @param {Object} opt passed by the vega loader, and will add 'graphProtocol' param
 * @returns {boolean} true on success
 */
VegaWrapper.prototype.sanitizeUrl = function sanitizeUrl(opt) {
    // In some cases we may receive a badly formed URL in a form   customprotocol:https://...
    opt.url = opt.url.replace(/^([a-z]+:)https?:\/\//, '$1//');

    var decodedPathname,
        isRelativeProtocol = /^\/\//.test(opt.url),
        urlParts = this.parseUrl(opt),
        sanitizedHost = this.sanitizeHost(urlParts.host);

    if (!sanitizedHost) {
        throw new Error('URL hostname is not whitelisted: ' + opt.url);
    }
    urlParts.host = sanitizedHost.host;
    if (!urlParts.protocol) {
        // node.js mode only - browser's url parser will always set protocol to current one
        // Update protocol-relative URLs
        urlParts.protocol = sanitizedHost.protocol;
        isRelativeProtocol = true;
    }

    // Save original protocol to post-process the data
    opt.graphProtocol = urlParts.protocol;

    if (opt.type === 'open') {

        // Trim the value here because mediawiki will do it anyway, so we might as well save on redirect
        decodedPathname = decodeURIComponent(urlParts.pathname).trim();

        switch (urlParts.protocol) {
            case 'http:':
            case 'https:':
                // The default protocol for the open action is wikititle, so if isRelativeProtocol is set,
                // we treat the whole pathname as title (without the '/' prefix).
                if (!isRelativeProtocol) {
                    // If we get http:// and https:// protocol hardcoded, remove the '/wiki/' prefix instead
                    if (!/^\/wiki\/.+$/.test(decodedPathname)) {
                        throw new Error('wikititle: http(s) links must begin with /wiki/ prefix');
                    }
                    decodedPathname = decodedPathname.substring('/wiki'.length);
                }
                opt.graphProtocol = 'wikititle';
                // fall-through

            case 'wikititle:':
                // wikititle:///My_page   or   wikititle://en.wikipedia.org/My_page
                // open() at this point may only be used to link to a Wiki page, as it may be invoked
                // without a click, thus potentially causing a privacy issue.
                if (Object.keys(urlParts.query).length !== 0) {
                    throw new Error('wikititle: query parameters are not allowed');
                }
                if (!/^\/[^|]+$/.test(decodedPathname)) {
                    throw new Error('wikititle: invalid title');
                }
                urlParts.pathname = '/wiki/' + encodeURIComponent(decodedPathname.substring(1).replace(' ', '_'));
                urlParts.protocol = sanitizedHost.protocol;
                break;

            default:
                throw new Error('"open()" action only allows links with wikititle protocol, e.g. wikititle:///My_page');
        }
    } else {

        switch (urlParts.protocol) {
            case 'http:':
            case 'https:':
                if (!this.isTrusted) {
                    throw new Error('HTTP and HTTPS protocols are not supported for untrusted graphs.\n' +
                        'Use wikiraw:, wikiapi:, wikirest:, wikirawupload:, and other protocols.\n' +
                        'See https://www.mediawiki.org/wiki/Extension:Graph#External_data');
                }
                // keep the original URL
                break;

            case 'wikiapi:':
                // wikiapi:///?action=query&list=allpages
                // Call to api.php - ignores the path parameter, and only uses the query
                urlParts.query = this.objExtender(urlParts.query, {format: 'json', formatversion: '2'});
                urlParts.pathname = '/w/api.php';
                urlParts.protocol = sanitizedHost.protocol;
                opt.addCorsOrigin = true;
                break;

            case 'wikirest:':
                // wikirest:///api/rest_v1/page/...
                // Call to RESTbase api - requires the path to start with "/api/"
                // The /api/... path is safe for GET requests
                if (!/^\/api\//.test(urlParts.pathname)) {
                    throw new Error('wikirest: protocol must begin with the /api/ prefix');
                }
                // keep urlParts.query
                // keep urlParts.pathname
                urlParts.protocol = sanitizedHost.protocol;
                break;

            case 'wikiraw:':
                // wikiraw:///MyPage/data
                // Get raw content of a wiki page, where the path is the title
                // of the page with an additional leading '/' which gets removed.
                // Uses mediawiki api, and extract the content after the request
                // Query value must be a valid MediaWiki title string, but we only ensure
                // there is no pipe symbol, the rest is handlered by the api.
                decodedPathname = decodeURIComponent(urlParts.pathname);
                if (!/^\/[^|]+$/.test(decodedPathname)) {
                    throw new Error('wikiraw: invalid title');
                }
                urlParts.query = {
                    format: 'json',
                    formatversion: '2',
                    action: 'query',
                    prop: 'revisions',
                    rvprop: 'content',
                    titles: decodedPathname.substring(1)
                };
                urlParts.pathname = '/w/api.php';
                urlParts.protocol = sanitizedHost.protocol;
                opt.addCorsOrigin = true;
                break;

            case 'wikifile:':
                // wikifile:///Einstein_1921.jpg
                // Get an image for the graph, e.g. from commons, by using Special:Redirect
                urlParts.pathname = '/wiki/Special:Redirect/file' + urlParts.pathname;
                urlParts.protocol = sanitizedHost.protocol;
                // keep urlParts.query
                break;

            case 'wikirawupload:':
                // wikirawupload://upload.wikimedia.org/wikipedia/commons/3/3e/Einstein_1921.jpg
                // Get an image for the graph, e.g. from commons
                // This tag specifies any content from the uploads.* domain, without query params
                this._validateExternalService(urlParts, sanitizedHost, opt.url);
                urlParts.query = {};
                // keep urlParts.pathname
                break;

            case 'wikidatasparql:':
                // wikidatasparql:///?query=<QUERY>
                // Runs a SPARQL query, converting it to
                // https://query.wikidata.org/bigdata/namespace/wdq/sparql?format=json&query=...
                this._validateExternalService(urlParts, sanitizedHost, opt.url);
                if (!urlParts.query || !urlParts.query.query) {
                    throw new Error('wikidatasparql: missing query parameter in: ' + opt.url);
                }
                // Only keep the "query" parameter
                urlParts.query = {query: urlParts.query.query};
                urlParts.pathname = '/bigdata/namespace/wdq/sparql';
                opt.headers = this.objExtender(opt.headers || {}, {'Accept': 'application/sparql-results+json'});
                break;

            case 'geoshape:':
            case 'geoline:':
                // geoshape:///?ids=Q16,Q30  or  geoshape:///?query=...
                // Get geoshapes data from OSM database by supplying Wikidata IDs
                // https://maps.wikimedia.org/shape?ids=Q16,Q30
                // 'geoline:' is an identical service, except that it returns lines instead of polygons
                this._validateExternalService(urlParts, sanitizedHost, opt.url, 'geoshape:');
                if (!urlParts.query || (!urlParts.query.ids && !urlParts.query.query)) {
                    throw new Error(opt.graphProtocol + ' missing ids or query parameter in: ' + opt.url);
                }
                // the query object is not modified
                urlParts.pathname = '/' + this.removeColon(opt.graphProtocol);
                break;

            case 'mapsnapshot:':
                // mapsnapshot:///?width=__&height=__&zoom=__&lat=__&lon=__ [&style=__]
                // Converts it into a snapshot image request for Kartotherian:
                // https://maps.wikimedia.org/img/{style},{zoom},{lat},{lon},{width}x{height}[@{scale}x].{format}
                // (scale will be set to 2, and format to png)
                // Uses the same configuration as geoshape service, so reuse settings
                this._validateExternalService(urlParts, sanitizedHost, opt.url, 'geoshape:');
                if (!urlParts.query) {
                    throw new Error('mapsnapshot: missing required parameters');
                }
                var query = urlParts.query;
                validate(query, 'width', 1, 4096);
                validate(query, 'height', 1, 4096);
                validate(query, 'zoom', 0, 22);
                validate(query, 'lat', -90, 90, true);
                validate(query, 'lon', -180, 180, true);
                if (query.style && !/^[-_0-9a-z]$/.test(query.style)) {
                    throw new Error('mapsnapshot: if style is given, it must be letters/numbers/dash/underscores only');
                }
                urlParts.pathname = '/img/' + (query.style || 'osm-intl') + ',' + query.zoom + ',' +
                    query.lat + ',' + query.lon + ',' + query.width + 'x' + query.height + '@2x.png';
                urlParts.query = {}; // deleting it would cause errors in mw.Uri()
                break;

            default:
                throw new Error('Unknown protocol ' + opt.url);
        }
    }

    return this.formatUrl(urlParts, opt);
};

function validate(obj, name, min, max, isFloat) {
    if (!obj.hasOwnProperty(name)) {
        throw new Error('mapsnapshot: parameter ' + name + ' is not set');
    }
    var value = obj[name];
    if (!(isFloat ? /^-?[0-9]+\.?[0-9]*$/ : /^-?[0-9]+$/).test(value)) {
        throw new Error('mapsnapshot: parameter ' + name + ' is not a number');
    }
    value = isFloat ? parseFloat(value) : parseInt(value);
    if (value < min || value > max) {
        throw new Error('mapsnapshot: parameter ' + name + ' is not valid');
    }
    return value;
}

VegaWrapper.prototype._validateExternalService = function _validateExternalService(urlParts, sanitizedHost, url, protocolOverride) {
    var protocol = protocolOverride || urlParts.protocol,
        domains = this._getProtocolDomains(protocol);
    if (!domains) {
        throw new Error(protocol + ': protocol is disabled: ' + url);
    }
    if (urlParts.isRelativeHost) {
        urlParts.host = domains[0];
        urlParts.protocol = this.sanitizeHost(urlParts.host).protocol;
    } else {
        urlParts.protocol = sanitizedHost.protocol;
    }
    if (!this.testHost(protocol, urlParts.host)) {
        throw new Error(protocol + ': URL must either be relative (' + protocol + '///...), or use one of the allowed hosts: ' + url);
    }
};

/**
 * Performs post-processing of the data requested by the graph's spec
 */
VegaWrapper.prototype.dataParser = function dataParser(error, data, opt, callback) {
    if (!error) {
        try {
            data = this.parseDataOrThrow(data, opt);
        } catch (e) {
            error = e;
        }
    }
    if (error) data = undefined;
    callback(error, data);
};

/**
 * Performs post-processing of the data requested by the graph's spec, and throw on error
 */
VegaWrapper.prototype.parseDataOrThrow = function parseDataOrThrow(data, opt) {
    switch (opt.graphProtocol) {
        case 'wikiapi:':
        case 'wikiraw:':
            // This was an API call - check for errors
            data = JSON.parse(data);
            if (data.error) {
                throw new Error('API error: ' + JSON.stringify(data.error));
            }
            if (data.warnings) {
                this.logger('API warnings: ' + JSON.stringify(data.warnings));
            }
            if (opt.graphProtocol === 'wikiraw:') {
                try {
                    data = data.query.pages[0].revisions[0].content;
                } catch (e) {
                    throw new Error('Page content not available ' + opt.url);
                }
            }
            break;

        case 'wikidatasparql:':
            data = JSON.parse(data);
            if (!data.results || !Array.isArray(data.results.bindings)) {
                throw new Error('SPARQL query result does not have "results.bindings"');
            }
            data = data.results.bindings.map(function (row) {
                var key, result = {};
                for (key in row) {
                    if (row.hasOwnProperty(key)) {
                        result[key] = parseWikidataValue(row[key]);
                    }
                }
                return result;
            });
            break;
    }

    return data;
};

/**
 * Throw an error when called
 */
function alwaysFail() {
    throw new Error('Disabled');
}

},{"domain-validator":2,"wd-type-parser":3}]},{},[1]);
