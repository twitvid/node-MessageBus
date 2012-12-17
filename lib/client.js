var util = require('util'),
	_ = require('underscore'),
	request = require('request'),
	packageJson = require('../package.json');

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
	this.sessionKey = opt_sessionKey ? opt_sessionKey : 'DEFAULT';

	/**
	 * The uri base for message bus API
	 * @property {String}
	 * @private
	 */
	this._uri = 'https://api-v4.messagebus.com/api';

	/**
	 * A request handle with defaults set
	 * @type {request}
	 * @private
	 */
	this._request = request.defaults({
		headers: {
			"X-MessageBus-Key": this._apiKey,
			"User-Agent": "MessageBusAPI:" + packageJson.version + "-Node.js:" + process.version,
			"Content-Type": "application/json; charset=utf-8"
		},
		pool: {
			maxSockets: MsgBusClient.MAX_HTTP_SOCKETS
		},
		jar: false
	});
};

/**
 * The maximum number of http connections to allow open in parallel
 * @type {Number}
 * @const
 */
MsgBusClient.MAX_HTTP_SOCKETS = 1;

/**
 * REST HTTP Status Errors
 * https://www.messagebus.com/documentation-content/#Status Codes
 *
 * @var {Object}
 * @const
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
 * @const
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
 * @const
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
			sessionKey: this.sessionKey
		}
	);
};

/**
 * Format seconds to MessageBus' "special" ISO8061 format (e.g. '2012-12-12T02:50:48Z')
 * @param {number} millisecondsSinceEpoch
 * @return {string}
 * @protected
 */
MsgBusClient.prototype._isoTime = function(millisecondsSinceEpoch) {
	function pad(number) {
		if (number >= 0 && number <= 9) {
			return "0" + number;
		}
		return "" + number;
	}

	var date = new Date();
	return date.getUTCFullYear()
		+ '-' + pad(date.getUTCMonth() + 1)
		+ '-' + pad(date.getUTCDate())
		+ 'T' + pad(date.getUTCHours())
		+ ':' + pad(date.getUTCMinutes())
		+ ':' + pad(date.getUTCSeconds())
		+ 'Z';
};

/**
 * Format seconds to MessageBus' "special" ISO8061 format (e.g. '2012-12-12T02:50:48Z')
 * @param {number} millisecondsAgo
 * @return {string}
 * @protected
 */
MsgBusClient.prototype._isoTimeAgo = function(millisecondsAgo) {
	return this._isoTime(Date.now() - millisecondsAgo);
};

/**
 * @param {Date|Number} fromTime
 * @param {Date|Number} toTime
 * @return {Object}
 * @private
 */
MsgBusClient.prototype._isoTimeParams = function(fromTime, toTime) {
	if (fromTime instanceof Date) {
		fromTime = fromTime.getTime();
	}

	if (toTime instanceof Date) {
		toTime = toTime.getTime();
	}

	fromTime = this._isoTime(fromTime);
	toTime = this._isoTime(toTime);

	return {
		startDate: fromTime,
		endDate: toTime
	};
};

/**
 * Get email stats from time to time
 * @param {Date|Number} fromTime
 * @param {Date|Number} toTime
 * @param {Function} cb
 */
