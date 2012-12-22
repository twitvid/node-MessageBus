// for testing, use http://visionmedia.github.com/mocha/

var SmartStream = require('smart-stream').SmartStream;
var MessageBatchStream = require('../index.js').MessageBatchStream;
var assert = require('assert');
var util = require('util');

var testData = {
	"toEmail":"alice@example.com",
	"toName":"Alice",
	"subject":"Sample Message with many parameters",
	"plaintextBody":"This is the plain text body.",
	"htmlBody":"This is the HTML body.",
	"fromEmail":"alice@example.com",
	"fromName":"Test",
	"sessionKey":"d41d8cd98f00b204e9800998ecf8427e"
};

function watchEvents(streams, events) {
	var eventsSeen = [];
	events.forEach(function(event) {
		streams.forEach(function(stream) {
			stream.on(event, function(data) {
				assert.equal(stream, this, 'Stream event emitted, but scope is not the same as Stream instance');
				eventsSeen.push([this, event]);
			});
		});
	});
	return eventsSeen;
}

function assertSeen(eventsSeen, stream, event) {
	var isSeen = false;
	eventsSeen.forEach(function(record) {
		if (record[0] === stream && record[1] === event) {
			isSeen = true;
			return false; // break
		}
	});
	assert.ok(isSeen, 'Event "' + event + '" not seen on Stream "' + stream.name + '"');
}

function assertNotSeen(eventsSeen, stream, event) {
	var isSeen = false;
	eventsSeen.forEach(function(record) {
		if (record[0] === stream && record[1] === event) {
			isSeen = true;
			return false; // break
		}
	});
	assert.ok(!isSeen, 'Event "' + event + '" was not expected on Stream "' + stream.name + '"');
}

function assertSeenCount(eventsSeen, stream, event, count) {
	var countSeen = 0;
	eventsSeen.forEach(function(record) {
		if (record[0] === stream && record[1] === event) {
			++countSeen;
		}
	});
	assert.equal(count, countSeen);
}

describe('MessageBatchStream', function() {
	it('deQueueBatch', function(done) {
		var mbStream = new MessageBatchStream('mbStream');
		assert.ok(mbStream.isDrainedFully());
		assert.deepEqual([], mbStream.deQueueBatch());

		mbStream.write(testData);
		assert.ok(mbStream.isDrained());
		assert.ok(!mbStream.isDrainedFully());
		assert.deepEqual([testData], mbStream.deQueueBatch());
		assert.equal(0, mbStream.countBuffer());

		for (var i = 1; i <= 49; i++) {
			mbStream.write(testData);
			assert.ok(mbStream.isDrained());
			assert.equal(i, mbStream.countBuffer());
		}

		mbStream.on('data', function(batch) {
			assert.equal(50, batch.length);
			done();
		});
		mbStream.write(testData);
	});

	it('startDrainCycle', function(done) {
		var mbStream = new MessageBatchStream('mbStream');
		mbStream.pause();

		var eventsSeen = watchEvents([mbStream], ['data','drain','pause','empty']);

		for (var i = 1; i <= 500; i++) {
			mbStream.write(testData);
			assert.equal(i, mbStream.countBuffer());
		}

		assertNotSeen(eventsSeen, mbStream, 'data');
		mbStream.startDrainCycle();
		mbStream.resume();
var a = 0;
		mbStream.on('data', function() {
			mbStream.pause();
			var countStuck = mbStream.countBuffer();
			setTimeout(function() {
				assert.equal(mbStream.countBuffer(), countStuck);
				mbStream.resume();
			}, 10);
			++a;
		});

		mbStream.on('empty', function() {
			assertSeenCount(eventsSeen, mbStream, 'data', 10);
			assertSeenCount(eventsSeen, mbStream, 'pause', 10);
			assertSeenCount(eventsSeen, mbStream, 'drain', 10);
			done();
		});
	});
});