var SmartStream = require('smart-stream').SmartStream;
var fs = require('fs');
var mustache = require('mustache');
var util = require('util');

/**
 * Produce email templates from data in a text file or some other Stream.
 *
 * @extends {SmartStream}
 * @constructor
 *
 * @param {Object.<string, string>} templatePaths		Path to mustache templates. Ex: {plain:'foo_plain.ms', html: 'foo_html.ms'}
 * @param {Object} defaultData		Defaults to pass to the template files
 */
var TemplateStream = function TemplateStream(templatePaths, defaultData) {
	SmartStream.call(this, 'TemplateStream');

	/**
	 * The compiled templates (keys: html, plain)
	 * @type {Object}
	 * @private
	 */
	this._templates = this._compile(templatePaths);

	/**
	 * Default data
	 * @type {Object}
	 * @private
	 */
	this._defaultData = defaultData;
};
util.inherits(TemplateStream, SmartStream);

/**
 * Compile templates into javascript
 * @param {Object.<string, string>} templatePaths		Path to mustache templates. Ex: {plain:'foo_plain.ms', html: 'foo_html.ms'}
 * @return {Object}
 * @private
 */
TemplateStream.prototype._compile = function(templatePaths) {
	// allow to be called only once
	this.compile = function() {};

	var compiled = {};
	if (templatePaths['plain']) {
		var htmlTemplate = fs.readFileSync(templatePaths['plain'], 'utf8');
		compiled['plain'] = mustache.compile(htmlTemplate)
	}

	if (templatePaths['html']) {
		var plainTemplate = fs.readFileSync(templatePaths['html'], 'utf8');
		compiled['html'] = mustache.compile(plainTemplate)
	}

	return compiled;
};

module.exports = TemplateStream;