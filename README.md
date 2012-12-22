node-MessageBus
================

A client for the MessageBus RESTful API, Version 4

Get started:

```javascript
npm install messagebus
```

Send an email:

```javascript
// send a single email
var MsgBusClient = require("MessageBus").MsgBusClient;
var client = new MsgBusClient(apiKey);
client.sendEmailMessage("test@example.com", "Customer Service <cs@example.com>", "Hello subjective world");
```

To send many emails faster, use the batch method:

```javascript
var MsgBusClient = require("MessageBus").MsgBusClient;
var client = new MsgBusClient(apiKey);
client.sendEmailBatch(messages, function(err, resp) {
	if (err) throw err;
	console.info('Emails sent:', resp['successCount']);
	console.info('Emails failed:', resp['failureCount']);
});
```

Need to send a massive amount of email as fast as possible using [mustache](http://mustache.github.com/) templates? Use streams!

```javascript
var mb = require("MessageBus");

var templateStream = new mb.TemplateStream({
	html: __dirname + '/templates/html.ms', // html mustache template
	plain: __dirname + '/templates/plain.ms' // plain-text mustache template
} /* as a 2nd arg, you can pass default data for each template */);
var batchStream = new mb.MessageBatchStream();

var client = new mb.MsgBusClient(apiKey);
var sendStream = new mb.MessageSendStream(client);

// ... assume you have an incoming Stream of users to email called "usersToEmailStream" (e.g. text file, etc.)
usersToEmailStream.pipe(templateStream);
templateStream.pipe(batchStream);
batchStream.pipe(sendStream);
sendStream.on('close', function() {
	// done sending!
	console.info("Emails sent: ", sendStream.successCount);
	console.info("Emails failed: ", sendStream.failureCount);
});
```

## Complete and tested:

 * Sending Email
  * /v4/message/email/send
 * Email Metrics
  * /v4/stats/email
 * Bounces
  * /v4/bounces
  * /v4/bounces/channel/%CHANNEL_KEY%
 * Complaint Processing
  * /v4/complaints
 * Unsubscribe Requests
  * /v4/unsubs
  * /v4/unsubs/channel/%CHANNEL_KEY%
 * Separating Mail Streams (Channels)
  * /v4/channels
  * /v4/channel/%CHANNEL_KEY%/config

## TODO:

 * FIX (test skipped, timing out): /v4/stats/email/channel/%CHANNEL_KEY%
 * FIX (test skipped, timing out): /v4/complaints/channel/%CHANNEL_KEY%
 * FIX (test skipped, timing out): /v4/channel/%CHANNEL_KEY%/sessions

 * implement: /v4/stats/email/channel/%CHANNEL_KEY%/session/%SESSION_KEY%
 * implement: POST /v4/channel/%CHANNEL_KEY%/sessions
 * implement: /v4/channel/%CHANNEL_KEY%/session/%SESSION_KEY%/rename
