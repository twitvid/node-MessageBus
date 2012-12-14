// for testing, use http://visionmedia.github.com/mocha/

var MessageBatchStream = require('../lib/message_batch_stream.js');
var MessageSendStream = require('../lib/message_send_stream.js');
var assert = require('assert');

var FakeClient = function() {
	this.callCount = 0;
};
FakeClient.prototype.sendEmailBatch = function(messages, cb) {
	++this.callCount;
	global.setTimeout(cb.bind(this, null, {
		successCount: messages.length,
		failureCount: 0
	}), 200);
};

describe('MessageSendStream', function() {
	it('end flush', function(done) {
		var message = {
			'subject': 'foobar'
		};

		// build a pipeline, Tex!
		var client = new FakeClient();
		var batchStream = new MessageBatchStream();
		var sendStream = new MessageSendStream(client);

		batchStream.pipe(sendStream);
		sendStream.on('close', function() {
			assert.equal(3, client.callCount);
			assert.equal(103, sendStream.successCount);
			done();
		});

		// queue 103 messages
		for (var i = 0; i < 103; i++) {
			batchStream.write(message);
		}
		batchStream.end();
	});
});