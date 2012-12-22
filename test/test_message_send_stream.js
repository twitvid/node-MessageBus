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

	it('concurrency', function(done) {
		var message = {
			'subject': 'foobar'
		};

		// build a pipeline, Tex!
		var client = new FakeClient();
		var batchStream = new MessageBatchStream();
		var sendStream = new MessageSendStream(client, 1);

		batchStream.pipe(sendStream);

		var isDrain = false;
		sendStream.on('drain', function() {
			isDrain = true;
		});

		var dataCount = 0;
		batchStream.on('data', function() {
			assert.ok(batchStream._isPaused);
			assert.ok(batchStream.countBuffer() <= 50);
		});

		var pauseCount = 0;
		batchStream.on('pause', function() {
			assert.ok(batchStream._isPaused);
			++pauseCount;
		});

		var resumeCount = 0;
		batchStream.on('resume', function() {
			assert.ok(!batchStream._isPaused);
			++resumeCount;
		});

		sendStream.on('close', function() {
			assert.ok(isDrain);
			assert.equal(3, client.callCount);
			assert.equal(1, pauseCount);
			assert.equal(0, resumeCount);
			done();
		});

		// queue 100 messages
		for (var i = 0; i < 103; i++) {
			batchStream.write(message);
		}
		batchStream.end();
	});
});