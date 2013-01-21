var SmartStream = require('smart-stream').SmartStream;
var MsgBusClient = require('messagebus').MsgBusClient;
var util = require('util');

/**
 * Consumes messages and sends them through a MsgBusClient
 *
 * @param {MsgBusClient} client				The client to send batches through
 * @param {Number=} opt_limitPending		Optional. Limit the number of concurrent message sends
 *
 * @constructor
 * @extends {SmartStream}
 */
var MessageSendStream = function (client, opt_limitPending) {
	SmartStream.call(this, 'MessageSendStream', opt_limitPending || MsgBusClient.MAX_HTTP_SOCKETS);

	/**
	 * @type {MsgBusClient}
	 * @private
	 */
	this._client = client;

	/**
	 * Number of times we've called out to the api
	 * @type {Number}
	 */
	this.callCount = 0;

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

	this.setMiddleware(this._sendMessages.bind(this));
};
util.inherits(MessageSendStream, SmartStream);

MessageSendStream.prototype._sendMessages = function(messages, cb) {
	this._client.sendEmailBatch(messages, this._onSendBatchResponse.bind(this, messages, cb));
};

/**
 * @param {Array} messages
 * @param {Function} cb
 * @param {Error} err
 * @param {Object} resp
 * @private
 */
MessageSendStream.prototype._onSendBatchResponse = function(messages, next, err, resp) {
	++this.callCount;

	if (err) {
		// well, this is certainly odd
		this.emit('odd', err);
		next();
		return;
	} else if (!resp) {
		this.emit('odd', new Error('empty response'));
		next();
		return;
	}

	var MsgBusClient = require('messagebus').MsgBusClient;

	this.successCount += resp['successCount'] ? resp['successCount'] : 0;
	this.failureCount += resp['failureCount'] ? resp['failureCount'] : 0;
	if (resp['results'] && resp['results'].length) {
		resp['results'].forEach(function(result) {
			var errorMsg = MsgBusClient.MESSAGE_ERROR_CODES[result['messageStatus']];
			if (errorMsg) {
				this.emit('odd', errorMsg, result);
			}
		}.bind(this));
	}

	next(null, resp);
};

module.exports = MessageSendStream;