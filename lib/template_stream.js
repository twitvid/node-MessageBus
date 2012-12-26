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
 * @param {Object} defaultData		Defaults to pass to the template files
 */
var TemplateStream = function TemplateStream(defaultData) {
	SmartStream.call(this, 'TemplateStream');

	/**
	 * The compiled templates, keyed by name
	 * @type {Object}
	 * @private
	 */
	this._templates = {};

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
 * Compile a bunch of template files
 * @param {Object.<string, string>} templatePaths		Templates, named by key, where the data is a file path
 * @return {TemplateStream} chain.
 */
TemplateStream.prototype.compileFiles = function(templatePaths) {
	var compiled = {};
	_.each(templatePaths, function(template, key) {
		this.compile(key, fs.readFileSync(template, 'utf8'));
	}.bind(this));

	return this;
};

/**
 * Compile a raw template input
 * @param {string} name				Name of the template
 * @param {string} templateText		The mustache template text
 * @return {TemplateStream} chain.
 */
TemplateStream.prototype.compile = function(name, templateText) {
	this._templates[name] = mustache.compile(templateText);
	return this;
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