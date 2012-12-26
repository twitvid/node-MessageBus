var SmartStream = require('smart-stream').SmartStream;
var fs = require('fs');
var mustache = require('mustache');
var util = require('util');
var _ = require('underscore');

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
	 * Template names, as keys
	 * @type {Array}
	 * @private
	 */
	this._templateKeys = _.keys(templatePaths);

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

	this.setMiddleware(this._middleWare.bind(this))
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
	_.each(templatePaths, function(template, key) {
		var templateText = fs.readFileSync(template, 'utf8');
		compiled[key] = mustache.compile(templateText)
	});

	return compiled;
};


/**
 * TemplateStream middleware
 * @param {Object} data
 * @param {Function} cb
 */
TemplateStream.prototype._middleWare = function(data, cb) {
	var templateData = _.defaults(
		data,
		this._defaultData
	);

	var renderedOutput = {
		templateData: templateData
	};

	_.each(this._templates, function(templateFn, key) {
		renderedOutput[key] = templateFn(templateData)
	});

	cb(null, renderedOutput);
};

module.exports = TemplateStream;