MsgBusClient.prototype.getEmailStats = function(fromTime, toTime, cb) {
	this.callApi('/v4/stats/email',
		this._isoTimeParams(fromTime, toTime),
		'GET',
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
	this.callApi('/v4/stats/email/channel/' + channelGuid,
		this._isoTimeParams(fromTime, toTime),
		'GET',
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
 * Retrieves bounce data associated with the account.
 *
 * NOTE: the maximum date range is 7 days
 * NOTE: the maximum row count returned is 10,000. In case this is exceeded, Error Code 413 - Request Too Large will
 * be returned. In order to view more records, the api call needs to be split across multiple requests with a shorter
 * date range.
 *
 * @param {Date|Number} fromTime
 * @param {Date|Number} toTime
 * @param {Function} cb
 */
MsgBusClient.prototype.getBounces = function(fromTime, toTime, cb) {
	this.callApi('/v4/bounces',
		this._isoTimeParams(fromTime, toTime),
		'GET',
		cb ? cb : function() {}
	);
};

/**
 * Retrieve email statistics associated with a channel from a time ago till now
 * @param {Number} msAgo
 * @param {Function} cb
 */
MsgBusClient.prototype.getBouncesSince = function(msAgo, cb) {
	this.getBounces(Date.now() - msAgo, Date.now(), cb);
};

/**
 * Retrieves the unsubscribe data associated with the account.
 * @param fromTime
 * @param toTime
 * @param cb
 */
MsgBusClient.prototype.getUnsubs = function(fromTime, toTime, cb) {
	this.callApi('/v4/unsubs',
		this._isoTimeParams(fromTime, toTime),
		'GET',
		cb ? cb : function() {}
	);
};

/**
 * Retrieves the unsubscribe data associated with the account.
 * @param {Number} msAgo
 * @param {Function} cb
 */
MsgBusClient.prototype.getUnsubsSince = function(msAgo, cb) {
	this.getUnsubs(Date.now() - msAgo, Date.now(), cb);
};

/**
 * Retrieves the unsubscribe data associated with a channel for the account.
 * @param {string} channelGuid
 * @param fromTime
 * @param toTime
 * @param cb
 */
MsgBusClient.prototype.getChannelUnsubs = function(channelGuid, fromTime, toTime, cb) {
	this.callApi('/v4/unsubs/channel/' + channelGuid,
		this._isoTimeParams(fromTime, toTime),
		'GET',
		cb ? cb : function() {}
	);
};

/**
 * Retrieves the unsubscribe data associated with a channel for the account.
 * @param {string} channelGuid
 * @param {Number} msAgo
 * @param {Function} cb
 */
MsgBusClient.prototype.getChannelUnsubsSince = function(channelGuid, msAgo, cb) {
	this.getChannelUnsubs(channelGuid, Date.now() - msAgo, Date.now(), cb);
};

/**
 * Retrieves the complaint (FBL) data associated with the account.
 *
 * NOTE: the maximum date range is 7 days
 * NOTE: the maximum row count returned is 10,000. In case this is exceeded, Error Code 413 - Request Too Large will
 * be returned. In order to view more records, the api call needs to be split across multiple requests with a shorter
 * date range.
 *
 * @param {Date|Number} fromTime
 * @param {Date|Number} toTime
 * @param {Function} cb
 */
MsgBusClient.prototype.getComplaints = function(fromTime, toTime, cb) {
	this.callApi('/v4/complaints',
		this._isoTimeParams(fromTime, toTime),
		'GET',
		cb ? cb : function() {}
	);
};

/**
 * Retrieves the complaint (FBL) data associated with the account.
 * @param {Number} msAgo
 * @param {Function} cb
 */
MsgBusClient.prototype.getComplaintsSince = function(msAgo, cb) {
	this.getComplaints(Date.now() - msAgo, Date.now(), cb);
};

/**
 * Retrieves the complaint data associated with a channel for the account.
 * @param {string} channelGuid
 * @param fromTime
 * @param toTime
 * @param cb
 */
MsgBusClient.prototype.getChannelComplaints = function(channelGuid, fromTime, toTime, cb) {
	this.callApi('/v4/complaints/channel/' + channelGuid,
		this._isoTimeParams(fromTime, toTime),
		'GET',
		cb ? cb : function() {}
	);
};

/**
 * Retrieves the complaint data associated with a channel for the account.
 * @param {string} channelGuid
 * @param {Number} msAgo
 * @param {Function} cb
 */
MsgBusClient.prototype.getChannelComplaintsSince = function(channelGuid, msAgo, cb) {
	this.getChannelComplaints(channelGuid, Date.now() - msAgo, Date.now(), cb);
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
	if (_.isFunction(arguments[3])) {
		cb = arguments[3];
		options = undefined;
	}

	var params = Object.create(options ? options : null);
	params = this._createEmailBody(params);

	params.toEmail = toEmail;
	params.fromEmail = fromEmail;
	params.subject = subject;

	this.callApi('/v4/message/email/send', {
			messages: [params]
		},
		'POST',
		_.isFunction(cb) ? cb : function() {}
	);
};

/**
 * Send a batch of up to 50 email messages in one api call
 * NOTE: a single message may contain:
 * 		toEmail			(required) a string containing the message recipient's email address
 * 		fromEmail		(required) a string containing the message sender's email address
 * 		subject			(required) a string containing the email's subject line
 * 		toName 			(optional)	a string containing the message recipient's name
 * 		fromName		(optional)	a string containing the message sender's name
 * 		plaintextBody	(optional)	a string containing the plaintext message body.
 * 		htmlBody		(optional)	a string containing the HTML message body.
 * 		customHeaders	(optional)	a hash of key/value strings, where keys are custom email headers and values are appropriate to each message recipient
 * 		sessionKey		(optional)	a GUID identifying the session to associate the message to and corresponding statistics. If a key is not provided, the message will be given a default key (default key alias is "DEFAULT")
 *
 * @param {Array.<Object>} messages
 * @param {Function=} cb			Optional. the success callback (i.e. cb(err, resp))
 */
MsgBusClient.prototype.sendEmailBatch = function(messages, cb) {
	if (messages.length > 50) {
		var err = new Error('unable to batch more than 50 messages at a time');
		if (cb) {
			cb(err);
			return;
		} else {
			throw err;
		}
	}

	this.callApi('/v4/message/email/send', {
			messages: messages
		},
		'POST',
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
	this.callApi('/v4/channels', {
		},
		'GET',
		cb ? cb : function() {}
	);
};

/**
 * Get configuration settings for the channel
 * @param {string} channelGuid
 * @param {Function} cb
 */
MsgBusClient.prototype.getChannelConfig = function(channelGuid, cb) {
	this.callApi('/v4/channel/' + channelGuid + '/config', {
		},
		'GET',
		cb ? cb : function() {}
	);
};

/**
 * Get sessions attach to a channel
 * @param {string} channelGuid
 * @param {Function} cb
 */
MsgBusClient.prototype.getChannelSessions = function(channelGuid, cb) {
	this.callApi('/v4/channel/' + channelGuid + '/sessions', {
		},
		'GET',
		cb ? cb : function() {}
	);
};

/**
 * Make a 'raw' call to the api
 * @param {String} path			end-point path to call (e.g. '/v4/message/email/send')
 * @param {Object} data			Parameters (GET or POST)
 * @param {string} method		'GET', 'POST', etc.
 * @param {Function} callback	callback(err, data, response)
 */
MsgBusClient.prototype.callApi = function(path, data, method, callback) {
	if (path.substr(0, 1) !== '/') {
		path = '/' + path;
	}

	var options = {
		uri: this._uri + path,
		method: method
	};

	if (method === 'GET') {
		options['qs'] = data;
	} else if (method === 'POST') {
		options['body'] = JSON.stringify(data);
	}

	this._request(options, function(err, resp, body) {
		if (err) {
			callback(err);
			return;
		} else if (!body) {
			callback(new Error('undefined response'));
			return;
		} else if (resp.statusCode > 299) {
			callback(new Error('MessageBus status code: ' + resp.statusCode + "\n" + body));
			return;
		}

		try {
			var data = JSON.parse(body);
		} catch (err) {
			callback(new Error("MessageBus failed JSON.parse:\n" + body));
			return;
		}

		if (!data.statusCode) {
			callback(new Error('undefined response: ' + util.inspect(resp)));
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
