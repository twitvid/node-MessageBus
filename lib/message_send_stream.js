var BiStream = require('base-stream').BiStream;
var util = require('util');

/**
 * Consumes messages and sends them through a MsgBusClient
 *
 * @param {MsgBusClient} client				The client to send batches through
 * @param {Number=} opt_limitPending		Optional. Limit the number of concurrent message sends
 *
 * @constructor
 * @extends {BiStream}
 */
var MessageSendStream = function (client, opt_limitPending) {
	BiStream.call(this, 'MessageSendStream', opt_limitPending);

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
util.inherits(MessageSendStream, BiStream);

MessageSendStream.prototype._sendMessages = function(messages, cb) {
	++this.callCount;
	this._client.sendEmailBatch(messages, this._onSendBatchResponse.bind(this, cb));
};

/**
 * @param {Function} cb
 * @param {Error} err
 * @param {Object} resp
 * @private
 */
MessageSendStream.prototype._onSendBatchResponse = function(cb, err, resp) {
	if (err) {
		this.emit('error', err);
	} else if (resp) {
		this.successCount += resp['successCount'] ? resp['successCount'] : 0;
		this.failureCount += resp['failureCount'] ? resp['failureCount'] : 0;
	}

	cb(err, resp);
};

module.exports = MessageSendStream;