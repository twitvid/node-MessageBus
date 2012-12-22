var AccStream = require('smart-stream').AccStream;
var util = require('util');

/**
 * Consumes a large volume of messages, and then produces a single batch downstream
 *
 * @constructor
 * @extends {Stream}
 */
var MessageBatchStream = function () {
	AccStream.call(this, 'MessageBatchStream', MessageBatchStream.BATCH_COUNT_MAX);

	/**
	 * General size of the this._buffer
	 * @type {Number}
	 */
	this.countBytes = 0;
};
util.inherits(MessageBatchStream, AccStream);

/**
 * @const {Number}
 */
MessageBatchStream.BATCH_SIZE_MAX = 1048576; // 1MB

/**
 * @const {Number}
 */
MessageBatchStream.BATCH_COUNT_MAX = 50;

MessageBatchStream.prototype.isFull = function() {
	return AccStream.prototype.isFull.call(this)
		|| this.countBytes >= MessageBatchStream.BATCH_SIZE_MAX;
};

/**
 * Enqueue a message
 * @param {Object} message
 */
MessageBatchStream.prototype.enQueue = function(message) {
	AccStream.prototype.enQueue.call(this, message);
	this.countBytes += this.sizeOfMsg(message);
};

/**
* Get the size of a message Object
* @param {Object} message
* @return {Number}
*/
MessageBatchStream.prototype.sizeOfMsg = function(message) {
	// increment a measure of message size, which is based mostly on htmlBody size
	if (message.htmlBody) {
		return Buffer.byteLength(message.htmlBody, 'utf8');
	} else if (message.plaintextBody) {
		return Buffer.byteLength(message.plaintextBody, 'utf8');
	} else {
		return Buffer.byteLength(message.subject, 'utf8');
	}
};

module.exports = MessageBatchStream;