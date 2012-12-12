var MsgBusClient = require('./client.js'),
	util = require('util'),
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
	 * The total size the html messages in this._batch
	 * This is an arbitrary measure of message size, which is based only on htmlBody size
	 * @type {Number}
	 * @private
	 */
	this._batchByteCount = NaN;

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
BatchSender.MAX_SEND = 50;

/**
 * Push a sendEmailMessage request into the batch send
 * NOTE: allowed options are:
 * 		toName (optional)	a string containing the message recipient's name
 * 		fromName (optional)	a string containing the message sender's name
 * 		plaintextBody (optional)	a string containing the plaintext message body.
 * 		htmlBody (optional)	a string containing the HTML message body.
 * 		customHeaders (optional)	a hash of key/value strings, where keys are custom email headers and values are appropriate to each message recipient
 * 		sessionKey (optional)	a GUID identifying the session to associate the message to and corresponding statistics. If a key is not provided, the message will be given a default key (default key alias is "DEFAULT")
 *
 * @param {String} toEmail			Required. a string containing the message recipient's email address - OR - an options list
 * @param {String} fromEmail		Required. a string containing the message sender's email address
 * @param {String} subject			Required. a string containing the email's subject line
 * @param {Object=} options			Optional. any and all optional parameters
 * @param {Function=} cb			Optional. the success callback (i.e. cb(err, resp))
 */
BatchSender.prototype.push = function(toEmail, fromEmail, subject, options, cb) {
	if (_.isFunction(arguments[3])) {
		cb = arguments[3];
		options = undefined;
	}

	var message = Object.create(options ? options : null);
	message.toEmail = toEmail;
	message.fromEmail = fromEmail;
	message.subject = subject;

	// increment a measure of message size, which is based only on htmlBody size
	if (message.htmlBody) {
		var numBytes = Buffer.byteLength(message.htmlBody, 'utf8');
		if (isNaN(this._batchByteCount)) {
			this._batchByteCount = numBytes;
		} else {
			this._batchByteCount += numBytes;
		}
	}

	this._batch.push({
		message: message,
		cb: _.isFunction(cb) ? cb : function() {}
	});

	// determine if we should flush the message buffer
	if (this.isTimeToFlush()) {
		this.flush();
	}
};

/**
 * Determine if it is time to flush the message batch
 * NOTE: we do this to optimize send throughput
 * @return {boolean}
 */
BatchSender.prototype.isTimeToFlush = function() {
	var maxSend = BatchSender.MAX_SEND;
	if (isNaN(this._batchByteCount)) {
		// send max number of messages if htmlBody is never used
		return this._batch.length >= maxSend;
	}

	// calculate the average size of htmlBody
	var numBytesAvg = Math.floor(this._batchByteCount / this._batch.length);
	if (numBytesAvg >= 51200) {
		maxSend = 20;
	} else if (numBytesAvg >= 10240) {
		maxSend = 30;
	}

	return this._batch.length >= maxSend;
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
	this._batchByteCount = NaN;
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