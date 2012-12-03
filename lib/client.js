var util = require("util"),
	_ = require("underscore"),
	request = require("request"),
	XDate = require("xdate"),
	packageJson = require("../package.json");

/**
 * A MessageBus client for their version 4 API
 * https://www.messagebus.com/documentation-content
 *
 * @constructor
 */
var MsgBusClient = function (apiKey, opt_sessionKey) {
	/**
	 * apiKey for all REST requests
	 * @property {String}
	 * @private
	 */
	this._apiKey = apiKey;

	/**
	 * Unique session identifier
	 * @property {String}
	 * @private
	 */
	this._sessionKey = opt_sessionKey ? opt_sessionKey : "DEFAULT";

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
 * Initialize a json post body
 * @return {Object}
 * @private
 */
MsgBusClient.prototype._createEmailBody = function(params) {
	return _.defaults(params, {
			"toEmail": "",
			"fromEmail": "",
			"subject": "",
			"toName": "",
			"fromName": "",
			"plaintextBody": "",
			"htmlBody": "",
			"sessionKey": this._sessionKey
		}
	);
};

/**
 * Format seconds to ISO8061 format (like "Mon Sep 05 2011 12:30:00 GMT-0700 (PDT)")
 * @param {number} millisecondsSinceEpoch
 * @return {string}
 */
MsgBusClient.prototype.isoTime = function(millisecondsSinceEpoch) {
	return new XDate(millisecondsSinceEpoch).setMilliseconds(0).toISOString();
};

/**
 * Format seconds to ISO8061 format (like "Mon Sep 05 2011 12:30:00 GMT-0700 (PDT)")
 * @param {number} millisecondsAgo
 * @return {string}
 */
MsgBusClient.prototype.isoTimeAgo = function(millisecondsAgo) {
	return new XDate(Date.now() - millisecondsAgo).setMilliseconds(0).toISOString();
};

/**
 * Get email stats from time to time
 * @param {Date|Number} fromTime
 * @param {Date|Number} toTime
 * @param {Function} cb
 */
MsgBusClient.prototype.getEmailStats = function(fromTime, toTime, cb) {
	if (fromTime instanceof Date) {
		fromTime = fromTime.getTime();
	}

	if (toTime instanceof Date) {
		toTime = toTime.getTime();
	}

	fromTime = this.isoTime(fromTime);
	toTime = this.isoTime(toTime);

	this.callApi("/v4/stats/email", {
			startDate: fromTime,
			endDate: toTime
		},
		"GET",
		cb ? cb : function() {}
	);
};

/**
 * Get email stats from a time ago till now
 * @param {Number} msAgo
 * @param {Function} cb
 */
MsgBusClient.prototype.getEmailStatsSince = function(msAgo, cb) {
	this.getEmailStats(Date.now() - msAgo, Date.now(), cb);
};

/**
 * Retrieve email statistics associated with a channel
 * @param {string} channelGuid
 * @param {Date|Number} fromTime
 * @param {Date|Number} toTime
 * @param {Function} cb
 */
MsgBusClient.prototype.getChannelStats = function(channelGuid, fromTime, toTime, cb) {
	if (fromTime instanceof Date) {
		fromTime = fromTime.getTime();
	}

	if (toTime instanceof Date) {
		toTime = toTime.getTime();
	}

	fromTime = this.isoTime(fromTime);
	toTime = this.isoTime(toTime);

	this.callApi("/v4/stats/email/channel/" + channelGuid, {
			startDate: fromTime,
			endDate: toTime
		},
		"GET",
		cb ? cb : function() {}
	);
};

/**
 * Retrieve email statistics associated with a channel from a time ago till now
 * @param {string} channelGuid
 * @param {Number} msAgo
 * @param {Function} cb
 */
MsgBusClient.prototype.getChannelStatsSince = function(channelGuid, msAgo, cb) {
	this.getChannelStats(channelGuid, Date.now() - msAgo, Date.now(), cb);
};

/**
 * Send batches of up to 20 email messages at a time and callback when all are sent
 * https://www.messagebus.com/documentation-content/#Sending Email
 *
 * @param {String} toEmail			Required. a string containing the message recipient's email address - OR - an options list
 * @param {String} fromEmail		Required. a string containing the message sender's email address
 * @param {String} subject			Required. a string containing the email's subject line
 * @param {Object=} options			Optional. any and all optional parameters
 * @param {Function=} cb			Optional. the success callback (i.e. cb(err, resp))
 */
MsgBusClient.prototype.sendEmailMessage = function(toEmail, fromEmail, subject, options, cb) {
	var params = Object.create(options ? options : null);
	params = this._createEmailBody(params);

	params.toEmail = toEmail;
	params.fromEmail = fromEmail;
	params.subject = subject;

	this.callApi("/v4/message/email/send", {
			messages: [params]
		},
		"POST",
		_.isFunction(cb) ? cb : function() {}
	);
};

/**
 * Return the list of channels.
 *
 * Mail streams, or channels, need to be separated in order to ensure the ongoing deliverability of different forms of
 * messaging. Transactional email, in most cases, is not subject to the same scrutiny, or regulatory compliance, as
 * marketing email; by separating these two unique and distinct mail streams you can ensure the ongoing transmission of
 * both sets of messages. Problems that arise in one channel will be confined to that channel's sending IP and domain
 * and not spill over. Mailers may want to further segment their mail streams by brand as different products may have
 * completely different audiences, recipient histories and opt-in practices over time. These variations can lead to
 * very different deliverability results and as such should be separated to avoid contamination from one channel to
 * another.
 *
 * @param {Function} cb
 */
MsgBusClient.prototype.getChannels = function(cb) {
	this.callApi("/v4/channels", {
		},
		"GET",
		cb ? cb : function() {}
	);
};

/**
 * Make a "raw" call to the api
 * @param {String} path			end-point path to call (e.g. "/v4/message/email/send")
 * @param {Object} data			Parameters (GET or POST)
 * @param {string} method		"GET", "POST", etc.
 * @param {Function} callback	callback(err, data, response)
 */
MsgBusClient.prototype.callApi = function(path, data, method, callback) {
	if (path.substr(0, 1) !== "/") {
		path = "/" + path;
	}

	var options = {
		uri: this._uri + path,
		headers: {
			"X-MessageBus-Key": this._apiKey,
			"User-Agent": "MessageBusAPI:" + packageJson.version + "-Node.js:" + process.version,
			"Content-Type": "application/json; charset=utf-8"
		},
		method: method,
		jar: false
	};

	if (method === "GET") {
		options["qs"] = data;
	} else if (method === "POST") {
		options["body"] = JSON.stringify(data);
	}

	request(options, function(err, resp, body) {
		if (err) {
			callback(err);
			return;
		} else if (!body) {
			callback(new Error("undefined response"));
			return;
		}

		var data = JSON.parse(body);
		if (!data.statusCode) {
			callback(new Error("undefined response: " + util.inspect(resp)));
			return;
		}

		if (MsgBusClient.HTTP_ERRORS[data.statusCode]) {
			callback(new Error(MsgBusClient.HTTP_ERRORS[data.statusCode]), data);
			return;
		}

		callback(null, data);
	});
};

module.exports = MsgBusClient;
