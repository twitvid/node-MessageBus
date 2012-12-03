var MsgBusClient = require('./client.js'),
	util = require('util'),
	Q = require('q'),
	_ = require('underscore');

/**
 * Wraps a client and sends batches of emails when ready in order to maximize throughput
 *
 * @param {MsgBusClient} client		The client to send batches through
 * @constructor
 */
var BatchSender = function (client) {
	/**
	 * @type {MsgBusClient}
	 * @private
	 */
	this._client = client;

	/**
	 * a group of batches to send
	 * @type {Array}
	 * @private
	 */
	this._batch = [];

	/**
	 * Successes
	 * @type {Number}
	 */
	this.successCount = 0;

	/**
	 * Failures
	 * @type {Number}
	 */
	this.failureCount = 0;

	/**
	 * Status code counts
	 * @type {Object}
	 */
	this.failureStats = {};
};

/**
 * Max number possible to send in a batch
 * @const {Number}
 */
BatchSender.MAX_SEND = 20;

/**
 * Push a sendEmailMessage request into the batch send
 *
 * @param {String} toEmail			Required. a string containing the message recipient's email address - OR - an options list
 * @param {String} fromEmail		Required. a string containing the message sender's email address
 * @param {String} subject			Required. a string containing the email's subject line
 * @param {Object=} options			Optional. any and all optional parameters
 * @param {Function=} cb			Optional. the success callback (i.e. cb(err, resp))
 */
BatchSender.prototype.push = function(toEmail, fromEmail, subject, options, cb) {
	var message = Object.create(options ? options : null);
	message.toEmail = toEmail;
	message.fromEmail = fromEmail;
	message.subject = subject;

	this._batch.push({
		message: message,
		cb: _.isFunction(cb) ? cb : function() {}
	});

	if (this._batch.length >= BatchSender.MAX_SEND) {
		this.flush();
	}
};

/**
 * Send all emails pushed so far
 */
BatchSender.prototype.flush = function() {
	if (!this._batch.length) {
		// nothing to send
		return;
	}

	this._client.callApi('/v4/message/email/send', {
			messages: _.pluck(this._batch, 'message')
		},
		'POST',
		this._onSendCallback.bind(this, this._batch)
	);

	// clear the buffer
	this._batch = [];
};

/**
 * Callback for calls to send emails
 * @param {Array} batch
 * @param {Error} err
 * @param {Object} resp
 * @private
 */
BatchSender.prototype._onSendCallback = function(batch, err, resp) {
	if (err) {
		_.each(batch, function invokeCallback(req) {
			req.cb(err);
		}.bind(this));
		return;
	}

	this.successCount += resp['successCount'] ? resp['successCount'] : 0;
	this.failureCount += resp['failureCount'] ? resp['failureCount'] : 0;

	var results = resp['results'];
	delete resp['results']; // performance

	// for each result, invoke callback with either success or failure
	for (var i = 0; i < results.length; i++) {
		var result = results[i];
		this._invokeSuccessCallback(resp, result, batch[i].cb);
		this._invokeErrorCallback(resp, result, batch[i].cb);
	}
};

/**
 * Handles successes
 * @param {Object} resp		The super response, used for making virtualized responses
 * @param {Object} result	The individual mail response
 * @param {Function} cb		The message callback
 * @private
 */
BatchSender.prototype._invokeSuccessCallback = function(resp, result, cb) {
	if (result['messageStatus']) {
		// error, not a success
		return;
	}

	// create a virtual response that represents one message
	var virtResp = Object.create(resp);
	virtResp['successCount'] = result['messageStatus'] ? 0 : 1;
	virtResp['failureCount'] = result['messageStatus'] ? 1 : 0;
	virtResp['results'] = [result];

	cb(undefined, virtResp);
};

/**
 * Handles failures
 *@param {Object} resp		The super response, used for making virtualized responses
 * @param {Object} result	The individual mail response
 * @param {Function} cb		The message callback
 * @private
 */
BatchSender.prototype._invokeErrorCallback = function(resp, result, cb) {
	if (!result['messageStatus']) {
		// no error
		return;
	}

	var errorMsg = MsgBusClient.MESSAGE_ERROR_CODES[result['messageStatus']];
	if (!errorMsg) {
		errorMsg = 'unknown error: ' + result['messageStatus'];
	}

	// increment failure stats
	if (this.failureStats[result['messageStatus']]) {
		++this.failureStats[result['messageStatus']];
	} else {
		this.failureStats[result['messageStatus']] = 1;
	}

	cb(new Error(errorMsg));
};

module.exports = BatchSender;