var util = require("util"),
	_ = require("underscore"),
	request = require("request"),
	XDate = require("xdate");

/**
 * A MessageBus client for their version 4 API
 * https://www.messagebus.com/documentation-content
 *
 * @constructor
 */
var MsgBusClient = function (apiKey, caCertFile) {
	/**
	 * apiKey for all REST requests
	 * @property {String}
	 * @private
	 */
	this._apiKey = apiKey;

	/**
	 * Full path to cacert.pem file
	 * @property {String}
	 * @private
	 */
	this._caCertFile = caCertFile;

	/**
	 * The uri base for message bus API
	 * @property {String}
	 * @private
	 */
	this._uri = "https://api-v4.messagebus.com/api";

	/**
	 * @property {Function}
	 * @private
	 */
	this._log = function() {};
};

/**
 * REST HTTP Status Errors
 * https://www.messagebus.com/documentation-content/#Status Codes
 *
 * @var {Object}
 * @static
 */
MsgBusClient.HTTP_ERRORS = {
	400: "Invalid Request (format or parameters not correct)",
	401: "Unauthorized-Missing API Key",
	403: "Unauthorized-Invalid API Key",
	404: "Incorrect URL (or object not found)",
	405: "Method not allowed",
	406: "Format not acceptable",
	408: "Request Timeout",
	409: "Conflict",
	410: "Object missing or deleted",
	413: "Too many messages in request",
	415: "POST JSON data invalid",
	422: "Unprocessable Entity",
	500: "Internal Server Error",
	501: "Not Implemented",
	503: "Service Unavailable",
	507: "Insufficient Storage"
};

/**
 * Extended error codes for message sending
 * https://www.messagebus.com/documentation-content/#Extended Status Codes
 *
 * @var {Object}
 * @static
 */
MsgBusClient.MESSAGE_ERROR_CODES = {
	1001: "General Failure",
	1002: "Invalid 'To' email address",
	1003: "Invalid 'From' email address",
	1004: "Missing Subject",
	1006: "Invalid Message-ID header",
	1007: "Invalid Template-Key",
	1008: "Invalid Merge-Field"
};

/**
 * Bounce codes
 * https://www.messagebus.com/documentation-content/#Bounce Code Menu
 *
 * @var {Object}
 * @static
 */
MsgBusClient.BOUNCE_CODES = {
	0:		"UNDETERMINED - (ie. Recipient Reply or not a bounce)",
	10:		"HARD BOUNCE - (ie. User Unknown)",
	20:		"SOFT BOUNCE - General",
	21:		"SOFT BOUNCE - Dns Failure",
	22:		"SOFT BOUNCE - Mailbox Full",
	23:		"SOFT BOUNCE - Message Too Large",
	30:		"BOUNCE - no email address",
	40:		"GENERAL BOUNCE",
	50:		"MAIL BLOCK - General",
	51:		"MAIL BLOCK - Known Spammer",
	52:		"MAIL BLOCK - Spam Detected",
	53:		"MAIL BLOCK - Attachment Detected",
	54:		"MAIL BLOCK - Relay Denied",
	60:		"AUTO REPLY - (ie. Out Of Office)",
	70:		"TRANSIENT BOUNCE",
	80:		"SUBSCRIBE Request",
	90:		"UNSUBSCRIBE/REMOVE Request",
	100:	"CHALLENGE-RESPONSE"
};

/**
 * Format seconds to ISO8061 format (like "Mon Sep 05 2011 12:30:00 GMT-0700 (PDT)")
 * @param {number} millisecondsSinceEpoch
 * @return {string}
 */
MsgBusClient.prototype.isoTime = function(millisecondsSinceEpoch) {
	return new XDate(millisecondsSinceEpoch).toISOString();
};

/**
 * Format seconds to ISO8061 format (like "Mon Sep 05 2011 12:30:00 GMT-0700 (PDT)")
 * @param {number} millisecondsAgo
 * @return {string}
 */
MsgBusClient.prototype.isoTimeAgo = function(millisecondsAgo) {
	return new XDate(Date.now() - millisecondsAgo).toISOString();
};

/**
 * Send a single email message.
 * https://www.messagebus.com/documentation-content/#Sending Email
 *
 * @param {String} toEmail			a string containing the message recipient's email address
 * @param {String} fromEmail		a string containing the message sender's email address
 * @param {String} subject			a string containing the email's subject line
 * @param {Object} options			any and all optional parameters
 * @param {Function} cb				the callback (i.e. cb(err, resp))
 */
MsgBusClient.prototype.sendEmailMessage = function(toEmail, fromEmail, subject, options, cb) {
	var params = Object.create(options);
	params.toEmail = toEmail;
	params.fromEmail = fromEmail;
	params.subject = subject;

	this.callApi("/api/v4/message/email/send", params, "POST", cb);
};

/**
 * Send batches of up to 20 email messages at a time and callback when all are sent
 * https://www.messagebus.com/documentation-content/#Sending Email
 *
 * @param {String} toEmail			a string containing the message recipient's email address
 * @param {String} fromEmail		a string containing the message sender's email address
 * @param {String} subject			a string containing the email's subject line
 * @param {Object} options			any and all optional parameters
 * @param {Function} cb				the success callback (i.e. cb(err, resp))
 */
MsgBusClient.prototype.sendEmailMessage = function(toEmail, fromEmail, subject, options, cb) {
	var params = Object.create(options);
	params.toEmail = toEmail;
	params.fromEmail = fromEmail;
	params.subject = subject;

	this.callApi("/api/v4/message/email/send", {
		messages: [params]
	}, "POST", cb);
};

/**
 * Make a "raw" call to the api
 * @param {String} path			end-point path to call (e.g. "/v4/message/email/send")
 * @param {Object} data			Parameters (GET or POST)
 * @param {string} method		"GET", "POST", etc.
 * @param {Function=} opt_callback	callback(err, data, response)
 */
MsgBusClient.prototype.callApi = function(path, data, method, opt_callback) {
	if (path.substr(0, 1) !== "/") {
		path = "/" + path;
	}

	var options = {
		uri: this._uri + path,
		method: method,
		json: true,
		jar: false
	};

	if (method === "GET") {
		options['qs'] = data;
	} else if (method === "POST") {
		options['body'] = JSON.stringify(data);
	}

	request(options, function(err, resp, body) {
		if (!resp) {
			if (opt_callback) {
				opt_callback(new Error("undefined response"));
			}
			return;
		} else if (MsgBusClient.HTTP_ERRORS[resp.statusCode]) {
			if (opt_callback) {
				opt_callback(new Error(MsgBusClient.HTTP_ERRORS[resp.statusCode]), body);
			}
			return;
		}

		if (opt_callback) {
			opt_callback(null, body);
		}
	});
};

module.exports = MsgBusClient;
